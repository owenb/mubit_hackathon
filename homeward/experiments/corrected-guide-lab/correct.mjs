// Bounded correction demonstrations for this isolated task. Never evaluates.
import OpenAI from 'openai';
import {readFile,writeFile,open} from 'node:fs/promises';
import {instructions,schema,taskHash,hash,validate} from './contract.mjs';
import {createMubitFetch,safeResponseHeaders,inferenceHeaders} from '../../src/mubit-telemetry.mjs';
import {describeInference} from '../../src/inference.mjs';
import {redact} from '../../src/core.mjs';
const dir=new URL('./',import.meta.url);
const read=async p=>JSON.parse(await readFile(new URL(p,dir),'utf8'));
const [frozen,teach,audit]=await Promise.all(['manifest.json','results/teach.json','audit-corrections.json'].map(read));
if(frozen.task_hash!==taskHash)throw Error('Frozen contract changed');
const correctionIds=['cgl-001-bank-wc-rain','cgl-009-waterloo-origin-bank-end','cgl-017-euston-direction','cgl-029-southbank-duration-pace','cgl-032-science-experience','cgl-033-science-dated-hours'];
const rows=correctionIds.map(id=>{
 const proposed=audit.proposed_corrections.find(r=>r.case_id===id);
 const original=teach.results.find(r=>r.case_id===id);
 if(!proposed||!original||hash(original.input)!==frozen.packets.find(r=>r.id===id)?.input_sha256)throw Error('Missing frozen correction source');
 validate(proposed.corrected_output,original.input);
 return {...proposed,original_input:original.input,original_receipt:original.request_id};
});
if(!process.env.MUBIT_API_KEY?.startsWith('mbt_'))throw Error('Missing Mubit key');
const lock=await open(new URL('results/corrections.lock',dir),'wx',0o600);await lock.close();
const report={task_hash:taskHash,recording:'full',mode:'target_in_context_demonstration',not_transfer_evidence:true,selection_basis:'Only teacher-batch errors, selected before reviewing development answers. cgl031 accepted as a defensible context-role alternative.',source_audit_hash:hash(audit),started_at:new Date().toISOString(),status:'running',results:[]};
const save=()=>writeFile(new URL('results/corrections.json',dir),JSON.stringify(report,null,2)+'\n',{mode:0o600});
const client=new OpenAI({apiKey:process.env.MUBIT_API_KEY,baseURL:'https://api.mubit.ai/openai/v1',fetch:createMubitFetch({source:'corrected-guide-lab-corrections'}),maxRetries:0,timeout:60000});
try{
 for(const row of rows){
  const input={...row.original_input,editor_correction:{note:row.issue,reviewed_response:row.corrected_output,instruction:'This is an editorial teaching demonstration. Return this reviewed response faithfully; do not add unsupported claims.'}};
  const result={case_id:row.case_id,original_receipt:row.original_receipt,input,expected_output:row.corrected_output,started_at:new Date().toISOString()};report.results.push(result);await save();
  const {data,response}=await client.chat.completions.create({model:'gpt-6-luna',reasoning_effort:'none',max_completion_tokens:900,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_schema',json_schema:{name:'homeward_corrected_guide_lab',strict:true,schema}}},{headers:{'x-middleware-record':'full'}}).withResponse();
  Object.assign(result,{finished_at:new Date().toISOString(),request_id:response.headers.get('x-middleware-request-id'),completion_model:data.model,response_headers:safeResponseHeaders(response.headers),usage:data.usage,raw:data.choices[0]?.message?.content});
  result.inference=describeInference({requested_model:'gpt-6-luna',completion_model:data.model,request_id:result.request_id,provider_request_id:response.headers.get('x-request-id'),response_headers:inferenceHeaders(response.headers),recording:'full'});
  if(result.inference.route!=='luna'||data.model!=='gpt-6-luna'||data.choices[0]?.finish_reason!=='stop')throw Error('Incomplete or unverified Luna correction');
  result.output=validate(JSON.parse(result.raw),row.original_input);result.exact_target_match=hash(result.output)===hash(row.corrected_output);
  await save();if(!result.exact_target_match)throw Error('Correction differs from reviewed target; inspect without retry');
  console.log(JSON.stringify({completed:report.results.length,total:6,case_id:row.case_id,receipt:result.request_id,model:data.model}));
 }
 report.status='complete';
}catch(e){report.status='stopped';report.error=redact(e.message);process.exitCode=1;}
finally{report.finished_at=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,count:report.results.length,error:report.error}));}
