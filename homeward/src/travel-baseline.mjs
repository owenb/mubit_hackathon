import {readFile,writeFile} from 'node:fs/promises';
const cases=JSON.parse(await readFile(new URL('../data/travel-eval.json',import.meta.url),'utf8')).slice(0,8);
const health=await (await fetch('http://127.0.0.1:48973/health')).json();
if(health.knowledge_version!=='homeward-2026-10-23-v2')throw new Error('Baseline requires the still-running original v2 service');
const results=[];
for(const c of cases){
const r=await(await fetch('http://127.0.0.1:48973/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:c.question,mode:'grounded'})})).json();
if(r.error)throw new Error(r.error);if(r.requested_model!=='gpt-6-luna')throw new Error('Not Luna');
results.push({...c,...r});console.log(`${c.id}: ${r.response_kind} ${r.answer}`);
await writeFile(new URL('../results/travel/before-expansion.json',import.meta.url),JSON.stringify({health,results,note:'Old v2 app and scope; compares product coverage, not weight improvement.'},null,2));
}
