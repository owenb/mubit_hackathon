import OpenAI from 'openai';
import {readFile, writeFile, mkdir, open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {instructions, schema, taskHash, appTaskHash, experiment, finalHeldoutSha256, packet, validate, diagnosticChecks, hash} from './contract.mjs';
import {createMubitFetch, safeResponseHeaders, inferenceHeaders} from '../../src/mubit-telemetry.mjs';
import {describeInference} from '../../src/inference.mjs';
import {redact} from '../../src/core.mjs';

const mode = process.argv[2] || 'prepare';
if (!['prepare', 'teach', 'luna-dev'].includes(mode)) throw new Error('Use prepare, teach or luna-dev');
const dir = new URL('./', import.meta.url);
const resultsDir = new URL('./results/', dir);
await mkdir(resultsDir, {recursive: true, mode: 0o700});
const read = async name => JSON.parse(await readFile(new URL(name, dir), 'utf8'));
// Evaluation reads the frozen input snapshots, never a mutable training file.
const training = mode === 'luna-dev' ? null : await read('training-cases.json');
const development = await read('development-cases.json');
const casesOf = x => Array.isArray(x) ? x : x.cases;
const trainRows = training ? casesOf(training) : [], devRows = casesOf(development);
if ((mode !== 'luna-dev' && trainRows.length !== 40) || devRows.length !== 6) throw new Error('Expected 40 training and six development cases');
const questions = [...trainRows, ...devRows].map(r => r.question.toLowerCase().replace(/\W+/g, ' ').trim());
if (new Set(questions).size !== questions.length) throw new Error('Duplicate/overlapping train and development questions');
const excluded = /greville|hatton|farringdon|chancery lane|canary wharf/i;
if ([...trainRows, ...devRows].some(r => excluded.test(r.question))) throw new Error('Reserved development topic included');
const heldoutDigest = async () => createHash('sha256').update(await readFile(new URL('../../data/travel-final-heldout.json', dir))).digest('hex');
if (await heldoutDigest() !== finalHeldoutSha256) throw new Error('Final heldout file changed');
const generatedPackets = [...trainRows, ...devRows].map(row => {
  const input = packet(row);
  // Local checks only. Rubric requirements never enter the model input.
  for (const id of row.source_fact_ids || []) if (!input.research.facts.some(f => f.id === id)) throw new Error(`${row.id}: required evidence was not retrieved: ${id}`);
  for (const pin of row.expected_scene?.places || []) if (!input.map_candidates.some(p => p.id === pin.id)) throw new Error(`${row.id}: expected map anchor was not retrieved: ${pin.id}`);
  return {id: row.id, input, input_sha256: hash(input)};
});
const config = {model: 'gpt-6-luna', reasoning_effort: 'none', max_completion_tokens: 900};
const manifest = {
  experiment, task_hash: taskHash, original_app_task_hash: appTaskHash,
  training_cases_sha256: hash(training), development_cases_sha256: hash(development),
  instructions, schema, generation: config, final_heldout_sha256: finalHeldoutSha256,
  training_cases: 40, development_cases: 6, app_integration: false,
  test_limitations: ['This is v1 of a new task, not original Homeward v2.', 'Instructions differ from original Homeward; any comparison is specific to this task.', 'Playground decoding settings are not fully exposed.', 'Luna-authored development rubrics are not independent expert judgments.'],
  packets: generatedPackets,
};
const manifestUrl = new URL('manifest.json', dir);
if (mode === 'prepare') {
  try { await readFile(new URL('teach.lock', resultsDir)); throw new Error('Teaching has begun: do not regenerate the frozen manifest'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  await writeFile(manifestUrl, JSON.stringify({...manifest, frozen_at: new Date().toISOString()}, null, 2) + '\n', {mode: 0o600});
  const inputsDir = new URL('development-inputs/', dir); await mkdir(inputsDir, {recursive:true, mode:0o700});
  for (const row of generatedPackets.slice(40)) await writeFile(new URL(row.id+'.txt', inputsDir), JSON.stringify(row.input), {mode:0o600});
  console.log(JSON.stringify({prepared: true, training:40, development:6, task_hash:taskHash, max_input_bytes:Math.max(...generatedPackets.map(r=>Buffer.byteLength(JSON.stringify(r.input)))), api_calls:0}));
  process.exit(0);
}
const frozen = await read('manifest.json');
const keys = mode === 'luna-dev' ? ['task_hash','development_cases_sha256'] : ['task_hash','training_cases_sha256','development_cases_sha256'];
for (const key of keys) if (frozen[key] !== manifest[key]) throw new Error(`Frozen ${key} changed`);
const allPackets = mode === 'luna-dev' ? frozen.packets.filter(p=>devRows.some(r=>r.id===p.id)) : frozen.packets;
if (hash(allPackets) !== hash(generatedPackets)) throw new Error('Evidence packets changed since freeze');
if (allPackets.some(p=>hash(p.input)!==p.input_sha256)) throw new Error('Frozen input integrity failure');
if (!process.env.MUBIT_API_KEY?.startsWith('mbt_')) throw new Error('Mubit key unavailable');
if (process.env.MUBIT_BASE_URL && process.env.MUBIT_BASE_URL.replace(/\/$/,'') !== 'https://api.mubit.ai/openai/v1') throw new Error('Unexpected Mubit endpoint');
const lock = await open(new URL(mode+'.lock', resultsDir), 'wx', 0o600);
await lock.writeFile(new Date().toISOString()); await lock.close();
const recording = mode === 'teach' ? 'full' : 'metadata';
const rows = mode === 'teach' ? trainRows : devRows;
const client = new OpenAI({apiKey:process.env.MUBIT_API_KEY, baseURL:'https://api.mubit.ai/openai/v1', fetch:createMubitFetch({source:experiment+'-'+mode}), maxRetries:0, timeout:60000});
const report = {experiment, task_hash:taskHash, mode, generation:config, recording, started_at:new Date().toISOString(), status:'running', retries:0, cache:false, target_answers_in_input:false, final_questions_used:false, app_route_changed:false, results:[]};
const reportUrl = new URL(mode+'.json', resultsDir);
const save = () => writeFile(reportUrl, JSON.stringify(report,null,2)+'\n', {mode:0o600});
try {
  for (const row of rows) {
    const entry = {case_id:row.id, input:allPackets.find(p=>p.id===row.id).input, started_at:new Date().toISOString()};
    report.results.push(entry); await save();
    const start = performance.now();
    const {data,response} = await client.chat.completions.create({...config,
      messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(entry.input)}],
      response_format:{type:'json_schema',json_schema:{name:'homeward_corrected_guide_lab',strict:true,schema}},
    },{headers:{'x-middleware-record':recording}}).withResponse();
    Object.assign(entry,{finished_at:new Date().toISOString(),elapsed_ms:Math.round(performance.now()-start),request_id:response.headers.get('x-middleware-request-id'),completion_model:data.model,response_headers:safeResponseHeaders(response.headers),usage:data.usage,finish_reason:data.choices[0]?.finish_reason,raw:data.choices[0]?.message?.content});
    entry.inference=describeInference({requested_model:config.model,completion_model:data.model,request_id:entry.request_id,provider_request_id:response.headers.get('x-request-id'),response_headers:inferenceHeaders(response.headers),recording});
    if (!entry.request_id || entry.inference.route !== 'luna' || data.model !== 'gpt-6-luna') throw new Error('Luna identity not positively verified; stop');
    if (entry.finish_reason !== 'stop') throw new Error('Incomplete answer; no retry');
    entry.output=validate(JSON.parse(entry.raw),entry.input);
    entry.checks=diagnosticChecks(entry.output,row);
    await save();
    console.log(JSON.stringify({completed:report.results.length,total:rows.length,case_id:row.id,receipt:entry.request_id,model:data.model,scene_match:entry.checks.exact_scene}));
  }
  report.status='complete';
} catch (e) {
  report.status='stopped'; report.error=redact(e.message); process.exitCode=1;
} finally {
  report.finished_at=new Date().toISOString(); report.final_heldout_sha256_after=await heldoutDigest();
  if (report.final_heldout_sha256_after !== finalHeldoutSha256) {report.status='heldout_integrity_failure'; process.exitCode=1;}
  await save(); console.log(JSON.stringify({status:report.status,attempted:report.results.length,report:reportUrl.pathname,error:report.error}));
}
