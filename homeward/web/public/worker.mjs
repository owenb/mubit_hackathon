globalThis.homeward_progress=(stage,completed,total)=>postMessage({type:'progress',stage,completed,total});
globalThis.homeward_ready=()=>{};
self.onmessage=async({data})=>{
  try{
    const {default:init,prepare_map}=await import(data.bindings);
    await init({module_or_path:data.module});
    const city=prepare_map(new Uint8Array(data.map));
    const metadata=city.metadata(),vertices=city.vertices(),indices=city.indices();
    city.free();
    postMessage({type:'city',metadata,vertices:vertices.buffer,indices:indices.buffer},[vertices.buffer,indices.buffer]);
    self.close();
  }catch(error){postMessage({type:'error',message:String(error?.message||error)});self.close();}
};
