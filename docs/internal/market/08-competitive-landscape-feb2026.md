# Конкурентный ландшафт: февраль 2026

> Актуальный анализ рынка. Кто двигается в нашу сторону, кто уже там, и где окно возможностей.

---

## ⚡ TL;DR: Главные выводы

> [!CAUTION]
> **Рынок быстро консолидируется.** За последние 6 месяцев три ключевых конкурента сделали значительные шаги в нашу сторону. Окно для AEPF как стандарта ещё открыто, но сужается.

1. **Galileo** — главная угроза. $68M funding, бесплатная Agent Reliability Platform с RCA и guardrails. HP, Twilio, Reddit уже клиенты
2. **Promptfoo** — добавил Golden Traces (янв. 2026) для regression testing агентов в CI. Прямо наша территория
3. **DeepEval v3.0** — component-level метрики для агентов + облачная платформа Confident AI
4. **Mindgard** — CI gating для AI security, попал в Gartner AI TRiSM (янв. 2026)
5. **Открытого стандарта evidence pack НЕТ** — AEPF-подобной спецификации не создал никто. Это наше окно

---

## 🔴 Критические угрозы (прямые конкуренты, двигающиеся к нам)

### 1. Galileo AI — «Agent Reliability Platform»

| Параметр | Детали |
|----------|--------|
| **Funding** | $68M total ($45M Series B, Oct 2024). Investors: Scale Ventures, Databricks, Premji, Amex, Citi, ServiceNow, SentinelOne |
| **Продукт** | Agent Reliability Platform (запущена Jul 2025, **бесплатно для разработчиков**) |
| **Клиенты** | HP, Twilio, Reddit, Comcast |
| **Ключевые фичи** | Graph Engine (визуализация decision paths), Insights Engine (automatic failure detection + **RCA**), agentic metrics, real-time **guardrails** |
| **Технология** | Luna-2 SLM для real-time eval. Совместим с CrewAI, LangGraph, OpenAI Agent SDK |
| **Модель** | Бесплатная платформа (PLG) → enterprise upsell |

> [!WARNING]
> **Что пересекается с нами:** RCA (root cause analysis), failure detection, agent metrics, CI-интеграция. Но: **нет evidence packs, нет self-hosted, нет portable offline reports, нет CI gating truth (gate_recommendation)**. Galileo — SaaS-only observability + eval. Наш moat: self-hosted + portable evidence + CI gating.

---

### 2. Promptfoo — «Golden Traces» (январь 2026!)

| Параметр | Детали |
|----------|--------|
| **Модель** | OSS + Cloud. Free / $49-499/мес |
| **Новое (Jan 2026)** | **Golden Traces** — frozen records of successful agent runs. «Making agents replayable and testable in CI» |
| **Red teaming** | Agent-specific: risky actions, data exfiltration paths, permission misuse |
| **Партнёр** | TrueFoundry (late 2025) — Promptfoo evaluations как guardrails в AI Gateway |
| **Фокус** | CLI-based coding agents, regression testing, latency/cost analysis |

> [!WARNING]
> **Что пересекается с нами:** Golden Traces — это их версия regression diff для агентов. Captures sequential tool calls + reasoning steps. Это **прямой удар** по нашей baseline-vs-new модели. Но: **у них нет evidence pack формата, нет security signals taxonomy, нет portable self-contained reports, нет gate_recommendation**. Они тестируют, но не создают audit-ready артефакты.

---

### 3. DeepEval v3.0 + Confident AI

| Параметр | Детали |
|----------|--------|
| **Модель** | OSS framework + Confident AI (облачная платформа). Free / $39-299/мес |
| **Новое (v3.0)** | **Component-level granularity** — метрики на каждый шаг агента (tools, memories, retrievers). Agent-specific metrics: tool correctness, argument correctness, step efficiency, plan adherence |
| **Тест-кейсы** | «Goldens» — precursors to test cases. Multi-turn support. Cloud платформа как централизованный registry для datasets |
| **Мониторинг** | Async production evaluations, trend tracking, quality degradation detection |
| **CI/CD** | Интеграция в pipelines |

> [!IMPORTANT]
> **Что пересекается с нами:** Component-level agent eval, CI integration, centralized test case management. Confident AI платформа работает как де-факто registry. Но: **нет portable evidence packs, нет offline mode, нет self-hosted, нет security signal detection (PII/secrets/injection), нет gate_recommendation**. DeepEval оценивает качество, но не создаёт audit trail.

---

## 🟠 Серьёзные конкуренты (смежные, но сближающиеся)

### 4. Mindgard — AI Security + CI Gating

| Параметр | Детали |
|----------|--------|
| **Признание** | Gartner AI TRiSM report (Jan 2026) — среди top-funded AI security startups |
| **Продукт** | Automated AI red teaming для LLMs, AI agents, multimodal models |
| **CI gating** | CLI с exit codes → **build gating по порогу рисков**. GitHub Action для CI/CD |
| **Отчёты** | Compliance-ready reports, MITRE ATLAS + OWASP Top 10 mapping |
| **Compliance** | SOC 2 Type II, GDPR, ISO 27001 ожидается в начале 2026 |

> **Пересечение:** CI gating для AI security — очень близко к нашему `gate_recommendation`. Но: **нет agent QA (regression testing), нет evidence packs, нет RCA, нет case-by-case analysis**. Mindgard — чистый security scanner, не QA toolkit.

---

### 5. Giskard — Red Teaming + Compliance

| Параметр | Детали |
|----------|--------|
| **Продукт** | OSS Python library + Hub (enterprise). Automated vulnerability detection |
| **Agent testing** | Continuous red teaming с adversarial queries |
| **RAG** | RAGET — toolkit для оценки RAG-компонентов |
| **Compliance** | Позиционируется как evidence generator для ISO 42001. Vulnerability reports как audit artifacts |
| **Timeline** | EU AI Act полностью вступает в силу Aug 2026 → Giskard позиционируется как enabler |

> **Пересечение:** Compliance-oriented testing, ISO 42001 alignment. Но: **нет regression testing, нет baseline-vs-new, нет CI gating, нет portable offline evidence packs**. Giskard тестирует безопасность, но не QA workflow.

---

### 6. Patronus AI — Agent Evaluation

| Параметр | Детали |
|----------|--------|
| **Фокус** | Hallucination frequency, context relevance, output correctness |
| **Agent eval** | Multi-agent tracking, agent dialogues, performance data, iterative feedback loops |
| **Технология** | Generative Simulators для создания eval environments |

> **Пересечение:** Agent evaluation, multi-agent. Но: **нет CI gating, нет evidence packs, нет security signals, нет self-hosted**.

---

### 7. Splx AI — AI Red Teaming

| Параметр | Детали |
|----------|--------|
| **Фокус** | Automated pentesting для conversational AI и AI agents |
| **Продукт** | Red teaming results → actionable insights. «Analyze with AI» для интерпретации результатов |
| **Вывод** | Показали что default configs моделей **недостаточны для enterprise** → нужен hardening |

> **Пересечение:** AI security testing. Чистый security инструмент, не QA.

---

### 8. LangSmith — Agent Builder GA (январь 2026)

| Параметр | Детали |
|----------|--------|
| **Новое (Jan 2026)** | Agent Builder — GA. Построение агентов из natural language descriptions |
| **Eval** | Built-in agent tracing, tool call visualization, integrated eval pipelines |
| **Сравнение** | Enhanced experiment comparison (Jan 2026) — side-by-side regressions/improvements |
| **События** | «Interrupt 2026» AI Agent Conference — May 13-14, 2026 |
| **Ограничение** | LangChain-ecosystem first (хотя поддерживает OpenTelemetry) |

> **Пересечение:** Experiment comparison = regression diff. Eval pipelines. Но: **SaaS-only, LangChain lock-in, нет portable evidence, нет security signals, нет CI gating**.

---

## 🟢 Стандарты и протоколы: наша ниша ПУСТА

| Стандарт/Протокол | Что делает | Evidence Pack? | CI Gating? | Наш конкурент? |
|-------------------|-----------|:-:|:-:|:-:|
| **OASF** (Open Agentic Schema Framework) | Schemas для agent capabilities | ❌ | ❌ | Нет — interop |
| **A2A** (Google → Linux Foundation) | Agent-to-agent communication | ❌ | ❌ | Нет — protocol |
| **MCP** (Anthropic) | Model ↔ tools connection | ❌ | ❌ | Нет — integration |
| **AGENTS.md** (OpenAI / AAIF) | Agent instruction format | ❌ | ❌ | Нет — config |
| **LangChain Agent Protocol** | Cross-framework agent API | ❌ | ❌ | Нет — interop |
| **OAP** (Open Agent Protocol) | Agent management | ❌ | ❌ | Нет — orchestration |

> [!TIP]
> **КРИТИЧЕСКИЙ ВЫВОД: Ни один протокол или стандарт не покрывает evidence packs для тестирования агентов.** Все протоколы про interop и communication. Никто не стандартизирует *результаты тестирования и аудита*. **AEPF — единственная попытка занять эту нишу.**

---

## 📊 Сводная матрица: кто что покрывает

| Возможность | Agent QA | Galileo | Promptfoo | DeepEval | Mindgard | Giskard | LangSmith |
|-------------|:--------:|:-------:|:---------:|:--------:|:--------:|:-------:|:---------:|
| **Regression diff** (baseline vs new) | ✅ | ❌ | 🟡 Golden Traces | ❌ | ❌ | ❌ | 🟡 experiment comparison |
| **Portable evidence packs** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CI gate_recommendation** | ✅ | ❌ | ❌ | ❌ | 🟡 exit codes | ❌ | ❌ |
| **Root Cause Analysis** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Security signals** (PII, secrets, injection) | ✅ | ❌ | 🟡 red-team only | ❌ | ✅ | ✅ | ❌ |
| **Self-hosted / offline** | ✅ | ❌ | 🟡 CLI OSS | 🟡 CLI OSS | ❌ | 🟡 OSS lib | ❌ |
| **Compliance mapping** (ISO/NIST) | 🟡 planned | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **HTML offline viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Open evidence standard** | 🟡 AEPF planned | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Agent-specific metrics** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Multi-agent** | ❌ planned | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Shared test case registry** | 🟡 planned | ❌ | ❌ | 🟡 Confident AI | ❌ | ❌ | ❌ |
| **Free tier** | ✅ self-hosted | ✅ | ✅ | ✅ | ❌ | ✅ OSS | ✅ |

---

## 🎯 Что это значит для нас

### Угрозы, требующие реакции

| # | Угроза | Уровень | Наш ответ |
|---|--------|---------|-----------|
| 1 | Galileo бесплатно раздаёт RCA + guardrails | 🔴 Высокий | Усилить **evidence pack portability**. Galileo = SaaS lock-in. Наш козырь = self-hosted + offline |
| 2 | Promptfoo Golden Traces для CI regression | 🔴 Высокий | **Ускорить AEPF публикацию**. Promptfoo может стать де-факто, если мы не предложим стандарт |
| 3 | DeepEval component-level agent metrics | 🟠 Средний | Добавить **assertions[]** в отчёт (уже в плане). Наш формат должен быть богаче |
| 4 | Mindgard CI gating в Gartner | 🟠 Средний | Маппинг AEPF → MITRE ATLAS / OWASP. Позиционировать security как часть QA, не отдельный scan |
| 5 | EU AI Act вступает в силу Aug 2026 | 🟡 Возможность | Compliance templates для AEPF evidence packs. **6 месяцев до дедлайна** |

### Наши уникальные преимущества (никто не копирует)

1. **Portable evidence pack** — self-contained directory с HTML viewer + JSON + manifests + SHA-256 integrity. **Ни один конкурент этого не делает**
2. **Единый gate_recommendation** — `none | require_approval | block`. Все остальные: exit codes, scores, dashboard alerts
3. **Self-hosted first** — полностью air-gapped mode. Galileo/LangSmith/Confident AI = SaaS only
4. **Contract versioning** — machine-readable schema v5 с backwards compatibility
5. **Open AEPF standard** — потенциальный первоходец. Никто не создал evidence pack спецификацию

### Рекомендуемые приоритеты (обновлённые)

| # | Действие | Срок | Почему сейчас |
|---|----------|------|---------------|
| 1 | Публикация AEPF spec v1.0 на GitHub | **ASAP, март 2026** | Promptfoo Golden Traces может стать де-факто стандартом если мы промедлим |
| 2 | Конвертер Promptfoo → AEPF | **Q1 2026** | Показать: «Golden Traces совместимы с AEPF» |
| 3 | ISO 42001 / EU AI Act compliance templates | **До Aug 2026** | EU AI Act enforcement = Aug 2026. 6 месяцев |
| 4 | Assertions[] в compare-report.json | **Март 2026** | DeepEval v3.0 уже показывает component-level метрики |
| 5 | OWASP AI Exchange proposal | **Апрель 2026** | Mindgard уже маппит на OWASP Top 10. Нужно быть в OWASP до них |

---

*Дата исследования: 15 февраля 2026*
*Источники: official websites, Gartner reports, product changelogs, GitHub, funding announcements*
