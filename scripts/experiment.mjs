import {createMubitFetch} from '../homeward/src/mubit-telemetry.mjs';
import OpenAI from 'openai';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

const instructions = 'Label the support ticket as billing, bug, account, or other. Output exactly one lowercase label and nothing else.';
const samples = [
  { input: 'My card has two identical charges for this month. Please refund one.', expected: 'billing' },
  { input: 'Clicking Export causes the dashboard to show a blank page.', expected: 'bug' },
  { input: 'Please help me change the email address I use to sign in.', expected: 'account' },
  { input: 'Do you offer a discount to registered charities?', expected: 'other' },
  { input: 'Please send me a receipt for my latest subscription payment.', expected: 'billing' },
  { input: 'The Android app crashes every time I open Settings.', expected: 'bug' },
  { input: 'I forgot my password and need to regain access.', expected: 'account' },
  { input: 'Where can I read about your upcoming product webinars?', expected: 'other' },
];

function redact(value) {
  let result = String(value);
  for (const key of [process.env.OPENAI_API_KEY, process.env.MUBIT_API_KEY]) {
    if (key?.trim()) result = result.replaceAll(key.trim(), '[REDACTED]');
  }
  return result.replace(/\b(?:sk-|mbt_)[A-Za-z0-9_-]+/g, '[REDACTED]');
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      direct: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      count: { type: 'string' },
      record: { type: 'string', default: 'full' },
    },
  });
  const mode = positionals[0] ?? 'doctor';
  if (positionals.length > 1 || !['doctor', 'smoke', 'batch', 'session', 'stream', 'responses', 'structured', 'tools', 'training'].includes(mode)) {
    throw new Error('Use doctor, smoke, batch, session, stream, responses, structured, tools, or training. Optional: --direct --dry-run --count 4 --record full|metadata|off');
  }
  if (!['full', 'metadata', 'off'].includes(values.record)) throw new Error('Invalid --record value.');
  if (values.count && !['batch', 'training'].includes(mode)) throw new Error('--count is supported only with batch or training.');
  if (values.direct && values.record !== 'full') throw new Error('--record controls Mubit only; omit it with --direct.');

  const direct = values.direct;
  const baseURL = direct ? 'https://api.openai.com/v1' : (process.env.MUBIT_BASE_URL || 'https://api.mubit.ai/openai/v1');
  const url = new URL(baseURL);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      (!direct && (!url.hostname.endsWith('.mubit.ai') || url.pathname.replace(/\/$/, '') !== '/openai/v1'))) {
    throw new Error('MUBIT_BASE_URL must be the HTTPS OpenAI base URL on a mubit.ai host shown by Connect.');
  }
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-6-luna';
  const keyName = direct ? 'OPENAI_API_KEY' : 'MUBIT_API_KEY';
  const apiKey = process.env[keyName]?.trim();

  if (mode === 'doctor') {
    console.log(JSON.stringify({
      node: process.version, model, mubitBaseURL: baseURL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ? 'set' : 'missing',
      MUBIT_API_KEY: process.env.MUBIT_API_KEY?.trim() ? 'set' : 'missing',
      note: 'No network calls. An OpenAI key in .env does not register it with Mubit; use starter credit or configure Provider keys in the console.',
    }, null, 2));
    return;
  }

  const sourceSamples = mode === 'training'
    ? JSON.parse(await readFile(new URL('../data/training-tickets.json', import.meta.url), 'utf8'))
    : samples;
  const count = mode === 'training' ? Number(values.count ?? sourceSamples.length)
    : mode === 'batch' ? Number(values.count ?? '4') : mode === 'session' ? 2 : 1;
  if (!Number.isInteger(count) || count < 1 || count > sourceSamples.length) {
    throw new Error(`This mode supports 1–${sourceSamples.length} calls.`);
  }
  const runId = `hackathon-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
  const selected = mode === 'session'
    ? [samples[2], { input: 'The new sign-in address should replace my old one. How can I update it?', expected: 'account' }]
    : sourceSamples.slice(0, count);
  const taskInstructions = ['structured', 'tools'].includes(mode)
    ? 'Classify the support ticket as billing, bug, account, or other. Return the category using the required structured format.'
    : instructions;
  const categorySchema = {
    type: 'object', properties: { category: { type: 'string', enum: ['billing', 'bug', 'account', 'other'] } },
    required: ['category'], additionalProperties: false,
  };
  const conversation = [{ role: 'system', content: taskInstructions }];
  const plan = selected.map((sample, index) => ({
    ...sample,
    localConversationId: mode === 'session' ? runId : `${runId}-${index + 1}`,
  }));

  console.log(JSON.stringify({
    mode, target: direct ? 'OpenAI direct' : 'Mubit', baseURL, model,
    calls: count, recording: direct ? 'not applicable' : values.record,
    maxOutputTokensPerCall: 128, reasoning: 'none', automaticRetries: 0,
    providerStore: mode === 'training' ? 'omitted (quickstart default)' : false,
  }, null, 2));
  if (values['dry-run']) {
    console.log(JSON.stringify({ instructions: taskInstructions, samples: plan }, null, 2));
    return;
  }
  if (!apiKey) throw new Error(`Add ${keyName} to .env first. No requests were sent.`);
  if (!direct && !apiKey.startsWith('mbt_')) throw new Error('MUBIT_API_KEY must be a Mubit inference key beginning mbt_.');
  if (direct && apiKey.startsWith('mbt_')) throw new Error('OPENAI_API_KEY contains a Mubit key; use your OpenAI API key for a direct baseline.');

  const client = new OpenAI({ fetch: direct ? undefined : createMubitFetch({source:'experiment'}), apiKey, baseURL, maxRetries: 0, timeout: 60_000 });
  const options = direct ? {} : { headers: { 'x-middleware-record': values.record } };
  const results = [];
  const resultsDir = new URL('../results/', import.meta.url);
  const resultFile = new URL(`${runId}.json`, resultsDir);
  await mkdir(resultsDir, { recursive: true, mode: 0o700 });
  const save = () => writeFile(resultFile, redact(JSON.stringify({ runId, mode, direct, baseURL, model, recording: values.record, instructions: taskInstructions, results }, null, 2)) + '\n', { mode: 0o600 });

  for (const [index, sample] of plan.entries()) {
    const startedAt = new Date().toISOString();
    const start = performance.now();
    const messages = mode === 'session'
      ? [...conversation, { role: 'user', content: sample.input }]
      : [{ role: 'system', content: taskInstructions }, { role: 'user', content: sample.input }];
    let response;
    let output = '';
    let usage;
    let finishReason;
    let toolCalls;
    let firstContentMs;
    let streamChunks = 0;
    try {
      if (mode === 'responses') {
        const raw = await client.responses.create({
          model, instructions: taskInstructions, input: sample.input,
          reasoning: { effort: 'none' }, max_output_tokens: 128, store: false,
        }, options).withResponse();
        response = raw.response;
        output = raw.data.output_text;
        usage = raw.data.usage;
        finishReason = raw.data.status;
      } else {
        const raw = await client.chat.completions.create({
          model, messages, reasoning_effort: 'none', max_completion_tokens: 128,
          ...(mode === 'training' ? {} : { store: false }),
          ...(mode === 'stream' ? { stream: true, stream_options: { include_usage: true } } : {}),
          ...(mode === 'structured' ? { response_format: { type: 'json_schema', json_schema: { name: 'support_category', strict: true, schema: categorySchema } } } : {}),
          ...(mode === 'tools' ? {
            tools: [{ type: 'function', function: { name: 'route_support_ticket', description: 'Choose a support queue. This experiment does not execute the function.', strict: true, parameters: categorySchema } }],
            tool_choice: { type: 'function', function: { name: 'route_support_ticket' } }, parallel_tool_calls: false,
          } : {}),
        }, options).withResponse();
        response = raw.response;
        if (mode === 'stream') {
          for await (const chunk of raw.data) {
            streamChunks++;
            if (chunk.choices[0]?.delta?.content && firstContentMs === undefined) firstContentMs = Math.round(performance.now() - start);
            output += chunk.choices[0]?.delta?.content ?? '';
            usage = chunk.usage ?? usage;
            finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
          }
        } else {
          output = raw.data.choices[0]?.message?.content ?? '';
          toolCalls = raw.data.choices[0]?.message?.tool_calls;
          if (mode === 'tools') output = toolCalls?.[0]?.function?.arguments ?? '';
          usage = raw.data.usage;
          finishReason = raw.data.choices[0]?.finish_reason;
        }
      }
      const mubitRequestId = response.headers.get('x-middleware-request-id');
      let category = output.trim();
      if (['structured', 'tools'].includes(mode)) {
        try { category = JSON.parse(output).category; } catch { category = null; }
      }
      const passed = category === sample.expected && (mode !== 'tools' || (toolCalls?.length === 1 && toolCalls[0].function?.name === 'route_support_ticket'));
      const result = {
        startedAt, input: sample.input, expected: sample.expected, output, passed,
        localConversationId: sample.localConversationId, status: response.status,
        elapsedMs: Math.round(performance.now() - start), finishReason, usage, toolCalls,
        ...(mode === 'stream' ? { streamChunks, firstContentMs } : {}),
        mubitRequestId, providerRequestId: response.headers.get('x-request-id'),
      };
      results.push(result);
      await save();
      console.log(mode === 'training' ? `${index + 1}/${count}: ${output.trim()} (${passed ? 'matched' : 'MISMATCH'}, ${result.elapsedMs} ms)` : redact(JSON.stringify(result, null, 2)));
      if (!direct && !mubitRequestId) throw new Error('No Mubit request-ID header returned. Stop and verify the Connect URL.');
      if (mode === 'session') conversation.push({ role: 'user', content: sample.input }, { role: 'assistant', content: output });
    } catch (error) {
      results.push({
        startedAt, input: sample.input, localConversationId: sample.localConversationId,
        error: redact(error.message), status: error.status ?? null,
        code: error.code ?? null,
        mubitRequestId: error.headers?.get?.('x-middleware-request-id') ?? response?.headers.get('x-middleware-request-id') ?? null,
        retryAfter: error.headers?.get?.('retry-after') ?? null,
      });
      await save();
      console.error(`Stopped on call ${index + 1}; no automatic retries. Results: ${resultFile.pathname}`);
      throw error;
    }
  }
  console.log(`${results.filter(r => r.passed).length}/${count} expected labels matched. Results: ${resultFile.pathname}`);
  if (results.some(r => !r.passed)) process.exitCode = 2;
}

main().catch(error => {
  console.error(redact(error.message));
  process.exitCode = 1;
});
