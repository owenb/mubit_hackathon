# Homeward corrected guide lab

An isolated attempt to train a new Homeward model without waiting for the original task's daily refresh. This is a new task's **first version**, not Homeward v2. The app keeps its existing instructions and route.

- Mubit task: `ln_cd244c7ae58bc8483b16fb6b`
- Mubit task key: `lk1_c0eb50451e86efc937b7119240b1e613`
- [Task dashboard](https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/workloads/ln_cd244c7ae58bc8483b16fb6b)
- Teacher and comparator: `gpt-6-luna` only.

The isolated task produced **v1 on 24 October at 16:39 London**: adapter `ad_lane_a190986c`, training job `ftjob_be8160c9`, on `Qwen/Qwen3-4B-Instruct-2507`. Training began at 16:33 with 29 kept examples; subsequent review reached **36 kept, 8 rejected and 1 awaiting review** from 45 recorded calls. All five corrective demonstrations were reviewed before training started, but Mubit did not expose the exact training snapshot or per-example inclusion manifest.

Its internal gate scored **4/12 (33.3%)**, below the 95% target. That gate differs from the original Homeward task's gate, so the scores are not a controlled before/after comparison. A 10% silent test was enabled for this isolated task only. It copies requests for testing while provider replies remain user-facing; the original Homeward task and app route were not changed. Direct playground replies identify this new adapter as **Homeward corrected guide lab v1**. Normal adapter API serving remains unverified. See `results/status.json` for the recorded state.

## What was sent

Forty teaching questions use a fixed answer-and-map JSON contract and the same evidence retrieval policy. Instructions explicitly distinguish an interchange from an origin or destination, a bounded walking estimate from an arbitrary route, and street access from boarding or interchange access. Map pins must use supplied IDs; the backend resolves those IDs to real locations.

An audit of the actual replies found errors worth excluding, including contradictory prose, incorrect interchange roles and transferring access evidence to the wrong pair of lines. Five additional Luna calls demonstrate corrected answers. Their targets are explicitly in context, so successful copying is **teaching material, not proof that a model learned**. The correction runner stopped on a punctuation-only difference in the fifth reply; it was reviewed as semantically equivalent. The planned sixth demonstration was not sent or retried.

All teacher calls use full Mubit recording. Accepted and rejected replies are reviewed in the console with comments identifying the reviewer as an agent. A receipt, a saved rating, a kept example, a training job and a usable adapter are separate stages; none substitutes for the next.

## The test

Six fresh development questions and their rubrics were frozen before teacher calls. Both sides received the same frozen input, with no target response, prior answer, correction field, cache or repair. All six new-adapter playground replies and all six Luna API replies are captured. Luna used metadata-only recording; the playground displayed “not stored · trains nothing.”

| Complete-answer assessment | Pass | Uncertain | Fail |
| --- | ---: | ---: | ---: |
| New isolated Mubit adapter v1 | 3 | 1 | 2 |
| Luna | 5 | 1 | 0 |

The adapter's map intent was acceptable on all six cases, allowing an optional area-pin omission. It correctly handled contextual pins, explicit origin/destination roles and a question needing no map. It still made two clear factual errors: an unsupported Bank lift-accessibility claim and a claim that Cutty Sark has free general entry. The results show partial correction transfer, **not better overall answer quality than Luna**. They do not isolate a causal effect of the corrections or establish improvement over the original Homeward v1.

This is a six-case development diagnostic, reviewed by a Luna agent without blinding or independent expert review. Playground and API generation settings are not proven identical. Ambiguous cases remain marked uncertain. Read the [paired development report](results/paired-development-report.md) and [per-case assessment](results/paired-development-assessment.json). Keep these six questions out of further training; they are no longer a fresh test for subsequent revisions.

The final 20-question benchmark was not opened or submitted. Only its SHA-256 was checked. The earlier development sets were also excluded from this curriculum.

## Audit trail

- `manifest.json`: authoritative frozen instructions, schema, generation settings and input packets.
- `results/teach.json`: the 40 actual inputs, outputs, receipts, usage and safe response headers.
- `results/corrections.json`: five corrective demonstrations, including the stopped exact-match check.
- `results/ui-reviews.json`: per-request console review submissions and verification status.
- `results/luna-dev.json`: six fresh Luna baseline answers and per-response identity evidence.
- `results/luna-dev-assessment.json`: preliminary development assessment and caveats.
- `results/adapter-dev.json`: six actual adapter answers with frozen input hashes and per-reply UI identity evidence.
- `results/paired-development-assessment.json`: final per-case development assessment with disclosed ambiguities.
- `results/paired-development-report.md`: comparison, failures and limitations.
- `results/integrity-check.json`: checks of app isolation, frozen inputs and the final-20 checksum.
- `results/training-freeze-incident.json`: a late curriculum-file edit was detected before evaluation; submitted training inputs and frozen evaluation inputs remain preserved. Do not regenerate the manifest or treat the later `training-cases.json` as the record of submitted questions.
- `results/review-addendum.json`: audit corrections and the punctuation-only stop explanation.

The scripts have single-run locks. Do not delete locks and rerun blindly: that would duplicate paid calls and change the training stream. `run.mjs prepare` is a preparation operation, not a training trigger. Mubit starts training according to its own acceptance and scheduling rules.

All 51 API replies (40 teaching, five corrections and six comparator calls) have safe response headers recorded and were positively identified as Luna. Adapter playground calls have visible version evidence but no HTTP headers available through the supported UI. No latency or cost advantage has been established for this experiment.
