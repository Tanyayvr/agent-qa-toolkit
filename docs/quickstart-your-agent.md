# Quickstart Your Agent

`quickstart` is the shortest honest path from "the demo works" to "show me this on my own agent."

It produces a **starter evidence pack** against your already-running adapter.

It does not claim:

- full qualification
- meaningful production coverage
- compliance readiness

It only proves that the toolkit pipeline can run on your agent and emit real artifacts.

## Command

```bash
npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

Supported `--systemType` values:

- `fraud`
- `credit`
- `insurance`
- `healthcare`
- `hr`
- `support`
- `general`

## What You Need First

- the repo installed locally
- a running adapter that answers:
  - `GET /health`
  - `POST /run-case`
- Node `>=20`

This command does not start your adapter for you.

## What Quickstart Does

1. Checks adapter health at `--baseUrl`
2. Creates a temporary quickstart workspace under `.agent-qa/quickstart/<profile>/`
3. Copies a curated starter case set for the selected `--systemType`
4. Runs the existing staged smoke pipeline against your adapter
5. Prints the paths to the generated `report.html` and `compare-report.json`

## What It Creates

Inside `.agent-qa/quickstart/<profile>/`:

```text
cases.json
quickstart-<profile>.env
runs/
reports/
```

The main output is a real report directory containing:

```text
report.html
compare-report.json
artifacts/manifest.json
archive/retention-controls.json
```

The starter path also records **provisional provenance values** so the current
core packaging contract can complete. Those placeholder identity fields are only
for first-run proof. Replace them with real agent/model/prompt/tools metadata in
your actual qualification flow.

## Why The Starter Cases Are Minimal

The starter suite is intentionally weak.

That is by design.

At this stage the toolkit does not know:

- your real intended use
- your real failure modes
- your real quality contract
- your real review threshold

So `quickstart` uses curated starter prompts with minimal expectations to answer only one question:

**Can this agent produce a real evidence pack through the toolkit pipeline?**

## What It Does Not Prove

`quickstart` does **not** prove:

- that your case coverage is good
- that your assertions are strong enough
- that your release gate is meaningful
- that your system is compliance-ready
- that your evidence is ready for external review
- that the recorded version metadata is production-grade

## Next Step After Quickstart

Move from starter proof to real qualification:

```bash
npm run intake:init -- --profile my-agent
npm run intake:scaffold:cases -- --profile my-agent
```

Then build a real case set and run the normal campaign path for that profile.

## Failure Mode To Expect

`quickstart` can still fail even if `/health` passes.

That usually means one of these:

- `/run-case` is not returning the expected response contract
- the adapter returns transport/runtime failures
- the adapter needs a different timeout envelope
- the adapter is alive, but not actually usable for a starter run

That is still useful information. The goal is an honest first signal, not a fake success.
