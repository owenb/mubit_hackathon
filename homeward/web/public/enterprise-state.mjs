// A hidden travel canvas must never submit into travel teaching while business mode is active.
export function createModeFetch(fetcher,isEnterprise,origin){
 return (input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,origin);
  if(isEnterprise()&&url.origin===origin&&url.pathname==='/api/ask')return Promise.resolve(new Response(JSON.stringify({error:'Switch to Travel before asking a travel question.'}),{status:409,headers:{'Content-Type':'application/json'}}));
  return fetcher(input,init);
 };
}
const words=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function companyForQuestion(question,companies,currentId){
 const text=' '+words(question)+' ';
 const matches=companies.filter(c=>[c.name,c.id,c.id==='jpmorgan'?'JP Morgan':''].filter(Boolean).some(alias=>text.includes(' '+words(alias)+' ')));
 if(matches.length>1)throw Error('Choose one verified business at a time so the assessment and map stay aligned.');
 return matches[0]||companies.find(c=>c.id===currentId)||null;
}

// Explicit links win; otherwise keep the visitor's last chosen map mode.
export function initialEnterpriseMode(url,saved){
 const u=new URL(url,'http://localhost');
 if(u.searchParams.has('mode'))return u.searchParams.get('mode')==='enterprise';
 return u.pathname.replace(/\/$/,'')==='/enterprise'||saved==='enterprise';
}
export function enterpriseModeUrl(url,active){const u=new URL(url,'http://localhost');u.searchParams.set('mode',active?'enterprise':'travel');return u.pathname+u.search+u.hash;}

// Move screen labels, never office anchors. Leaders retain exact projected locations.
export function layoutCompanyLabels(points,bounds,gap=8){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const overlap=(a,b)=>a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;
 const placed=[],result=new Map();
 for(const point of [...points].sort((a,b)=>Number(!!b.selected)-Number(!!a.selected))){
  const w=Math.min(point.width,bounds.right-bounds.left),h=point.height;
  const rect=(x,y)=>{x=clamp(x,bounds.left+w/2,bounds.right-w/2);y=clamp(y,bounds.top+h/2,bounds.bottom-h/2);return {x,y,left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};};
  const candidates=[];for(const dy of [-34,-74,6,-114,46,-154,86,-194,126])for(const dx of [0,-w*.65,w*.65,-w-12,w+12])candidates.push(rect(point.x+dx,point.y+dy));
  // A bounded grid covers unusually dense clusters without dropping a name.
  for(let y=bounds.top+h/2;y<=bounds.bottom-h/2;y+=h+gap)for(let x=bounds.left+w/2;x<=bounds.right-w/2;x+=w+gap)candidates.push(rect(x,y));
  let best=null,score=Infinity;for(const c of candidates){const conflicts=placed.filter(p=>overlap(c,p)).length;const distance=(c.x-point.x)**2+(c.y-(point.y-34))**2;const next=conflicts*1e9+distance;if(next<score){score=next;best=c;}}
  const label=best||rect(point.x,point.y-34);placed.push(label);result.set(point.id,{...label,anchor:{x:point.x,y:point.y},end:{x:clamp(point.x,label.left,label.right),y:clamp(point.y,label.top,label.bottom)}});
 }
 return result;
}
