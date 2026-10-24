import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {queryModel, instructions, schema, knowledge, redact, researchFor, mapCandidates} from '../../src/core.mjs';
import {catalog, validateScene} from '../../src/map-contract.mjs';
import {researchFresh} from '../../src/research.mjs';
import {describeInference} from '../../src/inference.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hashCanonical = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const root = new URL('../../', import.meta.url);
const outputDir = new URL('../../results/spatial-wave4/', import.meta.url);
const outputPath = new URL('luna-teaching-24.json', outputDir);
const excluded = /greville street|hatton garden|farringdon|chancery lane|canary wharf/i;
const curricula = [
  new URL('luna-travel-curriculum.json', import.meta.url),
  new URL('luna-map-curriculum.json', import.meta.url),
];
const sets = await Promise.all(curricula.map(async url => JSON.parse(await readFile(url, 'utf8'))));
if (sets.some(set => set.author_model !== 'gpt-6-luna')) throw new Error('Every curriculum must be Luna-authored.');
const cases = sets.flatMap(set => set.cases);
if (cases.length !== 24) throw new Error(`Expected 24 curriculum cases, got ${cases.length}.`);
if (new Set(cases.map(c => c.id)).size !== cases.length || new Set(cases.map(c => c.question)).size !== cases.length) throw new Error('Duplicate case IDs or questions.');
const catalogIds = new Set(catalog.places.map(p => p.id));
for (const c of cases) {
  if (excluded.test(c.question)) throw new Error(`${c.id}: excluded topic in question.`);
  const research = researchFor(c.question);
  if (!researchFresh(research)) throw new Error(`${c.id}: saved research is stale.`);
  const candidates = mapCandidates(c.question, [], research);
  for (const pin of c.expected_scene.places) {
    if (!catalogIds.has(pin.id) || !candidates.some(p => p.id === pin.id)) throw new Error(`${c.id}: expected pin is absent from offline candidates: ${pin.id}`);
  }
  validateScene(c.expected_scene, candidates);
}
if (!process.env.MUBIT_API_KEY?.trim().startsWith('mbt_')) throw new Error('MUBIT_API_KEY is unavailable or malformed; no calls made.');

const manifest = {
  requested_model: 'gpt-6-luna',
  recording: 'full',
  capture_input: true,
  cache: 'bypassed; queryModel called directly',
  retries: 0,
  task_hash: createHash('sha256').update(JSON.stringify([instructions, schema])).digest('hex'),
  task_hash_algorithm: 'sha256(JSON.stringify([instructions,schema])) with JavaScript object insertion order preserved',
  canonical_task_hash: hashCanonical([instructions, schema]),
  canonical_task_hash_algorithm: 'feedback.mjs canonical(value): recursively sort object keys, preserve array order, JSON.stringify, then SHA-256',
  answer_template_included: false,
  response_capture: 'Ordinary grounded queryModel output and request payload; source_ids and answer preserved; curriculum expectations omitted.',
  knowledge_version: knowledge.version,
  case_ids: cases.map(c => c.id),
  offline_validation: 'All 24 cases passed research freshness, excluded-topic, mapCandidate pin, and validateScene checks.',
};
let rows = [];
try {
  const prior = JSON.parse(await readFile(outputPath, 'utf8'));
  if (prior.manifest?.case_ids?.join('\n') !== cases.map(c => c.id).join('\n')) throw new Error('Existing result belongs to another batch.');
  rows = prior.results || [];
  if (rows.length > cases.length || rows.some((row, i) => row.case_id !== cases[i].id)) throw new Error('Existing checkpoint is not a valid sequential prefix.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const checkpoint = async () => {
  await mkdir(outputDir, {recursive: true, mode: 0o700});
  const schemaValid = rows.filter(r => r.response && !r.error).length;
  const summary = {
    attempted: rows.length,
    total: cases.length,
    schema_valid: schemaValid,
    exact_scene_diagnostics: rows.filter(r => r.diagnostics?.exact_scene_match).length,
    errors: rows.filter(r => r.error).length,
    total_tokens: rows.reduce((n, r) => n + (r.response?.usage?.total_tokens || 0), 0),
  };
  await writeFile(outputPath, JSON.stringify({manifest, summary, results: rows}, null, 2), {mode: 0o600});
};
let stopReason = null;
for (const c of cases.slice(rows.length)) {
  try {
    const response = await queryModel(c.question, {
      mode: 'grounded', recording: 'full', capture_input: true, teacher_recovery: false,
    });
    const identity = describeInference(response);
    const outcomeTimestamp = new Date().toISOString();
    if (identity.route !== 'luna' || response.completion_model !== 'gpt-6-luna') stopReason = 'Luna identity was not positively verified; stopped before the next call.';
    const expected = c.expected_scene;
    const actualPins = response.scene.places.map(({id, role}) => ({id, role}));
    const expectedPins = expected.places.map(({id, role}) => ({id, role}));
    const exact = expected.camera === response.scene.camera && JSON.stringify(expectedPins) === JSON.stringify(actualPins);
    rows.push({
      case_id: c.id,
      question: c.question,
      response,
      identity_audit: identity,
      outcome_timestamp: outcomeTimestamp,
      outcome_timestamp_source: 'Local wall clock captured immediately after queryModel returned.',
      diagnostics: {exact_scene_match: exact, expected_scene: expected, actual_scene: response.scene},
    });
  } catch (error) {
    const status = Number(error.status || error.statusCode || 0);
    rows.push({
      case_id: c.id,
      question: c.question,
      outcome_timestamp: new Date().toISOString(),
      outcome_timestamp_source: 'Local wall clock captured immediately after queryModel error; no provider response time is implied.',
      error: {name: error.name, message: redact(error.message), status: status || null,
        request_id: error.request_id || null, rejected_output: error.rejected_output ? redact(error.rejected_output) : null,
        inference: error.inference || null},
    });
    if ([401, 403, 429].includes(status)) stopReason = `Authentication/quota failure (HTTP ${status}); stopped.`;
    else console.log(`No retry or repair for failed call ${c.id}; proceeding to next case.`);
  }
  await checkpoint();
  const row = rows.at(-1);
  console.log(JSON.stringify({completed: rows.length, total: cases.length, case_id: c.id,
    outcome: row.error ? 'error' : 'response', request_id: row.response?.request_id || row.error?.request_id || null,
    model: row.response?.completion_model || null, stop_reason: stopReason}));
  if (stopReason) break;
}
manifest.stop_reason = stopReason;
await checkpoint();
console.log(`RESULT ${outputPath.pathname}`);
