# Browser distribution

The [root README](../../README.md) documents the complete WebGPU app and [AGENTS.md](../../AGENTS.md) carries the cross-agent handoff.

Edit `public/`, then run `npm run build` from the repository root. The build copies the shell, produces Brotli variants and verifies the bundled WebAssembly engine and complete map against `dist/manifest.json`. It requires Node 22+ only. Native desktop code and Rust sources are omitted; engine recompilation belongs to the separate source workspace.

Run `npm start` for localhost:3000 (`PORT` overrides). WebGPU requires a desktop browser with hardware acceleration and localhost or HTTPS. The loader shows the London Eye and “Loading London...”; measured transfer/geometry/upload evidence is available inside Evidence.

## Businesses in the same app

Choose Businesses or open `/enterprise` / `/?mode=enterprise`. Both modes use the same toolbar, question capsule, cards, editor, Evidence and Light dial. The enterprise canvas reuses the full London mesh with exact OSM office projections. It has its own task and server-side `ENTERPRISE_MUBIT_API_KEY` (or the authorized local `BANK_DEMO_MUBIT_API_KEY`), with no travel-key fallback.

See [the enterprise contract and evidence](../experiments/enterprise-prospecting/README.md). A gateway receipt is not proof that a trained model improved. `npm test` passed 78 tests with one expected missing-private-checksum skip at handoff.

## Deployment caveat

The current Dockerfile omits the enterprise experiment's imported runtime files and does not provision its default interaction store. Fix the public asset/contract packaging and private writable storage, then smoke-test a container before claiming it works. Local Node execution is the verified path; this repository is not evidence of a deployed service.
