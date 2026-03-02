import path from "node:path";
import { TextDecoder } from "node:util";
import type { ReadableStream } from "node:stream/web";
import type {
  FetchFailureClass,
  RunMeta,
  RunnerFailureArtifact,
  Version,
} from "shared-types";
import {
  attachTraceAnchorIfMissing,
  InterruptedRunError,
  writeFileAtomic,
  writeJsonAtomic,
  ensureDir,
} from "cli-utils";
import { fetchWithTimeout } from "./httpTransport";
import type { CaseFileItem, RunCaseRequest, RunnerConfig } from "./runnerTypes";
import {
  readBodySnippet,
  saveBodyStreamed,
  snippetFromBytes,
  toRel,
} from "./runnerArtifacts";
import { extractCaseHandoff, extractCaseRunMeta, isRecord } from "./runnerCli";
import {
  backoffMs,
  httpIsTransient,
  inferNetErrorKind,
  isTransientFailure,
  mkFailureResponse,
  sleep,
} from "./runnerReliability";

export async function runOneCaseWithReliability(
  cfg: RunnerConfig,
  c: CaseFileItem,
  version: Version,
  signal: AbortSignal,
  getInterruptSignalName: () => "SIGINT" | "SIGTERM"
): Promise<unknown> {
  const url = `${cfg.baseUrl}/run-case`;
  const caseRunMeta = extractCaseRunMeta(c.metadata);
  const requestRunMeta: RunMeta = {
    run_id: cfg.runId,
    incident_id: cfg.incidentId,
    ...(cfg.agentId ? { agent_id: cfg.agentId } : {}),
    ...(caseRunMeta?.parent_run_id ? { parent_run_id: caseRunMeta.parent_run_id } : {}),
  };
  const caseHandoff = extractCaseHandoff(c.id, c.metadata);
  const reqBody: RunCaseRequest = {
    case_id: c.id,
    version,
    input: { user: c.input.user, context: c.input.context },
    run_meta: requestRunMeta,
    ...(caseHandoff ? { handoff: caseHandoff } : {}),
  };

  const payload = JSON.stringify(reqBody);

  for (let attempt = 1; attempt <= Math.max(1, cfg.retries + 1); attempt++) {
    if (signal.aborted) {
      throw new InterruptedRunError("Runner", getInterruptSignalName());
    }
    const started = Date.now();

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload
        },
        cfg.timeoutMs,
        signal
      );

      const latency = Date.now() - started;

      if (!res.ok) {
        const klass: FetchFailureClass = "http_error";

        let bodyRel: string | undefined;
        let metaRel: string | undefined;
        let snippet = "";
        let truncated = false;
        let bytesWritten = 0;

        if (cfg.saveFullBodyOnError) {
          const saved = await saveBodyStreamed(cfg, c.id, version, attempt, res);
          bodyRel = saved.bodyRel;
          metaRel = saved.metaRel;
          snippet = saved.snippet;
          truncated = saved.truncated;
          bytesWritten = saved.bytes_written;
        } else {
          snippet = await readBodySnippet(res, cfg.bodySnippetBytes);
        }

        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: klass,
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          status: res.status,
          status_text: res.statusText,
          http_is_transient: httpIsTransient(res.status),
          body_snippet: snippet,
          max_body_bytes: cfg.maxBodyBytes
        };

        if (bodyRel !== undefined) artifact.full_body_saved_to = bodyRel;
        if (metaRel !== undefined) artifact.full_body_meta_saved_to = metaRel;
        if (cfg.saveFullBodyOnError) {
          artifact.body_truncated = truncated;
          artifact.body_bytes_written = bytesWritten;
        }

        artifact.is_transient = isTransientFailure(artifact);

        const msg = [
          `runner: fetch failure (${klass})`,
          `case_id=${c.id}`,
          `version=${version}`,
          `attempt=${attempt}`,
          `url=${url}`,
          `http=${res.status} ${res.statusText}`,
          `is_transient=${String(artifact.is_transient)}`,
          bodyRel ? `full_body_saved_to=${bodyRel}` : `full_body_saved_to=disabled`,
          metaRel ? `full_body_meta_saved_to=${metaRel}` : `full_body_meta_saved_to=disabled`,
          cfg.saveFullBodyOnError ? `body_truncated=${String(truncated)}` : `body_truncated=disabled`,
          cfg.saveFullBodyOnError ? `body_bytes_written=${String(bytesWritten)}` : `body_bytes_written=disabled`
        ].join("\n");

        if (attempt <= cfg.retries && artifact.is_transient === true) {
          await sleep(backoffMs(cfg.backoffBaseMs, attempt), signal);
          continue;
        }

        return mkFailureResponse(artifact, msg);
      }

      const body = res.body as unknown as ReadableStream<Uint8Array> | null;
      if (!body) {
        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: "invalid_json",
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          error_name: "RunnerError",
          error_message: "response.body is null",
          is_transient: false
        };
        return mkFailureResponse(artifact, "runner: invalid_json (response.body is null)");
      }

      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      let truncated = false;

      try {
        for (; ;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          if (total + value.byteLength <= cfg.maxBodyBytes) {
            chunks.push(value);
            total += value.byteLength;
          } else {
            const remain = cfg.maxBodyBytes - total;
            if (remain > 0) {
              chunks.push(value.slice(0, remain));
              total += remain;
            }
            truncated = true;
            break;
          }
        }
      } finally {
        if (truncated) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
        }
      }

      const merged =
        chunks.length === 0
          ? new Uint8Array(0)
          : (() => {
            const out = new Uint8Array(total);
            let off = 0;
            for (const c0 of chunks) {
              out.set(c0, off);
              off += c0.byteLength;
            }
            return out;
          })();

      const dec = new TextDecoder("utf-8", { fatal: false });
      const text = dec.decode(merged);

      if (truncated) {
        let bodyRel: string | undefined;
        let metaRel: string | undefined;
        if (cfg.saveFullBodyOnError) {
          const failuresDirAbs = path.join(cfg.outDir, "_runner_failures");
          await ensureDir(failuresDirAbs);

          const bodyAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.success_truncated.body.bin`);
          const metaAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.success_truncated.body.meta.json`);

          await writeFileAtomic(bodyAbs, merged);
          const meta = {
            kind: "runner_body_capture_success_truncated",
            case_id: c.id,
            version,
            attempt,
            max_body_bytes: cfg.maxBodyBytes,
            truncated: true,
            bytes_written: merged.byteLength,
            content_type: res.headers.get("content-type") ?? null
          };
          await writeJsonAtomic(metaAbs, meta);

          bodyRel = toRel(cfg.repoRoot, bodyAbs);
          metaRel = toRel(cfg.repoRoot, metaAbs);
        }

        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: "invalid_json",
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          error_name: "BodyTooLarge",
          error_message: `Response body exceeded maxBodyBytes=${cfg.maxBodyBytes} and was truncated; cannot parse JSON.`,
          body_snippet: snippetFromBytes(merged, cfg.bodySnippetBytes),
          max_body_bytes: cfg.maxBodyBytes,
          body_truncated: true,
          body_bytes_written: merged.byteLength,
          is_transient: false
        };
        if (bodyRel !== undefined) artifact.full_body_saved_to = bodyRel;
        if (metaRel !== undefined) artifact.full_body_meta_saved_to = metaRel;

        const msg = [
          `runner: fetch failure (invalid_json)`,
          `case_id=${c.id}`,
          `version=${version}`,
          `attempt=${attempt}`,
          `url=${url}`,
          `error=${artifact.error_name}: ${artifact.error_message}`,
          bodyRel ? `full_body_saved_to=${bodyRel}` : `full_body_saved_to=disabled`,
          metaRel ? `full_body_meta_saved_to=${metaRel}` : `full_body_meta_saved_to=disabled`
        ].join("\n");

        return mkFailureResponse(artifact, msg);
      }

      try {
        const parsed = JSON.parse(text) as unknown;
        attachTraceAnchorIfMissing(parsed, res.headers);
        if (isRecord(parsed)) {
          const existing = isRecord(parsed.runner_transport) ? parsed.runner_transport : {};
          parsed.runner_transport = {
            ...existing,
            latency_ms: latency,
            timeout_ms: cfg.timeoutMs,
            attempt,
            transport_ok: true,
          };
        }
        return parsed;
      } catch (e) {
        const klass: FetchFailureClass = "invalid_json";
        const snippet = text.length ? text.slice(0, Math.max(0, cfg.bodySnippetBytes)) : "";

        let bodyRel: string | undefined;
        let metaRel: string | undefined;

        if (cfg.saveFullBodyOnError) {
          const failuresDirAbs = path.join(cfg.outDir, "_runner_failures");
          await ensureDir(failuresDirAbs);

          const bodyAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.invalid_json.body.txt`);
          const metaAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.invalid_json.body.meta.json`);

          await writeFileAtomic(bodyAbs, text, "utf-8");
          const meta = {
            kind: "runner_invalid_json_capture",
            case_id: c.id,
            version,
            attempt,
            max_body_bytes: cfg.maxBodyBytes,
            truncated: false,
            bytes_written: Buffer.byteLength(text, "utf8"),
            content_type: res.headers.get("content-type") ?? null
          };
          await writeJsonAtomic(metaAbs, meta);

          bodyRel = toRel(cfg.repoRoot, bodyAbs);
          metaRel = toRel(cfg.repoRoot, metaAbs);
        }

        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: klass,
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          error_name: e instanceof Error ? e.name : "Error",
          error_message: e instanceof Error ? e.message : String(e),
          body_snippet: snippet,
          max_body_bytes: cfg.maxBodyBytes,
          is_transient: false
        };
        if (bodyRel !== undefined) artifact.full_body_saved_to = bodyRel;
        if (metaRel !== undefined) artifact.full_body_meta_saved_to = metaRel;

        const msg = [
          `runner: fetch failure (${klass})`,
          `case_id=${c.id}`,
          `version=${version}`,
          `attempt=${attempt}`,
          `url=${url}`,
          `error=${artifact.error_name}: ${artifact.error_message}`,
          bodyRel ? `full_body_saved_to=${bodyRel}` : `full_body_saved_to=disabled`,
          metaRel ? `full_body_meta_saved_to=${metaRel}` : `full_body_meta_saved_to=disabled`
        ].join("\n");

        return mkFailureResponse(artifact, msg);
      }
    } catch (e) {
      if (signal.aborted) {
        throw new InterruptedRunError("Runner", getInterruptSignalName());
      }
      const latency = Date.now() - started;
      const netErrorKind = inferNetErrorKind(e);
      const aborted = e instanceof Error && e.name === "AbortError";
      const timeoutLike = aborted || netErrorKind === "headers_timeout";
      const klass: FetchFailureClass = timeoutLike ? "timeout" : "network_error";

      const artifact: RunnerFailureArtifact = {
        type: "runner_fetch_failure",
        class: klass,
        net_error_kind: netErrorKind,
        case_id: c.id,
        version,
        url,
        attempt,
        timeout_ms: cfg.timeoutMs,
        latency_ms: latency,
        error_name: e instanceof Error ? e.name : "Error",
        error_message: e instanceof Error ? e.message : String(e)
      };

      artifact.is_transient = klass === "timeout" || klass === "network_error";

      const msg = [
        `runner: fetch failure (${klass})`,
        `case_id=${c.id}`,
        `version=${version}`,
        `attempt=${attempt}`,
        `url=${url}`,
        `net_error_kind=${String(artifact.net_error_kind ?? "unknown")}`,
        `is_transient=${String(artifact.is_transient)}`,
        `error=${artifact.error_name}: ${artifact.error_message}`
      ].join("\n");

      if (attempt <= cfg.retries && artifact.is_transient === true) {
        await sleep(backoffMs(cfg.backoffBaseMs, attempt), signal);
        continue;
      }

      return mkFailureResponse(artifact, msg);
    }
  }

  const fallback: RunnerFailureArtifact = {
    type: "runner_fetch_failure",
    class: "network_error",
    net_error_kind: "unknown",
    is_transient: true,
    case_id: c.id,
    version,
    url: `${cfg.baseUrl}/run-case`,
    attempt: 1,
    timeout_ms: cfg.timeoutMs,
    latency_ms: 0,
    error_name: "RunnerError",
    error_message: "unreachable"
  };
  return mkFailureResponse(fallback, "runner: unreachable state");
}

