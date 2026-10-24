import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {instructions,schema,researchFor,mapCandidates,validateAnswer} from './core.mjs';
import {validateScene} from './map-contract.mjs';
import {researchFresh} from './research.mjs';
import {compactPayload} from './payload.mjs';

export const heldoutHash='a8a19175c5ec7b3b0309b897ef4c92ddf19f797634ad141f6f3b19e6b01abe91';
export const generation={reasoning_effort:'none',max_completion_tokens:900};
export const digest=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export async function loadHeldout(){
 const raw=await readFile(new URL('../data/travel-final-heldout.json',import.meta.url),'utf8');
 if(digest(raw)!==heldoutHash)throw Error('Frozen evaluation checksum changed; do not report it as the original held-out set');
 const set=JSON.parse(raw);if(set.cases.length!==20)throw Error('Expected the frozen 20 cases');return set;
}
export function evaluationPacket(c,date=new Date().toISOString().slice(0,10)){
 const research=researchFor(c.question),candidates=mapCandidates(c.question,[],research);
 if(!researchFresh(research))throw Error('Evaluation evidence needs revalidation');
 const payload=compactPayload({case_id:c.id,date,question:c.question,map_context:[],map_candidates:candidates.map(({id,name,aliases,lines})=>({id,name,aliases,lines})),research});
 return {body:{model:'gpt-6-luna',...generation,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(payload)}],response_format:{type:'json_schema',json_schema:{name:'homeward_access',strict:true,schema}}},payload};
}
export function checkServing(result,arm,version){
 const evidence=result.inference;
 if(evidence?.route!==arm||!evidence.request_id)throw Error(`Expected ${arm}, received ${evidence?.route||'unverified'}; final evaluation halted`);
 if(arm==='mubit_adapter'){
  if(!evidence.adapter_id||!evidence.adapter_version||!evidence.evidence?.length)throw Error('Adapter ID, version and serving evidence are required');
  const identity=evidence.adapter_id+':'+evidence.adapter_version;
  if(version&&identity!==version)throw Error('Adapter version changed during evaluation');return identity;
 }
 if(evidence.response_model!=='gpt-6-luna')throw Error('Luna comparator identity is not verified');
 return 'gpt-6-luna';
}
export function structuralGrade(result,packet){
 try{
  if(result.finish_reason!=='stop')throw Error('Generation did not finish normally');
  const answer=typeof result.output==='string'?JSON.parse(result.output):result.output;
  const exactKeys=(value,keys)=>{if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw Error('Output violates the strict object schema');};
  exactKeys(answer,schema.required);exactKeys(answer.scene,['camera','places']);
  if(!Array.isArray(answer.scene.places))throw Error('Map places must be an array');
  for(const place of answer.scene.places)exactKeys(place,['id','role']);
  validateAnswer(answer);validateScene(answer.scene,packet.payload.map_candidates);
  const supplied=new Set(packet.payload.research.sources.map(s=>s.id));
  if(answer.source_ids.some(id=>!supplied.has(id)))throw Error('Citation was not supplied');
  return {passed:true,error:null,answer};
 }catch(e){return {passed:false,error:e.message,answer:null};}
}
const quantile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.max(0,Math.ceil(p*a.length)-1)]:null;
export function wilson(passed,total){
 if(!total)return null;const z=1.959963984540054,p=passed/total,d=1+z*z/total;
 const centre=(p+z*z/(2*total))/d,margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
 return [Math.max(0,centre-margin),Math.min(1,centre+margin)];
}
export function summarizeEvaluation(run){
 const complete=run.rows.length===run.case_count&&run.rows.every(r=>r.mubit_adapter&&r.luna)&&!run.error;
 const graded=complete&&run.rows.every(r=>['mubit_adapter','luna'].every(a=>typeof r[a].grade?.full_task_pass==='boolean'&&r[a].grade?.adjudicated===true));
 const arms={};
 for(const arm of ['mubit_adapter','luna']){
  const rows=run.rows.map(r=>r[arm]).filter(Boolean),latencies=rows.map(r=>r.latency_ms).filter(Number.isFinite);
 const passed=graded?rows.filter(r=>r.structural.passed&&r.grade.full_task_pass).length:null;
  const semanticMap=graded&&rows.every(r=>typeof r.grade.map_correct==='boolean')?rows.filter(r=>r.structural.passed&&r.grade.map_correct).length:null;
  arms[arm]={calls:rows.length,structural_passes:rows.filter(r=>r.structural.passed).length,full_task_passes:passed,full_task_total:graded?run.case_count:null,map_correct:semanticMap,accuracy_ci95:graded?wilson(passed,run.case_count):null,
   latency_p50_ms:quantile(latencies,0.5),latency_p95_ms:quantile(latencies,0.95),tokens:rows.reduce((n,r)=>n+(r.usage?.total_tokens||0),0),observed_cost_usd:null,cost_note:'No attributable billing received. Token counts are not a price.',model:rows[0]?.inference?.response_model||null,adapter_id:rows[0]?.inference?.adapter_id||null,adapter_version:rows[0]?.inference?.adapter_version||null};
 }
 return {status:!complete?(run.phase==='collecting'&&!run.error?'running':'incomplete'):graded?'complete':'awaiting_adjudication',complete,adjudicated:graded,arms,
  observed_accuracy_difference:graded?(arms.mubit_adapter.full_task_passes-arms.luna.full_task_passes)/run.case_count:null,
  caveats:['20 question-held-out cases; taught topics overlap. This is not general model superiority.','Both arms receive identical source evidence, prompt, schema and generation settings.','No answer cache, no fallback recovery, and metadata-only Mubit recording. Provider prompt caching may still occur and is recorded in usage.','Latency is sequential client wall time; order alternates, with one warm-up/proof call per arm.','Model-blinded development-team adjudication is not independent expert assessment. Reviewer identity is retained.']};
}
// Caller contract is intentionally explicit. A gateway receipt or UI-only adapter
// demonstration cannot satisfy the production adapter proof gate.
export async function collectEvaluation({callers,cases,checkpoint=async()=>{},now=()=>new Date().toISOString()}){
 if(typeof callers?.mubit_adapter!=='function'||typeof callers?.luna!=='function')throw Error('Both verified API callers must be configured');
 const probe=evaluationPacket({id:'serving-canary',question:'At Bank station, is there street-to-platform lift access to the Northern line?'});
 const adapterProbe=await callers.mubit_adapter(structuredClone(probe.body));
 const version=checkServing(adapterProbe, 'mubit_adapter');
 const lunaProbe=await callers.luna(structuredClone(probe.body));
 checkServing(lunaProbe,'luna');
 // Final questions are never sent before BOTH serving gates have passed.
 const set=cases||((await loadHeldout()).cases),date=now().slice(0,10);
 const run={run_id:now().replaceAll(':','-'),created_at:now(),phase:'collecting',test_sha256:heldoutHash,task_hash:digest([instructions,schema]),adapter_identity:version,case_count:set.length,recording:'metadata',cache:false,recovery:false,serving_probes:{input_hash:digest(probe.body),mubit_adapter:adapterProbe,luna:lunaProbe},rows:[]};
 run.summary=summarizeEvaluation(run);
 await checkpoint(run);
 for(const [index,c] of set.entries()){
  const packet=evaluationPacket(c,date),row={id:c.id,question:c.question,topic:c.topic,essential_points:c.essential_points,input_hash:digest(packet.body),packet};run.rows.push(row);
  for(const arm of index%2?['luna','mubit_adapter']:['mubit_adapter','luna']){
   let response;
   try{
    response=await callers[arm](structuredClone(packet.body));
    checkServing(response,arm,arm==='mubit_adapter'?version:null);
    row[arm]={...response,structural:structuralGrade(response,packet),grade:null};
   }catch(error){row[arm]={...response,error:error.message,structural:{passed:false,error:error.message},grade:null};run.error=error.message;run.phase='failed';run.summary=summarizeEvaluation(run);await checkpoint(run);return run;}
   run.summary=summarizeEvaluation(run);await checkpoint(run);
  }
 }
 run.completed_at=now();run.phase='collected';run.summary=summarizeEvaluation(run);await checkpoint(run);return run;
}
export async function saveEvaluation(run){
 run.summary=summarizeEvaluation(run);
 const dir=new URL('../results/evaluation/',import.meta.url);await mkdir(dir,{recursive:true});
 await writeFile(new URL(run.run_id+'.json',dir),JSON.stringify(run,null,2));
 // Public UI data excludes model inputs, grading rubrics and private credentials.
 const report={schema_version:1,checked_at:new Date().toISOString(),run_id:run.run_id,test:{id:'travel-final-20',sha256:run.test_sha256,cases:run.case_count},...run.summary,error:run.error||null,
  rows:run.rows.map(({id,question,topic,mubit_adapter,luna})=>({id,question,topic,mubit_adapter,luna,scene_diff:sceneDiff(mubit_adapter,luna)}))};
 await writeFile(new URL('../data/evaluation-latest.json',import.meta.url),JSON.stringify(report,null,2));
}
export function sceneDiff(adapter,luna){
 const a=adapter?.structural?.answer?.scene,b=luna?.structural?.answer?.scene;if(!a||!b)return null;
 const ai=a.places.map(p=>p.id),bi=b.places.map(p=>p.id);
 return {adapter_only:ai.filter(id=>!bi.includes(id)),luna_only:bi.filter(id=>!ai.includes(id)),common:ai.filter(id=>bi.includes(id)),adapter_camera:a.camera,luna_camera:b.camera};
}
