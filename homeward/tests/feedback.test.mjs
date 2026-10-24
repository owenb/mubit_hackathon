import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import {createFeedbackStore,teachCorrection,searchPlaces,teachingChecks} from '../src/feedback.mjs';
import {researchFor} from '../src/core.mjs';
const base={static_access:'not_applicable',response_kind:'answer',answer:'Use your watch to leave after entering with your phone.',source_ids:['tfl-payment'],scene:{camera:'keep',places:[]},question:'Can I enter a rail journey with my phone and leave with my watch?',request_id:'mreq_fixture_original',inference:{route:'luna',label:'Fixture, not real inference'}};
async function setup(teach){const dir=await mkdtemp(tmpdir()+'/homeward-feedback-'),directory=pathToFileURL(dir+'/');const store=createFeedbackStore({directory,teach,training:async()=>({version:2,checked_at:'2026-10-24T12:00:00Z'})});const original=store.record('one',base.question,{},base);return {store,original,directory,done:()=>rm(dir,{recursive:true,force:true})};}
const correction=original=>({interaction_id:original.interaction_id,answer:'Use the same phone throughout the rail journey. A watch is a separate payment identity.',scene:{camera:'keep',places:[]},response_kind:'answer',static_access:'not_applicable',reason:'unsupported_fact',note:'The watch and phone are separate payment identities.',scope:'reusable'});
test('saved correction is durable, owned, idempotent and previewed without replacing original',async()=>{
 const x=await setup();try{const body=correction(x.original),saved=await x.store.save('one',body);assert.equal(saved.status,'saved');assert.equal(saved.stages.mubit_recording.state,'not_sent');assert.equal((await x.store.save('one',body)).id,saved.id);
 const preview=await x.store.preview('one',saved.id);assert.equal(preview.inference.route,'operator_preview');assert.equal(preview.model_calls_this_request,0);assert.equal((await x.store.getInteraction(x.original.interaction_id,'one')).result.answer,base.answer);
 await assert.rejects(()=>x.store.get('two',saved.id),/Unknown/);
 const restarted=createFeedbackStore({directory:x.directory,training:async()=>({version:3})});const restored=await restarted.get('one',saved.id);assert.equal(restored.stages.model_update.newer_version_observed,true);assert.equal(restored.stages.model_update.correction_inclusion_verified,false);assert.equal(restored.original.result.answer,base.answer);
 }finally{await x.done();}
});
test('unknown/duplicate place IDs and incomplete edits cannot enter feedback',async()=>{const x=await setup();try{
 await assert.rejects(()=>x.store.save('one',{...correction(x.original),scene:{camera:'focus',places:[{id:'invented',role:'context'}]}}),/unsupported/);
 await assert.rejects(()=>x.store.save('one',{...correction(x.original),note:''}),/short reason/);
 assert.ok(searchPlaces('Chancery Lane').some(p=>p.name==='Chancery Lane'));
}finally{await x.done();}});
test('trip preferences never call the teacher and repeated/concurrent submissions cannot double spend',async()=>{
 let calls=0,release;const x=await setup(async(_r,checkpoint)=>{calls++;await new Promise(r=>release=r);await checkpoint({receipt:'mreq_fixture_teaching',matched:true,audit:{accepted:true}});});
 try{const trip=await x.store.save('one',{...correction(x.original),scope:'trip'});await assert.rejects(()=>x.store.submit('one',trip.id,{reviewed:true}),/Trip preferences/);assert.equal(calls,0);
 const saved=await x.store.save('one',correction(x.original)),pending=x.store.submit('one',saved.id,{reviewed:true});
 while(!release)await new Promise(r=>setTimeout(r,1));await assert.rejects(()=>x.store.submit('one',saved.id,{reviewed:true}),/in progress/);release();const result=await pending;
 assert.equal(calls,1);assert.equal(result.status,'submitted');assert.equal(result.stages.mubit_review.state,'unverified');assert.equal(result.stages.model_update.correction_inclusion_verified,false);
 await assert.rejects(()=>x.store.submit('one',saved.id,{reviewed:true}),/already has an attempt/);assert.equal(calls,1);
 }finally{await x.done();}
});
function mockClient(replies){
 const calls=[];
 const create=(body,options)=>{
  calls.push({body,options});
  return {withResponse:async()=>({
   data:{model:'gpt-6-luna',choices:[{finish_reason:'stop',message:{content:JSON.stringify(replies.shift())}}]},
   response:{headers:new Headers({'x-middleware-request-id':'mreq_fixture_'+calls.length,'x-request-id':'req_fixture','openai-processing-ms':'5'})}
  })};
 };
 return {calls,chat:{completions:{create}}};
}
test('rejected Luna audit sends no recorded teaching call',async()=>{const client=mockClient([{accepted:false,reason:'Target not supported'}]),progress=[];const row={original:{question:base.question,input:{research:researchFor(base.question)},result:base},target:base,note:'Unsupported target'};
 await teachCorrection(row,p=>progress.push(p),{client});assert.equal(client.calls.length,1);assert.equal(client.calls[0].options.headers['x-middleware-record'],'off');assert.equal(progress[0].audit.accepted,false);
});
test('teaching preserves task contract, records actual output and cannot turn a receipt into training proof',async()=>{
 const target={...base,answer:'Use the same device.'};for(const k of ['question','request_id','inference'])delete target[k];
 const client=mockClient([{accepted:true,reason:'Supported by evidence'},target]),progress=[];const row={original:{question:base.question,input:{question:base.question,research:researchFor(base.question),map_candidates:[]},result:base},target,note:'Keep payment identity consistent'};
 await teachCorrection(row,p=>progress.push(p),{client});assert.equal(client.calls.length,2);assert.equal(client.calls[1].options.headers['x-middleware-record'],'full');assert.equal(client.calls[1].body.model,'gpt-6-luna');assert.equal(client.calls[1].body.response_format.json_schema.name,'homeward_access');assert.equal(progress.at(-1).matched,true);assert.ok(progress.some(p=>p.receipt));assert.equal(progress.some(p=>p.model_update),false);
});
test('citation changes are assessed separately from the edited answer and pins',()=>{
 const target={static_access:'not_applicable',response_kind:'answer',answer:'Same device.',source_ids:['tfl-payment','tfl-night'],scene:{camera:'keep',places:[]}};
 const input={research:{sources:[{id:'tfl-payment'},{id:'tfl-night'}]}};
 const reply={...target,source_ids:['tfl-payment']},c=teachingChecks(reply,target,input);assert.equal(c.answer_exact,true);assert.equal(c.pins_exact,true);assert.equal(c.citations_supplied,true);assert.equal(c.citation_ids_changed,true);
 assert.equal(teachingChecks({...reply,answer:'A different claim'},target,input).answer_exact,false);
 assert.equal(teachingChecks({...reply,source_ids:['invented']},target,input).citations_supplied,false);
 assert.equal(teachingChecks({...reply,source_ids:[]},target,input).citations_supplied,false);
});
