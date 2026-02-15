# Рабочие заметки и выводы из обсуждений

> Сводка ключевых решений, комментариев и согласованных направлений из рабочих сессий по стратегии Agent QA Toolkit → AEPF.

---

## 1. Общая оценка текущего состояния

**Покрытие относительно стандарта: ~75%.**

Ядро уже сильное:
- 11 типов security signals
- Gate / risk / trace integrity / redaction / portability / manifests
- Портативные evidence packs (report contract v5)
- HTML offline viewer + compare-report.json

**2 critical gap'а** (согласованы как P0):

### 1) Metadata / provenance
Без `toolkit_version`, `spec_version`, `generated_at`, `run_id` в явном разделе, evidence pack слаб для аудита. Невозможно ответить: "кто, когда, каким инструментом сгенерировал этот отчёт?"

**Решение** (согласовано):
```json
"meta": {
  "toolkit_version": "1.4.0",
  "spec_version": "v5",
  "generated_at": 1738045000000,
  "run_id": "latest",
  "report_id": "latest"
}
```

### 2) Environment linkage
Нет привязки к agent/model/prompt version — "baseline vs new" не объяснимо.

**Решение** (согласовано):
```json
"environment": {
  "agent_id": "support_ticketing_v1",
  "model": "gpt-4.1-mini",
  "prompt_version": "prompt-v12",
  "tools_version": "2026-02-12"
}
```

---

## 2. P1 gap'ы

### A) Assertions[] в compare-report.json
Сейчас теряется самое важное: почему PASS/FAIL. Assertions существуют в коде (`evaluateOne()` возвращает `assertions[]`), но **не пробрасываются** в items при сборке отчёта.

**Решение**: одна строчка кода — пробросить `nEval.assertions` в item.

**Формат** (согласован):
```json
"assertions": [
  { "name": "tool_required", "pass": false, "details": { "missing_tools": ["create_ticket"] } }
]
```

### B) Security taxonomy: core vs extended
Слишком большой taxonomy в core → сложно поддерживать. Решение:
- **Core types** (стабильные, минимальный список) — 7 kinds
- **Extended types** (доп. сигналы, versioned) — 12+ kinds

### C) Compliance mapping (ISO/NIST)
P1/P2. Это скорее "doc-слой", чем техническая блокировка. Можно добавить `compliance_mapping[]` в report (опционально) и отдельный doc.

---

## 3. Архитектурные решения

### Трёхкомпонентная архитектура (согласовано)

| # | Компонент | Тип | Роль |
|---|-----------|-----|------|
| 1 | **aepf.dev** (сайт) | Public, бесплатный | Спецификация, docs, shared cases, бенчмарки |
| 2 | **agent-qa toolkit** | Self-hosted | Runner + Evaluator + Plugins → генерация AEPF packs |
| 3 | **registry.aepf.dev** | Lightweight hub | Синхронизация cases, plugin registry, anonymized benchmarks |

**Ключевое решение**: toolkit работает на 100% без registry (air-gapped mode). Registry — value-add для network effects, не зависимость.

### Registry — не SaaS, а lightweight hub
По типу npm registry / Docker Hub. Минимальный стек: static site + Cloudflare Workers + R2. Стоимость: $0-10/мес. на старте.

---

## 4. Стратегические решения

### Self-hosted first — якорь стратегии
- Данные не покидают инфраструктуру клиента → нулевой барьер доверия
- SaaS может появиться позже, но не обязательно
- Формула: Open-core self-hosted → bottom-up adoption → enterprise contracts → optional SaaS later

### Становление стандартом — 5 механизмов
1. Владеть спецификацией (AEPF)
2. Стать протокольным слоем (middleware между testing tools и CI)
3. Network effects через shared data (case library, benchmarks)
4. Regulatory alignment (OWASP, NIST, ISO 42001)
5. Максимальный switching cost (data + workflow + knowledge + compliance lock-in)

### Формула монопольного отрыва
```
Отрыв = Switching_Cost × Network_Effects × Regulatory_Alignment
```

### 4 горизонта развития
1. **Сейчас → 6 мес**: QA Toolkit (CLI, evidence, security)
2. **6-18 мес**: Agent Testing Platform (plugins, SDK, multi-agent)
3. **18-36 мес**: AI Reliability Platform (runtime monitoring, causal debug)
4. **36+ мес**: AI Governance Hub (compliance dashboards, cross-team policy)

---

## 5. Конкурентное позиционирование

**Уникальная комбинация** (нет ни у одного конкурента):
1. Portable evidence packs — self-contained report directory
2. Self-hosted first — данные не покидают инфраструктуру
3. CI gating truth — единый `gate_recommendation` для любой CI
4. Версионированные контракты — machine-readable, стабильные API

**Конкуренты и их слабости**:
- Promptfoo: нет CI gating, нет RCA, нет evidence packs
- DeepEval: нет tool-chain analysis, нет security signals
- LangSmith: lock-in к LangChain, нет offline mode
- Arize Phoenix: monitoring-first, не CI gating
- Maxim AI: enterprise-only, нет self-hosted

---

## 6. Ценообразование (согласовано)

### Hybrid: подписка + pay-per-use

| Plan | Цена | Runs/мес | Security | Users |
|------|------|----------|----------|-------|
| Free | $0 | 10 | Regex only | 1 |
| Starter | $79/мес | 100 | + Presidio PII | 3 |
| Pro | $299/мес | 1000 | + TruffleHog + LLM Guard | 10 |
| Enterprise | Custom ($2K+) | Unlimited | + LLM Judge + custom | Unlimited |

Pay-per-use: $9.99 за один run (до 20 cases), без подписки.

Target: $50K MRR к концу первого года.

---

## 7. Реализованные изменения

По результатам gap-анализа и обсуждений были выполнены следующие технические изменения:

- **Report contract v5 → дополнен**: `meta` (provenance), `environment` (context), `assertions[]` (per-item)
- **Security signal taxonomy**: разделена на core (7 kinds) и extended (12+ kinds)
- **JSON Schema** (`compare-report-v5.schema.json`): обновлена
- **HTML report**: рендеринг meta/environment/assertions
- **Redaction pipeline**: реализован `findUnredactedMarkers()` с полной поддержкой presets
- **Manifests**: SHA-256 integrity, ThinIndex для embedded viewer

---

## 8. Что дальше (открытые вопросы)

1. **Домен**: aepf.dev / agentevidence.dev / другой?
2. **Первые early adopters**: кто будет первыми 3-5 пилотными пользователями?
3. **OWASP submission**: когда подавать proposal в OWASP AI Exchange?
4. **Конвертеры**: в каком порядке делать Promptfoo → AEPF, DeepEval → AEPF?
5. **Plugin SDK**: начинать с Presidio или TruffleHog?
6. **Registry deployment**: Cloudflare Workers + R2 или AWS Lambda + S3?
