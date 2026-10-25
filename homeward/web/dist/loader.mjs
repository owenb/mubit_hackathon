const $=id=>document.getElementById(id);
globalThis.london_event=(kind,encoded)=>window.dispatchEvent(new CustomEvent('london:'+kind,{detail:JSON.parse(encoded)}));
globalThis.homeward_answered=encoded=>window.dispatchEvent(new CustomEvent('homeward:answer',{detail:JSON.parse(encoded)}));
const stages={unpack:['Unpacking the whole city',1,'Opening the lossless London package.'],verify:['Checking every corner',1,'Validating the complete map before it reaches the screen.'],build:['Putting London together',1,'Building the original geometry, district by district.'],transfer:['Passing the city to your browser',1,'The map is ready. Moving its geometry into the renderer.'],gpu:['Switching on the lights',2,'Connecting WebGPU and preparing the glass, streets and skyline.'],upload:['Lighting up London',2,'Sending the complete city to your graphics card.'],present:['All aboard',2,'Waiting for the first completed map frame.']};
const loadStarted=performance.now(),history=[];
const mb=n=>(n/1e6).toFixed(1)+' MB';
let failed=false,ready=false,worker;
function status(label,station,detail,completed=0,total=0){
  if(failed||ready)return;
  history.push({at_ms:Math.round(performance.now()-loadStarted),label,station,completed,total});
}
// Without WebGPU there is no map to show, so explain why and where it works instead of a stalled loader.
const gpuReasons={
  insecure:'WebGPU only runs on secure pages. Open London Guide over HTTPS.',
  missing:'Your browser doesn’t offer WebGPU, or has it switched off.',
  adapter:'WebGPU is there, but it couldn’t reach your graphics card. Check that hardware acceleration is on in your browser’s settings, then try again.',
  device:'Your graphics card stopped responding while London was loading. Closing other heavy tabs and trying again often helps.'
};
const gpuProblem=(reason,message)=>Object.assign(Error(message),{gpu:reason});
function showNoWebGPU(reason){
  $('no-webgpu-reason').textContent=gpuReasons[reason]||gpuReasons.missing;
  $('no-webgpu-retry').onclick=()=>location.reload();
  $('loading').remove();$('no-webgpu').hidden=false;
}
function fail(error){
  if(failed)return;failed=true;worker?.terminate();
  const message=error?.message||String(error);
  const gpu=error?.gpu||(/webgpu|gpu ?adapter|requestDevice|device (?:was )?lost|wgpu/i.test(message)?'device':null);
  globalThis.homewardDiagnostics={status:'error',error:String(error),gpu,history};console.error('London Guide startup:',error);
  if(gpu){showNoWebGPU(gpu);return;}
  $('loading').dataset.failed='';$('loading').setAttribute('aria-busy','false');
  $('loading-title').textContent='London didn’t load';
  $('failure').textContent=message+' Click the London Eye to try again.';$('failure').hidden=false;
  $('retry').disabled=false;$('retry').setAttribute('aria-label','Retry loading London');$('retry').title='Retry loading London';
  $('retry').onclick=()=>location.reload();
}
globalThis.homeward_progress=(stage,completed,total)=>{
  const [label,station,detail]=stages[stage]||[stage,1,''];
  const count=stage==='build'&&total?`${completed.toLocaleString()} / ${total.toLocaleString()} district layers assembled.`:stage==='upload'?`${mb(completed)} / ${mb(total)} of complete geometry uploaded.`:detail;
  status(label,station,count,completed,total);
};
globalThis.homeward_ready=()=>{
  if(ready||failed)return;
  status('Welcome to London',3,`Your city is ready in ${((performance.now()-loadStarted)/1000).toFixed(1)} seconds.`,1,1);ready=true;
  document.documentElement.dataset.homewardReady='true';
  globalThis.homewardDiagnostics={...globalThis.homewardDiagnostics,status:'ready',load_ms:performance.now()-loadStarted,history};
  const d=globalThis.homewardDiagnostics;
  $('homeward-proof').textContent=JSON.stringify({status:d.status,load_ms:d.load_ms,features:d.map?.features,vertices:d.map?.vertices,indices:d.map?.indices,geometry_bytes:d.map?.vertices*32+d.map?.indices*4,source_sha256:d.source_sha256,download_bytes:d.download_bytes,history:d.history});
  window.dispatchEvent(new Event('london:ready'));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{$('loading').classList.add('depart');setTimeout(()=>$('loading').remove(),500);}));
};
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function fetchAsset(asset,cache,update){
  const cached=await cache?.match(asset.url);
  const response=cached||await fetch(asset.url);
  if(!response.ok||!response.body)throw Error('The map package could not be downloaded. Please try again.');
  const bytes=new Uint8Array(asset.bytes);let at=0;const reader=response.body.getReader();
  for(;;){const {value,done}=await reader.read();if(done)break;if(at+value.length>bytes.length)throw Error('Asset length does not match its manifest. Please reload.');bytes.set(value,at);at+=value.length;update(at,Boolean(cached));}
  if(at!==asset.bytes||await digest(bytes)!==asset.sha256){await cache?.delete(asset.url);throw Error('Asset verification failed. Please reload to fetch a fresh copy.');}
  if(!cached)try{await cache?.put(asset.url,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch{/* A full browser cache must not prevent loading. */}
  return bytes;
}
async function boot(){
  if(!isSecureContext)throw gpuProblem('insecure','Open London Guide over HTTPS or localhost to use WebGPU.');
  if(!navigator.gpu||new URLSearchParams(location.search).has('no-webgpu'))throw gpuProblem('missing','This browser does not have WebGPU available.');
  // The real adapter check happens before downloading the city.
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'}).catch(()=>null);
  if(!adapter)throw gpuProblem('adapter','Your browser could not connect to a WebGPU graphics adapter.');
  const manifest=await fetch('/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('London Travel assets are not built yet.');return r.json();});
  let cache;try{cache=await caches.open('homeward-verified-assets-v1');}catch{}
  const loaded={engine:0,map:0},total=manifest.engine.bytes+manifest.map.bytes;
  function update(name,bytes,cached){loaded[name]=bytes;const done=loaded.engine+loaded.map;status(cached?'Finding London in your browser':'Bringing London to you',0,`${mb(done)} / ${mb(total)} received${cached?' · verified browser cache':''}.`,done,total);}
  const [engineBytes,mapBytes]=await Promise.all([fetchAsset(manifest.engine,cache,(n,c)=>update('engine',n,c)),fetchAsset(manifest.map,cache,(n,c)=>update('map',n,c))]);
  status('Preparing the route',1,'Starting the map renderer and opening the London package.');
  const rawEngine=await new Response(new Blob([engineBytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const module=await WebAssembly.compile(rawEngine);
  worker=new Worker('/worker.mjs',{type:'module',name:'London Travel full London builder'});
  const prepared=await new Promise((resolve,reject)=>{
    worker.onmessage=({data})=>{if(data.type==='progress')globalThis.homeward_progress(data.stage,data.completed,data.total);else if(data.type==='city')resolve(data);else if(data.type==='error')reject(Error(data.message));};
    worker.onerror=e=>reject(Error(e.message||'The map worker stopped unexpectedly.'));
    worker.postMessage({module,bindings:manifest.bindings,map:mapBytes.buffer},[mapBytes.buffer]);
  });
  worker.terminate();
  // Browser-only enterprise layer reuses the exact prepared city buffers.
  globalThis.enterpriseCity={vertices:prepared.vertices,indices:prepared.indices,metadata:JSON.parse(prepared.metadata)};
  window.dispatchEvent(new Event('london:geometry'));
  const metadata=JSON.parse(prepared.metadata);
  globalThis.homewardDiagnostics={status:'initializing',map:metadata,source_sha256:manifest.map.source_sha256,download_bytes:total,history};
  const {default:init,start,preview_answer,ui_command}=await import(manifest.bindings);await init({module_or_path:module});
  globalThis.londonMap=value=>ui_command(JSON.stringify(value));
  window.dispatchEvent(new Event('london:engine'));
  globalThis.homewardPreviewAnswer=value=>{if(!preview_answer)throw Error('This renderer needs the correction bridge build.');preview_answer(JSON.stringify(value));};
  await start($('homeward'),new Uint8Array(prepared.vertices),new Uint8Array(prepared.indices),prepared.metadata);
}
boot().catch(fail);
window.addEventListener('unhandledrejection',event=>{if(!ready)fail(event.reason);});
