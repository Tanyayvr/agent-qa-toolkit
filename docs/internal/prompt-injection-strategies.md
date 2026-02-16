# Prompt Injection: Strategies (Internal)

## Context
Prompt injection is widely viewed as a **persistent risk**. Even in self‑hosted setups, it cannot be fully eliminated because LLMs cannot reliably separate instructions from untrusted data.

## Strategy A — Treat LLM as Untrusted
- LLM never has direct access to sensitive actions.
- Tool broker validates and sanitizes calls.
- Strict allowlist of tools and parameters.
- **Pros:** strong systemic safety.
- **Cons:** higher integration overhead.

## Strategy B — Capability Tokens + Allowlist
- Each action requires scoped, expiring capability token.
- Only allowed tools/params are accepted.
- **Pros:** reduces blast radius.
- **Cons:** requires careful policy design.

## Strategy C — Output Validation (Deterministic Gate)
- LLM output must pass strict schema validation.
- Mandatory evidence refs (tool_result, retrieval_doc).
- **Pros:** formal guarantees.
- **Cons:** less flexibility.

## Strategy D — Retrieval Isolation
- All retrieved docs treated as untrusted data.
- Tagging/segmentation of data vs instruction.
- Optional sanitization of retrieved content.
- **Pros:** reduces indirect injection.
- **Cons:** added pipeline complexity.

## Strategy E — Multi‑Model Guard
- One model generates, another verifies.
- Layered filters (regex → ML → LLM judge).
- **Pros:** better obfuscation detection.
- **Cons:** latency + cost.

## Strategy F — Human Review on High‑Risk
- Gate `require_approval` for critical actions.
- Use evidence packs for manual audit.
- **Pros:** highest control.
- **Cons:** manual overhead.

## Recommendations (Internal, Draft)
- Short‑term: A + C + optional entropy scanner.
- Mid‑term: D + E (local ML guard).
- Long‑term: formal capability/token layer for tool invocation.

## Bridging to Our Toolkit
- Output validation already exists (assertions + schema).
- Evidence‑linked outputs already exist.
- SecurityScanner interface can host local ML guards.
- Gate logic already supports manual approval.
