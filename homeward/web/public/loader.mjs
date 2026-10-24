const $=id=>document.getElementById(id);
const stages={unpack:['Unpacking the whole city',1,'Opening the lossless London package.'],verify:['Checking every corner',1,'Validating the complete map before it reaches the screen.'],build:['Putting London together',1,'Building the original geometry, district by district.'],transfer:['Passing the city to your browser',1,'The map is ready. Moving its geometry into the renderer.'],gpu:['Switching on the lights',2,'Connecting WebGPU and preparing the glass, streets and skyline.'],upload:['Lighting up London',2,'Sending the complete city to your graphics card.'],present:['All aboard',2,'Waiting for the first completed map frame.']};
const loadStarted=performance.now(),history=[];
const mb=n=>(n/1e6).toFixed(1)+' MB';
let failed=false,ready=false,worker;
function status(label,station,detail,completed=0,total=0){
  if(failed||ready)return;
  const determinate=Number.isFinite(total)&&total>0;
  const fraction=determinate?Math.min(Math.max(completed/total,0),1):0;
  $('phase-label').textContent=label;$('progress-detail').textContent=detail;
  $('progress-number').textContent=determinate?`${Math.floor(fraction*100)}%`:'';
  $('progress-track').classList.toggle('indeterminate',!determinate);
  $('progress-track').setAttribute('aria-label',label);
  if(determinate){$('progress-track').setAttribute('aria-valuenow',String(Math.floor(fraction*100)));$('progress-track').setAttribute('aria-valuemin','0');$('progress-track').setAttribute('aria-valuemax','100');}else{$('progress-track').removeAttribute('aria-valuenow');}
  $('progress-fill').style.width=`${fraction*100}%`;$('progress-track').style.setProperty('--progress',`${fraction*100}%`);
  document.querySelectorAll('[data-station]').forEach((node,i)=>{node.classList.toggle('done',i<station);node.classList.toggle('active',i===station);});
  history.push({at_ms:Math.round(performance.now()-loadStarted),label,station,completed,total});
}
function fail(error){
  if(failed)return;failed=true;worker?.terminate();
  $('phase-label').textContent='We missed this connection';$('progress-number').textContent='';$('progress-track').classList.remove('indeterminate');
  $('failure').textContent=error?.message||String(error);$('failure').hidden=false;$('retry').hidden=false;
  $('retry').onclick=()=>location.reload();console.error('Homeward startup:',error);
  globalThis.homewardDiagnostics={status:'error',error:String(error),history};
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
  $('evaluation').hidden=false;
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
  if(!isSecureContext)throw Error('Open Homeward over HTTPS or localhost to use WebGPU.');
  if(!navigator.gpu)throw Error('This desktop browser does not have WebGPU available. Try a current Chrome, Edge, Safari or supported Firefox version.');
  // The real adapter check happens before downloading the city.
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw Error('Your browser could not connect to a WebGPU graphics adapter. Check that hardware acceleration is enabled.');
  const manifest=await fetch('/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Homeward assets are not built yet.');return r.json();});
  let cache;try{cache=await caches.open('homeward-verified-assets-v1');}catch{}
  const loaded={engine:0,map:0},total=manifest.engine.bytes+manifest.map.bytes;
  $('package-note').textContent=`Full London · ${mb(manifest.map.bytes)} lossless package · ${mb(manifest.map.raw_bytes)} unpacked`;
  function update(name,bytes,cached){loaded[name]=bytes;const done=loaded.engine+loaded.map;status(cached?'Finding London in your browser':'Bringing London to you',0,`${mb(done)} / ${mb(total)} received${cached?' · verified browser cache':''}.`,done,total);}
  const [engineBytes,mapBytes]=await Promise.all([fetchAsset(manifest.engine,cache,(n,c)=>update('engine',n,c)),fetchAsset(manifest.map,cache,(n,c)=>update('map',n,c))]);
  status('Preparing the route',1,'Compiling the Rust renderer and opening the London package.');
  const rawEngine=await new Response(new Blob([engineBytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const module=await WebAssembly.compile(rawEngine);
  worker=new Worker('/worker.mjs',{type:'module',name:'Homeward full London builder'});
  const prepared=await new Promise((resolve,reject)=>{
    worker.onmessage=({data})=>{if(data.type==='progress')globalThis.homeward_progress(data.stage,data.completed,data.total);else if(data.type==='city')resolve(data);else if(data.type==='error')reject(Error(data.message));};
    worker.onerror=e=>reject(Error(e.message||'The map worker stopped unexpectedly.'));
    worker.postMessage({module,bindings:manifest.bindings,map:mapBytes.buffer},[mapBytes.buffer]);
  });
  worker.terminate();
  const metadata=JSON.parse(prepared.metadata);
  globalThis.homewardDiagnostics={status:'initializing',map:metadata,source_sha256:manifest.map.source_sha256,download_bytes:total,history};
  const {default:init,start}=await import(manifest.bindings);await init({module_or_path:module});
  await start($('homeward'),new Uint8Array(prepared.vertices),new Uint8Array(prepared.indices),prepared.metadata);
}
boot().catch(fail);
window.addEventListener('unhandledrejection',event=>{if(!ready)fail(event.reason);});
