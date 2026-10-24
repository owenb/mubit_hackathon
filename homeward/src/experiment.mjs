import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { queryModel, root, redact, knowledge, knowledgeHash, instructions, schema } from './core.mjs';
import { createHash } from 'node:crypto';
const { values, positionals } = parseArgs({ allowPositionals: true, options: { mode: { type: 'string', default: 'grounded' }, count: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
const split = positionals[0] || 'eval';
if (!['eval', 'train'].includes(split) || !['grounded', 'memory'].includes(values.mode)) throw new Error('Use eval|train --mode grounded|memory [--count N] [--dry-run]');
if (split === 'train' && values.mode !== 'grounded') throw new Error('Train only on source-grounded answers');
const cases = JSON.parse(await readFile(new URL(`data/${split}.json`, root), 'utf8'));
const count = values.count === undefined ? cases.length : Number(values.count);
if (!Number.isInteger(count) || count < 1 || count > cases.length) throw new Error('Invalid bounded call count');
const selected = cases.slice(0, count);
const manifest = { split, mode: values.mode, cases: count, recording: split === 'train' ? 'full' : 'metadata',
  max_output_tokens_per_call: 900, knowledge_hash: knowledgeHash,
  case_hash: createHash('sha256').update(JSON.stringify(cases)).digest('hex'),
  task_hash: createHash('sha256').update(JSON.stringify([instructions, schema])).digest('hex'),
  system_prompt: instructions, output_schema: schema, research_snapshot: knowledge,
  scoring: 'Exact structured access/kind agreement only. Free text requires separate review; not a full answer-quality score.' };
console.log(JSON.stringify(manifest));
if (values['dry-run']) { console.log(JSON.stringify(selected, null, 2)); process.exit(0); }
await mkdir(new URL('results/', root), { recursive: true });
const path = new URL(`results/${split}-${values.mode}-${new Date().toISOString().replaceAll(':', '-')}.json`, root);
const results = [];
for (const c of selected) {
  try {
    const response = await queryModel(c.question, { mode: values.mode, recording: manifest.recording });
    const passed = response.static_access === c.expected_access && response.response_kind === c.expected_kind;
    results.push({ ...c, ...response, passed });
    console.log(`${c.id}: ${response.static_access}/${response.response_kind} ${passed ? 'matched' : 'MISMATCH'} ${response.elapsed_ms}ms`);
  } catch (e) {
    results.push({ ...c, error: redact(e.message) });
    await writeFile(path, JSON.stringify({ manifest, results }, null, 2));
    throw e;
  }
  await writeFile(path, JSON.stringify({ manifest, results }, null, 2));
}
const latencies = results.map(r => r.elapsed_ms).sort((a,b)=>a-b);
const summary = { matched: results.filter(r => r.passed).length, cases: results.length,
  median_ms: latencies[Math.floor(latencies.length / 2)], p95_ms: latencies[Math.ceil(latencies.length * .95)-1],
  tokens: results.reduce((s,r)=>s+(r.usage?.total_tokens || 0),0), file: path.pathname };
await writeFile(path, JSON.stringify({ manifest, summary, results }, null, 2));
console.log(JSON.stringify(summary));
