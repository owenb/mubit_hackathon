import {readFile,writeFile} from 'node:fs/promises';
import {queryModel,instructions,schema,knowledge} from './core.mjs';
import {describeInference} from './inference.mjs';
const cases=JSON.parse(await readFile(new URL('../data/travel-challenge.json',import.meta.url),'utf8')).cases;
const results=[];
for(const c of cases){
 const r=await queryModel(c.question,{recording:'metadata',capture_input:true});
 results.push({...c,...r,inference:describeInference(r)});
 await writeFile(new URL('../results/travel/challenge-luna-compact-baseline.json',import.meta.url),JSON.stringify({created_at:new Date().toISOString(),instructions,schema,knowledge,recording:'metadata',note:'Prospective test combinations, not training. UI adapter diagnostics may use different decoding/schema settings; report that limitation. Cache bypassed. Do not tune on these answers without retiring the set.',results},null,2));
 console.log(`${c.id}: ${r.elapsed_ms}ms ${r.answer}`);
}
