# Getting Homeward v2: independent investigation

Checked 24 October 2026. Read-only investigation requested by the user. No project setting, rollout, app route or model call was changed. No credential was read, no CLI was installed or run, and no final evaluation question was opened.

## Finding

I found **no supported self-service command or API that forces an early v2 of the existing Homeward adapter**. There is a concrete timing explanation worth testing before buying more examples: the recorded lane refresh interval is 24 hours, and v1 is still less than 24 hours old. The exact scheduler anchor, cursor and next-run time remain unavailable, so this is an explanation to verify, not a promised start time.

The most useful documented live diagnostic is missing from our console presentation. The public guide describes a line underneath a failed version:

- `Next: a new version after {need} new examples`
- `Next: retraining paused: {reason}`

The main agent expanded the actual engine 0.14.0 Overview and header Details during this investigation and found neither training line. The visible next step concerned **canary rollout**, with insufficient live pairs and sessions; that is a different process. A docs/console presentation mismatch prevents using the documented diagnostic here. [Official adapter guide](https://docs.mubit.ai/guides/first-adapter#after-a-version-that-didnt-pass)

## The existing task

Read from local, timestamped console evidence, with the main agent checking current visible counts:

| Item | Observation | Implication |
| --- | --- | --- |
| Task | `ln_445191829380864c541213cd` | Preserve this task for a genuine v2. |
| Adapter | `ad_lane_8bdd977d` | Only v1 has been observed. |
| Current pool | 150 kept; 183 calls | This is not the scheduler's new-row cursor. |
| First training | Started 23 October 21:25:31 UTC; v1 created 21:31:28 UTC | At about 13:33 UTC on 24 October, fewer than 17 hours had elapsed. |
| Lane history | Refresh every 24 hours, once 25 new rows are rated up; train from base and replay 10% | The recorded schedule is separate from workspace cooldown. |
| Workspace policy | `adapters.cooldown_minutes=0`; no daily job limit | Does not establish that the lane interval is zero. |
| New-row thresholds | 25 rows and 0.5 of the live version's examples | Neither is a documented interval override. No live version is currently promoted; exact interaction is unknown. |
| Reviewer cap | 200 calls per task/day | Only one ordinary request is currently queued; no evidence the review cap is blocking training. |
| Row size | `rows.max_row_bytes=262144` in the saved advanced settings | The Try models 8 KiB message limit is a separate serving/UI limit. Do not confuse it with this training cap. |
| Version state | Qwen3-4B PEFT v1; failed advisory recorded-reference exam; 10% silent test | Rollout controls do not submit a new training run. |
| Correction | Retained, assigned to Homeward, trainable, persisted Good rating | Good evidence of accepted feedback, not proof of row membership in a future run. |

If the 24-hour timer anchors to the first start or completion, its first plausible due window is **24 October 21:25–21:31 UTC (22:25–22:31 London)**. This is an inferred diagnostic window, **not an exposed deadline**. The timer might anchor elsewhere or be evaluated on a later scheduler tick.

At first training, the saved pool was 49 kept. The pool is now 150, a gross increase of 101. That exceeds both 25 and half of 49, before considering exclusions. This makes a simple shortage of total kept rows a weak explanation. It does **not** establish how many new eligible rows the refresh scheduler recognizes: held-out sessions, excluded examples, failed attempts or a different cursor can change the effective count. Do not purchase another batch just to move the visible total.

Evidence: `homeward/data/backend-readiness.json`, `homeward/results/travel/mubit-status.json`, `homeward/results/travel/backend-refresh-block-2026-10-24.txt`, `homeward/results/travel/backend-policy-2026-10-24.txt`, `homeward/data/feedback-observations.json`.

## What the current docs actually support

The guide describes automatic training once examples and eligibility permit it. It lists time, daily-budget, insufficient-example and failed-training waits; failed training retries depend on new examples, and there is no retry button. A below-target version can produce a later version without first passing. It does not document a retrain endpoint or an editable lane interval. [Official adapter guide](https://docs.mubit.ai/guides/first-adapter)

The app API reference describes provider-compatible inference paths and recording headers. It does not publish task-management or training-job submission routes. Model IDs cannot select a Mubit adapter. Changing a provider key, model alias or inventing an `x-middleware-*` force header would not be a supported solution. [API reference](https://docs.mubit.ai/reference/api), [model IDs](https://docs.mubit.ai/guides/model-ids)

Task identity uses model, instructions, tools, tool choice and output format. Variable questions belong in the user message. A new system instruction or output contract can create another task; training its first adapter would be **v1 of another task**, not Homeward v2. Session IDs are also significant because Mubit separates testing by session. Keep development tests separate and never put the final 20 into any recorded training session. [Tasks and sessions](https://docs.mubit.ai/guides/tasks-and-sessions)

Past-call import is not an arbitrary JSONL/correction upload escape hatch. The documented sources are Langfuse, Braintrust and Pydantic Logfire, and the import cuts off at the project's first live Mubit call. Moving today's correction into an observability tool would not make it eligible under that historical cutoff. It also does not promise to bypass refresh scheduling. [Import past calls](https://docs.mubit.ai/guides/import-past-calls)

Admins can change visible project settings; no additional retrain entitlement is documented for a different role. Creating another project is not available in this middleware console. [Members and roles](https://docs.mubit.ai/admin/members), [Projects](https://docs.mubit.ai/admin/projects)

## Official CLI investigation

There is a real official CLI, but it does **not** provide the missing adapter command. I read the public [`MubitLabs/mubit-cli` README](https://github.com/MubitLabs/mubit-cli), then downloaded its v0.1.1 macOS archive **only into memory** and read its bundled README. I verified the archive against the checksum in the official [Homebrew formula](https://github.com/MubitLabs/homebrew-tap/blob/main/Formula/mubit-cli.rb):

`dbc072468b0232bfc1ac299ddf677e6bfeb2cd959b58ab1864cb10b7dd3b78aa`

Its command reference lists login, identity, organizations, projects, instances, runtime users, keys, usage, local config and opening the console. It has **no tasks, adapters, train, refresh or retrain command**. Its management sessions use a versioned CLI API and default to `console.mubit.ai`; its project/instance lifecycle describes a different management surface from the current one-project `app.mubit.ai` middleware console. No login or request using an inference key was attempted. [Official release](https://github.com/MubitLabs/mubit-cli/releases/tag/v0.1.1)

Older search results for the memory SDK, `mubit.learn`, MCP feedback/outcomes and Minima refer to runtime memory/retrieval. Their existence does not establish a route for submitting a new PEFT version of this middleware task. The current docs index contains none of those management controls. [Current index](https://docs.mubit.ai/llms.txt), [official memory plugin](https://github.com/MubitLabs/plugins)

## Concrete next steps without founder access

1. **Preserve the current task and accepted correction.** Do not alter shared instructions/schema, apply rollout or promote v1 merely to try to start retraining. The promotion gate and training scheduler are distinct; public docs do not require a failed version to become live before a successor can train.
2. **Inspect the remaining visible version History/Versions presentation and status tooltip once.** Capture a training-specific waiting reason if present. A canary-evidence message is not that reason. The main agent owns these browser checks; this subagent has not touched the browser.
3. **Use the inferred daily-refresh window as a bounded check**, during authorized active work. Capture an actual new training job ID/version, not merely a changed count. No new scheduled monitor is requested or created.
4. **If a concrete wait says more new examples are needed**, first inspect whether eligible, retained new development rows are counted for the same task and separate sessions. Only then send a bounded set sized to the displayed shortage. A total-kept number alone is insufficient justification.
5. **If no v2 follows the inferred window**, classify the scheduler reason as unknown/unexposed. We can retain the exact evidence and use support when available; we cannot honestly claim a supported force action exists. Changing a workspace threshold may affect shared training and is not evidence of shortening a materialized lane schedule.
6. **Once v2 exists**, verify the original correction's inclusion if the console exposes lineage. Re-run only the already frozen, fresh six-case development inputs, same evidence and settings, without target hints, repair or retries. Compare actual outputs against the saved baseline. Mark version selection and playground limitations explicitly. Keep the final 20 closed.

If the hackathon deadline demands immediate new weights before that window, an isolated narrow task can trigger a first training under the documented first-adapter flow. That needs an explicit product choice, new examples, its own baseline and its own version labels. It is not a technical workaround that turns the existing adapter into v2, and it must not be represented as the original correction updating the original weights.

## Still unknown

- Which event anchors the materialized 24-hour refresh policy and whether it remains effective.
- The last consumed row/session cursor and the count of new eligible rows after it.
- How fractional new-row eligibility behaves while v1 has no promoted/live version.
- Whether the failed advisory exam changes scheduler eligibility in engine 0.14.0; public recovery guidance suggests it should allow a successor, but it does not specify this build's predicate.
- Whether any task override affects an already-created lane refresh object. No supported interval field or manual refresh action has been found.
- Whether the saved correction will be selected into v2's actual training split, and whether its effect transfers to different questions.

These are unknowns, not reasons to lower quality gates, change app traffic or label Luna target copying as learned improvement.
