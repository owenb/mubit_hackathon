import test from 'node:test';
import assert from 'node:assert/strict';
import {describeInference,routeMetrics} from '../src/inference.mjs';
import {ask} from '../src/core.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const provider={request_id:'mreq_example',requested_model:'gpt-6-luna',completion_model:'gpt-6-luna',provider_request_id:'req_example',response_headers:{'openai-processing-ms':'1800'},recording:'full'};
test('gateway receipt and requested or returned model alone cannot claim an adapter or provider',()=>{
 for(const a of [{request_id:'mreq_1'}, {request_id:'mreq_1',completion_model:'gpt-6-luna'}, {request_id:'mreq_1',completion_model:'qwen-adapter'}])assert.equal(describeInference(a).route,'unverified');
 assert.equal(describeInference(provider).route,'luna');
 const saved=describeInference(provider,{cache:true});assert.equal(saved.route,'cache');assert.equal(saved.request_id,null);assert.equal(saved.original_route,'luna');
 assert.deepEqual(routeMetrics([{route:'luna',latency_ms:100},{route:'cache',latency_ms:0}]),{requests:2,model_calls:1,luna:1,mubit_adapter:0,unverified:0,cache:1,window:'last 2 recorded app attempts',median_latency_ms:100});
});
test('normal app requests make fresh recorded calls; diagnostic calls do not train',async()=>{
 const dir=await mkdtemp(tmpdir()+'/homeward-inference-');const seen=[];
 const options={cacheDir:pathToFileURL(dir+'/'),modelQuery:async(q,o)=>{seen.push(o);return {...provider,static_access:'not_applicable',response_kind:'answer',answer:'Check museum booking requirements.',source_ids:[],scene:{camera:'keep',places:[]},elapsed_ms:1800};}};
 try{
  await ask('Science Museum booking?',options);const b=await ask('Science Museum booking?',options);
  assert.equal(seen.length,2);assert.equal(b.cache_hit,false);assert.equal(b.inference.route,'luna');assert.equal(seen[0].recording,'full');
  await ask('Science Museum booking?',{...options,mode:'memory'});assert.equal(seen[2].recording,'metadata');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid structured result invokes one visible Luna recovery; transport errors do not retry',async()=>{
 const dir=await mkdtemp(tmpdir()+'/homeward-recovery-');let calls=0;
 const options={cacheDir:pathToFileURL(dir+'/'),modelQuery:async(q,o)=>{calls++;if(calls===1){const e=new Error('Invalid map role');e.kind='invalid_model_answer';e.request_id='mreq_rejected';throw e;}
 assert.equal(o.teacher_recovery,true);assert.equal(o.recording,'off');
 return {...provider,recording:'off',static_access:'not_applicable',response_kind:'answer',answer:'Try the Science Museum.',source_ids:[],scene:{camera:'keep',places:[]}};}};
 try{const a=await ask('Science Museum?',options);assert.equal(calls,2);assert.equal(a.model_calls_this_request,2);assert.equal(a.inference.route,'luna');assert.match(a.inference.detail,/Recovery/);assert.equal(a.recovery.rejected_request_id,'mreq_rejected');
 let attempts=0;await assert.rejects(()=>ask('Science Museum?',{...options,modelQuery:async()=>{attempts++;throw new Error('upstream unavailable');}}));assert.equal(attempts,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('contradictory answer kind and multi-place focus are rejected before rendering',async()=>{
 const {validateAnswer}=await import('../src/core.mjs');const {validateScene}=await import('../src/map-contract.mjs');
 assert.throws(()=>validateAnswer({answer:'Outside scope. Here are travel facts.',static_access:'not_applicable',response_kind:'answer',source_ids:[]}),/contradicts/);
 assert.throws(()=>validateScene({camera:'focus',places:[{id:'a',role:'context'},{id:'b',role:'context'}]},[{id:'a'},{id:'b'}]),/exactly one/);
});
