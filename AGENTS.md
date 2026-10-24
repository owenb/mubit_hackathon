# Homeward / London Travel: agent handoff

Updated 24 October 2026. **This copy is in the browser Git distribution. Private Bank experiment files referenced below exist only in the original source workspace; do not assume a fresh clone contains them.** Read this before making calls, changing routing or continuing training. This file is intended for any coding agent; it does not depend on Codex conversation history. All platform state below is a dated observation, not a live guarantee.

## Start here

The user is committed to this product. The priority is a convincing, truthful demonstration of **correction → trained model update → better answers on fresh questions**. A teacher copying a supplied target is not that demonstration. The current product works, but an overall quality win over Luna has not been established.

Latest backend state: the isolated Bank model exists and answers in Mubit Try models. Its first six-question comparison had a narrow improvement but answer acceptance stayed **2/6 → 2/6**. Round 2 has **38 completed Luna teaching calls, 26 locally recommended Good examples, 12 withheld, zero submitted round-2 ratings and zero new student evaluations**. No next version is verified. Do not rerun the teaching batch.

Last access check: **2026-10-24 19:14:54 UTC / 20:14:54 BST**. The console was signed out. Previously it reported an engine timeout; recovery is unverified even though the inference gateway had worked. A sign-in request was already made. Wait for the user to confirm restored sign-in before inspecting that console again; do not replay cookies or seek another authenticated access path.

Read these source-workspace files first:

1. `homeward/experiments/bank-transfer-demo/round2/status.json` — latest active experiment and access state.
2. `homeward/experiments/bank-transfer-demo/round2/results/curation-pending.json` — exact 38 receipts and audit recommendations; select the 26 Good recommendations for review.
3. `homeward/experiments/bank-transfer-demo/LEARNING-PROOF.md` — completed first-round evidence and limitations.
4. `homeward/experiments/enterprise-prospecting/observed-status.json` and `HANDOFF.md` — separate business task and current integrated UI.
5. `homeward/data/backend-readiness.json`, `homeward/data/development-learning.json` and `homeward/results/travel/mubit-status.json` — older original-app observations. Do not mistake these for Bank round-2 status.

The user requested publication of the latest WebGPU app and this handoff to `owenb/mubit_hackathon`, excluding credentials, private results and the final 20. That publication does not authorize another paid batch, browser session, deployment or final benchmark.

## Two directories, different purposes

- **Full source workspace:** `/Users/owen/Work/Hackathons/Mubit`. It is **not a Git repository**. It contains private ignored experiment results, environment files, the protected final set, legacy native code and the WebGPU source build.
- **Git / browser distribution:** `/private/tmp/mubit-webgpu-publish`. Remote: `git@github.com:owenb/mubit_hackathon.git`, public URL `https://github.com/owenb/mubit_hackathon`. It ships the WebGPU app, precompiled WASM and the complete map; no native Rust source/application. Before the publication commits, local HEAD was `ccb4e4f` (enterprise flow hardening). A fresh fetch found nine local commits ahead of `origin/main` and no remote-only commits. Use Git history/current remote state for the final publication revision.
- The distribution's `package.json`, Dockerfile, build script and `homeward/src/core.mjs` deliberately differ from source. Never blindly mirror the whole source directory over it.
- The Bank experiment and raw private results are **not in the Git distribution**. A fresh clone alone cannot resume its 26 receipt reviews or reproduce the captures. Continue from this source workspace, or arrange a private transfer of that experiment and its dependencies. Do not publish private payloads to solve this. Credentials must be supplied separately.
- The publication includes the reviewed visual changes in `homeward/web/public/{appearance,experience,index,loader,style}.*`, matching built files, and updated documentation. Future work may be concurrent: inspect `git diff` and preserve other edits; never use a blanket restore, clean, add or overwrite.
- `/private/tmp` is temporary storage. Preserve needed Git commits and private source artifacts before moving machines. Do not assume a local commit was pushed.

## User constraints that persist

- **Luna only (`gpt-6-luna`)** for teaching, review/model calls and delegated curriculum work. Do not substitute Astra. The enterprise implementation thread was explicitly requested with GPT 6.1; that was not permission to use other teachers.
- **WebGPU UI only.** Do not resume the native desktop app or publish native sources. Existing Rust is source-build provenance for the WASM renderer; enterprise UI changes are browser code.
- **Keep the app isolated.** No task-wide manual rollout, app contract/routing change or global project setting as a training workaround. Bank and enterprise have different tasks but share an isolated project: global settings can affect both.
- **The final 20 questions remain untouched.** Do not read their contents, edit, run, train on, upload or copy them into a development gate. Source path: `homeward/data/travel-final-heldout.json`. SHA-256: `a8a19175c5ec7b3b0309b897ef4c92ddf19f797634ad141f6f3b19e6b01abe91`. Byte-hash checks are allowed. The public distribution intentionally omits it. A final run needs fresh explicit authorization and verified comparable serving first.
- Keep frozen development inputs/rubrics out of teaching too. Prior development questions are used cases, not a renewable fresh benchmark. Record failed attempts, avoid answer repair/retry/cherry-picking, and disclose any post-hoc diagnostic separately.
- Record safe response headers for **every Mubit HTTP attempt**, including errors. Requested model names and receipts do not prove an adapter served. Never invent fixed-version model strings or routing headers.
- **No scheduled monitor.** The user cancelled it because scheduled turns flooded the chat, then explicitly chose checks only during active work. Make meaningful read-only console checks within roughly 110 seconds while actively using it. Scheduling/keepalive scripts must not be restored. If signed out, ask once, record the blocker and wait. Do not weaken authentication.
- Do not send messages to founders, businesses or other people without explicit authorization. Existing coordination permission covered the London map visuals workstream; it was subsequently asked to stop distracting backend work. Do not interfere with the separate SF project or new-ideas chat.
- Never print, commit, copy into browser code or transmit API key values. `.env`, `.env.bank-demo`, raw headers, session stores and private results remain private. Safe environment variable names and public task IDs are fine in docs.
- Work toward an honest live demo, not a predetermined Mubit victory. No unmeasured cost/latency claims, no claim of local inference or exported weights already running, no saved replay presented as live inference.

## Product and judging criteria

Homeward is the project/task name; **London Travel — London, in your words** is the current UI branding. A full-screen London WebGPU map supports travel questions, dated source evidence, verified pins and human corrections. **Businesses** is a mode of the same UI: locate large London firms, assess a hypothetical recurring LLM workload, propose how Mubit might help, and teach an operator's correction.

Four equally weighted hackathon criteria: use of Mubit (correction becomes an update), usefulness (a real recurring task), technical execution (works and withstands questions), and a clear live demo. The bot recommended a three-minute story, one persona, dated sources, a real later answer changed by learning, a clean-clone path and smaller regular commits. Keep optional direct-OpenAI scripts out of the product/demo.

Travel operators' accumulated local knowledge motivates sovereignty, ownership, reliability, optional hosting/local execution and some resilience to future provider access restrictions. These are goals, not established independence or quality measurements. Potential customers: Citymapper, London hotel concierges, theatre websites; no partnership is claimed. Founders said weights/adapter export is possible, but a completed export and self-hosted inference have not been demonstrated.

## Architecture and current UX

- Hono/Node serves same-origin WebGPU assets and APIs on port 3000 (`PORT` overrides). `/enterprise` or `/?mode=enterprise` selects Businesses; `/?mode=travel` forces Travel. Mode is remembered.
- Source corpus is a local dated snapshot, not live web search on every question. Do not refresh dates without reviewing sources. Current lift requests use a separate TfL feed; absence of an outage notice is not proof a lift works. Do not promise current departures, bookings or an audited accessible journey.
- Travel returns strict JSON: `answer`, `response_kind`, `static_access`, `source_ids`, `scene`. Scene commands include `keep`, `city`, `focus`, `fit`, `closer`, `wider`, with at most six verified IDs and `origin`/`destination`/`context` roles. Backend validation resolves coordinates. The model does not train on the London mesh or invent coordinates/routes.
- Street-to-platform, platform-to-train and interchange are different claims. A station pin is not an accessible entrance. Waterloo & City and Victoria may be line names, not requested destinations. Canary Wharf has distinct line-specific stations.
- Travel model calls explicitly request Luna via `https://api.mubit.ai/openai/v1`. Normal app calls are full-recorded. Cache is opt-in (`use_cache: true`); a saved answer is not a model call or learning.
- The app distinguishes identified Luna, unknown route and cached answer. Its evidence/status reports are timestamped files, not live polling of model training. A single labelled recovery may exist in interactive travel; evaluation must not use it.
- Travel correction UX: **Fix this → Edit wording / add or remove pins → Use on my map** for a personal edit. **Share as a correction… → reason → Send correction** invokes a Luna audit (recording off), then a full-recorded teacher example. The target is supplied to the teacher. Exact copying demonstrates fidelity only.
- Session-owned travel stores live in `homeward/results/feedback/`. The httpOnly/sameSite cookie is ownership scoping, not full user authentication. Losing the cookie loses browser access to that history, not the files.
- `homeward/src/mubit-telemetry.mjs` journals safe response headers under `homeward/results/mubit-headers/`, no prompt/answer bodies or outbound secrets. Unknown identity fields remain unverified until their contract is established. `npm run homeward:headers` is offline.
- Full city: 183,550 source features; 5,121,079 vertices; 8,813,310 indices; approximately 199 MB GPU geometry. No simplified/partial map. Database 21,910,636 bytes, Brotli transfer 7,992,181 bytes. Map SHA-256 `b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719`.
- Worker verifies/decompresses/builds geometry; bounded GPU upload. Current loading UI is a rotating London Eye and “Loading London...”; actual metrics live in Evidence. The old phase labels are historical implementation detail.
- The main question capsule retains exact drafts, with glow during work. Travel and Businesses share cards, correction editor, Evidence, examples and the Light dial. Do not reintroduce a separate enterprise sidebar/branding/composer. Light spans 270 degrees, values 0–3, and drives both views.
- Enterprise renders the same complete geometry with a browser WebGPU camera and exact matrix-projected pins. Collision-managed labels use leaders to the true office dots. No approximate CSS latitude projection or travel catalogue-ID injection.

Important code: `homeward/web/{app,server}.mjs`, `homeward/web/public/`, `homeward/src/{core,map-contract,feedback,inference,mubit-telemetry,evaluation,demo-evidence}.mjs`, `homeward/src/enterprise-{service,model,routes}.mjs`, `homeward/experiments/enterprise-prospecting/contract.mjs`.

## Credentials, run and test

Travel: `MUBIT_API_KEY`, optional `MUBIT_BASE_URL`. Enterprise: `ENTERPRISE_MUBIT_API_KEY`, falling back only to `BANK_DEMO_MUBIT_API_KEY`, **never the travel key**. Local `.env.bank-demo` holds the isolated project's key and `BANK_DEMO_ISOLATED_PROJECT_ID=ws-f6fde7f8cb6510fa`. Never replace the app key. `OPENAI_API_KEY` is optional for old direct comparison scripts; it does not configure Mubit provider credentials. Configure Mubit starter credit/provider access in its console.

Source workspace (Node 22+, Rust only when rebuilding the supplied renderer):

```sh
npm ci
rustup target add wasm32-unknown-unknown
npm run build
PORT=3000 node --env-file-if-exists=.env --env-file-if-exists=.env.bank-demo homeward/web/server.mjs
node --test homeward/tests/*.test.mjs homeward/web/tests/*.test.mjs
```

Git distribution (Node 22+, no Rust):

```sh
npm ci
# Copy .env.example to .env only if .env does not already exist; fill keys privately.
npm run build
npm start
npm test
```

The distribution build verifies bundled WASM/map hashes and rebuilds the editable shell. Source `--assets-only` reuses an existing `.wasm` build. Rebuild/reload for public-shell changes; restart Node for backend changes. Inspect listeners/processes before restarting; old native API port 48973 belongs to legacy work and should not be stopped casually. Port 3003 was replaced with a temporary redirect to the main app, not another supported app.

Tests are local/injected and make no paid inference. The final-file test reads bytes only; distribution skips it when the private file is absent. Handoff verification on 24 October passed 79/79 tests in source and 78 with one expected private-file skip in the distribution, with zero failures. The protected final-set byte hash was unchanged. No build is needed for Markdown-only edits.

**Deployment gap found during handoff:** both Dockerfiles omit the imported `homeward/experiments/enterprise-prospecting/` runtime files (contract/catalogue/photos/status). The integrated service imports them at startup. Enterprise durable storage defaults inside that directory's `results/`, while the image only creates/chowns `homeward/results/`. Repair packaging and writable storage, exclude private results, then smoke-test a container before claiming deployment works. No public deployment has been verified in this handoff.

## Separate model/task identities — do not conflate versions

| Workload | Project | Task | Adapter / training job | Last measured outcome |
| --- | --- | --- | --- | --- |
| Original app travel | `ws-1ac8e778cff912a3` | `ln_445191829380864c541213cd` | `ad_lane_8bdd977d` v1 / `ftjob_a58f1590` | 153 kept at 15:59 BST; internal 1/12; no verified normal adapter traffic |
| Corrected guide lab | same original project | `ln_cd244c7ae58bc8483b16fb6b` | `ad_lane_a190986c` v1 / `ftjob_be8160c9` | internal 4/12; six-case adapter 3 pass / 1 uncertain / 2 fail vs Luna 5 / 1 / 0 |
| Bank correction demo, active backend | `ws-f6fde7f8cb6510fa` | `ln_1c7c0a9b48c013cc4b2de67d` | `ad_lane_dac58061` v1 / `ftjob_1a88e264` | internal 5/12; first fresh comparison answers 2/6 before and after |
| Enterprise Lens | same isolated Bank project | `ln_a45d95b39436e0f1ea9583d0` | `ad_lane_39642a41` v1 / `ftjob_89d5f355` | internal 11/12; fresh full-task 0/6, so app remains Luna |

All these are real Qwen3-4B PEFT adapters observed in the console. Their internal exams differ; comparing 8.3%, 33.3%, 41.7% and 91.7% is not a controlled improvement curve. A new isolated task starts at v1, not v2 of the original app. No normal fixed-version adapter API serving has been established. Selected-version Try models replies provide preview-serving evidence only; decoding/schema setup is not fully exposed.

### Original app and corrected-guide history

- Original travel v1 remained in 10% silent testing, zero graded pairs and no observed normal adapter traffic. One ordinary probe explicitly fell back to Luna because the primary deployment was not serving; task History said it awaited a promoted version. Manual rollout controls affect all task calls, so were not used.
- History recorded refresh every 24 hours after 25 new rated-up rows, separate from workspace zero-minute cooldown. Cursor and exact next run unknown. The reused 12-case exam versus 20-judged-case promotion minimum appeared inconsistent; actual promotion predicate unconfirmed. Do not assume this policy applies to the newer Bank project.
- Greville Street UI correction removed Canary Wharf DLR, retained Farringdon/Chancery Lane. Stored/trainable reply and Good feedback were verified; task count rose 149→150. Per-row weight inclusion was not exposed. Six fresh original-app diagnostics produced only 1/6 validated answers/maps, including one interrupted failure. This original correction still lacks an updated-model comparison.
- Corrected-guide lab: 40 Luna examples + 5 corrections, 36 kept / 8 rejected / 1 pending; training began with 29 kept. New model at 16:39 BST. Six fresh tests used same evidence but UI/API settings were not matched; Luna review was non-blinded and not independent. Evidence: `homeward/experiments/corrected-guide-lab/results/paired-development-report.md` and `adapter-dev.json`. Those reviewed synthetic records are included in the distribution.
- Earlier support-ticket gateway lab tested 44 successful simple calls (streaming, Responses, strict JSON, tool call). Its 11/12 gate vs base 12/12 was a different classifier, not travel evidence. Original scripts and `docs/mubit-notes.md` retain it. The 40-example decision lab is prepared but **unsubmitted**. Do not spend credit rerunning old batches.

### Bank round 1: what actually unlocked training

The first 25 teaching calls had **one manual Good rating and 24 waiting**, not 24 rejections. Audited manual Good/Bad controls cleared the review bottleneck. Across 35 Luna calls (25 initial + 5 supplemental + 1 top-up + 4 calibration), 29 were rated Good and six Bad. At 25 accepted, `holdout_below_calibration_min` required at least 12 internal checks plus enough training rows; UI said 28 accepted. At 29 accepted, training started automatically at **18:31:48 BST**, completing a real v1 by 18:37:28. No force-training button was used. Ratings were assistant-applied under user authorization with Luna audit, not independent human expert labels.

Fresh six-case comparison from corrected-guide v1 to Bank v1: Bank-transfer answers **1/4→2/4**, controls **1/2→0/2**, all answers **2/6→2/6**, full answer/classification/map **0/6→2/6**, map intent **4/6→5/6**. One fresh answer added the supported 290-metre street-and-lifts interchange detail and focused Bank correctly. Other answers still invented accessibility details or contradicted payment rules. This is a narrow changed behavior, not overall superiority or proof one specific row caused it.

Source evidence: `homeward/experiments/bank-transfer-demo/LEARNING-PROOF.md`, `results/{before-v1,after-isolated-v1,before-after-comparison,curation-lineage,training-integrity-assessment,comparison-integrity}.json`, `results/correction-to-trained-model.txt`, `results/new-adapter-identity.txt`. First three after-capture labels required reconstruction from existing verbatim tool/screenshot evidence; first two finish timestamps are unavailable. No call was rerun or output rewritten. This limitation is disclosed, not silently repaired.

### Bank round 2: exact resume plan

Root: `homeward/experiments/bank-transfer-demo/round2/`. Contract hash: `deb13fa888a79a32e598e08d1442bce1c2817b8f51ecdb412267505ddb64fbf7`. Project/task as above; task key `lk1_c0eb50451e86efc937b7119240b1e613` (also used by the earlier guide contract in a different project).

Completed: 32 teaching examples plus six extras, 38 unique receipts, all positively identified Luna, no automatic retries. `results/header-summary.json` found no new serving-identity headers. Recommendations: 26 Good, 12 withheld (nine uncertain, three bad/incomplete for this curriculum). All `console_rating` values and new task observations remain pending. **A local Good recommendation is not a saved Mubit rating or a kept row.**

Files: `manifest.json`, `development-frozen.json`, `inputs/`, `teaching-frozen.json`, `teaching-extra-frozen.json`, `results/luna-teaching-{first,rest,extra}.json`, `results/teaching-assessment.json`, `results/teaching-extra-assessment.json`, `results/curation-pending.json`, `status.json`, `results/console-outage*.txt/png`.

The first teacher runner prematurely labelled task membership verified; metadata was corrected with a note, preserving raw input/output/header evidence. Bank teacher rubric rows 01–19 mistakenly expected no pins; actual governing instructions require focusing Bank. Audit used the governing contract, not the faulty rubric. Some rubric source allowlists were too narrow; valid supplied evidence was not falsely rejected. Preserve this audit history.

`teach.mjs --first`, `--rest`, `--extra` are **completed paid phases** with exclusive `.lock` files. Do not delete locks, rerun or invent a new phase to duplicate them. An offline guard is `node homeward/experiments/bank-transfer-demo/round2/teach.mjs --extra --check`.

Resume in this order:

1. After human sign-in confirmation, observe the authenticated console and current engine health. Clear the recorded blocker only on success. Inspect current task, versions and actual next-training condition.
2. Verify the 38 receipts belong to the isolated Bank task, matching question/output evidence. API `mreq_…` IDs differ from console UUIDs; do not convert or guess them.
3. **Before accepting the new batch**, capture the planned five fresh fixed-v1 baseline replies if v1 remains selectable. Last shared Try quota was 11/50: five before + six after was the conservative plan. Check current quota; do not bypass it. The sixth is after-only and cannot enter the five-pair improvement percentage. No student call has yet been made for round 2.
4. Save the 26 audited Good recommendations through supported review controls, with truthful reasons. Re-read each save and record exact console IDs/task membership. Keep the 12 uncertain/incomplete targets withheld; do not mislabel a merely ambiguous answer as factually wrong. Do not spend another teaching batch just to recreate existing receipts.
5. Inspect the task's accepted count, calibration/pause reason, retraining policy and new job/version. Read-only inspection of Tasks, adapter History, Settings → Training, task overrides and More/version actions is appropriate. Global rollout is not a refresh trigger. No hidden API guesses, cookie replay or cross-project changes.
6. Only after positive new-version identity, run the six frozen after inputs once each without targets, repair or retries. Save each response immediately with an explicit case ID and model version. Preview input limit observed: 8 KiB. Preserve settings limitations.
7. Report five matched pairs and the sixth after-only result separately; assess prose, classification, source IDs, map IDs/roles/camera and unsupported claims. Preserve losses as well as gains. Do not substitute revised Luna teaching output for student inference.
8. If no new job starts, report the actual blocker shown. The founder escalation, if later needed, is a per-task refresh / fixed-version API identity request, not “please add more data.” Do not send it externally without authorization.

### Enterprise workstream: preserve its independent evidence

Seven verified OSM offices (maximum requested was 30, not a quota): Morgan Stanley, Barclays, HSBC, J.P. Morgan, Unilever, Shell, Google. Exact OSM objects were downloaded after Overpass failures; source IDs/dates/geometry are retained. Six licensed Wikimedia images plus a J.P. Morgan monogram. Company AI evidence does not establish London-office adoption, confidential usage, spend or willingness to buy. Separate facts, hypotheses and unknowns; no outreach.

Task contract hash `32d6df5258fb8811245e3bb48e3591b748b5963c67abf2ed5c93649b50164b58`. 36 Luna teaching calls + one scripted browser correction; 28 kept at training, 9 waiting at that observation. Real Qwen3-4B v1 internal gate **11/12**, target 85%; reported base-plus-prompt 0/12 lacks independently established serving/protocol. Fresh six development: semantic 2 pass / 1 uncertain / 3 fail; format only 1/6; **full task 0/6**. Luna diagnostic accepted 3/6 including a retained transport failure. A seventh explicit-schema HSBC diagnostic succeeded in format but is excluded from the six. Preview setup may contribute; no overall win or deployment readiness.

Real main-app Unilever and Shell correction flows later obtained receipts `mreq_01a16f5794f47701b97254d30dab8124` and `mreq_01a16f5a31b77e12819c3c48c92a329d`; these are not evidence of a subsequent trained version. `results/main-app-flow-test.json` and screenshot preserve them privately. Assessments use metadata recording, explicit teaching uses full recording. Duplicate paid calls coalesce; ambiguous failures do not retry. Session ownership, drafts across modes, stale completions, pending controls and receipt reload were checked/fixed.

## Supported Mubit behavior and remaining uncertainty

- Official docs last rechecked 24 October: https://docs.mubit.ai/guides/first-adapter says **“There is no button that retries a training.”** New examples can trigger recovery; adapter pages should expose the next-example requirement or pause reason. Calibration can exceed the nominal 25-row threshold, as both new tasks demonstrated.
- https://docs.mubit.ai/reference/api did not document training/review administration, a fixed-version serving selector or adapter identity headers. Do not invent endpoints. This is a dated finding: re-read official docs/UI after restored access if continuing the user's force-training investigation.
- Try models is labelled “not stored / trains nothing.” It has a shared quota; last observed remaining count was 11. The console outage does not prove inference is offline, and gateway success does not prove review/training is healthy.
- Full recording can feed review/training; metadata/off do not submit teaching payloads. OpenAI `store` is a separate setting. Stable system/model/schema define task grouping; changing a format name alone was not a reliable isolation boundary. Verify every new task before scaling a batch.
- Inspection of `@mubit-ai/mcp` 0.8.0 found 21 memory/coordination tools, no request/task/adapter management; its health route was incompatible with the inference gateway. It was not globally installed. This historical probe is not proof no newer integration exists.
- A final paired API evaluation requires supported fixed-version inference, per-response adapter/version proof, an identified Luna arm, equal inputs/settings, metadata-only recording, no answer cache/recovery and explicit user authorization. Its serving gate must remain fail-closed.

## Handoff / publication checks

Keep Markdown claims scoped to exact experiments and dates. Link evidence, avoid stale “active monitor” or “v2 trained” statements. Root README is the current product overview; `homeward/IMPLEMENTATION-HISTORY.md` is historical, not a current instruction sheet. `homeward/LEARNING.md` documents the original app correction separately from Bank and enterprise.

Before a requested push: inspect the actual Git distribution diff, include only intended browser/docs changes, retain OSM/image attribution, exclude keys/private logs/final questions/native source, and validate the bundled map/engine. Do not copy private artifacts into Git just because results are useful. Report whether changes are local, committed or pushed. Do not deploy or contact third parties merely because the repository is public.
