import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { ask, cacheKey, researchIsFresh, validateAnswer, knowledge, liveLifts } from '../src/core.mjs';

test('freshness expires and rejects future-dated provenance', () => {
  const t = Math.max(...knowledge.sources.map(s=>Date.parse(s.retrieved_at)));
  assert.equal(researchIsFresh(t + 1000), true);
  assert.equal(researchIsFresh(t + 8*86400000), false);
  assert.equal(researchIsFresh(Math.min(...knowledge.sources.map(s=>Date.parse(s.retrieved_at)))-1000), false);
});
test('cache preserves factual distinctions and mode boundaries', () => {
  assert.equal(cacheKey(' BANK Northern '), cacheKey('bank northern'));
  assert.notEqual(cacheKey('Bank Central'), cacheKey('Bank Northern'));
  assert.notEqual(cacheKey('Bank', 'memory'), cacheKey('Bank', 'grounded'));
});
test('repeated questions avoid a model call but do not reuse lift status', async () => {
  const dir = await mkdtemp(tmpdir()+'/homeward-test-');
  let calls = 0, checks = 0;
  const opts = { use_cache:true, cacheDir: pathToFileURL(dir+'/'), modelQuery: async () => { calls++; return { static_access:'unknown',response_kind:'live_check',answer:'Checking the lifts.',source_ids:[],scene:{camera:'keep',places:[]} }; }, checkLifts: async () => ({ status:'checked',generation:++checks }) };
  try {
    const a = await ask('Bank lifts now?', opts), b = await ask('Bank lifts now?', opts);
    assert.equal(calls,1); assert.equal(checks,2); assert.equal(a.cache_hit,false); assert.equal(b.cache_hit,true);
    assert.equal(b.model_calls_this_request,0); assert.equal(b.live.generation,2);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('failed live fetch never rebrands old data as current', async () => {
  const r = await liveLifts('Bank', { fetcher: async () => { throw new Error('network offline'); }, now: 1 });
  assert.equal(r.status,'unavailable'); assert.equal(r.checked_at,null);
});
test('reject unsupported citations and optimistic live status', () => {
  assert.throws(()=>validateAnswer({answer:'fine',static_access:'yes',response_kind:'live_check',source_ids:[]}));
  assert.throws(()=>validateAnswer({answer:'fine',static_access:'yes',response_kind:'answer',source_ids:['made-up']}));
});

test('malformed cached answers are replaced by a fresh validated result', async () => {
  const dir = await mkdtemp(tmpdir()+'/homeward-corrupt-');
  const cacheDir = pathToFileURL(dir+'/');
  const question = 'Bank Northern street access?';
  let calls = 0;
  try {
    await writeFile(new URL(cacheKey(question)+'.json',cacheDir),JSON.stringify({answer:'broken',source_ids:[]}));
    const result = await ask(question,{cacheDir,use_cache:true,modelQuery:async()=>{
      calls++;
      return {static_access:'yes',response_kind:'answer',answer:'Northern has a street-to-platform lift route.',source_ids:['tfl-guide'],scene:{camera:'keep',places:[]}};
    }});
    assert.equal(calls,1); assert.equal(result.cache_hit,false); assert.equal(result.static_access,'yes');
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('live feed cache expires and a clock rollback forces revalidation', async () => {
  let fetches = 0;
  const fetcher = async () => {
    fetches++;
    return new Response(JSON.stringify([{stationUniqueId:'HUBBAN',message:`Bank: notice ${fetches}`}]),{headers:{'Content-Type':'application/json'}});
  };
  const a = await liveLifts('Bank',{fetcher,now:100000});
  const b = await liveLifts('Bank',{fetcher,now:100001});
  assert.equal(fetches,1); assert.equal(a.checked_at,b.checked_at);
  await liveLifts('Bank',{fetcher,now:160000}); assert.equal(fetches,2);
  await liveLifts('Bank',{fetcher,now:150000}); assert.equal(fetches,3);
});
