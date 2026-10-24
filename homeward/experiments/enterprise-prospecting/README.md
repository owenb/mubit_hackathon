# Mubit Enterprise Lens

Browser-only enterprise mode: open `/?mode=enterprise` or choose **Businesses** beside the Light dial. The travel renderer, ask route, task and rollout are unchanged. Native Rust sources are not changed.

Seven verified large enterprises have actual London office nodes/building footprints downloaded from the official OpenStreetMap API. Quality was preferred to the maximum of 30. The bounded Overpass query is preserved, along with its failed mirror attempts; the successful exact-object download and geometry nodes are in `osm/`. Meta’s stale Rathbone Square identity was rejected. A building centre is not an entrance. OSM data is © OpenStreetMap contributors, ODbL 1.0. Source IDs, versions, object timestamps, download time, licence and exact public query endpoints are retained in `companies.json`. Do not renew checked dates without reviewing sources.

Six card photos are local Wikimedia thumbnails, with creator, source, licence URL and modification notes in `images.json`. The J.P. Morgan card deliberately uses a monogram fallback because the candidate search returned a generic skyline rather than an adequately identified office photo. Wikimedia filenames are not evidence for company adoption or occupancy.

## Architecture and explicit mode contract

- `GET /api/enterprise/companies`: verified company catalogue, public facts, sources and image provenance.
- `POST /api/enterprise/assess {company_id,question?}`: one Luna request, metadata-only recording; no answer cache or automatic retry. Model output cannot invent map coordinates or company IDs. Facts and estimated recurring workloads are distinct fields.
- `POST /api/enterprise/corrections {interaction_id,note}`: durable session-owned local correction. No model call.
- `POST /api/enterprise/corrections/:id/teach {}`: explicit full-recorded Luna teaching call. Duplicate and concurrent submissions do not duplicate a paid call. Ambiguous failures remain unconfirmed and are not automatically retried.
- `GET /api/enterprise/corrections/:id`: durable session-owned correction/receipt.
- `GET /api/enterprise/status`: manually observed evidence; never equates a receipt with kept review, training or a quality gain.

The existing loader exposes the exact full prepared London vertex/index buffers. `enterprise-gpu.mjs` renders those buffers with the same city WGSL shader in a separate browser WebGPU canvas. Its own camera matrix projects the company pins exactly. No approximate CSS latitude projection, synthetic office coordinates, partial city replacement, native-source edit or travel ID injection is used. The Light dial drives both views. Switching back preserves the travel canvas and its typed draft. A mode-aware fetch guard prevents the hidden travel canvas from submitting into travel teaching while enterprise mode is active. Enterprise has its own composer and explicit endpoint, so it cannot accidentally send an enterprise question into travel teaching.

For local inference use a dedicated `ENTERPRISE_MUBIT_API_KEY`, or the already-authorized isolated project environment `.env.bank-demo`. There is deliberately no fallback to the old app’s `MUBIT_API_KEY`. Credentials stay in Node and must never be committed. Example local start from the source workspace:

```sh
PORT=3003 node --env-file=.env.bank-demo homeward/web/server.mjs
```

## Teaching and honest demonstration state

The enterprise task fingerprint is `32d6df5258fb8811245e3bb48e3591b748b5963c67abf2ed5c93649b50164b58`, distinct from travel and Bank. Its instruction/schema/model contract is frozen in `contract.mjs` and `manifest.json`. The six fresh DEVELOPMENT questions/rubrics were frozen before teaching; they are excluded from all 36 teaching inputs. No original final travel question was used, edited or sent.

36 batch teaching calls completed with 36 unique gateway receipts and positively verified Luna provider responses. A browser test then saved a concrete Unilever workload-scoping correction and received a real full-recorded teaching receipt. The suggested lessons and the scripted test correction were authored by the coding assistant, not an independent sales expert. The UI invites the user to provide their own expertise.

**No enterprise adapter or fresh adapter quality improvement has yet been verified.** The Mubit console session expired during verification. The live UI says exactly this. The revised answer to a correction is labelled a Luna teaching example, never a trained improvement. The memorable final learning step remains incomplete until a real new adapter can be inspected and tested.

The baseline is a DEVELOPMENT diagnostic, not a final benchmark: five Luna responses and one retained sandbox transport failure, without retry. Manual conservative grading accepted 3/6 complete tasks; per-case reasons are private under `results/`. All paired adapter tests must use the frozen inputs without the expert note, same schema/settings, and no retrieval changes, answer cache, target copies, repair or retry. Keep model/version proof, full raw outputs and failures. A result may support an honest negative conclusion.

All Mubit HTTP attempts, including errors, use `createMubitFetch` and the safe private header journal. Provider identity uses completion model plus provider request/processing headers; a gateway receipt alone is insufficient. Adapter identity must be verified by its supported serving path. No private or invented adapter headers are assumed.

## Rehearse in under three minutes

1. Open the business overview. Select Unilever or Morgan Stanley on the map.
2. Point out the source-backed fact, the explicitly hypothetical recurring workload and the tailored pitch.
3. Choose **Teach better judgement**. Narrow the proposed first pilot; save the correction locally, then explicitly **Teach this judgement**.
4. Show the real Mubit receipt and its honest pending review/model states.
5. Only when verified, show the new adapter and its fresh development results. If unavailable or worse, state that rather than substituting the teacher answer.

No business outreach is performed. Nothing is auto-pushed or deployed by this workstream.

## Verification

The source workspace passed 74 backend/browser contract tests, including eleven new enterprise checks covering exact OSM identity/bounds, frozen-set separation, strict company/source validation, matrix projection, session ownership, persistence, and paid-call idempotence. The full map source SHA remains `b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719`. The existing compiled WASM engine is unchanged. Live browser checks cover company selection, camera focus, real Luna assessment, photo attribution, local correction save and a real Mubit teaching receipt.
