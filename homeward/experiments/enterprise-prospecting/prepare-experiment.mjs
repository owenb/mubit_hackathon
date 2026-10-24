import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {instructions,schema,responseName,taskHash,hash,generation,packet} from './contract.mjs';
const dir=new URL('./',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,dir),'utf8'));
try{await readFile(new URL('manifest.json',dir));throw Error('Enterprise experiment is frozen. Create a separate experiment for any new contract.');}catch(e){if(e.code!=='ENOENT')throw e;}
const data=await read('companies.json'),development=await read('development-frozen.json');
const expert_note='Suggested operator lesson, authored by the coding assistant for this demo: qualify one narrow recurring text task before pitching. Keep changing facts in retrieval and stable reviewer judgement in weights. A large company is not automatically a strong fit; existing model builders may be weak fits. Private spend, traffic and London adoption are unknown unless specifically sourced. Propose corrected examples and separate fresh questions, then measure quality and latency. Receipt, kept review, trained adapter and successful evaluation are four different states. Ownership and serving optionality are conditional benefits; do not promise savings, compliance or intelligence gains.';
const questions=[
 'Identify a repeatable internal writing or classification pilot with an accountable reviewer.',
 'How could an operations expert make the output more consistent over time?',
 'What would prevent this company from being a sensible first customer?',
 'Draft a short pilot proposal around staff knowledge and reliable citations.',
 'Which buying signal is evidenced, and which assumptions should we validate first?',
 'How should we handle a request to estimate this office’s private AI budget?',
];
const rows=Array.from({length:36},(_,i)=>{const company=data.companies[i%data.companies.length],question=questions[Math.floor(i/data.companies.length)];const input=packet(company,question,expert_note);return {id:'ent-teach-'+String(i+1).padStart(2,'0'),input,input_sha256:hash(input)};});
const devRows=development.cases.map(c=>{const company=data.companies.find(x=>x.id===c.company_id);if(!company)throw Error('Unknown frozen company');const input=packet(company,c.question);return {id:c.id,input,input_sha256:hash(input)};});
for(const row of rows)if(devRows.some(d=>d.input.question===row.input.question))throw Error('Development contamination');
const manifest={experiment:'enterprise-prospecting',created_at:new Date().toISOString(),task_hash:taskHash,instructions,schema,responseName,generation,data_sha256:hash(data),development_rubric_sha256:hash(development),development:devRows,teaching_sha256:hash(rows),teaching_count:rows.length,expert_note_author:'coding assistant suggested operator lesson, not an independent enterprise expert',final_travel_questions_used:false,app_travel_route_changed:false,project_env:'BANK_DEMO_ISOLATED_PROJECT_ID',comparison:'Fresh frozen DEVELOPMENT inputs only; same instructions/schema/settings, no correction in evaluation inputs, no answer cache, repair or retry. Actual adapter serving must be proven separately.'};
await mkdir(new URL('results/',dir),{recursive:true});
await writeFile(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
await writeFile(new URL('teaching-frozen.json',dir),JSON.stringify({task_hash:taskHash,rows},null,2)+'\n');
console.log(JSON.stringify({task_hash:taskHash,teaching:rows.length,development:devRows.length,development_sha256:manifest.development_rubric_sha256}));
