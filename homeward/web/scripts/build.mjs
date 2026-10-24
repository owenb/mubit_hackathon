// Browser distribution build: the renderer is already compiled to WebAssembly.
import {readFile,writeFile,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,gunzipSync,constants} from 'node:zlib';
const web=new URL('../',import.meta.url),dist=new URL('dist/',web);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await readFile(new URL('manifest.json',dist),'utf8'));
for(const [name,decode] of [['map',brotliDecompressSync],['engine',gunzipSync]]){
 const entry=manifest[name],bytes=await readFile(new URL('.'+entry.url,dist));
 if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error(name+' package does not match manifest');
 const raw=decode(bytes);
 if(raw.length!==entry.raw_bytes)throw Error(name+' unpacked length differs');
 if(name==='map'&&hash(raw)!==entry.source_sha256)throw Error('Map source checksum differs');
 if(name==='engine'&&raw.subarray(0,4).toString('hex')!=='0061736d')throw Error('Invalid WebAssembly engine');
}
await readFile(new URL('.'+manifest.bindings,dist));
const source=await readFile(new URL('maps/london.ael',dist));
if(hash(source)!==manifest.map.source_sha256)throw Error('Downloadable source map differs from packed map');
await cp(new URL('public/',web),dist,{recursive:true});
for(const name of ['index.html','style.css','loader.mjs','worker.mjs','evaluation.mjs','corrections.mjs','experience.mjs','correction-state.mjs','ui.mjs','appearance.mjs','appearance-state.mjs','enterprise.mjs','enterprise-gpu.mjs','enterprise-state.mjs','enterprise.css','enterprise-city.wgsl','city-composite.wgsl','map-ask.mjs','map-ask.wgsl','intro.mjs','intro.css']){
 await writeFile(new URL(name+'.br',dist),brotliCompressSync(await readFile(new URL(name,dist)),{params:{[constants.BROTLI_PARAM_QUALITY]:9}}));
}
console.log(JSON.stringify({status:'built',renderer:'precompiled WebAssembly / WebGPU',map_transfer_bytes:manifest.map.bytes,engine_transfer_bytes:manifest.engine.bytes,source_sha256:manifest.map.source_sha256}));
