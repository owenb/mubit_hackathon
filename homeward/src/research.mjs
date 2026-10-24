import {readFile} from 'node:fs/promises';
export const knowledge=JSON.parse(await readFile(new URL('../data/knowledge.json',import.meta.url),'utf8'));
const stop=new Set('a an and are as at be by can could do does for from had has have how i if in into is it me my of on or our please that the their there these this to us was we what when where which will with would you your show london'.split(' '));
const words=s=>String(s).toLowerCase().normalize('NFKD').replace(/[’']/g,'').match(/[\p{L}\p{N}&]+/gu)||[];
const stem=w=>w.length>4?w.replace(/(?:ing|ies|s)$/,''):w;
const tokens=s=>[...new Set(words(s).filter(w=>!stop.has(w)).map(stem))];
const expanded=q=>q+' '+[/rain|wet|indoor/i.test(q)?'museum gallery indoor':'',/kids|child|family|dinosaur/i.test(q)?'children family dinosaur':'',/wheelchair|step.free|mobility|stairs/i.test(q)?'access accessibility wheelchair':'',/boat|river|clipper/i.test(q)?'river boat thames':'',/late|midnight|overnight/i.test(q)?'night':'',/pay|tap|touch|phone|watch/i.test(q)?'payment contactless':'',/design|fashion|v&a|\bva\b/i.test(q)?'V&A art design':'',/maritime|ship|greenwich/i.test(q)?'maritime greenwich':''].join(' ');
export function retrieveResearch(question,contextIds=[]){
 const q=tokens(expanded(question));
 const count=t=>knowledge.facts.filter(f=>tokens(f.text+' '+(f.tags||[]).join(' ')).includes(t)).length;
 const weights=new Map(q.map(t=>[t,Math.log(1+knowledge.facts.length/(1+count(t)))]));
 const ranked=knowledge.facts.map((fact,index)=>{
  const body=new Set(tokens(fact.text)),tags=new Set(tokens((fact.tags||[]).join(' ')));
  let score=q.reduce((s,t)=>s+(body.has(t)?1:0)*weights.get(t)+(tags.has(t)?2:0)*weights.get(t),0);
  if(fact.station&&question.toLowerCase().includes(fact.station.toLowerCase()))score+=15;
  if((fact.place_ids||[]).some(id=>contextIds.includes(id)))score+=3;
  return{fact,score,index};
 }).filter(x=>x.score>1.5).sort((a,b)=>b.score-a.score||a.index-b.index);
 // Retain all facts from each selected source to keep exceptions beside headline advice.
 const sourceIds=[];for(const {fact} of ranked){for(const id of fact.source_ids){if(!sourceIds.includes(id))sourceIds.push(id);}if(sourceIds.length>=5)break;}
 const facts=knowledge.facts.filter(f=>f.source_ids.some(s=>sourceIds.includes(s)));
 const reviewed_examples=/chang|interchange|transfer|stay inside|underground/i.test(question)?(knowledge.reviewed_examples||[]).filter(e=>question.toLowerCase().includes(e.station.toLowerCase())&&e.source_ids.every(id=>sourceIds.includes(id))):[];
 return{version:knowledge.version,facts,rules:knowledge.rules,reviewed_examples,sources:knowledge.sources.filter(s=>sourceIds.includes(s.id))};
}
export function researchFresh(research,now=Date.now()){
 return research.sources.every(s=>Number.isFinite(Date.parse(s.retrieved_at))&&now>=Date.parse(s.retrieved_at)&&now-Date.parse(s.retrieved_at)<knowledge.static_ttl_hours*3600000);
}
