# Глубокий аудит: заявления vs реальность, стандарт, UX, дорога к 10/10

> 15 февраля 2026 | v1.4.0 | contract v5

---

## Update (16 февраля 2026)

Закрыто с момента первичного аудита:
- Добавлены `assertions_baseline` и `assertions_new` (исправлено “только new”).
- Добавлены `.dockerignore`, multi‑stage Dockerfile, `npm ci --omit=dev`.
- Добавлены SBOM (`scripts/sbom.mjs`) и подпись manifest (`scripts/manifest-sign.mjs`).
- Добавлены compliance profiles (ISO 42001, EU AI Act, NIST AI RMF).
- Добавлен reference‑сканер на энтропию токенов (`--entropyScanner`) как optional security plugin.

Осталось актуальным:
- regex‑only security не заменён на ML/LLM (остается опциональной интеграцией).
- PDF export / print stylesheet / expand assertions в UI — **сделано** (Print/PDF button + print CSS + assertions details).
- нужен warning по localStorage (filters persistence).

---

## 1. Заявления в README vs реальный код

Проверено каждое утверждение из README (711 LOC) + AEPF spec (223 LOC) + контракты.

### ✅ Полностью реализовано (соответствует заявлениям)

| # | Заявление | Где в коде | Верифицировано |
|---|-----------|-----------|:-:|
| 1 | Baseline vs New regression runs | `runner.ts:1130` → runs для обеих version | ✅ |
| 2 | Per-case replay diff (`case-<id>.html`) | `replayDiff.ts:490` + `evaluator.ts:1204` | ✅ |
| 3 | Machine report (`compare-report.json`) | `evaluator.ts:1266–1340` → полный объект | ✅ |
| 4 | Root cause attribution (7 RCA types) | `core.ts:chooseRootCause()` → `tool_failure\|format_violation\|missing_required_data\|wrong_tool_choice\|hallucination_signal\|missing_case\|unknown` | ✅ |
| 5 | Security Signals Pack | `computeSecuritySide()` в core.ts + SecurityScanner plugin | ✅ |
| 6 | `gate_recommendation: none\|require_approval\|block` | `deriveGateRecommendation()` в core.ts:265 | ✅ |
| 7 | `risk_level: low\|medium\|high` | `deriveRiskLevel()` в core.ts | ✅ |
| 8 | 7 assertion types | `evaluateOne()`: tool_required, tool_sequence, must_include, must_not_include, json_schema, evidence_refs, hallucination_signal | ✅ |
| 9 | Self-hosted, no SaaS | Никаких outbound requests в коде | ✅ |
| 10 | Portable evidence pack | PVIP verify: schema + manifest + SHA-256 + portable paths | ✅ |
| 11 | JSON Schema validation | `schemas/compare-report-v5.schema.json` (233 LOC) | ✅ |
| 12 | Manifest with SHA-256 | `manifest.ts:86` → `sha256`, `bytes`, `media_type` per item | ✅ |
| 13 | 4 redaction presets | `sanitize.ts:38` → none, internal_only, transferable, transferable_extended | ✅ |
| 14 | Retry / backoff / timeout | `runner.ts` → configurable retries (3), timeout_ms (10000), exponential backoff | ✅ |
| 15 | Concurrency control | `runner.ts` → `--concurrency N` | ✅ |
| 16 | Audit logging (JSONL) | `runner.ts` + `evaluator.ts` → `AUDIT_LOG_PATH` env | ✅ |
| 17 | Retention management | `--retentionDays N` → auto-delete old runs/reports | ✅ |
| 18 | License system (Ed25519) | `aq-license/src/index.ts:221` → sign/verify, monthly+pack, usage tracking | ✅ |
| 19 | Docker Compose pipeline | `docker-compose.yml:65` → 3 services with dep chain | ✅ |
| 20 | Agent SDK (TS + Python) | `agent-sdk/src/index.ts:112` + `scripts/agent-sdk-python/` | ✅ |
| 21 | CLI exit codes (0/1/2) | `CliUsageError` → exit 2, runtime → exit 1 | ✅ |
| 22 | Case suites (correctness/robustness) | `cases/all.json` + `summary_by_suite` | ✅ |
| 23 | Environment metadata | `--environment` CLI + `environment` in report | ✅ |
| 24 | Compliance mapping | `compliance_mapping` in schema + report + HTML | ✅ |
| 25 | Load testing | `load-test.ts:210` → concurrency, iterations, CSV/JSON output | ✅ |

### ⚠️ Заявлено, работает, но с оговорками

| # | Заявление | Реальность | Оценка |
|---|-----------|-----------|:------:|
| 1 | **Security Signals** «signals may be empty in demo» | `computeSecuritySide()` реализован, но ищет только **regex-паттерны** (sk-*, api_key, prompt injection markers). Нет ML/LLM-based scanner. Но: есть **plugin interface** `SecurityScanner` для подключения custom scanners | ✅ Честно |
| 2 | **Policy rules** (Rule1-4) | `mapPolicyRules()` маппит RCA → rule IDs. Enforcement — **Stage 2** (не заявлено для Stage 1) | ✅ Честно |
| 3 | **Stage 2/3** | Явно помечены как «QUEUED / NEXT» и «VISION» — не заявлены как реализованные | ✅ Честно |
| 4 | **assertions[] в items[]** | Исправлено: добавлены `assertions_baseline` и `assertions_new` (baseline + new) | ✅ |

### Вердикт: соответствие заявлениям → **9.5/10**

Все 25 ключевых features реализованы. Единственная неточность — `assertions[]` добавляются только для new версии, не для baseline (minor).

---

## 2. Готовность к стандарту AEPF

### Что уже формализовано

| Элемент стандарта | Файл | Статус |
|-------------------|-------|--------|
| Spec document | `docs/aepf-spec-v1.md` (223 LOC) | ✅ |
| JSON Schema | `schemas/compare-report-v5.schema.json` (233 LOC) | ✅ |
| Verifier tool | `scripts/pvip-verify.mjs` (215 LOC) — schema + manifest + SHA-256 + portability | ✅ |
| Reference implementation | Evaluator v1.4.0 | ✅ |
| Versioning strategy | `contract_version: 5`, `spec_version: "aepf-v1"`, `additionalProperties: true` | ✅ |

### Что нужно для публикации стандарта

| # | Элемент | Статус | Что нужно |
|---|---------|--------|-----------|
| 1 | **Отдельный репозиторий spec** | ❌ | Выделить `aepf-spec-v1.md` + schema в отдельный repo (как OpenAPI spec) |
| 2 | **Conformance test suite** | ⚠️ Частично | `pvip-verify.mjs` — это verifier, но нет **генератора** тестовых evidence packs для сторонних инструментов |
| 3 | **Multi-language validators** | ⚠️ Только JS | Нужен Python + Go validator (3 языка = industry standard) |
| 4 | **Spec versioning policy** | ⚠️ Неявная | Нет SEMVER для spec, нет migration guide v4→v5 |
| 5 | **Adapter examples** | ❌ | Пример: «как Promptfoo может вывести AEPF pack» |
| 6 | **Security signal taxonomy** | ✅ Есть | 7 core + 12 extended kinds — хорошо формализовано |
| 7 | **RFC-style numbering** | ❌ | Нет AEPF-001, AEPF-002 нумерации |

### Вердикт: готовность к стандарту → **7/10** (для внутреннего использования — 10/10, для публичного — нужна обвязка)

---

## 3. Наличие всех модулей для запуска

### Полный чек-лист запуска

| Модуль | Нужен? | Есть? | Проверено |
|--------|:------:|:-----:|:---------:|
| `runner` (CLI) | ✅ | ✅ 1 130 LOC | `npm -w runner run dev -- --help` |
| `evaluator` (CLI) | ✅ | ✅ 4 380 LOC | `npm -w evaluator run dev -- --help` |
| `shared-types` (contract types) | ✅ | ✅ 143 LOC | TypeScript imports work |
| `agent-sdk` (integration helper) | ✅ | ✅ 111 LOC + Python 1 файл | Both TS and Python |
| `aq-license` (offline licensing) | Опционально | ✅ 220 LOC | keygen + sign + verify scripts |
| `compare-report-v5.schema.json` | ✅ | ✅ 233 LOC | Used by pvip-verify |
| Test cases (`cases/`) | ✅ | ✅ 3 файла | cases.json, matrix.json, all.json |
| Demo agent | Для разработки | ✅ 1 671 LOC | Not needed for production |
| Scripts (demo, E2E, PVIP) | ✅ | ✅ 10 файлов | toolkit-tests.mjs runs all |
| Configs (tsconfig, eslint, prettier) | ✅ | ✅ | All present |
| Docker files | ✅ | ⚠️ Есть, но без .dockerignore | See gaps |
| README | ✅ | ✅ 711 LOC | Comprehensive |
| Docs | ✅ | ✅ 22 файла | Contracts, specs, deploy |
| **node_modules** | ✅ | ✅ | `npm install` works |

### Вердикт: полнота модулей → **10/10** — всё для запуска есть

---

## 4. UX отчёта (HTML)

### Что реализовано в HTML Report (1 130 LOC)

| UX-элемент | Реализован | Качество |
|-----------|:---------:|:--------:|
| **Dark theme** (glassmorphism-inspired) | ✅ | Отличное — radial gradients, dark background, proper contrast |
| **Summary cards** (KPI) | ✅ | Baseline/new pass, regressions, improvements, risk, coverage |
| **Per-suite breakdowns** | ✅ | Отдельные карточки per suite |
| **Security summary** | ✅ | Severity counts, top signal kinds |
| **Quality flags display** | ✅ | self_contained, portable_paths, missing/violations/large |
| **Environment + Compliance** | ✅ | Conditional rendering when present |
| **Filters** (text, suite, diff, risk, gate, status) | ✅ | 7 фильтров с dropdowns |
| **Sort** (case_id, risk, gate, diff, suite, time) | ✅ | 7 вариантов сортировки |
| **Save/restore filters** | ✅ | localStorage + URL hash encoding |
| **Shareable filter links** | ✅ | Copy URL с filter params |
| **Regression/improvement highlights** | ✅ | Orange/green left borders |
| **Evidence links** (manifest-key resolution) | ✅ | Embedded manifest index + runtime resolution |
| **Per-case assets links** | ✅ | body/meta/case.json/run.json links |
| **Responsive layout** | ✅ | `@media (max-width: 1100px)` grid collapse |
| **Offline-safe** | ✅ | Zero external dependencies in CSS/JS |
| **XSS protection** | ✅ | Proper `escHtml()` + `scriptSafeJson()` |

### UX-проблемы

| # | Проблема | Impact | Fix complexity |
|---|---------|--------|:-:|
| 1 | **Шрифт не загружается** — CSS объявляет `"Space Grotesk"` но не подключает Google Fonts (и правильно — offline!) | Низкий — fallback chain работает | ✅ Correct for offline |
| 2 | **Нет export в PDF** | Средний — compliance officers хотят PDF | Средний |
| 3 | **Нет search within case content** | Низкий — browser Ctrl+F работает | Низкий |
| 4 | **Нет print stylesheet** | Средний — печать отчёта плохо выглядит | Низкий |
| 5 | **Нет keyboard shortcuts** | Низкий | Низкий |
| 6 | **Assertions не развернуты** | Средний — только chip «assertions: N (fail: M)» | Средний |

### Вердикт UX → **8/10** — профессиональный, функциональный, offline-safe. Для enterprise: нужен PDF export + assertions expandable.

---

## 5. Почему Security/Compliance = 8/10 и что нужно для 10/10

### Что есть (то, что даёт 8)

| ✅ Есть | Реализация |
|---------|-----------|
| PII/secret regex detection | `computeSecuritySide()` — email, API keys, tokens |
| Prompt injection marker detection | Regex for «ignore previous instructions» и подобные |
| 19 signal kinds (7 core + 12 extended) | Формализовано в типах |
| Plugin interface | `SecurityScanner` type + `runSecurityScanners()` |
| Severity (4 levels) + Confidence (3 levels) | Typed enum |
| Evidence refs on signals | `manifest_key` linking |
| Redaction pipeline (4 presets) | Deep recursive + verification gate |
| Compliance mapping field | In schema + report + HTML rendering |
| AEPF spec | Формализованный формат evidence pack |
| Portability checks | PVIP verify — paths, hrefs, bundle integrity |

### Что отсутствует (что мешает 10/10)

| # | Gap | Impact | Для 10/10 нужно |
|---|-----|--------|----------------|
| 1 | **Нет pre-built compliance profiles** | Клиент сам заполняет `compliance-profile.json` | Добавить ready-made profiles для **ISO 42001**, **EU AI Act**, **NIST AI RMF** — JSON файлы с пред-маппингом |
| 2 | **Security scanner = regex only** | False positives/negatives, нет semantic analysis | Хотя бы 1 reference plugin с token-entropy scanner или YARA rules |
| 3 | **Нет SBOM** (Software Bill of Materials) | Enterprise compliance требует SBOM | `npm sbom --omit dev` или CycloneDX |
| 4 | **Нет SAST scan** в pipeline | Code security not validated | Добавить `npm audit --audit-level=high` + exit code gate |
| 5 | **Нет signed evidence packs** | Manifest integrity = SHA-256, но нет подписи автора bundle | Подписать manifest.json Ed25519 ключом (re-use aq-license) |

---

## 6. Почему Deployment = 8/10 и что нужно для 10/10

### Что есть (то, что даёт 8)

| ✅ Есть | Реализация |
|---------|-----------|
| Dockerfile | `FROM node:20-alpine`, COPY + npm install |
| docker-compose.yml | 3 services с dependency chain + health checks |
| Self-hosted deploy guide | `docs/self-hosted-deploy.md` (37 LOC) |
| CI guide | `docs/ci.md` |
| `.nvmrc` | Node 20 pinned |
| Volume mounts | runs + reports persist |

### Что отсутствует (что мешает 10/10)

| # | Gap | Impact | Для 10/10 нужно |
|---|-----|--------|----------------|
| 1 | **Нет `.dockerignore`** | `node_modules`, `.git`, `docs/internal/market/` попадают в Docker image → image bloat (~200MB+ лишнего) | Создать `.dockerignore` с node_modules, .git, docs/internal/market, apps/*/reports |
| 2 | **`npm install` вместо `npm ci`** | Non-deterministic builds; `npm ci` гарантирует lock-file consistency | Заменить `RUN npm install` → `RUN npm ci --omit=dev` |
| 3 | **Нет multi-stage build** | Final image содержит devDependencies + build tools | Stage 1: build, Stage 2: copy only prod deps |
| 4 | **Нет health check в Dockerfile** | Docker Compose has it, но standalone container — нет | `HEALTHCHECK CMD node -e "fetch(...)"` |
| 5 | **Нет resource limits** | docker-compose не задаёт memory/CPU limits | Добавить `deploy.resources.limits` |
| 6 | **Deploy doc = 37 LOC** | Минимальный — нет TLS, нет reverse proxy, нет secrets management | Расширить: Nginx/Caddy + env secrets + log rotation |
| 7 | **Нет Kubernetes manifests** | Enterprise клиенты ожидают Helm chart или K8s manifests | Helm chart MVP |

---

## 7. Почему Production stability = 8/10 и что нужно для 10/10

### Что есть (то, что даёт 8)

| ✅ Есть | Реализация |
|---------|-----------|
| Strict TypeScript | `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, no `any` |
| ESLint v9 | Flat config + @typescript-eslint |
| 45 unit tests | core.test (39), sanitize.test (3), redactionCheck.test (3) |
| E2E tests | toolkit-tests.mjs, demo-e2e.mjs |
| Contract tests | PVIP verify (schema + manifest + hash) |
| Error handling | CliUsageError, try/catch everywhere, fallback HTML renders |
| Retry/backoff/timeout | Production-grade HTTP client |
| Bounded memory | Streaming body reads, configurable large payload warnings |
| Exit codes | 0/1/2 convention |
| Audit logging | JSONL append-only |

### Что отсутствует (что мешает 10/10)

| # | Gap | Impact | Для 10/10 нужно |
|---|-----|--------|----------------|
| 1 | **Unit тесты: evaluator orchestrator** | 1 401 LOC evaluator.ts без unit тестов. Покрыто E2E, но edge cases (concurrent writes, disk full, broken JSON) не тестированы | Мок-тесты для evaluator orchestration logic |
| 2 | **Unit тесты: runner.ts** | 1 130 LOC без unit тестов | Тесты на retry logic, timeout handling, body truncation |
| 3 | **Unit тесты: htmlReport.ts** | 1 129 LOC без unit тестов | Snapshot tests для HTML output |
| 4 | **Unit тесты: aq-license** | 220 LOC без unit тестов | Тесты на expired, wrong signature, limit exceeded |
| 5 | **Test coverage metrics** | Нет --coverage config | Добавить `vitest --coverage` + порог (80%+) |
| 6 | **CLI helpers дублируются** | `normalizeArgv()`, `hasFlag()`, `getArg()` copy-pasted в runner.ts и evaluator.ts | Вынести в `packages/cli-utils` |
| 7 | **CHANGELOG automation** | `CHANGELOG.md` ведётся вручную (556 bytes) | Conventional commits + `standard-version` или `changeset` |
| 8 | **Graceful shutdown** | Нет signal handlers (SIGINT/SIGTERM) в runner/evaluator | `process.on('SIGINT', cleanup)` |
| 9 | **Error codes catalog** | Ошибки — English strings, нет кодификации | Error code enum: `AQ_ERR_001` и т.д. |

---

## 8. Сводная таблица: путь к 10/10

| Область | Текущая | Что нужно для 10/10 | Оценка трудозатрат |
|---------|:-------:|--------------------|--------------------|
| **Claims vs Reality** | 9.5 | Assertions для baseline версии | 1 час |
| **Standard readiness** | 7 → 10 | Отдельный repo + conformance suite + Python validator | 2-3 недели |
| **Module completeness** | 10 | — | ✅ Готово |
| **UX** | 8 → 10 | PDF export + expandable assertions + print CSS | 1-2 недели |
| **Security/Compliance** | 8 → 10 | Pre-built compliance profiles + SBOM + signed packs | 1-2 недели |
| **Deployment** | 8 → 10 | .dockerignore + multi-stage + npm ci + K8s | 3-5 дней |
| **Production stability** | 8 → 10 | Unit tests +coverage + CLI utils package + graceful shutdown | 2-3 недели |

---

## 9. Quick wins (1-2 дня до повышения на 1+ балл)

| # | Действие | Время | Повышает |
|---|---------|-------|----------|
| 1 | Создать `.dockerignore` | 10 мин | Deployment |
| 2 | `npm install` → `npm ci --omit=dev` в Dockerfile | 5 мин | Deployment |
| 3 | Multi-stage Dockerfile | 30 мин | Deployment |
| 4 | `vitest --coverage` + порог 60% | 20 мин | Stability |
| 5 | Assertions для baseline в `evaluator.ts:1114` | 15 мин | Claims |
| 6 | ISO 42001 compliance profile (JSON) | 2 часа | Security |
| 7 | SBOM generation script | 30 мин | Security |
| 8 | Print stylesheet в htmlReport.ts | 1 час | UX |
| 9 | Graceful shutdown handlers | 30 мин | Stability |
| 10 | CLI utils package extract | 2 часа | Stability |

**После quick wins: оценка → 9.0–9.2/10**

---

*Аудит проведён 15 февраля 2026*
*Все 45 тестов прошли (666ms)*
*Каждое заявление проверено построчно по исходному коду*
