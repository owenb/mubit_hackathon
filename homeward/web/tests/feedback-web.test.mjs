import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import {createWebApp} from '../app.mjs';import {createFeedbackStore} from '../../src/feedback.mjs';
test('browser correction routes bind real answers to their session and saving makes no teaching call',async()=>{
 const dir=await mkdtemp(tmpdir()+'/homeward-web-feedback-');let teaching=0;
 const feedback=createFeedbackStore({directory:pathToFileURL(dir+'/'),teach:async()=>teaching++,training:async()=>({version:1})});
 const answer={static_access:'not_applicable',response_kind:'answer',answer:'A phone and watch are the same payment identity.',source_ids:['tfl-payment'],scene:{camera:'keep',places:[]}};
 const app=createWebApp({feedback,askFn:async()=>answer});
 const post=(path,body,cookie,origin)=>app.request('http://homeward.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin,Host:'homeward.test'}:{})},body:JSON.stringify(body)});
 try{
  const first=await post('/api/ask',{question:'May I switch from phone to watch on one rail journey?'}),cookie=first.headers.get('set-cookie').split(';')[0],original=await first.json();assert.ok(original.interaction_id);
  const body={interaction_id:original.interaction_id,answer:'Use the same device throughout the journey.',scene:{camera:'keep',places:[]},response_kind:'answer',static_access:'not_applicable',reason:'unsupported_fact',note:'Each device is a separate identity.',scope:'reusable'};
  assert.equal((await post('/api/learning/corrections',body,null)).status,400);
  assert.equal((await post('/api/learning/corrections',body,cookie,'https://other.test')).status,400);
  const savedResponse=await post('/api/learning/corrections',body,cookie),saved=await savedResponse.json();assert.equal(savedResponse.status,201);assert.equal(teaching,0);assert.equal(saved.stages.mubit_recording.state,'not_sent');
  const preview=await(await post('/api/learning/corrections/'+saved.id+'/preview',{},cookie)).json();assert.equal(preview.inference.route,'operator_preview');assert.equal(teaching,0);
  const foreign=await app.request('http://homeward.test/api/learning/corrections/'+saved.id);assert.equal(foreign.status,404);
  const history=await(await app.request('http://homeward.test/api/learning',{headers:{Cookie:cookie}})).json();assert.equal(history.corrections.length,1);
  assert.equal((await post('/api/learning/corrections/'+saved.id+'/teach',{reviewed:false},cookie)).status,400);assert.equal(teaching,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
