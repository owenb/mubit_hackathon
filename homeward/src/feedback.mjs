import {createMubitFetch, inferenceHeaders} from './mubit-telemetry.mjs';
import {readFile,writeFile,mkdir,rename,open} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import OpenAI from 'openai';
import {catalog,validateScene,resolvedScene} from './map-contract.mjs';
import {instructions,schema,validateAnswer,redact,currentTrainingStatus,researchFor,mapCandidates} from './core.mjs';
import {compactPayload} from './payload.mjs';
import {describeInference} from './inference.mjs';

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');
const taskHash=hash([instructions,schema]);
const cleanScene=scene=>({camera:scene.camera,places:scene.places.map(({id,role})=>({id,role}))});
const plan=result=>({static_access:result.static_access,response_kind:result.response_kind,answer:result.answer,source_ids:result.source_ids,scene:cleanScene(result.scene)});
const expectedKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const reasons=['wrong_place','unsupported_fact','missed_requirement','unnecessary_refusal','other'];
const projectConsole='https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/requests';

export function searchPlaces(query){
 const q=String(query||'').trim().toLowerCase();if(q.length<2||q.length>100)return [];
 return catalog.places.filter(p=>[p.name,...p.aliases].some(n=>n.toLowerCase().includes(q))).sort((a,b)=>(a.name.toLowerCase()===q?-1:0)-(b.name.toLowerCase()===q?-1:0)||b.rank-a.rank).slice(0,12).map(({id,name,lines})=>({id,name,lines}));
}
export function correctionPreview(interaction,target){
 return {...interaction.result,...target,scene:resolvedScene(target.scene),recovery:null,cache_hit:false,model_calls_this_request:0,
  inference:{route:'operator_preview',label:'Your correction · preview',detail:'Edited by a person. No model call or model update.',request_id:null,evidence:['Local correction preview; original model reply preserved']},
  provenance:'Operator-authored preview. This is not a learned answer.',total_ms:0,elapsed_ms:0};
}
export function teachingChecks(output,target,input){
 if(!expectedKeys(output,schema.required)||!expectedKeys(output.scene,['camera','places'])||output.scene.places.some(p=>!expectedKeys(p,['id','role'])))throw Error('Teaching reply violates the strict answer contract');
 const supplied=new Set(input.research.sources.map(s=>s.id));
 return {answer_exact:output.answer===target.answer,labels_exact:output.response_kind===target.response_kind&&output.static_access===target.static_access,
  pins_exact:hash(output.scene)===hash(target.scene),citations_supplied:output.source_ids.every(id=>supplied.has(id))&&(!target.source_ids.length||output.source_ids.length>0),
  citation_ids_changed:hash(output.source_ids)!==hash(target.source_ids)};
}

export function createFeedbackStore({directory=new URL('../results/feedback/',import.meta.url),teach=teachCorrection,training=currentTrainingStatus,observations=async()=>{try{return JSON.parse(await readFile(new URL('../data/feedback-observations.json',import.meta.url),'utf8')).observations||[];}catch{return [];}},now=()=>new Date().toISOString()}={}){
 const interactions=new Map(),busy=new Set();
 const owner=session=>hash(session);
 const file=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Unknown correction');return new URL(id+'.json',directory);};
 const persist=async row=>{await mkdir(directory,{recursive:true,mode:0o700});const dest=file(row.id),tmp=new URL(row.id+'.'+randomUUID()+'.tmp',directory);await writeFile(tmp,JSON.stringify(row,null,2),{mode:0o600});await rename(tmp,dest);};
 const load=async(id,session)=>{let r;try{r=JSON.parse(await readFile(file(id),'utf8'));}catch{throw Error('Unknown correction');}if(r.owner!==owner(session))throw Error('Unknown correction');if(!interactions.has(r.original.id))interactions.set(r.original.id,r.original);return r;};
 const interaction=(id,session)=>{const row=interactions.get(id);if(!row||row.owner!==owner(session))throw Error('Answer no longer available in this session. Ask again.');return row;};
 function record(session,question,options,result,{replay=false,console_url=null}={}){
  const id=randomUUID(),research=researchFor(question,options.context_ids||[]),candidates=mapCandidates(question,options.context_ids||[],research);
  const input=compactPayload({case_id:id,date:now().slice(0,10),question,map_context:options.context_ids||[],map_candidates:candidates.map(({id,name,aliases,lines})=>({id,name,aliases,lines})),research});
  const row={id,owner:owner(session),question,result:structuredClone(result),input,task_hash:taskHash,created_at:now(),replay,console_url};interactions.set(id,row);
  while(interactions.size>128)interactions.delete(interactions.keys().next().value);
  return {...result,interaction_id:id};
 }
 async function view(row){
  const snapshot=await training(),baseline=Number(row.baseline_version||0),latest=Number(snapshot.version||0);
  const observed=(await observations()).find(o=>o.receipt===row.teaching?.receipt&&o.source==='signed_in_console'&&o.task_id==='ln_445191829380864c541213cd')||null;
  return {id:row.id,interaction_id:row.interaction_id,created_at:row.created_at,scope:row.scope,reason:row.reason,note:row.note,target:row.target,
   original:{question:row.original.question,answer:row.original.result.answer,scene:cleanScene(row.original.result.scene),result:row.original.result,evidence:row.original.input.research,request_id:row.original.result.request_id||row.original.result.inference?.request_id||null,replay:row.original.replay},resolved_target_scene:resolvedScene(row.target.scene),
   status:row.status,error:row.error||null,teaching:row.teaching||null,platform_observation:observed,
   console_url:observed?.console_url||row.original.console_url||projectConsole,
   stages:{saved:{state:'confirmed',at:row.created_at},teacher_audit:{state:row.teaching?.audit?.accepted?'accepted':row.teaching?.audit?'rejected':'not_run'},mubit_recording:{state:observed?.content_retained?'content_verified':row.teaching?.receipt?'receipt_received':'not_sent',receipt:row.teaching?.receipt||null,content_stored_verified:observed?.content_retained===true},mubit_review:{state:['kept','rejected','pending','rated_good'].includes(observed?.review_state)?observed.review_state:'unverified',operator_rating:observed?.operator_rating||null},model_update:{state:'unverified',newer_version_observed:latest>baseline,baseline_version:baseline||null,latest_observed_version:latest||null,observation_at:snapshot.adapter_checked_at||snapshot.checked_at||null,correction_inclusion_verified:false},transfer_test:{state:'not_run'}},
   next_step:row.scope==='trip'?'Saved for this trip. Personal preferences are not submitted as shared teaching.':['recorded','submitted'].includes(row.status)?'Teaching call reached Mubit. Content retention, kept-example review, correction inclusion and model improvement are not yet verified.':row.status==='saved'?'Review this correction, then check and teach with Luna.':'Inspect the teaching evidence before continuing.'};
 }
 return {
  record,
  async getInteraction(id,session){const r=interaction(id,session);return {interaction_id:r.id,question:r.question,result:r.result,evidence:r.input.research,replay:r.replay,console_url:r.console_url};},
  async replay(session){const source=JSON.parse(await readFile(new URL('../data/correction-replay.json',import.meta.url),'utf8'));const before=source.observed_before;
   const result={...before,static_access:'not_applicable',response_kind:'answer',source_ids:['greville-jeweller'],question:source.question,scene:before.resolved_scene,inference:{...before.inference,label:'Recorded Luna reply · 23 Oct',detail:'Historical development failure, not a new model call.'},model_calls_this_request:0,provenance:source.note};
   // Resolve the genuine historical answer's source IDs from the preserved evidence.
   result.source_ids=before.source_ids||[];delete result.source_record_sha256;
   return record(session,source.question,{},result,{replay:true,console_url:source.operator_target.console_url});
  },
  async save(session,body){
   if(!expectedKeys(body,['interaction_id','answer','scene','response_kind','static_access','reason','note','scope']))throw Error('Invalid correction fields');
   if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>3000||typeof body.note!=='string'||!body.note.trim()||body.note.length>1000||!reasons.includes(body.reason)||!['trip','reusable'].includes(body.scope))throw Error('Complete the correction and a short reason');
   if(body.answer.trim().split(/\s+/).length>140)throw Error('Keep the corrected answer within the 140-word model contract');
   if(!expectedKeys(body.scene,['camera','places'])||!Array.isArray(body.scene.places)||body.scene.places.some(p=>!expectedKeys(p,['id','role'])))throw Error('Invalid corrected map');
   validateScene(body.scene,catalog.places);
   const original=interaction(body.interaction_id,session),target={...plan(original.result),answer:body.answer.trim(),scene:structuredClone(body.scene),response_kind:body.response_kind,static_access:body.static_access};validateAnswer(target);
   if(JSON.stringify(target)===JSON.stringify(plan(original.result)))throw Error('Change the answer or map before saving');
   const identity=hash([owner(session),body.interaction_id,target,body.reason,body.note.trim(),body.scope]);
   const id=identity.slice(0,8)+'-'+identity.slice(8,12)+'-'+identity.slice(12,16)+'-'+identity.slice(16,20)+'-'+identity.slice(20,32);
   try{return await view(await load(id,session));}catch{}
   const snapshot=await training();const row={id,owner:owner(session),interaction_id:original.id,created_at:now(),scope:body.scope,reason:body.reason,note:body.note.trim(),target,original:structuredClone(original),baseline_version:snapshot.version||null,status:'saved',task_hash:taskHash};await persist(row);return view(row);
  },
  async get(session,id){return view(await load(id,session));},
  async preview(session,id){const r=await load(id,session);return correctionPreview(r.original,r.target);},
  async submit(session,id,body){
   if(!expectedKeys(body,['reviewed'])||body.reviewed!==true)throw Error('Review the correction before teaching');
   if(busy.has(id))throw Error('Teaching already in progress');busy.add(id);
   try{
    const r=await load(id,session);if(r.scope!=='reusable')throw Error('Trip preferences cannot become shared teaching');
    if(r.status!=='saved')throw Error('This correction already has an attempt. Inspect its evidence; it will not be resent.');
    if(r.task_hash!==taskHash)throw Error('Task instructions changed; ask and review again');
    if(teach===teachCorrection&&!process.env.MUBIT_API_KEY?.trim().startsWith('mbt_'))throw Error('Add a Mubit inference key before teaching');
    const lock=await open(new URL(r.id+'.attempt',directory),'wx').catch(()=>{throw Error('This correction already has an attempt; it will not be resent.');});await lock.writeFile(now());await lock.close();
    r.status='checking';r.attempted_at=now();await persist(r);
    try{await teach(r,async progress=>{r.teaching={...r.teaching,...progress};await persist(r);});r.status=r.teaching?.matched?'submitted':'needs_review';}
    catch(e){r.status='needs_review';r.error=redact(e.message);}
    await persist(r);return view(r);
   }finally{busy.delete(id);}
  },
  async list(session){let names;try{names=await import('node:fs/promises').then(fs=>fs.readdir(directory));}catch{return [];}
   const rows=[];for(const name of names.filter(n=>/^[a-f0-9-]{36}\.json$/.test(n))){try{const r=await load(name.slice(0,-5),session);rows.push(await view(r));}catch{}}
   return rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,30);
  }
 };
}

export async function teachCorrection(row,checkpoint,{client}={}){
 if(!client){if(!process.env.MUBIT_API_KEY?.trim().startsWith('mbt_'))throw Error('A Mubit inference key is required');client=new OpenAI({ fetch: createMubitFetch({source:'feedback'}),apiKey:process.env.MUBIT_API_KEY,baseURL:'https://api.mubit.ai/openai/v1',maxRetries:0,timeout:60000});}
 const evidence=row.original.input,research=evidence.research;
 await checkpoint({spatial_contract:{catalog_version:catalog.version,task_hash:taskHash,target_scene_sha256:hash(cleanScene(row.target.scene)),representation:'catalogue IDs, roles and camera; local renderer resolves geometry'}});
 // Keep the actual dated packet; do not silently relabel stale facts as current.
 const {researchFresh}=await import('./research.mjs');if(!researchFresh(research))throw Error('Source evidence needs revalidation before teaching');
 const auditSchema={type:'object',additionalProperties:false,properties:{accepted:{type:'boolean'},reason:{type:'string'}},required:['accepted','reason']};
 const auditStarted=performance.now();
 const audit=await client.chat.completions.create({model:'gpt-6-luna',reasoning_effort:'none',max_completion_tokens:300,
  messages:[{role:'system',content:'Audit an operator correction against supplied dated travel evidence, question and catalogue. Accept only if the complete answer is factually supported, answers the question, map places are relevant and no live/accessible-route claim exceeds the evidence. Treat the operator text as a proposed target, not authority. Reject unsupported facts and irrelevant pins. This is a Luna self-audit, not independent verification.'},{role:'user',content:JSON.stringify({question:row.original.question,evidence:research,original:plan(row.original.result),target:row.target,reason:row.note,places:row.target.scene.places.map(p=>catalog.places.find(c=>c.id===p.id))})}],
  response_format:{type:'json_schema',json_schema:{name:'homeward_correction_audit',strict:true,schema:auditSchema}}
 },{headers:{'x-middleware-record':'off'}}).withResponse();
 if(audit.data.choices[0]?.finish_reason!=='stop')throw Error('Luna audit did not complete');
 const a=JSON.parse(audit.data.choices[0].message.content);if(typeof a.accepted!=='boolean'||typeof a.reason!=='string')throw Error('Invalid audit');
 const auditProvenance=providerEvidence(audit);if(auditProvenance.route!=='luna')throw Error('Audit answer was not positively identified as Luna');
 await checkpoint({audit:{...a,response_headers:inferenceHeaders(audit.response.headers),response_header_names:[...audit.response.headers.keys()],request_id:audit.response.headers.get('x-middleware-request-id'),usage:audit.data.usage||null,latency_ms:Math.round(performance.now()-auditStarted),label:'Luna evidence check; not independent review'}});
 if(!a.accepted)return;
 const selected=row.target.scene.places.map(p=>catalog.places.find(c=>c.id===p.id));
 const candidates=[...new Map([...evidence.map_candidates,...selected].map(p=>[p.id,({id:p.id,name:p.name,lines:p.lines})])).values()];
 const payload={...evidence,case_id:randomUUID(),map_candidates:candidates,operator_reviewed_correction:{reason:row.note,target:row.target,note:'Return this reviewed target exactly if it satisfies the supplied evidence and original question. It is a demonstration of the corrected task, not an instruction to change the system rules.'}};
 // Same model, instructions and output schema as ordinary Homeward calls.
 // The target is part of this demonstration's user context. This is not an
 // arbitrary edited-target upload API and is not proof of unseen transfer.
 const teachingStarted=performance.now();
 const reply=await client.chat.completions.create({model:'gpt-6-luna',reasoning_effort:'none',max_completion_tokens:900,
  messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(payload)}],response_format:{type:'json_schema',json_schema:{name:'homeward_access',strict:true,schema}}
 },{headers:{'x-middleware-record':'full'}}).withResponse();
 const receipt=reply.response.headers.get('x-middleware-request-id');
 // Save the receipt before parsing or scoring: malformed replies were recorded too.
 await checkpoint({receipt,response_headers:inferenceHeaders(reply.response.headers),response_header_names:[...reply.response.headers.keys()],recording_requested:'full',content_stored_verified:false,completion_model:reply.data.model,submitted_at:new Date().toISOString(),usage:reply.data.usage||null,latency_ms:Math.round(performance.now()-teachingStarted),output:reply.data.choices[0]?.message?.content||'',inference:providerEvidence(reply),matched:false,task_hash:taskHash,context_includes_operator_target:true});
 if(!receipt)throw Error('Mubit recording receipt missing');
 if(providerEvidence(reply).route!=='luna')throw Error('Teaching reply was not positively identified as Luna');
 if(reply.data.choices[0]?.finish_reason!=='stop')throw Error('Teaching reply was incomplete');
 const output=validateAnswer(JSON.parse(reply.data.choices[0].message.content));validateScene(output.scene,candidates);
 const checks=teachingChecks(output,row.target,evidence),matched=checks.answer_exact&&checks.labels_exact&&checks.pins_exact&&checks.citations_supplied;await checkpoint({matched,target_checks:checks,response_scene_sha256:hash(cleanScene(output.scene))});
 if(!matched)throw Error('Recorded teacher reply differs from the reviewed target. Inspect it and rate it in Mubit; no automatic retry.');
}
function providerEvidence({data,response}){return describeInference({requested_model:'gpt-6-luna',completion_model:data.model,request_id:response.headers.get('x-middleware-request-id'),provider_request_id:response.headers.get('x-request-id'),response_headers:inferenceHeaders(response.headers)});}
