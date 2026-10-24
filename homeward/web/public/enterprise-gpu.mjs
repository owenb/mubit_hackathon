// Browser-only WebGPU view of the same complete London mesh. No native source changes.
const norm=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const multiply=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
export function cameraMatrix({x,z,yaw,tilt,range},aspect,shift=0){
 const d=range*2,eye=[x+Math.sin(yaw)*Math.cos(tilt)*d,Math.sin(tilt)*d,z+Math.cos(yaw)*Math.cos(tilt)*d];
 const forward=norm([eye[0]-x,eye[1],eye[2]-z]),right=norm(cross([0,1,0],forward)),up=cross(forward,right);
 const view=new Float32Array([right[0],up[0],forward[0],0,right[1],up[1],forward[1],0,right[2],up[2],forward[2],0,-dot(right,eye),-dot(up,eye),-dot(forward,eye),1]);
 const far=range*8,near=1,projection=new Float32Array([1/(range*aspect),0,0,0,0,1/range,0,0,0,0,-1/(far-near),0,shift,0,-near/(far-near),1]);
 return {matrix:multiply(projection,view),eye};
}
export const project=(m,p,width,height)=>{const v=[...p,1],o=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[r]+=m[c*4+r]*v[c];return {x:(o[0]/o[3]+1)*width/2,y:(1-o[1]/o[3])*height/2,depth:o[2]/o[3]};};
export async function createEnterpriseMap({canvas,companies,onSelect,onView}){
 if(!navigator.gpu)throw Error('Enterprise map requires WebGPU.');
 const city=globalThis.enterpriseCity;if(!city)throw Error('The full London geometry is still loading.');
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('WebGPU adapter unavailable.');
 const device=await adapter.requestDevice(),context=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 device.lost.then(info=>window.dispatchEvent(new CustomEvent('london:notice',{detail:'Enterprise map graphics connection lost: '+info.message})));
 const buffer=(data,usage)=>{const b=device.createBuffer({size:data.byteLength,usage:usage|GPUBufferUsage.COPY_DST});const bytes=new Uint8Array(data);for(let off=0;off<bytes.length;off+=8*1024*1024)device.queue.writeBuffer(b,off,bytes.subarray(off,Math.min(bytes.length,off+8*1024*1024)));return b;};
 const vertices=buffer(city.vertices,GPUBufferUsage.VERTEX),indices=buffer(city.indices,GPUBufferUsage.INDEX),uniform=device.createBuffer({size:208,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const shader=device.createShaderModule({code:await fetch('/enterprise-city.wgsl').then(r=>r.text())});
 const pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs',buffers:[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'uint32'},{shaderLocation:3,offset:28,format:'float32'}]}]},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less-equal'},multisample:{count:4}});
 const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 let color,depth,width=0,height=0,active=false,dirty=true,drag=null,lastMatrix,ambience=Number(document.documentElement.dataset.ambience)||1,frame=null;
 const camera={x:3100,z:-650,yaw:.08,tilt:1.02,range:4700},target={...camera};
 const pins=document.createElement('div');pins.className='enterprise-pins';pins.setAttribute('aria-label','Verified London offices');canvas.after(pins);
 const buttons=companies.map(c=>{const b=document.createElement('button');b.className='enterprise-pin';b.style.setProperty('--company-color',c.color);b.title=c.name+' · '+c.address;b.setAttribute('aria-label','Select '+c.name);b.innerHTML='<span class="pin-dot"></span><span class="pin-label"></span><span class="pin-stem"></span>';b.querySelector('.pin-label').textContent=c.name;b.onclick=e=>{e.stopPropagation();onSelect(c);};pins.append(b);return b;});
 let selected=null;
 function resize(){const ratio=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(innerWidth*ratio)),h=Math.max(1,Math.round(innerHeight*ratio));if(w===width&&h===height)return;width=w;height=h;canvas.width=w;canvas.height=h;color?.destroy();depth?.destroy();color=device.createTexture({size:[w,h],sampleCount:4,format,usage:GPUTextureUsage.RENDER_ATTACHMENT});depth=device.createTexture({size:[w,h],sampleCount:4,format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});dirty=true;}
 function draw(){if(!active)return;resize();let moving=false;for(const k of Object.keys(camera)){const delta=target[k]-camera[k];if(Math.abs(delta)>.005){camera[k]+=delta*(matchMedia('(prefers-reduced-motion:reduce)').matches?1:.12);moving=true;}}if(moving)dirty=true;
 if(dirty){dirty=false;const side=innerWidth>900?390:0,view=cameraMatrix(camera,width/height,side/innerWidth),u=new Float32Array(52);lastMatrix=view.matrix;u.set(view.matrix);u.set([...view.eye,camera.range],16);
 const day=Math.max(0,Math.min(1,(ambience-1.2)/.6)),deep=Math.max(0,1-ambience),clean=Math.max(0,ambience-2);u.set([0,deep,clean,1],20);u.set([-.45,.83,.35,0],24);u.set([day,0,1-day,0],28);u.set([.035+day*.1,.04+day*.1,.075+day*.12,0],32);u.set([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],36);device.queue.writeBuffer(uniform,0,u);
 const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:color.createView(),resolveTarget:context.getCurrentTexture().createView(),clearValue:ambience>2.5?{r:.94,g:.95,b:.93,a:1}:{r:.008,g:.013,b:.027,a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.setVertexBuffer(0,vertices);pass.setIndexBuffer(indices,'uint32');pass.drawIndexed(city.metadata.indices);pass.end();device.queue.submit([encoder.finish()]);
 const placed=[];companies.forEach((c,i)=>{const p=project(lastMatrix,[c.east,c.height+12,-c.north],innerWidth,innerHeight),b=buttons[i],isSelected=c.id===selected;const clipped=p.x<Math.max(side+12,18)||p.x>innerWidth-20||p.y<100||p.y>innerHeight-120||p.depth<0||p.depth>1;
 b.hidden=clipped;b.classList.toggle('selected',isSelected);b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.zIndex=isSelected?'20':String(10-Math.floor(p.depth*5));
 const collision=placed.some(q=>Math.abs(q.x-p.x)<120&&Math.abs(q.y-p.y)<36);b.classList.toggle('compact',collision&&!isSelected);if(!clipped&&!collision)placed.push(p);});
 globalThis.enterpriseMapProof={renderer:'WebGPU · shared full London geometry',source_sha256:globalThis.homewardDiagnostics?.source_sha256,features:city.metadata.features,vertices:city.metadata.vertices,indices:city.metadata.indices,companies:companies.length,camera:{...camera},selected,projection:'same matrix for GPU scene and company DOM pins'};onView?.();
 }frame=requestAnimationFrame(draw);}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,pan:e.shiftKey};});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;if(drag.pan){const scale=2*target.range/innerHeight;target.x-=scale*(Math.cos(target.yaw)*dx+Math.sin(target.yaw)*dy/Math.sin(target.tilt));target.z+=scale*(Math.sin(target.yaw)*dx-Math.cos(target.yaw)*dy/Math.sin(target.tilt));}else{target.yaw-=dx*.005;target.tilt=Math.max(.45,Math.min(1.42,target.tilt+dy*.004));}dirty=true;});
 for(const kind of ['pointerup','pointercancel'])canvas.addEventListener(kind,()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();target.range=Math.max(220,Math.min(18000,target.range*Math.exp(e.deltaY*.001)));dirty=true;},{passive:false});
 window.addEventListener('resize',()=>dirty=true);window.addEventListener('london:appearance',e=>{ambience=e.detail.ambience;dirty=true;});
 return {setActive(value){if(frame!==null)cancelAnimationFrame(frame);frame=null;active=value;canvas.hidden=!value;pins.hidden=!value;if(value){dirty=true;draw();}},select(company){selected=company?.id||null;for(const b of buttons)b.setAttribute('aria-pressed','false');const ix=companies.findIndex(c=>c.id===selected);if(ix>=0)buttons[ix].setAttribute('aria-pressed','true');if(company){target.x=company.east;target.z=-company.north;target.range=900;}dirty=true;},overview(){selected=null;Object.assign(target,{x:3100,z:-650,range:4700,yaw:.08,tilt:1.02});dirty=true;},zoom(factor){target.range=Math.max(220,Math.min(18000,target.range*factor));dirty=true;}};
}
