# Browser distribution

The [root README](../../README.md) documents the complete WebGPU app and [AGENTS.md](../../AGENTS.md) carries the cross-agent handoff.

Edit `public/`, then run `npm run build` from the repository root. The build copies the shell, produces Brotli variants and verifies the bundled WebAssembly engine and complete map against `dist/manifest.json`. It requires Node 22+ only. Native desktop code and Rust sources are omitted; engine recompilation belongs to the separate source workspace.

Run `npm start` for localhost:3000 (`PORT` overrides). WebGPU requires a desktop browser with hardware acceleration and localhost or HTTPS. The loader shows the London Eye and “Loading London...” (a visible message and retry if loading fails); measured transfer/geometry/upload evidence is available inside Evidence.

## Businesses in the same app

Choose Businesses or open `/enterprise` / `/?mode=enterprise`. Both modes use the same toolbar, question capsule, cards, editor, Evidence and Light dial. The enterprise canvas reuses the full London mesh with exact OSM office projections. It has its own task and server-side `ENTERPRISE_MUBIT_API_KEY` (or the authorized local `BANK_DEMO_MUBIT_API_KEY`), with no travel-key fallback.

See [the enterprise contract and evidence](../experiments/enterprise-prospecting/README.md). A gateway receipt is not proof that a trained model improved. `npm test` passed 82 tests with one expected missing-private-checksum skip on 25 October.

## Deployment

The Dockerfile copies the enterprise runtime files (contract, catalogue, images, status) and the shared `public/friendly.mjs`, and creates writable `homeward/results/` and `enterprise-prospecting/results/interactions/` directories. The Railway deployment builds from it and passes `/health`. Interaction stores in the container do not persist across redeploys.

## Errors and browsers without WebGPU

`public/friendly.mjs` turns raw failures (Mubit 5xx, timeouts, network errors, model replies that fail validation) into plain messages. The server returns them as `error`, with the redacted original as `detail`. Messages already written for people pass through unchanged. If WebGPU is missing, blocked or loses its device, `loader.mjs` shows a screen listing browsers that work instead of a stalled loader. Add `?no-webgpu` to preview it.
