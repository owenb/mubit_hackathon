import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import OpenAI from 'openai';
import {createMubitFetch,appendHeaderRecord,safeResponseHeaders} from '../src/mubit-telemetry.mjs';
const endpoint='https://api.mubit.ai/openai/v1/chat/completions';

test('records new headers without consuming streams or logging request content/credentials',async()=>{
 const records=[],secret='test-credential-value',body='private question that must not be logged';
 const response=new Response('data: hello\n\n',{headers:{'x-middleware-request-id':'mreq_fixture','x-mubit-model-version':'v2-fixture','x-new-unrecognised':'capture me','set-cookie':'session=private','x-debug':secret}});
 const observed=createMubitFetch({write:r=>records.push(r),fetcher:async(url,init)=>{assert.equal(url,endpoint);assert.equal(init.body,body);return response;}});
 assert.equal(await observed(endpoint,{method:'POST',headers:{authorization:'Bearer '+secret,'x-middleware-record':'metadata'},body}),response);
 assert.equal(response.bodyUsed,false);assert.equal(await response.text(),'data: hello\n\n');
 assert.equal(records.length,1);assert.equal(records[0].recording_requested,'metadata');assert.equal(records[0].response_headers['x-new-unrecognised'],'capture me');
 assert.deepEqual(records[0].identity_header_candidates,['x-mubit-model-version']);
 const log=JSON.stringify(records);assert.ok(!log.includes(body));assert.ok(!log.includes(secret));assert.ok(!log.includes('session=private'));
});
test('HTTP errors are retained before SDK throws; malformed successful JSON is also retained',async()=>{
 for(const status of [200,401,502]){
  const records=[];let attempts=0;
  const client=new OpenAI({apiKey:'fixture-key',baseURL:'https://api.mubit.ai/openai/v1',maxRetries:0,
   fetch:createMubitFetch({write:r=>records.push(r),fetcher:async()=>{attempts++;return new Response('invalid JSON',{status,headers:{'content-type':'application/json','x-middleware-request-id':'mreq_failure'}});}})});
  await assert.rejects(()=>client.chat.completions.create({model:'gpt-6-luna',messages:[]}).withResponse());
  assert.equal(attempts,1);assert.equal(records.length,1);assert.equal(records[0].status,status);assert.equal(records[0].request_id,'mreq_failure');
 }
});
test('network and journal failures never repeat a paid request',async()=>{
 const records=[];let calls=0;const failure=new Error('secret provider detail');
 const fetcher=createMubitFetch({write:r=>records.push(r),fetcher:async()=>{calls++;throw failure;}});
 await assert.rejects(()=>fetcher(endpoint),e=>e===failure);assert.equal(calls,1);assert.equal(records[0].outcome,'network_error');assert.equal(records[0].headers_received,false);assert.ok(!JSON.stringify(records).includes(failure.message));
 let warnings=0;const response=new Response('ok');const broken=createMubitFetch({fetcher:async()=>response,write:async()=>{throw Error('disk full');},onLogError:()=>warnings++});
 assert.equal(await broken(endpoint),response);assert.equal(warnings,1);
});
test('direct provider calls bypass the Mubit journal',async()=>{
 let writes=0;const response=new Response('direct');const fetcher=createMubitFetch({fetcher:async()=>response,write:()=>writes++});
 assert.equal(await fetcher('https://api.openai.com/v1/chat/completions'),response);assert.equal(writes,0);
});
test('all header names survive redaction and private journal uses restrictive file permissions',async()=>{
 const headers=safeResponseHeaders({'X-Api-Key':'secret','X-Model':'mbt_fixture_key','X-Version':'v2'});
 assert.deepEqual(headers,{'x-api-key':'[REDACTED]','x-model':'[REDACTED]','x-version':'v2'});
 const dir=await mkdtemp(tmpdir()+'/homeward-header-test-');try{
  const directory=pathToFileURL(dir+'/'),record={at:'2026-10-24T00:00:00Z',response_headers:headers};
  await appendHeaderRecord(record,directory);await appendHeaderRecord(record,directory);
  const path=new URL('2026-10-24.jsonl',directory);assert.equal((await readFile(path,'utf8')).trim().split('\n').length,2);
  assert.equal((await stat(path)).mode&0o777,0o600);
 }finally{await rm(dir,{recursive:true,force:true});}
});
