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
