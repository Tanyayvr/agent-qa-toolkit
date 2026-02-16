# Prompt Injection Mitigation: Decision Matrix (Internal)

| Option | Impact | Cost | Latency | Self‑Hosted Fit | Notes |
|---|---|---:|---:|---|---|
| Treat LLM as untrusted (tool broker) | High | Medium | Low | ✅ | Strong systemic boundary |
| Capability tokens + allowlist | High | Medium | Low | ✅ | Requires policy design |
| Output validation (schema/evidence) | Medium‑High | Low | Low | ✅ | Already in toolkit |
| Retrieval isolation | Medium | Medium | Low | ✅ | Requires RAG changes |
| Multi‑model guard (local) | High | High | Medium | ✅ | Needs local ML infra |
| Human review (gates) | High | Medium | High | ✅ | Slower, but safest |
