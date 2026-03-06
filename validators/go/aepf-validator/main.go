package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Check struct {
	Name    string      `json:"name"`
	Pass    bool        `json:"pass"`
	Details interface{} `json:"details,omitempty"`
	Message string      `json:"message,omitempty"`
}

type ValidatorResult struct {
	Ok             bool                   `json:"ok"`
	Mode           string                 `json:"mode"`
	ProfilesStatus map[string]string      `json:"profiles_status"`
	Checks         []Check                `json:"checks"`
	Message        string                 `json:"message,omitempty"`
	Extra          map[string]interface{} `json:"-"`
}

func pushCheck(checks *[]Check, name string, pass bool, details interface{}, message string) {
	c := Check{Name: name, Pass: pass}
	if details != nil {
		c.Details = details
	}
	if message != "" {
		c.Message = message
	}
	*checks = append(*checks, c)
}

func isPortableHref(href interface{}) bool {
	s, ok := href.(string)
	if !ok || s == "" {
		return false
	}
	if strings.Contains(s, "://") {
		return false
	}
	if strings.HasPrefix(s, "/") || strings.HasPrefix(s, "\\") {
		return false
	}
	if strings.Contains(s, "..") {
		return false
	}
	return true
}

func pathInsideReport(reportDir, rel string) bool {
	abs, err := filepath.Abs(filepath.Join(reportDir, rel))
	if err != nil {
		return false
	}
	base, err := filepath.Abs(reportDir)
	if err != nil {
		return false
	}
	base = filepath.Clean(base)
	abs = filepath.Clean(abs)
	if abs == base {
		return true
	}
	return strings.HasPrefix(abs, base+string(os.PathSeparator))
}

func collectHrefFields(v interface{}, out *[]string) {
	switch vv := v.(type) {
	case []interface{}:
		for _, item := range vv {
			collectHrefFields(item, out)
		}
	case map[string]interface{}:
		for key, val := range vv {
			if s, ok := val.(string); ok && (strings.HasSuffix(key, "_href") || strings.HasSuffix(key, "_path")) {
				*out = append(*out, s)
				continue
			}
			collectHrefFields(val, out)
		}
	}
}

func asMap(v interface{}) map[string]interface{} {
	m, _ := v.(map[string]interface{})
	return m
}

func asSlice(v interface{}) []interface{} {
	s, _ := v.([]interface{})
	return s
}

func addMissingRequired(errors *[]map[string]string, obj map[string]interface{}, path string, required []string) {
	for _, field := range required {
		if _, ok := obj[field]; !ok {
			*errors = append(*errors, map[string]string{
				"path":    path,
				"message": fmt.Sprintf("missing required field '%s'", field),
			})
		}
	}
}

func validateRequiredSchema(report map[string]interface{}) []map[string]string {
	errors := []map[string]string{}

	topReq := []string{
		"contract_version",
		"report_id",
		"meta",
		"baseline_dir",
		"new_dir",
		"cases_path",
		"summary",
		"quality_flags",
		"items",
	}
	addMissingRequired(&errors, report, "$", topReq)

	meta := asMap(report["meta"])
	if meta == nil {
		errors = append(errors, map[string]string{"path": "$.meta", "message": "must be an object"})
	} else {
		addMissingRequired(&errors, meta, "$.meta", []string{"toolkit_version", "spec_version", "generated_at", "run_id"})
	}

	summary := asMap(report["summary"])
	if summary == nil {
		errors = append(errors, map[string]string{"path": "$.summary", "message": "must be an object"})
	} else {
		summaryReq := []string{
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
		}
		addMissingRequired(&errors, summary, "$.summary", summaryReq)
		tac := asMap(summary["trace_anchor_coverage"])
		if tac == nil {
			errors = append(errors, map[string]string{"path": "$.summary.trace_anchor_coverage", "message": "must be an object"})
		} else {
			addMissingRequired(&errors, tac, "$.summary.trace_anchor_coverage", []string{"cases_with_anchor_baseline", "cases_with_anchor_new"})
		}
	}

	items := asSlice(report["items"])
	if items == nil {
		errors = append(errors, map[string]string{"path": "$.items", "message": "must be an array"})
	} else {
		itemReq := []string{
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
		}
		for i, raw := range items {
			it := asMap(raw)
			if it == nil {
				errors = append(errors, map[string]string{"path": fmt.Sprintf("$.items[%d]", i), "message": "must be an object"})
				continue
			}
			basePath := fmt.Sprintf("$.items[%d]", i)
			addMissingRequired(&errors, it, basePath, itemReq)
			pe := asMap(it["policy_evaluation"])
			if pe == nil {
				errors = append(errors, map[string]string{"path": basePath + ".policy_evaluation", "message": "must be an object"})
				continue
			}
			addMissingRequired(&errors, pe, basePath+".policy_evaluation", []string{"baseline", "new"})
			for _, side := range []string{"baseline", "new"} {
				sideObj := asMap(pe[side])
				if sideObj == nil {
					errors = append(errors, map[string]string{"path": basePath + ".policy_evaluation." + side, "message": "must be an object"})
					continue
				}
				addMissingRequired(&errors, sideObj, basePath+".policy_evaluation."+side, []string{"planning_gate_pass", "repl_policy_pass"})
			}
		}
	}

	return errors
}

func sha256File(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(b)
	return hex.EncodeToString(hash[:]), nil
}

func runValidator(reportDir, mode string) ValidatorResult {
	checks := []Check{}
	result := ValidatorResult{
		Ok:     false,
		Mode:   mode,
		Checks: checks,
		ProfilesStatus: map[string]string{
			"aepf_format":    "fail",
			"pvip_integrity": "skip",
			"signature":      "skip",
			"governance":     "skip",
			"certification":  "skip",
		},
	}

	reportPath := filepath.Join(reportDir, "compare-report.json")
	manifestPath := filepath.Join(reportDir, "artifacts", "manifest.json")

	rawReport, err := os.ReadFile(reportPath)
	if err != nil {
		pushCheck(&checks, "schema_valid", false, nil, "Missing compare-report.json")
		result.Checks = checks
		return result
	}

	var report map[string]interface{}
	if err := json.Unmarshal(rawReport, &report); err != nil {
		pushCheck(&checks, "schema_valid", false, nil, "compare-report parse error: "+err.Error())
		result.Checks = checks
		return result
	}

	schemaErrors := validateRequiredSchema(report)
	if len(schemaErrors) > 0 {
		pushCheck(&checks, "schema_valid", false, map[string]interface{}{"errors": schemaErrors}, "Schema validation failed")
	} else {
		pushCheck(&checks, "schema_valid", true, nil, "")
		result.ProfilesStatus["aepf_format"] = "pass"
	}

	var manifest map[string]interface{}
	var manifestItems []interface{}
	manifestLoaded := false

	if mode != "aepf" {
		rawManifest, err := os.ReadFile(manifestPath)
		if err != nil {
			pushCheck(&checks, "manifest_present", false, nil, "Missing artifacts/manifest.json")
		} else {
			if err := json.Unmarshal(rawManifest, &manifest); err != nil {
				pushCheck(&checks, "manifest_present", false, nil, "manifest parse error: "+err.Error())
			} else {
				manifestItems = asSlice(manifest["items"])
				okItems := manifestItems != nil
				pushCheck(&checks, "manifest_present", okItems, nil, map[bool]string{true: "", false: "Invalid manifest.items"}[okItems])
				manifestLoaded = okItems
			}
		}

		hrefs := []string{}
		collectHrefFields(report, &hrefs)
		bad := 0
		for _, href := range hrefs {
			if !isPortableHref(href) || !pathInsideReport(reportDir, href) {
				bad++
			}
		}
		msg := ""
		if bad > 0 {
			msg = "Non-portable hrefs"
		}
		pushCheck(&checks, "portable_hrefs", bad == 0, map[string]interface{}{"count": bad}, msg)

		if qf := asMap(report["quality_flags"]); qf != nil {
			portableOk := qf["portable_paths"] == true
			msg := ""
			if !portableOk {
				msg = "portable_paths is false"
			}
			pushCheck(&checks, "quality_portable_paths", portableOk, nil, msg)
			if mode == "strict" {
				violations, _ := qf["path_violations_count"].(float64)
				missingAssets, _ := qf["missing_assets_count"].(float64)
				pushCheck(
					&checks,
					"quality_zero_violations",
					int(violations) == 0,
					map[string]interface{}{"path_violations_count": int(violations)},
					map[bool]string{true: "", false: "path_violations_count > 0"}[int(violations) == 0],
				)
				pushCheck(
					&checks,
					"quality_zero_missing_assets",
					int(missingAssets) == 0,
					map[string]interface{}{"missing_assets_count": int(missingAssets)},
					map[bool]string{true: "", false: "missing_assets_count > 0"}[int(missingAssets) == 0],
				)
			}
		}

		if manifestLoaded {
			missing := 0
			hashMismatch := 0
			sizeMismatch := 0
			missingHash := 0

			for _, raw := range manifestItems {
				item := asMap(raw)
				if item == nil {
					continue
				}
				rel, ok := item["rel_path"].(string)
				if !ok {
					continue
				}
				if !isPortableHref(rel) || !pathInsideReport(reportDir, rel) {
					missing++
					continue
				}
				abs := filepath.Join(reportDir, rel)
				st, err := os.Stat(abs)
				if err != nil || st.IsDir() {
					missing++
					continue
				}
				sha, hasSha := item["sha256"].(string)
				if !hasSha || sha == "" {
					missingHash++
				}
				if bytes, ok := item["bytes"].(float64); ok {
					if int64(bytes) != st.Size() {
						sizeMismatch++
					}
				}
				if hasSha && sha != "" {
					actual, err := sha256File(abs)
					if err != nil || actual != sha {
						hashMismatch++
					}
				}
			}

			pushCheck(
				&checks,
				"manifest_missing_assets",
				missing == 0,
				map[string]interface{}{"missing": missing},
				map[bool]string{true: "", false: "Missing manifest assets"}[missing == 0],
			)
			pushCheck(
				&checks,
				"manifest_hash_mismatch",
				hashMismatch == 0,
				map[string]interface{}{"hashMismatch": hashMismatch},
				map[bool]string{true: "", false: "Manifest hash mismatches"}[hashMismatch == 0],
			)
			if mode == "strict" {
				pushCheck(
					&checks,
					"manifest_missing_hash",
					missingHash == 0,
					map[string]interface{}{"missingHash": missingHash},
					map[bool]string{true: "", false: "Manifest items missing sha256"}[missingHash == 0],
				)
				pushCheck(
					&checks,
					"manifest_size_mismatch",
					sizeMismatch == 0,
					map[string]interface{}{"sizeMismatch": sizeMismatch},
					map[bool]string{true: "", false: "Manifest size mismatches"}[sizeMismatch == 0],
				)
			}
		}
	}

	if mode == "strict" {
		sigPath := filepath.Join(reportDir, "artifacts", "manifest.sig")
		if _, err := os.Stat(sigPath); err != nil {
			pushCheck(&checks, "signature", false, nil, "manifest.sig is missing")
		} else if os.Getenv("AQ_MANIFEST_PUBLIC_KEY") == "" {
			pushCheck(&checks, "signature", false, nil, "AQ_MANIFEST_PUBLIC_KEY is not set")
		} else {
			pushCheck(&checks, "signature", false, nil, "signature verification is not implemented in go baseline")
		}
		result.ProfilesStatus["signature"] = "fail"
	}

	allPass := true
	for _, c := range checks {
		if !c.Pass {
			allPass = false
			break
		}
	}
	if mode != "aepf" {
		if allPass {
			result.ProfilesStatus["pvip_integrity"] = "pass"
		} else {
			result.ProfilesStatus["pvip_integrity"] = "fail"
		}
	}
	result.Ok = allPass
	result.Checks = checks
	return result
}

func main() {
	reportDir := flag.String("reportDir", "", "Path to report directory")
	mode := flag.String("mode", "pvip", "Validation mode: aepf|pvip|strict")
	strict := flag.Bool("strict", false, "Use strict mode")
	jsonOut := flag.Bool("json", false, "Output JSON")
	flag.Parse()

	if *strict {
		*mode = "strict"
	}
	if *mode != "aepf" && *mode != "pvip" && *mode != "strict" {
		msg := fmt.Sprintf("Invalid --mode: %s. Use aepf|pvip|strict", *mode)
		if *jsonOut {
			fmt.Println(`{"ok":false,"message":"` + msg + `"}`)
		} else {
			fmt.Fprintln(os.Stderr, msg)
		}
		os.Exit(2)
	}
	if *reportDir == "" {
		msg := "Usage: go run . --reportDir <path> [--mode aepf|pvip|strict] [--strict] [--json]"
		if *jsonOut {
			fmt.Println(`{"ok":false,"message":"` + msg + `"}`)
		} else {
			fmt.Fprintln(os.Stderr, msg)
		}
		os.Exit(2)
	}
	if st, err := os.Stat(*reportDir); err != nil || !st.IsDir() {
		msg := "reportDir not found or not a directory: " + *reportDir
		if *jsonOut {
			out, _ := json.Marshal(map[string]interface{}{"ok": false, "message": msg})
			fmt.Println(string(out))
		} else {
			fmt.Fprintln(os.Stderr, msg)
		}
		os.Exit(2)
	}

	result := runValidator(*reportDir, *mode)
	if *jsonOut {
		out, _ := json.Marshal(result)
		fmt.Println(string(out))
	} else if result.Ok {
		fmt.Println("PASS")
	} else {
		fmt.Println("FAIL")
	}

	if result.Ok {
		os.Exit(0)
	}
	os.Exit(1)
}
