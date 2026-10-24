# Correcting Homeward answers and map pins

The WebGPU interface has a **Correct & teach** panel. It preserves the original answer and lets an operator edit the answer, remove or add verified catalogue places, and set each pin’s role. Coordinates cannot be invented. A corrected preview changes the visible camera, pins and answer, with an **Operator preview · not learned** badge.

## Use the correction flow

1. Ask a travel question, then open **Correct & teach**. Alternatively, **Replay a real map mistake** loads the recorded Greville Street development failure without a model call.
2. Inspect **Original model reply** and **Source evidence for this correction**. Edit the answer and pins; explain what should change. The answer remains within the 140-word task contract.
3. Choose **Only this trip or person** for personal preferences. These are saved locally and cannot become shared teaching. Choose **Reusable travel correction** for supported task-level mistakes.
4. **Save correction** makes no inference call. **Preview corrected map** draws the saved edit without replacing the original model output. **Restore original** returns to the original map and answer.
5. Check the reviewed box, then **Check & teach with Luna**. This uses up to two paid Luna calls through Mubit: a source-grounded audit with recording off, then a full-recording teaching request if the audit accepts.
6. Inspect **Where your correction stands**. It shows the actual receipt and teacher reply, not an invented “learned” state. Saved corrections and their receipts remain available in the same browser session after a server restart.

![Corrected map and the actual Mubit teaching receipt, with model inclusion unverified](../docs/images/homeward-correction.png)

## What the teaching request does

The recorded completion uses the ordinary Homeward system instructions, strict JSON schema, model (`gpt-6-luna`) and generation limits. The operator target and reason are included in its user context, alongside dated research and catalogue candidates. The complete teacher answer, labels and map must match the reviewed edit; citation IDs may differ if they remain supplied and non-empty where factual citations are required. Stable instructions and schema preserve the intended task contract, but Mubit’s actual task assignment still needs verification.

This is a corrected demonstration recorded through the gateway. It is **not an undocumented edited-target upload API**, a rating of the original reply, or proof of learned transfer. Use **Copy correction for Mubit review** and the console link if manually rating the original request. Trip preferences are never passed to this teacher.

The audit is Luna checking Luna-style output against supplied evidence, not independent expert review. Unsupported edits are rejected before full recording. Edits to a new venue or fact may require a research update before they can pass. Live lift status and other changing facts still require current evidence; the system does not silently refresh source dates.

## Receipt, review and model update are different

| Stage | Evidence |
| --- | --- |
| Saved in Homeward | Durable local record with immutable original and edited target |
| Luna audit accepted | Actual structured audit reply, with a receipt and provider evidence |
| Teacher preserved answer and pins | Validated actual completion; target was included in context |
| Call reached Mubit | `x-middleware-request-id` from the gateway |
| Mubit retained the full teaching content | **Unverified** until inspected in Mubit |
| Mubit kept this example | **Unverified** until its review is observed |
| This correction entered a model version | **Unverified** without attributable row/version lineage |
| Fresh-question improvement | **Not tested** without verified adapter inference and a separate comparison |

**Refresh evidence** reloads the saved training snapshot. It does not query Mubit directly, trigger training, keep a console session alive, or infer inclusion from the existence of a newer version. A new version can be observed while this correction’s inclusion remains unknown. The public API documentation currently provides no verified per-correction inclusion endpoint in this project.

The [live development evidence](data/learning-flow-evidence.json) preserves one real UI submission: Luna accepted the Greville Street correction, removed the unrelated Canary Wharf pin, and returned the corrected target through Mubit. It does not prove an adapter update. One initial citation-only mismatch was reassessed offline, with the original attempt and receipt retained and no extra paid request.

## Storage and API

`src/feedback.mjs` owns correction validation, storage and submission; `web/public/corrections.mjs` renders the panel. Records live under ignored `homeward/results/feedback/` with restricted filesystem permissions. Persist that directory on a writable volume if deploying the container. The HttpOnly, SameSite browser-session cookie controls access to those records; it is not a multi-user authentication system. Lost cookies mean lost browser access to that session’s history. Do not publish raw correction records or put personal travel data into reusable teaching.

- `GET /api/places?q=…`: search verified map places.
- `GET /api/learning`: this session’s saved corrections.
- `GET /api/learning/interactions/:id`: original answer and dated review evidence.
- `POST /api/learning/replay`: load the genuine historical failure.
- `POST /api/learning/corrections`: validate and save an edit.
- `GET /api/learning/corrections/:id`: current saved evidence.
- `POST /api/learning/corrections/:id/preview`: resolve the saved scene, no inference.
- `POST /api/learning/corrections/:id/teach`: explicitly reviewed reusable target only.

Saving identical edits is idempotent. An exclusive attempt file prevents concurrent or repeated teaching of one saved correction, including across server processes. Network failures are retained for inspection rather than automatically retried. Changing an edit creates a new correction; review its need before spending again. API keys stay on the server.

The final 20 questions and rubrics are untouched and are never loaded by this feature. There are no rollout changes, training-policy changes, automatic batches or scheduled keepalive jobs.
