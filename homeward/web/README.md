# Browser distribution

The [root README](../../README.md) documents the complete WebGPU app.

Edit `public/`, then run `npm run build` from the repository root. The build copies the browser shell, produces Brotli variants and verifies the precompiled WebAssembly renderer and map against `dist/manifest.json`. It requires Node only.

The renderer binary is bundled; engine recompilation is outside this distribution. The native desktop app and Rust sources are omitted. Hono serves the browser and same-origin model endpoints through `app.mjs` and `server.mjs`.
