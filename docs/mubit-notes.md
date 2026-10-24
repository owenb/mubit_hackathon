# Mubit research notes

Reviewed 23 October 2026: all 22 pages in the current [documentation index](https://docs.mubit.ai/llms.txt), the [full documentation](https://docs.mubit.ai/llms-full.txt), and the public [Mubit site](https://mubit.ai/). The source notes describe documented behavior. Signed-in observations below record differences in the live workspace.

## How the current product works

Your server sends ordinary provider API calls through Mubit. Change the client's base URL and credential, and keep the provider model ID. Mubit forwards calls, records them, groups recurring work into tasks, and can train small task-specific adapters from accepted examples. [Quickstart](https://docs.mubit.ai/quickstart) · [Concepts](https://docs.mubit.ai/concepts)

The website describes a broader direction involving runtime calibration, reusable memory, prompt/skill improvements and specialized Banyan models. The current integration docs give a concrete proxy → recorded requests → tasks → adapters → comparison workflow. Do not assume every website capability is enabled in this workspace. [Mubit site](https://mubit.ai/)

## Connection and credentials

- OpenAI base URL: `https://api.mubit.ai/openai/v1`, subject to the project's **Connect** page. Chat Completions, Responses and streaming are supported.
- `MUBIT_API_KEY` authenticates to Mubit. Inference keys are project scoped. Read-only keys cannot run inference.
- Your OpenAI provider key is configured separately in **Provider keys**, where Mubit validates and stores it encrypted. Starter credit can cover supported models before a provider key is added.
- Adding an OpenAI key makes that provider's future calls use your account. A ChatGPT/Codex subscription login is not an API key.
- Call from a server or terminal. The inference API does not answer browser CORS preflights.

[OpenAI connection](https://docs.mubit.ai/guides/connect-openai) · [Provider keys](https://docs.mubit.ai/admin/provider-keys) · [Mubit keys](https://docs.mubit.ai/admin/mubit-keys)

## Task identity and sessions

Task identity depends on model, instructions, tools, tool choice and output format. Changing user text does not create a new task. Whitespace and numbers/dates/IDs in instructions are normalized; changing other words can split tasks. Put customer-specific values in user messages.

OpenAI session IDs can come from `metadata.thread_id`, `metadata.session_id` or `metadata.conversation_id`, in that order. Otherwise Mubit can infer a session from the conversation's beginning. Keep independent examples in separate sessions: held-out test cases are separated by session. A session is conversation grouping, not task identity.

[Tasks and sessions](https://docs.mubit.ai/guides/tasks-and-sessions) · [Model IDs](https://docs.mubit.ai/guides/model-ids)

## Adapter lifecycle and limits

Not every request is accepted as a kept example. The documented default first-training threshold is 25 kept examples; the console count is authoritative. Training must be enabled for the workspace. The first-adapter tutorial sends 40 examples, but no fixed number guarantees training or a passing result.

Tasks progress through collecting, reviewing, training and testing. Daily limits, pauses, insufficient held-out examples or failed training can delay progress. Failed training waits for new examples; there is no manual retry button. Test results can be Passed, Below target, Malformed tool calls, Prompt only or Not tested.

Passing adapters can be compared against the provider in **Try models**. Try models calls are not stored and do not train anything; they have a daily allowance. The first adapter start can take minutes. There is no documented adapter model ID to put in an API call. Passing a test does not establish correctness on all future inputs or production routing behavior.

[First adapter](https://docs.mubit.ai/guides/first-adapter) · [Model IDs](https://docs.mubit.ai/guides/model-ids)

## Observability and errors

Requests exposes inputs, replies, served-by details, tokens, timing, ratings and session links. Every inference response should carry `x-middleware-request-id`; keep it for debugging. It differs from the console record's own ID. Lists of models and calls rejected before provider execution do not appear in Requests.

`x-middleware-record: metadata` keeps no prompt/reply content; `off` also removes the task fingerprint. Such calls do not appear in Requests or supply kept examples. Headers can reduce recording, never increase a stricter policy.

Mubit errors normally have type `middleware_gateway_error`; upstream provider errors pass through. Starter credit restricts models, routes, features and concurrency. Hosted search, file search, code execution and other separately billed tools require provider-key setup. Preserve the error code when diagnosing a rejection.

The gateway retries only failures before any request bytes were sent. The SDK may independently retry, so this lab disables SDK retries. Documented gateway limits include 10 seconds to connect, 610 seconds to first byte, 15 minutes of silence and 60 minutes total. This lab deliberately uses a shorter timeout.

[Requests](https://docs.mubit.ai/guides/requests) · [API reference](https://docs.mubit.ai/reference/api) · [Troubleshooting](https://docs.mubit.ai/troubleshooting)

## Other integrations reviewed

Supported provider routes include Anthropic, Gemini and OpenAI-compatible OpenRouter, Groq, Together and Mistral. Framework guides cover Vercel AI SDK, LangChain and OpenAI Agents SDK; coding-tool guides cover Claude Code, Codex, Gemini CLI and Aider. OpenAI Agents SDK tracing requires care: the guide turns it off to prevent sending a Mubit credential to OpenAI's trace endpoint.

Past calls can be imported from Langfuse, Braintrust and Pydantic Logfire with scoped read-only credentials. Imports stop at the project's first live call. The documented workspace has one project. Admins manage keys and settings; membership changes require support. Console inactivity signs users out after 15 minutes.

[Frameworks](https://docs.mubit.ai/guides/frameworks) · [Coding tools](https://docs.mubit.ai/guides/coding-tools) · [Imports](https://docs.mubit.ai/guides/import-past-calls) · [Projects](https://docs.mubit.ai/admin/projects) · [Members](https://docs.mubit.ai/admin/members)

## Luna verification

The official OpenAI documentation names `gpt-6-luna` and supports both Chat Completions and Responses. Reasoning can be disabled with `none`. We use that setting for these short classification probes. If we add function calling later, the official docs require `reasoning_effort: none` for Chat Completions function calling; Responses is the recommended tool-capable route.

[Official GPT-6 Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna)

## First session plan

1. One recorded classifier call; verify the reply and dashboard record.
2. Four independent inputs with unchanged instructions; inspect task grouping.
3. Two turns with the same conversation history; inspect inferred session grouping.
4. One stream and one Responses call if the first tests work.
5. Review the observed task counts and training availability before deciding on a larger dataset. Any later quality comparison should use new held-out inputs, not just repeat the training examples.

## Initial observations

- Local syntax, configuration reporting, four-call preview and two-turn session preview passed.
- Missing-key handling stopped the local smoke command before it made a request.
- An explicit unauthenticated probe to the Chat Completions endpoint returned HTTP 401, `missing_key`, type `middleware_gateway_error`, `x-should-retry: false`, and a Mubit request ID. This verifies endpoint reachability and the documented gateway error shape; it does not verify inference or model access.
- The in-app browser reached the Mubit email sign-in form. Account setup, credits, training availability and dashboard contents remain unverified until sign-in.
- No authenticated inference has run yet. Both key fields were empty when configuration was checked.

## Signed-in experiments, 23 October 2026

The live console identifies engine 0.14.0 and project `ws-1ac8e778cff912a3`. It shows 1 of 5 projects, contrary to the one-project limitation in the reviewed docs. Starter credit is available for Anthropic, OpenAI and Gemini. No provider keys have been added. Billing setup is still incomplete but did not prevent our small API experiments.

The live Settings pages show: 25 new examples per subsequent version, 256 KB maximum example size, no daily training limit, automatic approval after passing, a silent test on 10% of calls up to 100/day, partial rollout on 10% for at least 100 calls, and a 90% quality bar. These are observed defaults, not settings we changed. The live dashboard exposes rollout capabilities beyond the docs' adapter-comparison workflow.

The Luna **Try models** request failed with `The gateway answered 502: the model's provider answered 401`. The page explicitly used Mubit's own key, and its daily allowance fell from 50 to 49. We did not repeat the failing playground call. This does not imply the API starter-credit path is broken: that path subsequently worked.

With the user's confirmation, created the project-scoped **mubit-hackathon** Inference key and saved it only in the local, owner-readable `.env`. The UI showed it Active and expiring Jan 21. The OpenAI key remains optional for these starter-credit experiments.

The first authenticated Chat Completions call returned HTTP 400: `The 'metadata' parameter is only allowed when 'store' is enabled.` The lab now omits `metadata`, sets provider `store: false`, and relies on Mubit's documented inferred sessions. Full Mubit recording remains enabled. This avoids opting into stored OpenAI completions solely to attach a session label.

After that fix, **five successful Luna calls** (one smoke call and four batch calls) matched all expected labels: billing, billing, bug, account, other. Client timings were 2.07–3.67 seconds, with 247 total reported tokens. This is a small connectivity/classification probe, not an accuracy benchmark. The dashboard showed all six recorded API attempts: five HTTP 200s and the earlier HTTP 400. No adapter training or settings changes were triggered by us.

The final call's dashboard detail showed `other`, 42 input tokens, 4 output tokens, 2.92 seconds total, and 6 ms attributed to Middleware. Its inferred session was `pfx_a17a51ea9c6ba7b1`. At 20:02 London time, Tasks still showed **No tasks yet**, and requests showed **Not in a task yet**. Request recording and inferred session creation are verified; task discovery and training are not yet verified.

Evidence from this initial stage is saved under ignored `results/`: JSON request results, the playground error screenshot, and the active-key screenshot (masked key only). The follow-up experiments below supersede the initial unverified statuses.

## Follow-up experiments and approved 32-ticket batch

All calls used `gpt-6-luna` through the Mubit gateway and starter credit. No OpenAI provider key has been added. The user explicitly approved the 32-call batch, including its potential to trigger automatic training and rollout. No training or rollout settings were changed.

| Experiment | Successful calls | Result | Reported tokens |
| --- | ---: | --- | ---: |
| Two-turn session | 2 | Both returned `account`; same inferred session | 128 |
| Streaming Chat Completions | 1 | SSE completed with `billing`; dashboard retained final text | 51 |
| Responses | 1 | Completed with `billing`; recorded under the same plain classifier task | 52 |
| Strict JSON schema | 1 | `{"category":"billing"}` | 96 |
| Forced function call | 1 | `route_support_ticket` with `{"category":"billing"}`; function not executed | 205 |
| Metadata-only recording | 1 | Returned `billing`; excluded from the Requests list | 51 |
| Distinct training candidates | 32 | 32/32 expected labels matched, balanced eight per category | 1,507 |

Including the first five successes, this is **44 successful calls**, all matching the simple expected-label checks, and **2,337 reported tokens**. One earlier authenticated attempt failed with the metadata/store HTTP 400. This is a synthetic integration check, not a held-out quality benchmark. The 32-call batch had client latency 799–1,618 ms, median 1,003 ms. Its result file is `results/hackathon-2026-10-23T19-10-24.018Z-cba3dc39.json`.

Requests showed 44 recorded attempts after loading all rows: 43 successes plus the earlier 400. The metadata-only success was absent, as documented. The gateway response ID remains different from the console record ID.

### Sessions and response shapes

The two session-test turns appeared together under `pfx_99379eb1bf62d200`. That session also contained the earlier independent account example because its first user message was identical. Inferred sessions can therefore merge repeated independent invocations; the script's unique local labels do not override Mubit grouping.

The streamed request page explicitly showed **streamed**, the final `billing` reply, 47 input/4 output tokens, and a Good rating from the reviewer with reason **Correct label and format**. The dashboard reported 778 ms versus 959 ms measured by the client; these are different measurement boundaries.

The function-call record showed **1 tool**, finish reason **tool_calls**, and **1** returned tool call. Its text preview said **No text in the reply**; this is not a failed call. The function name and arguments are preserved in the local JSON result. The strict-JSON and function-call requests still showed **Not in a task yet** at the check, unlike the plain classifier traffic.

### Task discovery and review

Mubit discovered **Label support ticket as**, task `ln_bb4ba40b34538f44c41d5a0d`, and associated the plain classifier requests with it. Its explanation was **Grouped: same instructions and tools**, and its name came from the instructions. This verifies task discovery, which had not appeared during the smaller initial run; it does not isolate whether elapsed time or volume caused discovery.

At approximately 20:13 London time, the task was **Reviewing examples**, with **0 of 25** kept and **First training: not started**. Its expanded detail reported nine queued for review, one review running, and 15 waiting. The nine older successful requests already showed Good ratings in Requests. Task counters were inconsistent across panels (10 calls in the summary versus 42 in the model breakdown), so do not treat those snapshots as a finalized dataset count. Adapters explicitly showed **No adapters yet**.

The task traffic panel's expanded error said reading the lane's metrics **needs manager**, despite the signed-in account being an administrator. This is an observed console/metrics permission issue, not evidence that inference or review failed. No access changes were attempted.

Useful live pages: [task](https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/workloads/ln_bb4ba40b34538f44c41d5a0d), [Requests](https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/requests), [streamed request](https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/requests/01a16a26-eea7-7bf2-8e5e-d3dfa30a9c7d), [function-call request](https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/requests/01a16a2b-da22-7d52-810c-9b37102ccb15). Screenshots are in `results/requests-after-training.png`, `results/task-reviewing.png`, `results/stream-reviewed.png`, and `results/tool-call-record.png`.

## MCP investigation

The plugin-directory search returned no Mubit plugin. Public research did find the published [`@mubit-ai/mcp`](https://www.npmjs.com/package/@mubit-ai/mcp), version **0.8.0**. Its tools target memory and agent coordination, not the current inference dashboard. The [older Codex integration repository](https://github.com/mubit-ai/claude-plugins/blob/main/integrations/codex/README.md) was marked archived on September 22, 2026. Indexed MCP documentation at `https://docs.mubit.ai/sdk/integrations/mcp` remained searchable, but fetching that path directly returned 404; it is not in the current documentation index.

Inspected the registry package, installed it only in `/private/tmp/mubit-mcp-inspect/runtime`, and used `scripts/probe-mcp.mjs` to connect through stdio. `tools/list` succeeded and returned 21 tools: remember, recall, context, reflect, lessons, forget, checkpoint, archive, dereference, memory_health, diagnose, register_agent, list_agents, outcome, learned, step_outcome, ingest_status, strategies, handoff, feedback, and status (each prefixed `mubit_`). None lists inference requests, tasks, adapters or their metrics.

Only the read-only `mubit_status` tool was called. Its SDK requested `/v2/core/health` from `https://api.mubit.ai` and received `middleware_gateway_error`, code `unknown_route`. The response identified the supported current routes as `/anthropic/…`, `/openai/v1/…`, `/gemini/…`, and `/compat/<provider>/v1/…`. Thus the published MCP can start, but its memory API is incompatible with the gateway endpoint used by this project. No persistent MCP registration or memory hooks were installed, and no memory data was written. Sanitized evidence: `results/mcp-discovery.json`.

Inference is already automated through the OpenAI SDK and the local scripts. No compatible official dashboard-management MCP or documented management API was found in the reviewed sources. Dashboard inspection still uses the browser. At that check the next useful test was to inspect kept-example and training progress; the subsequent observation follows below.

### First version and evaluation, 20:25–20:37 London time

The plain classifier task reached **41 kept examples**. Training began at 20:25:30 and v1 was created at 20:29:02 according to the console. This verifies that the recorded traffic progressed through the training workflow; it does not verify export or adapter inference. Strict JSON and tool-call traffic appeared as two separate tasks, each collecting 1 of 25 examples.

Adapter `ad_lane_9f3fe5ae` reported **v1 silent test 10% (prompt only) · your provider model answers**. Try it was disabled with **Not in Try models: prompt only**. The evaluation showed:

- Adapter: 11 of 12 held-out checks, 91.7%, displayed interval 64.6–98.5%.
- Base model plus prompt: 12 of 12, 100%, displayed interval 75.8–100%.
- Schema validity: not measured. Provider model: not measured in the comparison table; the reference was recorded provider answers.
- Held-out row 2 differed: adapter `billing`, recorded provider `other`. The input was not shown in the expanded Replies row, so this alone cannot adjudicate which answer was correct.
- The console required at least 20 judged cases for live promotion and a 0.05 improvement margin over the untuned base. This version had only 12 and did not beat the base. The explanation said the adapter was not served because the step's rules alone did as well.

The explanatory text also describes comparison with the frontier, while the explicit table labels the provider as unmeasured. Preserve that distinction: do not present this as an independent benchmark of current Luna. The sample is small and its intervals overlap. The result demonstrates the selection workflow, not an adaptation win or general inferiority. A richer task where expert corrections add behavior is needed for the hackathon.

Evidence: `results/first-adapter-evaluation.txt`, `results/first-adapter-evaluation.png`, and [the live adapter](https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/adapters/ad_lane_9f3fe5ae). No new calls or settings changes were made during this observation.
