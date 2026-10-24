import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createWebApp} from '../app.mjs';

test('same-origin browser questions preserve the existing inference contract',async()=>{
  let input;
  const app=createWebApp({askFn:async(q,options)=>{input={q,options};return {answer:'Example',scene:{camera:'keep',places:[]},inference:{route:'luna'}};}});
  const r=await app.request('https://homeward.example/api/ask',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://homeward.example',Host:'homeward.example'},body:JSON.stringify({question:'Is Bank step-free?',context_ids:['station:bank']})});
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).inference.route,'luna');
  assert.deepEqual(input,{q:'Is Bank step-free?',options:{mode:'grounded',context_ids:['station:bank'],use_cache:false}});
});
test('invalid, oversized and cross-origin requests never reach the model',async()=>{
  let calls=0;const app=createWebApp({askFn:async()=>{calls++;return {};}});
  for(const [headers,body,status] of [
    [{'Content-Type':'text/plain'},'hello',415],
    [{'Content-Type':'application/json',Origin:'https://elsewhere.example',Host:'homeward.example'},JSON.stringify({question:'Bank?'}),403],
    [{'Content-Type':'application/json'},JSON.stringify({question:'Bank?',context_ids:['x','x','x','x','x','x','x']}),400],
    [{'Content-Type':'application/json'},JSON.stringify({question:''}),400],
    [{'Content-Type':'application/json'},'x'.repeat(10001),413],
  ]){const r=await app.request('https://homeward.example/api/ask',{method:'POST',headers,body});assert.equal(r.status,status);}
  assert.equal(calls,0);
});
test('packed map round-trips to the complete, unchanged source database',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url)));
  const packed=await readFile(new URL('../dist'+manifest.map.url,import.meta.url));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(packed.length,manifest.map.bytes);assert.equal(hash(packed),manifest.map.sha256);
  const raw=brotliDecompressSync(packed);
  assert.equal(raw.length,21_910_636);assert.equal(hash(raw),'b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719');
  const wasm=gunzipSync(await readFile(new URL('../dist'+manifest.engine.url,import.meta.url)));
  assert.equal(wasm.length,manifest.engine.raw_bytes);assert.deepEqual([...wasm.subarray(0,4)],[0,97,115,109]);
});
test('asset lengths are truthful and immutable; missing assets are not SPA HTML',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url)));const app=createWebApp();
  const r=await app.request('http://localhost:3000'+manifest.map.url);
  assert.equal(r.status,200);assert.equal(Number(r.headers.get('content-length')),manifest.map.bytes);
  assert.equal(r.headers.get('content-encoding'),null);assert.match(r.headers.get('cache-control'),/immutable/);
  assert.equal((await r.arrayBuffer()).byteLength,manifest.map.bytes);
  assert.equal((await app.request('http://localhost:3000/assets/missing.wasm.gz')).status,404);
  assert.equal((await app.request('http://localhost:3000/api/unknown')).status,404);
  const page=await app.request('http://localhost:3000/explore');assert.equal(page.status,200);assert.match(await page.text(),/Interactive 3D map of London/);
});
test('evaluation endpoints show the evidence state without inventing an adapter win',async()=>{
  const app=createWebApp();const r=await app.request('http://localhost:3000/api/evals');assert.equal(r.status,200);const e=await r.json();assert.equal(e.test.cases,20);assert.equal(typeof e.complete,'boolean');if(!e.complete)assert.ok(e.pending_reason);
  assert.equal((await app.request('http://localhost:3000/health')).status,200);
});

test('editable shell bypasses date-based stale cache while immutable assets keep their cache policy',async()=>{
 const app=createWebApp();
 const response=await app.request('http://homeward.test/corrections.mjs',{headers:{'If-Modified-Since':'Wed, 01 Jan 2031 00:00:00 GMT'}});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-type'),/javascript/);assert.ok((await response.text()).length>1000);
});
