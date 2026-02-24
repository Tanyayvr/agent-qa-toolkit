<!-- /docs/format/multi-agent-bundling.md -->
# Multi‑Agent Bundling (Run Scope)

This document clarifies how evidence packs are produced when a workflow spans multiple agents or services.

## Principle: bundle = run scope

A bundle is **run‑scoped**, not trace‑scoped. The goal is to produce one portable artifact per observed run.

## Case A: Single orchestrator (fan‑out)

If one orchestrator/runner can observe the full workflow (agent→agent handoff, multi‑trace):

- Emit **one bundle**
- Include multiple `trace_id`s (and/or `workflow_id`) as **correlation anchors**
- Attach per‑step latency, model parameters, and retrieval snapshots as manifest‑indexed evidence assets

## Case B: Distributed ownership (no single observer)

If the run is split across services/teams and no single system sees the whole chain:

- Emit **multiple bundles** (one per component)
- Stitch **at review time** via correlation fields:
  - `workflow_id`
  - `parent_run_id`
  - `trace_id` (when available)

The **manifest is not for cross‑bundle stitching**. It ensures closure/integrity **inside** one bundle.

## Recommended context fields

To make cross‑bundle review practical, we recommend capturing:

- `model`: provider + model version
- `inference_params`: temperature / top‑p / max tokens
- `latency`: per‑step breakdown (not just total)
- `retrieval_context`: snippets or doc IDs as seen by the model
- `trace_id` / `span_id` (if OTel available)

