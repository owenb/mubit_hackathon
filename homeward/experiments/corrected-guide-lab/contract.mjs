// Isolated experiment; the application must never import this module.
import {createHash} from 'node:crypto';
import {instructions as appInstructions, schema, knowledge, researchFor, mapCandidates, validateAnswer} from '../../src/core.mjs';
import {contextFor, validateScene} from '../../src/map-contract.mjs';
import {researchFresh} from '../../src/research.mjs';

export {schema};
export const experiment = 'homeward-corrected-guide-lab-2026-10-24';
export const finalHeldoutSha256 = 'a8a19175c5ec7b3b0309b897ef4c92ddf19f797634ad141f6f3b19e6b01abe91';
export const instructions = `Homeward corrected guide lab, isolated experiment 2026-10-24.\n${appInstructions}\nApply the corrected guide conventions consistently: a station mentioned as the location of an interchange is context, unless the user explicitly makes it the journey's origin or destination. A proposed stop is not automatically the user's starting point. Keep timing estimates attached to the exact endpoints and conditions named in the evidence; never transfer a whole-walk estimate to an arbitrary segment. A step-free interchange does not establish street access, indoor-only travel or current lift operation. Return the declared JSON object only.`;
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
export const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(canonical(x))).digest('hex');
export const taskHash = hash([instructions, schema]);
export const appTaskHash = hash([appInstructions, schema]);
if (taskHash === appTaskHash) throw new Error('Experiment must have a separate task fingerprint');

// Every case uses the same retrieval/compaction policy. No rubric, expected
// answer, previous output or per-case target facts are sent to either model.
export function packet(row) {
  const context = contextFor(row.context_ids || []);
  const research = researchFor(row.question, context);
  if (!researchFresh(research)) throw new Error(`${row.id}: evidence snapshot needs revalidation`);
  const candidates = mapCandidates(row.question, context, research);
  const input = {
    date: '2026-10-24', question: row.question, map_context: context,
    map_candidates: candidates.map(({id, name, lines}) => ({id, name, lines})),
    research: {
      version: knowledge.version,
      facts: research.facts.map(({id, text, source_ids, place_ids}) => ({id, text, source_ids, place_ids})),
      sources: research.sources.map(({id, url, retrieved_at}) => ({id, url, retrieved_at})),
    },
  };
  if (Buffer.byteLength(JSON.stringify(input)) > 8000) throw new Error(`${row.id}: input exceeds isolated playground budget`);
  return input;
}

export function validate(output, input) {
  validateAnswer(output);
  validateScene(output.scene, input.map_candidates);
  if (output.source_ids.some(id => !input.research.sources.some(s => s.id === id))) throw new Error('Cited source was not supplied');
  return output;
}

export function diagnosticChecks(output, row) {
  const key = scene => JSON.stringify({camera: scene.camera, places: scene.places.map(p => `${p.id}|${p.role}`).sort()});
  return {
    exact_scene: row.expected_scene ? key(output.scene) === key(row.expected_scene) : null,
    response_kind: row.expected_response_kind ? output.response_kind === row.expected_response_kind : null,
    static_access: row.expected_static_access ? output.static_access === row.expected_static_access : null,
    semantic_answer: 'ungraded: use the frozen required_points and forbidden_claims rubric',
  };
}
