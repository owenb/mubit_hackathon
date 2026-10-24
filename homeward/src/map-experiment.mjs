import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {queryModel,instructions,schema,knowledge,root} from './core.mjs';
import {catalog} from './map-contract.mjs';
const selected=process.argv.find(a=>a.startsWith('--ids='))?.slice(6).split(',');
const curriculum=process.argv.includes('--curriculum');
const cases=JSON.parse(await readFile(new URL(curriculum?'data/map-training.json':'data/map-eval.json',root),'utf8')).filter(c=>!selected||selected.includes(c.id));
if(!cases.length)throw new Error('No matching evaluation cases');
const dry=process.argv.includes('--dry-run');const recording=process.argv.includes('--record')?'full':'metadata';
if(dry){console.log(JSON.stringify({cases,recording},null,2));process.exit(0);}
await mkdir(new URL('results/map/',root),{recursive:true});
const path=new URL(`results/map/model-eval-${new Date().toISOString().replaceAll(':','-')}.json`,root);
const results=[];const manifest={instructions,schema,knowledge,catalog_version:catalog.version,recording,curriculum,scoring:'Exact camera intent and set of verified place IDs; answer text still requires separate review. Development cases, not a frozen adaptation benchmark.'};
for(const c of cases){
 const answer=await queryModel(c.question,{context_ids:c.context_ids||[],recording});
 const actual=answer.scene.places.map(p=>p.id).sort();const expected=[...c.places].sort();
 const passed=answer.scene.camera===c.camera&&JSON.stringify(actual)===JSON.stringify(expected);
 results.push({...c,...answer,passed});console.log(`${c.id}: ${passed?'PASS':'MISMATCH'} ${answer.scene.camera} ${actual.join(', ')} ${answer.elapsed_ms}ms`);
 await writeFile(path,JSON.stringify({manifest,results},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length,file:path.pathname}));
