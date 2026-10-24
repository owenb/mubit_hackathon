# Helping Homeward learn

Open **Fix an answer** in the WebGPU app. The flow has three steps:

1. **Fix:** edit what Homeward should say, remove the wrong map places and add missing ones. Explain the mistake in a few words. Tick **Help Homeward answer this better for everyone** for a reusable correction; leave it off for a personal trip edit.
2. **Check:** **Preview my changes** saves the edit and draws it on the real map. Check the answer, places and travel sources. Choose **Send correction** for shared teaching, or **Keep for this trip** for a personal edit.
3. **Follow:** see whether Mubit received and reviewed it, whether a new model exists, and whether that model does better on different questions. Detailed receipts and raw replies are under **How we know**.

The map labels edited previews **Your correction · preview**. That is your edit, not an answer learned by a model. Saved originals remain unchanged. Sending an identical saved correction twice is blocked, including across server restarts.

## What actually happened

The Greville Street development example incorrectly included Canary Wharf DLR. A real UI correction removed that pin, kept Farringdon and Chancery Lane, and preserved the warning that station lifts do not prove an accessible pavement or shop entrance.

Luna checked the correction and returned a matching teaching reply through Mubit. The console then confirmed that its request and answer were stored, grouped under the original Homeward task, and trainable. A Good rating and its explanation were saved and re-read. Homeward’s pool rose from **149 to 150 kept examples**, with the other counts unchanged. The console has no per-row kept flag, so that aggregate increase is not treated as confirmed per-row lineage.

**Only v1 is visible. No post-correction model improvement is proved yet.** The recorded task policy refreshes every 24 hours after enough new examples; its exact next-run time is not exposed. The available version actions control rollout, not retraining. App routing was not changed.

See [the console observations](data/feedback-observations.json) and [the original live teaching evidence](data/learning-flow-evidence.json). These are timestamped observations, not live queries. Refreshing the progress panel reads the latest saved check; use its Mubit link for the live console.

## Fresh development test

Six new questions were frozen before collecting model replies: four Greville Street variants and two Canary Wharf controls. No operator target or answer was included. Mubit Try models explicitly marks these calls **not stored · trains nothing**. They do not enter teaching or the final evaluation set.

V1 returned five retained outputs; the sixth call was interrupted by a console reset and remains a failure in the six-case denominator. Only **1/6** returned a usable validated answer and map scene. Several replies named reasonable stations but used invented roles or the wrong camera mode; another added a wrong place. This is a development baseline using a selected playground version, with generation controls not fully exposed. It is not a general accuracy estimate or a controlled Luna comparison.

The same frozen inputs and source evidence are saved privately for the next model. Their questions and rubrics stay out of teaching. [The public summary](data/development-learning.json) has no question payloads. The final 20 questions and rubrics remain untouched.

## Teaching and its limits

For a reusable correction, Homeward makes up to two paid calls to **gpt-6-luna through Mubit**: a source-grounded audit with recording off, then a full-recording teaching completion if accepted. Normal task instructions, schema and generation limits remain fixed. The operator target is in the teaching request’s user context. Matching that target proves submission fidelity, not weight learning or generalisation. Luna’s self-audit is not independent expert review.

A call receipt, stored content, positive review, kept training example, trained model version and improvement on fresh questions are distinct. The UI never turns a newer version or a positive rating into proof that this particular correction caused improvement. Platform observations must match the exact teaching receipt and Homeward task. There is no invented feedback-upload endpoint or force-adapter model ID.

## Storage and API

`src/feedback.mjs` validates corrections and owns the teacher flow. `web/public/corrections.mjs` renders the three steps. Records live under ignored `homeward/results/feedback/`, restricted to the browser-session cookie. Persist that directory on a writable volume for deployment. This session ownership is not a multi-user authentication system; losing the cookie loses browser access to that session’s history. Original questions still pass through Mubit under the app’s normal recording policy; only trip-specific correction submissions stay local.

- `GET /api/places?q=…`: verified catalogue search.
- `GET /api/learning`: this session’s saved corrections.
- `GET /api/learning/interactions/:id`: original answer and dated review evidence.
- `POST /api/learning/replay`: recorded development example, no inference.
- `POST /api/learning/corrections`: validate and save an edit.
- `GET /api/learning/corrections/:id`: current saved observations.
- `POST /api/learning/corrections/:id/preview`: draw the edit, no inference.
- `POST /api/learning/corrections/:id/teach`: reviewed reusable correction only.

Network failures are retained rather than automatically retried. The final questions are never loaded by this feature. API keys and raw session stores are not published. No rollout or training policy was changed.
