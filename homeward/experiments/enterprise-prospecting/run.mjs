import {readFile,writeFile,open} from 'node:fs/promises';
import {enterpriseModel} from '../../src/enterprise-model.mjs';
import {taskHash,hash} from './contract.mjs';
const dir=new URL('./',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,dir),'utf8'));
const manifest=await read('manifest.json'),teach=await read('teaching-frozen.json'),dev=await read('development-frozen.json');
if(manifest.task_hash!==taskHash||hash(dev)!==manifest.development_rubric_sha256||hash(teach.rows)!==manifest.teaching_sha256)throw Error('Frozen experiment changed');
const mode=process.argv[2];if(!['before','teach','check'].includes(mode))throw Error('Use before, teach or check');
if(mode==='check'){console.log(JSON.stringify({taskHash,teaching:teach.rows.length,dev:manifest.development.length,model:manifest.generation.model}));process.exit(0);}
if(!process.env.BANK_DEMO_ISOLATED_PROJECT_ID||!process.env.BANK_DEMO_MUBIT_API_KEY||process.env.BANK_DEMO_MUBIT_API_KEY===process.env.MUBIT_API_KEY)throw Error('Isolated project required');
const continuing=process.argv.includes('--continue');
const lock=await open(new URL('results/'+mode+(continuing?'-continue':'')+'.lock',dir),'wx',0o600);await lock.writeFile(new Date().toISOString());await lock.close();
const report=continuing?await read('results/'+mode+'.json'):{mode,task_hash:taskHash,project_id:process.env.BANK_DEMO_ISOLATED_PROJECT_ID,started_at:new Date().toISOString(),status:'running',recording:mode==='teach'?'full':'metadata',retries:0,cache:false,results:[]};
report.status='running';
const save=()=>writeFile(new URL('results/'+mode+'.json',dir),JSON.stringify(report,null,2)+'\n',{mode:0o600});
for(const row of (mode==='teach'?teach.rows:manifest.development).slice(report.results.length)){
 const entry={case_id:row.id,input_sha256:hash(row.input),at:new Date().toISOString()};report.results.push(entry);await save();
 try{Object.assign(entry,await enterpriseModel(row.input,{recording:report.recording,source:'enterprise-'+mode}));
 if(entry.inference.route!=='luna'||!entry.request_id||entry.completion_model!=='gpt-6-luna')throw Error('Teacher identity not verified');
 console.log(JSON.stringify({completed:report.results.length,case_id:row.id,receipt:entry.request_id,model:entry.completion_model}));
 }catch(e){entry.error=String(e.message).replace(/\b(?:mbt_|sk-)[\w-]+/g,'[REDACTED]');report.status='stopped';report.finished_at=new Date().toISOString();await save();throw Error(entry.error);}
 await save();
}
report.status='complete';report.finished_at=new Date().toISOString();await save();
