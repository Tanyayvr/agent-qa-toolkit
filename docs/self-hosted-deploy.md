# Self-Hosted Deploy (Docker Compose)

This guide runs the full pipeline locally using Docker Compose:
- demo-agent → runner → evaluator
- outputs written to `apps/runner/runs` and `apps/evaluator/reports`

---

## Requirements
- Docker + Docker Compose

---

## One-command run

Use Docker Desktop with Compose v2 (dev target):

```bash
docker compose up --build
```

If `docker compose` is not available, use classic Compose:

```bash
docker-compose up --build
```

When finished:
- `apps/evaluator/reports/latest/report.html`
- `apps/evaluator/reports/latest/compare-report.json`

---

## Notes
- `demo-agent` is a fixture. Replace it with a real agent service when integrating.
- The compose file uses `cases/all.json` to run correctness + robustness suites.
- The Dockerfile includes `dev` and `prod` targets. Compose uses `dev` (ts-node). For production packaging, build `prod`.

---

## Production hardening (recommended)
- Put the evaluator HTML behind an internal reverse proxy (Caddy/Nginx) with TLS.
- Store secrets in an env manager (Vault / AWS SSM / Docker secrets).
- Limit resources (CPU/RAM) per service.
- Mount data volumes on encrypted disks if required by policy.
- Disable demo-agent in production; use only your real agent service.
