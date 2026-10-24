# Mubit Enterprise Lens

Browser-only enterprise mode: open `/enterprise` (or `/?mode=enterprise`) or choose **Businesses** beside **Travel**. The chosen mode is kept across reloads; an explicit `?mode=travel` link always opens travel. The travel renderer, ask route, task and rollout are unchanged. Native Rust sources are not changed.

Seven verified large enterprises have actual London office nodes/building footprints downloaded from the official OpenStreetMap API. Quality was preferred to the maximum of 30. The bounded Overpass query is preserved, along with its failed mirror attempts; the successful exact-object download and geometry nodes are in `osm/`. Meta’s stale Rathbone Square identity was rejected. A building centre is not an entrance. OSM data is © OpenStreetMap contributors, ODbL 1.0. Source IDs, versions, object timestamps, download time, licence and exact public query endpoints are retained in `companies.json`. Do not renew checked dates without reviewing sources.

Six card photos are local Wikimedia thumbnails, with creator, source, licence URL and modification notes in `images.json`. The J.P. Morgan card deliberately uses a monogram fallback because the candidate search returned a generic skyline rather than an adequately identified office photo. Wikimedia filenames are not evidence for company adoption or occupancy.

## Architecture and explicit mode contract

- `GET /api/enterprise/companies`: verified company catalogue, public facts, sources and image provenance.
- `POST /api/enterprise/assess {company_id,question?}`: one Luna request, metadata-only recording; no answer cache or automatic retry. Model output cannot invent map coordinates or company IDs. Facts and estimated recurring workloads are distinct fields.
- `POST /api/enterprise/corrections {interaction_id,note}`: durable session-owned local correction. No model call.
- `POST /api/enterprise/corrections/:id/teach {}`: explicit full-recorded Luna teaching call. Duplicate and concurrent submissions do not duplicate a paid call. Ambiguous failures remain unconfirmed and are not automatically retried.
- `GET /api/enterprise/corrections/:id`: durable session-owned correction/receipt.
- `GET /api/enterprise/status`: manually observed evidence; never equates a receipt with kept review, training or a quality gain.

Businesses is a mode of the main app, using the same toolbar, question capsule, suggestion row, answer card, correction editor and Evidence panel. There is no separate branded sidebar, directory landing screen or independent controls. Business browsing lives in Evidence → Businesses, and training results in Evidence → Evaluation. Travel and business editor/Evidence contents are retained separately when switching modes. The question draft is not cleared by an answer.

The browser question capsule reuses the unchanged native `ask.wgsl` shader and the same captured-backdrop, five-level blur, aura, bloom and presentation graph in `map-ask.mjs`. `city-composite.wgsl` likewise preserves the existing HDR bloom/tone-map presentation. A direct enterprise submit path avoids depending on the hidden travel renderer to deliver business responses; the hidden travel fetch guard remains in place.

The existing loader exposes the exact full prepared London vertex/index buffers. `enterprise-gpu.mjs` renders those buffers with the same city WGSL shader in a separate browser WebGPU canvas. Its own camera matrix projects the company pins exactly. Each visible office keeps its name: the overview camera fits office extents to the available map width, and a bounded collision layout moves only the screen label and draws a leader back to the exact projected office dot, rather than reducing nearby offices to anonymous dots. No approximate CSS latitude projection, synthetic office coordinates, partial city replacement, native-source edit or travel ID injection is used. The Light dial drives both views. Switching back preserves the travel canvas and its typed draft. A mode-aware fetch guard prevents the hidden travel canvas from submitting into travel teaching while enterprise mode is active. The shared composer routes enterprise questions to an explicit enterprise endpoint; the hidden travel fetch guard prevents them from entering travel teaching.

For local inference use a dedicated `ENTERPRISE_MUBIT_API_KEY`, or the already-authorized isolated project environment `.env.bank-demo`. There is deliberately no fallback to the old app’s `MUBIT_API_KEY`. Credentials stay in Node and must never be committed. Example local start from the source workspace:

```sh
PORT=3000 node --env-file-if-exists=.env --env-file-if-exists=.env.bank-demo homeward/web/server.mjs
```

## Teaching and honest demonstration state

The enterprise task fingerprint is `32d6df5258fb8811245e3bb48e3591b748b5963c67abf2ed5c93649b50164b58`, distinct from travel and Bank. Its instruction/schema/model contract is frozen in `contract.mjs` and `manifest.json`. The six fresh DEVELOPMENT questions/rubrics were frozen before teaching; they are excluded from all 36 teaching inputs. No original final travel question was used, edited or sent.

36 batch teaching calls completed with 36 unique gateway receipts and positively verified Luna provider responses. A browser test then saved a concrete Unilever workload-scoping correction and received a real full-recorded teaching receipt. The suggested lessons and the scripted test correction were authored by the coding assistant, not an independent sales expert. The UI invites the user to provide their own expertise.

The signed-in Mubit console confirms **28 kept examples and a real trained v1**, adapter `ad_lane_39642a41`, job `ftjob_89d5f355`, on `Qwen/Qwen3-4B-Instruct-2507`. This consists of 27 source-reviewed batch replies and the scripted Unilever correction, with truthful coding-assistant comments. The exact per-row training snapshot is not exposed. Calibration required 28 accepted rows (at least 12 held-out checks and at least 13 training rows), beyond the displayed nominal 25-row minimum. The internal grader passed **11/12 (91.7%)**, above the displayed 85% target. It also reports base-plus-prompt 0/12; that comparison's serving identity and exact protocol were not independently established. The internal gate is distinct from the fresh development set.

**The six fresh DEVELOPMENT tests did not establish overall improvement or deployment readiness.** All six were attempted once on the fixed enterprise v1 in Mubit’s supported Try models preview, using the exact frozen company/question user payloads and empty expert notes. Two met the substantive judgement rubric, one was uncertain and three failed. Only one matched the required app response format; five omitted `pilot_measure` or invented an additional field. None passed both the full semantic rubric and response contract. Outputs were retained without repair or retry. The model gives useful caution about private usage and spend, a complementary Morgan Stanley pilot, and a candid Google no-go, but often misses stable judgement learning, frozen fresh evaluation or latency details.

The existing Luna DEVELOPMENT diagnostic had five responses and one retained sandbox transport failure; conservative manual grading accepted 3/6 complete tasks. This is not a controlled before/after comparison. The preview exposes neither full assembled system/schema nor decoding settings, so identical API settings are not verified. In a separate post-hoc diagnostic, a new HSBC prompt with an explicit schema produced valid structure; this is excluded from the original six scores and suggests the preview setup contributes to format failures. Do not attribute all format failures to model weights or use the diagnostic as a repaired benchmark.

`observed-status.json` contains the public summary and all six raw outputs. Private `results/` retains exact frozen-input hashes, per-response model/UI evidence, the internal gate, schema check and non-independent manual grading. No original final travel questions were read, edited or sent. No cost or latency advantage has been established. App assessments still request Luna; no enterprise adapter API rollout or normal API-serving identity has been verified.

All Mubit HTTP attempts, including errors, use `createMubitFetch` and the safe private header journal. Teacher identity uses completion model plus provider request/processing headers; a gateway receipt alone is insufficient. The six adapter replies are visibly labelled Adapter 1 v1 and “Answered with Adapter 1's setup prompt” at the exact enterprise adapter URL. No private or invented adapter headers are assumed.

## Rehearse in under three minutes

1. Open the main app and choose Businesses. Select Unilever or Morgan Stanley on the map, or browse them in Evidence.
2. Point out the source-backed fact, the explicitly hypothetical recurring workload and the tailored pitch.
3. Choose **Fix this** in the main answer card. Narrow the proposed first pilot; save the correction locally in the main editor, then explicitly **Teach this judgement**.
4. Show the real Mubit receipt, then open **Evidence → Evaluation**.
5. Show the trained adapter, its 11/12 internal score and all six fresh development results. Explain the observed weaknesses and why live assessments remain on Luna. The revised teacher answer is not substituted for the adapter result.

No business outreach is performed. Nothing is auto-pushed or deployed by this workstream.

## Verification

The 24 October handoff reran 79 backend/browser tests: source 79 passed; distribution 78 passed with one expected private checksum skip. They include enterprise checks covering exact OSM identity/bounds, frozen-set separation, strict company/source validation, matrix projection, session ownership, persistence, and paid-call idempotence. The full map source SHA remains `b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719`. The existing compiled WASM engine is unchanged. Live browser checks cover company selection, camera focus, real Luna assessment, photo attribution, local correction save and a real Mubit teaching receipt.

For the original combined preview, restart after backend route changes so the current enterprise data endpoint is loaded. Start with `PORT=3000 node --env-file-if-exists=.env --env-file-if-exists=.env.bank-demo homeward/web/server.mjs` to preserve existing travel settings and add the isolated enterprise credential when that local file exists. A previously running server cannot acquire newly added routes merely because the browser JavaScript was rebuilt. No credentials are packaged or committed.
