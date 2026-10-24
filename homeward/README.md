# Homeward implementation guide

The current product is **London Travel**, a WebGPU London map with **Travel** and **Businesses** in the same interface. Start with [the root README](../README.md) for running it and the latest measured results, and [AGENTS.md](../AGENTS.md) for the complete agent handoff.

## Working paths

- `web/`: Hono entry point, browser shell and complete map/compiled renderer.
- `src/core.mjs` and `src/map-contract.mjs`: dated travel grounding and validated scene IDs/camera rules.
- `src/feedback.mjs` and [LEARNING.md](LEARNING.md): original-app personal edits, Luna audit, teaching receipts and saved training observations.
- `src/mubit-telemetry.mjs`: safe response-header capture for every backend Mubit attempt.
- `src/evaluation*.mjs`: serving-gated evaluation collection/reporting; the protected final set is not authorized for use.
- [Enterprise README](experiments/enterprise-prospecting/README.md): business catalogue, isolated model, shared UI and measured development failures.
- [Corrected-guide results](experiments/corrected-guide-lab/results/paired-development-report.md): completed six-case isolated diagnostic.

## Current learning state — 24 October 2026

A Greville Street answer/pin correction reached stored trainable content and saved Good feedback on the original travel task. That original task still lacks an updated-model comparison. Separately, a new isolated Bank v1 was trained from reviewed Luna examples. It changed one useful fresh answer and improved complete answer/map acceptance from 0/6 to 2/6, but answer acceptance stayed 2/6. Enterprise v1 scored 11/12 on its internal gate but 0/6 on the full fresh app contract. None of these establishes an overall win over Luna.

Bank round 2 has 38 completed Luna teaching calls, 26 locally recommended Good examples and 12 withheld. None of the round-2 console ratings has been submitted; no next model or new student test is verified. The source-only `experiments/bank-transfer-demo/round2/` holds the exact queue and frozen six-question plan. Resume instructions and model identities are in AGENTS.md. Do not recreate this batch in a clone lacking those private files.

The original final 20 remain private and untouched. App rollout/routing stays isolated from these experiments. The scheduled monitor is cancelled; only active-work checks are authorized. No export/self-hosted inference, ordinary fixed-version adapter API serving, or cost/latency advantage has been verified.

## Development and deployment

See [WebGPU build details](web/README.md). The full source workspace can rebuild the Rust-derived WASM engine; the Git distribution runs with Node and its precompiled renderer. The deliverable is browser-only. Existing Docker recipes omit enterprise runtime imports/storage and need repair plus a container smoke test before deployment.

Historical native app commands, intermediate curricula, old counts and earlier diagnostic screenshots are retained in `IMPLEMENTATION-HISTORY.md` in the source workspace. They are not current instructions. Do not use an old checkpoint's active-monitor, no-adapter or deployment claims as today's state.
