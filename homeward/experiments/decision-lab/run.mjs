// Explicit opt-in, bounded teacher calls; never imported by the application.
import OpenAI from 'openai';
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {instructions,schema,taskHash,heldoutSha256,packet,validate,assess} from './contract.mjs';
import {describeInference} from '../../src/inference.mjs';

const submit=process.argv.includes('--submit');
const rows=JSON.parse(await readFile(new URL('./curriculum.json',import.meta.url),'utf8'));
const heldoutUrl=new URL('../../data/travel-final-heldout.json',import.meta.url);
const digest=async()=>createHash('sha256').update(await readFile(heldoutUrl)).digest('hex');
if(await digest()!==heldoutSha256)throw new Error('Final held-out checksum changed; stop for review');
if(rows.length!==40||new Set(rows.map(r=>r.question)).size!==40)throw new Error('Expected 40 unique teaching inputs');
for(const row of rows){const input=packet(row);validate(row.expected,input);if(Buffer.byteLength(JSON.stringify(input))>7400)throw new Error('Packet too long for playground');}
if(!submit){
 console.log(JSON.stringify({mode:'dry_run',calls:0,prepared:rows.length,model:'gpt-6-luna',task_hash:taskHash,recording_if_submitted:'full',existing_app_route_changed:false,final_heldout_sha256:heldoutSha256}));
 process.exit(0);
}
if(process.env.HOMEWARD_DECISION_LAB_APPROVED!=='40-luna-calls')throw new Error('Set HOMEWARD_DECISION_LAB_APPROVED=40-luna-calls after explicit successor-task approval');
if(!process.env.MUBIT_API_KEY?.startsWith('mbt_'))throw new Error('MUBIT_API_KEY missing');
if(process.env.MUBIT_BASE_URL&&process.env.MUBIT_BASE_URL.replace(/\/$/,'')!=='https://api.mubit.ai/openai/v1')throw new Error('Unexpected gateway');
const resultDir=new URL('./results/',import.meta.url);await mkdir(resultDir,{recursive:true});
const lock=await open(new URL('submitted.lock',resultDir),'wx');
await lock.writeFile(JSON.stringify({created_at:new Date().toISOString(),task_hash:taskHash,max_calls:40})+'\n');await lock.close();
const client=new OpenAI({apiKey:process.env.MUBIT_API_KEY,baseURL:'https://api.mubit.ai/openai/v1',maxRetries:0,timeout:60000});
const report={status:'running',task_hash:taskHash,model:'gpt-6-luna',max_calls:40,recording:'full',cache:false,retries:0,
 final_heldout_questions_sent:0,existing_app_route_changed:false,existing_adapter_v2_started:false,
 scope:'Isolated compact decision selection successor; its first trained version will be v1. Not the original end-to-end travel benchmark.',results:[]};
const reportUrl=new URL('teacher-results.json',resultDir);
let attempted=0;
try{
 for(const row of rows){
  const input=packet(row),started=performance.now();attempted++;
  const result={id:row.id,family:row.family,input,expected:row.expected};report.results.push(result);
  // Preserve the attempted row even on timeout; no automatic retries or resume.
  await writeFile(reportUrl,JSON.stringify({...report,attempted},null,2)+'\n');
  const {data,response}=await client.chat.completions.create({model:'gpt-6-luna',reasoning_effort:'none',max_completion_tokens:256,
   messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],
   response_format:{type:'json_schema',json_schema:{name:'homeward_decision_lab',strict:true,schema}}
  },{headers:{'x-middleware-record':'full'}}).withResponse();
  result.elapsed_ms=Math.round(performance.now()-started);result.raw=data.choices[0]?.message?.content;
  result.usage=data.usage;result.completion_model=data.model;result.request_id=response.headers.get('x-middleware-request-id');
  const headers=Object.fromEntries([...response.headers].filter(([k])=>k==='x-request-id'||k==='openai-processing-ms'||(k.startsWith('x-middleware-')&&!/auth|key|cookie|token/.test(k))));
  result.inference=describeInference({requested_model:'gpt-6-luna',completion_model:data.model,request_id:result.request_id,provider_request_id:response.headers.get('x-request-id'),response_headers:headers,recording:'full'});
  if(data.choices[0]?.finish_reason!=='stop')throw new Error('Incomplete teacher answer; no retry');
  result.plan=validate(JSON.parse(result.raw),input);result.checks=assess(result.plan,row);
  result.matches_manual_target=Object.values(result.checks).every(Boolean);
  await writeFile(reportUrl,JSON.stringify({...report,attempted},null,2)+'\n');
  if(result.inference.route!=='luna')throw new Error('Teacher not positively identified as Luna; stop');
  if(!result.matches_manual_target)throw new Error('Teacher plan differs from audit target; inspect before sending more calls');
  console.log(`${attempted}/40 ${row.id}: accepted by local plan checks; Mubit kept/training state still unverified`);
 }
 report.status='teacher_calls_complete_training_unverified';
}catch(error){
 report.status='stopped';report.error=String(error.message).replace(/\b(?:mbt_|sk-)[\w-]+/g,'[REDACTED]');process.exitCode=1;
}finally{
 report.attempted=attempted;report.final_heldout_sha256_after=await digest();
 if(report.final_heldout_sha256_after!==heldoutSha256){report.status='heldout_integrity_failure';process.exitCode=1;}
 await writeFile(reportUrl,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,attempted,report:reportUrl.pathname,error:report.error}));
}
