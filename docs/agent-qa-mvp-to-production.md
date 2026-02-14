# Agent QA Toolkit: MVP → Production (Self-Hosted Now, SaaS Later)

> Этот документ фиксирует два направления развития:
> 1) **Self-hosted only** — то, что реально реализуем в ближайших релизах.  
> 2) **SaaS future** — возможная ветка, если рынок подтвердит спрос.

---

## 1. Проблема и решение (кратко)
**Проблема:** AI‑агенты недетерминированы, multi‑step, security‑риски, нет portable evidence‑pack.  
**Решение:** локальный (self‑hosted) toolkit, который превращает прогоны в портативные evidence‑пакеты и даёт CI‑gating.

---

## 2. Текущее состояние (MVP / Stage 1)
Компоненты:
- `runner` — CLI: запускает кейсы, сохраняет артефакты, redaction
- `evaluator` — сравнение baseline/new, RCA, security, HTML+JSON отчёты
- `demo-agent` — детерминированные ответы для демо
- `shared-types` — каноничные типы
- `cases` — correctness + robustness (+ matrix)

Готово:
- отчёты v5 (portable, manifest‑mapping)
- security signals + gates
- strict redaction / portability gates
- matrix robustness (timeout/500/invalid JSON/large payloads)

---

## 3. Архитектура (Self‑Hosted, реальная цель)
**Single‑tenant self‑hosted deployment:**
- Runner + Evaluator (CLI or service)
- Local storage (FS / MinIO / S3‑compatible)
- Optional security sidecars (Presidio, TruffleHog)
- No external data flow

**Принцип:** все данные остаются внутри инфраструктуры клиента.

---

## 4. Пошаговый план (Self‑Hosted Only)
Принцип: чекпойнты дают самостоятельную ценность, каждый имеет DoD (Definition of Done).

### Checkpoint 0 — Freeze MVP
- зафиксировать текущую версию и отчёты (correctness + robustness)
- критерий: отчёт открывается, `summary_by_suite` заполнен

### Checkpoint 1 — CI/E2E (DONE)
- добавить интеграционные прогоны `demo:correctness` и `demo:robustness`
- критерий: CI зелёный, отчёт валиден

### Checkpoint 1.5 — Toolkit Tests (E2E + Contract + Portability) (DONE)
- E2E test: runner → demo-agent → evaluator → validate compare-report.json schema
- Contract test: gate_recommendation == expected for fixed cases
- Portability test: report dir копируется в /tmp, HTML открывается, ссылки работают
- критерий: 3 теста проходят в CI
 - команда: `npm run test:toolkit`

### Checkpoint 2 — Integration Contract
- документ `/run-case` (schema + примеры)
- критерий: doc опубликован + ссылка в README
 - файл: `docs/agent-integration-contract.md`

### Checkpoint 2.5 — Agent Adapter SDK (Python/TS)
- минимальный SDK/adapter для реальных агентов
- поддержка: raw HTTP, LangChain/CrewAI (минимум один адаптер)
- критерий: агент можно поднять через SDK и прогнать `cases/cases.json`

### Checkpoint 3 — Security Plugins + Refactor (together)
- интерфейс `SecurityScanner`
- regex остаётся default
- подготовка под sidecar scanners (Presidio, TruffleHog)
- разнести `runner/index.ts` и `evaluator/index.ts` на модули
- критерий: старое поведение сохраняется + новый интерфейс подключаем

### Checkpoint 4 — Extended Redaction
- добавить расширенные паттерны (phone/IP/JWT/CC)
- новый preset (например `transferable_extended`)
- критерий: unit-тесты зелёные, не ломает matrix suite

### Checkpoint 5 — Self‑Hosted Packaging
- Docker‑compose или Helm chart
- air‑gapped режим (без внешних вызовов)
- критерий: полный пайплайн поднимается одной командой

### Checkpoint 6a — Audit Log
- append-only log (JSON/SQLite)
- критерий: все run/eval actions логируются

### Checkpoint 6b — TTL / Retention
- автоудаление reports старше N дней
- критерий: retention работает в тесте

### Checkpoint 6c — RBAC (после multi-user)
- локальные роли/permissions
- критерий: доступ к reports ограничен по ролям

### Checkpoint 7 — UI polish (опционально)
- улучшение UX, но без онлайновых зависимостей
- критерий: HTML открывается <2s, фильтры/поиск работают offline

---

## 5. SaaS Future (appendix, not planned)
Это **не текущая стратегия**. Ветка “SaaS” остаётся как гипотеза рынка:
- multi‑tenant
- hosted dashboard
- billing / metering
- API gateway

Если рынок подтвердится, отдельный roadmap добавляется позже.

---

## 6. Почему self‑hosted — ключевое позиционирование
- данные никогда не уходят наружу
- portable evidence packs (off‑line)
- проще пройти enterprise compliance

---

## 7. Итог
Ключевые принципы:
- self‑hosted first, данные не покидают инфраструктуру
- portable evidence packs как центральная ценность
- чёткие checkpoints вместо длинных фаз
- security layer расширяется плагинами, без SaaS‑зависимостей
