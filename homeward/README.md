# Homeward implementation guide

The current product is **London Guide**, a WebGPU London map with **Travel** and **Businesses** in the same interface. Start with [the root README](../README.md) for running it and the latest measured results, and [AGENTS.md](../AGENTS.md) for the complete agent handoff.

## Working paths

- `web/`: Hono entry point, browser shell and complete map/compiled renderer.
- `src/core.mjs` and `src/map-contract.mjs`: dated travel grounding and validated scene IDs/camera rules.
- `src/feedback.mjs` and [LEARNING.md](LEARNING.md): original-app personal edits, Luna audit, teaching receipts and saved training observations.
- `src/mubit-telemetry.mjs`: safe response-header capture for every backend Mubit attempt.
- `src/evaluation*.mjs`: serving-gated evaluation collection/reporting; the protected final set is not authorized for use.
- [Enterprise README](experiments/enterprise-prospecting/README.md): business catalogue, isolated model, shared UI and measured development failures.
- [Corrected-guide results](experiments/corrected-guide-lab/results/paired-development-report.md): completed six-case isolated diagnostic.

## Current learning state — 25 October 2026

The correction loop runs end to end:
1. **Fix this**, then a Luna audit against the dated sources (through Mubit, recording off).
2. If accepted, a fully recorded teaching call through Mubit.
3. Mubit review, then automatic training of a Qwen3-4B adapter for that task.

What that has produced so far:
- **Bank v1:** trained from 29 reviewed examples. On fresh questions, full answer and map went from 0/6 to 2/6, while answers alone stayed at 2/6.
- **The clearest before/after:** on frozen question `bank-xfer-03`, the earlier model stops at "The interchange station is Bank". Bank v1 adds "involves 290 metres via street and lifts". On 25 October we re-ran both live in Try models, once each, and got the same replies word for word.
- **Enterprise v1:** 91.7% on Mubit's own exam, and Mubit promoted it to a 10% partial rollout.
- **New "London Guide" project:** 109 teaching calls and 80 audited examples produced two more adapters, travel 50% and business 83.3%, both in silent test. On the six frozen round-2 questions, the new travel model fully passed one (step-free vs gap-free boarding), nearly passed two and failed three.

**What none of this shows:**
- An overall win over Luna.
- Fixed-version adapter serving for normal app traffic.
- Weight export.
- Any cost or latency advantage.

The original final 20 remain private and untouched. Full details, IDs and evidence locations are in [AGENTS.md](../AGENTS.md), starting at its "Final state" section.

## Development and deployment

See [WebGPU build details](web/README.md). The full source workspace can rebuild the Rust-derived WASM engine; the Git distribution runs with Node and its precompiled renderer. The deliverable is browser-only. The Dockerfile packages the integrated app, including the enterprise runtime files and writable result directories; it is deployed manually to Railway with `railway up` (https://london-guide-production.up.railway.app).

Historical native app commands, intermediate curricula, old counts and earlier diagnostic screenshots are retained in `IMPLEMENTATION-HISTORY.md` in the source workspace. They are not current instructions. Do not use an old checkpoint's active-monitor, no-adapter or deployment claims as today's state.
