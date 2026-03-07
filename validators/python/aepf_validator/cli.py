#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def is_portable_href(href: Any) -> bool:
    if not isinstance(href, str) or not href:
        return False
    if "://" in href:
        return False
    if href.startswith("/") or href.startswith("\\"):
        return False
    if ".." in href:
        return False
    return True


def path_inside_report(report_dir: Path, rel: str) -> bool:
    try:
        candidate = (report_dir / rel).resolve()
        base = report_dir.resolve()
        return base == candidate or base in candidate.parents
    except Exception:
        return False


def collect_href_fields(obj: Any, out: List[str]) -> None:
    if isinstance(obj, list):
        for item in obj:
            collect_href_fields(item, out)
        return
    if not isinstance(obj, dict):
        return
    for key, value in obj.items():
        if isinstance(value, str) and (key.endswith("_href") or key.endswith("_path")):
            out.append(value)
        elif isinstance(value, (dict, list)):
            collect_href_fields(value, out)


def push_check(checks: List[Dict[str, Any]], name: str, passed: bool, details: Any = None, message: Optional[str] = None) -> None:
    payload: Dict[str, Any] = {"name": name, "pass": passed}
    if details is not None:
        payload["details"] = details
    if message:
        payload["message"] = message
    checks.append(payload)


def sha256_file(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()


def verify_signature_with_openssl(manifest_text: str, signature_b64: str, public_key_b64: str) -> Tuple[bool, str]:
    try:
        signature = base64.b64decode(signature_b64, validate=True)
    except Exception:
        return False, "manifest.sig is not valid base64"
    try:
        public_key_der = base64.b64decode(public_key_b64, validate=True)
    except Exception:
        return False, "AQ_MANIFEST_PUBLIC_KEY is not valid base64"

    with tempfile.TemporaryDirectory(prefix="aepf-verify-signature-") as tmp:
        tmpdir = Path(tmp)
        key_der_path = tmpdir / "pub.der"
        key_pem_path = tmpdir / "pub.pem"
        sig_path = tmpdir / "manifest.sig"
        msg_path = tmpdir / "manifest.txt"

        key_der_path.write_bytes(public_key_der)
        sig_path.write_bytes(signature)
        msg_path.write_text(manifest_text, encoding="utf-8")

        key_conv = subprocess.run(
            ["openssl", "pkey", "-pubin", "-inform", "DER", "-in", str(key_der_path), "-out", str(key_pem_path)],
            capture_output=True,
            text=True,
        )
        if key_conv.returncode != 0:
            stderr = (key_conv.stderr or "").strip()
            return False, f"public key parse failed: {stderr or 'openssl pkey failed'}"

        verify = subprocess.run(
            [
                "openssl",
                "pkeyutl",
                "-verify",
                "-pubin",
                "-inkey",
                str(key_pem_path),
                "-sigfile",
                str(sig_path),
                "-in",
                str(msg_path),
                "-rawin",
            ],
            capture_output=True,
            text=True,
        )
        if verify.returncode != 0:
            stderr = (verify.stderr or "").strip()
            return False, f"manifest.sig verification failed: {stderr or 'openssl verify failed'}"

    return True, ""


def validate_required_fields(obj: Dict[str, Any], fields: List[str], prefix: str, errors: List[Dict[str, str]]) -> None:
    for field in fields:
        if field not in obj:
            errors.append({"path": prefix, "message": f"missing required field '{field}'"})


def validate_report_schema(report: Dict[str, Any]) -> List[Dict[str, str]]:
    errors: List[Dict[str, str]] = []

    top_required = [
        "contract_version",
        "report_id",
        "meta",
        "baseline_dir",
        "new_dir",
        "cases_path",
        "summary",
        "quality_flags",
        "items",
    ]
    validate_required_fields(report, top_required, "$", errors)

    meta = report.get("meta")
    if isinstance(meta, dict):
        validate_required_fields(meta, ["toolkit_version", "spec_version", "generated_at", "run_id"], "$.meta", errors)
    else:
        errors.append({"path": "$.meta", "message": "must be an object"})

    summary = report.get("summary")
    if isinstance(summary, dict):
        summary_required = [
            "baseline_pass",
            "new_pass",
            "regressions",
            "improvements",
            "quality",
            "security",
            "risk_summary",
            "cases_requiring_approval",
            "cases_block_recommended",
            "data_coverage",
            "execution_quality",
            "trace_anchor_coverage",
        ]
        validate_required_fields(summary, summary_required, "$.summary", errors)
        tac = summary.get("trace_anchor_coverage")
        if isinstance(tac, dict):
            validate_required_fields(
                tac,
                ["cases_with_anchor_baseline", "cases_with_anchor_new"],
                "$.summary.trace_anchor_coverage",
                errors,
            )
        else:
            errors.append({"path": "$.summary.trace_anchor_coverage", "message": "must be an object"})
    else:
        errors.append({"path": "$.summary", "message": "must be an object"})

    items = report.get("items")
    if isinstance(items, list):
        item_required = [
            "case_id",
            "title",
            "case_status",
            "baseline_pass",
            "new_pass",
            "data_availability",
            "artifacts",
            "trace_integrity",
            "security",
            "policy_evaluation",
            "risk_level",
            "gate_recommendation",
        ]
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                errors.append({"path": f"$.items[{idx}]", "message": "must be an object"})
                continue
            validate_required_fields(item, item_required, f"$.items[{idx}]", errors)
            policy_eval = item.get("policy_evaluation")
            if isinstance(policy_eval, dict):
                validate_required_fields(policy_eval, ["baseline", "new"], f"$.items[{idx}].policy_evaluation", errors)
                for side in ["baseline", "new"]:
                    side_obj = policy_eval.get(side)
                    if isinstance(side_obj, dict):
                        validate_required_fields(
                            side_obj,
                            ["planning_gate_pass", "repl_policy_pass"],
                            f"$.items[{idx}].policy_evaluation.{side}",
                            errors,
                        )
                    else:
                        errors.append(
                            {"path": f"$.items[{idx}].policy_evaluation.{side}", "message": "must be an object"}
                        )
            else:
                errors.append({"path": f"$.items[{idx}].policy_evaluation", "message": "must be an object"})
    else:
        errors.append({"path": "$.items", "message": "must be an array"})

    return errors


def run_validator(report_dir: Path, mode: str) -> Tuple[bool, Dict[str, Any]]:
    checks: List[Dict[str, Any]] = []

    report_path = report_dir / "compare-report.json"
    manifest_path = report_dir / "artifacts" / "manifest.json"

    if not report_path.exists():
        return False, {
            "mode": mode,
            "profiles_status": {},
            "checks": [{"name": "schema_valid", "pass": False, "message": "Missing compare-report.json"}],
        }

    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception as err:
        return False, {
            "mode": mode,
            "profiles_status": {},
            "checks": [{"name": "schema_valid", "pass": False, "message": f"compare-report parse error: {err}"}],
        }

    schema_errors = validate_report_schema(report)
    if schema_errors:
        push_check(checks, "schema_valid", False, {"errors": schema_errors}, "Schema validation failed")
    else:
        push_check(checks, "schema_valid", True)

    manifest = None
    manifest_text = None
    if mode != "aepf":
        if not manifest_path.exists():
            push_check(checks, "manifest_present", False, None, "Missing artifacts/manifest.json")
        else:
            manifest_text = manifest_path.read_text(encoding="utf-8")
            try:
                manifest = json.loads(manifest_text)
                ok_items = isinstance(manifest.get("items"), list)
                push_check(checks, "manifest_present", ok_items, None, None if ok_items else "Invalid manifest.items")
            except Exception as err:
                push_check(checks, "manifest_present", False, None, f"manifest parse error: {err}")

    if mode != "aepf":
        hrefs: List[str] = []
        collect_href_fields(report, hrefs)
        bad = 0
        for href in hrefs:
            if not is_portable_href(href) or not path_inside_report(report_dir, href):
                bad += 1
        push_check(checks, "portable_hrefs", bad == 0, {"count": bad}, None if bad == 0 else "Non-portable hrefs")

    if mode != "aepf" and isinstance(report.get("quality_flags"), dict):
        qf = report["quality_flags"]
        portable_ok = qf.get("portable_paths") is True
        push_check(
            checks,
            "quality_portable_paths",
            portable_ok,
            None,
            None if portable_ok else "portable_paths is false",
        )
        if mode == "strict":
            violations = qf.get("path_violations_count", 0)
            missing_assets = qf.get("missing_assets_count", 0)
            push_check(
                checks,
                "quality_zero_violations",
                violations == 0,
                {"path_violations_count": violations},
                None if violations == 0 else "path_violations_count > 0",
            )
            push_check(
                checks,
                "quality_zero_missing_assets",
                missing_assets == 0,
                {"missing_assets_count": missing_assets},
                None if missing_assets == 0 else "missing_assets_count > 0",
            )

    if mode != "aepf" and isinstance(manifest, dict) and isinstance(manifest.get("items"), list):
        missing = 0
        hash_mismatch = 0
        size_mismatch = 0
        missing_hash = 0

        for item in manifest["items"]:
            rel_path = item.get("rel_path")
            if not isinstance(rel_path, str):
                continue
            if not is_portable_href(rel_path) or not path_inside_report(report_dir, rel_path):
                missing += 1
                continue
            abs_path = report_dir / rel_path
            if not abs_path.exists():
                missing += 1
                continue
            if not item.get("sha256"):
                missing_hash += 1
            if isinstance(item.get("bytes"), int):
                try:
                    if abs_path.stat().st_size != item["bytes"]:
                        size_mismatch += 1
                except Exception:
                    pass
            if item.get("sha256"):
                if sha256_file(abs_path) != item["sha256"]:
                    hash_mismatch += 1

        push_check(
            checks,
            "manifest_missing_assets",
            missing == 0,
            {"missing": missing},
            None if missing == 0 else "Missing manifest assets",
        )
        push_check(
            checks,
            "manifest_hash_mismatch",
            hash_mismatch == 0,
            {"hashMismatch": hash_mismatch},
            None if hash_mismatch == 0 else "Manifest hash mismatches",
        )
        if mode == "strict":
            push_check(
                checks,
                "manifest_missing_hash",
                missing_hash == 0,
                {"missingHash": missing_hash},
                None if missing_hash == 0 else "Manifest items missing sha256",
            )
            push_check(
                checks,
                "manifest_size_mismatch",
                size_mismatch == 0,
                {"sizeMismatch": size_mismatch},
                None if size_mismatch == 0 else "Manifest size mismatches",
            )

    if mode == "strict":
        sig_path = report_dir / "artifacts" / "manifest.sig"
        if not sig_path.exists():
            push_check(checks, "signature", False, None, "manifest.sig is missing")
        elif manifest_text is None:
            push_check(checks, "signature", False, None, "manifest.json required for signature verification")
        elif not os.getenv("AQ_MANIFEST_PUBLIC_KEY"):
            push_check(checks, "signature", False, None, "AQ_MANIFEST_PUBLIC_KEY is not set")
        else:
            ok, message = verify_signature_with_openssl(
                manifest_text=manifest_text,
                signature_b64=sig_path.read_text(encoding="utf-8").strip(),
                public_key_b64=os.getenv("AQ_MANIFEST_PUBLIC_KEY", ""),
            )
            push_check(checks, "signature", ok, None, None if ok else message)

    all_pass = all(check.get("pass") is True for check in checks)
    profiles_status = {
        "aepf_format": "pass" if any(c["name"] == "schema_valid" and c["pass"] for c in checks) else "fail",
        "pvip_integrity": "skip" if mode == "aepf" else ("pass" if all_pass else "fail"),
        "signature": "fail" if mode == "strict" else "skip",
        "governance": "skip",
        "certification": "skip",
    }

    return all_pass, {"mode": mode, "profiles_status": profiles_status, "checks": checks}


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="aepf-verify",
        description="Python baseline validator for AEPF/PVIP conformance modes.",
    )
    parser.add_argument("--reportDir", required=True)
    parser.add_argument("--mode", choices=["aepf", "pvip", "strict"], default="pvip")
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    mode = "strict" if args.strict else args.mode
    report_dir = Path(args.reportDir).resolve()
    if not report_dir.is_dir():
        payload = {"ok": False, "message": f"reportDir not found or not a directory: {report_dir}"}
        if args.json:
            print(json.dumps(payload))
        else:
            print(payload["message"], file=sys.stderr)
        return 2

    ok, payload = run_validator(report_dir, mode)
    body = {"ok": ok, **payload}
    if args.json:
        print(json.dumps(body))
    else:
        print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
