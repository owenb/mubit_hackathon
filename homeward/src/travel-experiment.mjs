import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {queryModel,instructions,schema,knowledge,redact,researchFor,mapCandidates} from './core.mjs';
const mode=process.argv[2]||'eval';if(!['train','eval'].includes(mode))throw new Error('Use train or eval');
const selected=process.argv.find(a=>a.startsWith('--ids='))?.slice(6).split(',');
const count=Number(process.argv.find(a=>a.startsWith('--count='))?.slice(8)||100);
if(!Number.isInteger(count)||count<1||count>100)throw new Error('Count must be 1–100');
const split=process.argv.includes('--wave3')?'wave3':process.argv.includes('--wave2')?'wave2':process.argv.includes('--corrections')?'corrections':mode;
const cases=JSON.parse(await readFile(new URL(`../data/travel-${split}.json`,import.meta.url),'utf8')).filter(c=>!selected||selected.includes(c.id)).slice(0,count);
const dry=process.argv.includes('--dry-run');
const recording=mode==='train'?'full':'metadata';
const name=process.argv.find(a=>a.startsWith('--name='))?.slice(7)||mode;
if(!/^[a-zA-Z0-9-]+$/.test(name))throw new Error('Invalid run name');
const manifest={requested_model:'gpt-6-luna',recording,cache:'bypassed',instructions,schema,knowledge,cases,task_hash:createHash('sha256').update(JSON.stringify([instructions,schema])).digest('hex'),note:'Scene and answer-content development checks. Provider routing/adapter serving is independently unverified. Training records the actual teacher response, not the local scoring notes.'};
if(dry){console.log(JSON.stringify({mode,cases:cases.length,recording,task_hash:manifest.task_hash}));process.exit();}
await mkdir(new URL('../results/travel/',import.meta.url),{recursive:true});
const path=new URL(`../results/travel/${name}-${new Date().toISOString().replaceAll(':','-')}.json`,import.meta.url);
const rows=[];let stopped=false;
for(const c of cases){
 try{
  const r=await queryModel(c.question,{recording});
  const s=r.answer.toLowerCase();const ids=r.scene.places.map(p=>p.id);
  const content_ok=(c.contains||[]).every(t=>s.includes(t.toLowerCase()))&&(!c.any||c.any.some(t=>s.includes(t.toLowerCase())))&&!(c.forbidden||[]).some(t=>s.includes(t.toLowerCase()));
  const pins_ok=(c.places||[]).every(id=>ids.includes(id));
  const kind_ok=!c.expected_kind||r.response_kind===c.expected_kind;
  const source_ok=recording==='full'?r.source_ids.includes(c.source_id):r.source_ids.length>0||c.id==='travel-19'||c.id==='travel-20';
  const passed=content_ok&&pins_ok&&kind_ok&&source_ok;
  rows.push({...c,...r,checks:{content_ok,pins_ok,kind_ok,source_ok},passed,manual_review_required:true});
  console.log(`${c.id}: ${passed?'PASS':'REVIEW'} ${r.response_kind} ${r.elapsed_ms}ms ${r.answer}`);
 }catch(e){rows.push({...c,error:redact(e.message),request_id:e.request_id,rejected_output:e.rejected_output?redact(e.rejected_output):undefined});console.log(`${c.id}: ERROR ${redact(e.message)}`);stopped=true;}
 const summary={completed:rows.length,total:cases.length,matched:rows.filter(r=>r.passed).length,errors:rows.filter(r=>r.error).length,tokens:rows.reduce((s,r)=>s+(r.usage?.total_tokens||0),0)};
 await writeFile(path,JSON.stringify({manifest,summary,results:rows},null,2));
 if(stopped)break;
}
console.log(path.pathname);if(stopped)process.exitCode=1;
