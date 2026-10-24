// Source notes were checked in primary public pages on 24 October 2026.
import {readFile,writeFile} from 'node:fs/promises';
const dir=new URL('./',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,dir),'utf8'));
const ways=(await read('osm/ways.json')).elements,nodes=new Map((await read('osm/nodes.json')).elements.map(n=>[n.id,n]));
const google=(await read('osm/google.json')).elements[0];
// Preserve the actual source-review snapshot; rebuilding does not renew evidence.
const checked_at='2026-10-24T16:55:42.533Z';
const rows=[
 ['morgan-stanley','Morgan Stanley','Financial services',172886760,'25 Cabot Square, Canary Wharf, London E14 4QA','#9ac9ed',[
  ['office','London offices','https://www.morganstanley.com/about-us/global-offices/europe-middle-east-africa/united-kingdom','Morgan Stanley lists its London office at 25 Cabot Square.'],
  ['ai','Debrief launch · 26 June 2024','https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch','In June 2024 Morgan Stanley Wealth Management announced an OpenAI-powered meeting notes and draft follow-up tool with client consent and advisor review. This announcement does not establish London office deployment.']]],
 ['barclays','Barclays','Banking',5986929,'1 Churchill Place, Canary Wharf, London E14 5HP','#43c6ec',[
  ['office','Barclays London contact','https://privatebank.barclays.com/international-banking/help-with-my-account/banking/international-client-contact-information/','Barclays lists a London contact address at 1 Churchill Place.'],
  ['ai','Microsoft announcement · 9 June 2025','https://ukstories.microsoft.com/features/barclays-rolls-out-microsoft-365-copilot-to-100000-colleagues/','Microsoft announced a planned global rollout of Microsoft 365 Copilot to 100,000 Barclays colleagues in June 2025. This is a public rollout announcement, not measured London adoption or spend.']]],
 ['hsbc','HSBC','Banking',5986805,'8 Canada Square, Canary Wharf, London E14 5HQ','#ed6e72',[
  ['office','HSBC Asset Management contact','https://www.assetmanagement.hsbc.co.uk/en/contact-us','HSBC Asset Management lists its contact address at 8 Canada Square, Canary Wharf. The OSM building label is HSBC UK; this pin represents the HSBC group office building, not the Birmingham headquarters of HSBC UK.'],
  ['business','HSBC at a glance','https://www.hsbc.com/who-we-are/hsbc-at-a-glance','HSBC describes banking services across its UK, Hong Kong, Corporate and Institutional Banking, and International Wealth and Premier Banking businesses. No office-specific LLM usage is established by this source.']]],
 ['jpmorgan','J.P. Morgan','Financial services',140144145,'25 Bank Street, Canary Wharf, London E14 5JP','#c2b49b',[
  ['office','J.P. Morgan entity information','https://cws-main-ndc.jpmorgan.com/disclosures/legal-entity-information','JPMorgan Chase Bank, N.A., London Branch and J.P. Morgan SE London Branch list 25 Bank Street. The source describes private banking and treasury/securities services; it does not establish this office’s LLM usage.']]],
 ['unilever','Unilever','Consumer goods',159590822,'Unilever House, 100 Victoria Embankment, London EC4Y 0DY','#a3a1ff',[
  ['office','Unilever contact','https://www.unilever.com/contact/','Unilever lists Unilever House at 100 Victoria Embankment as a London contact office. Its registered office is Port Sunlight; this pin is not labelled the registered office.'],
  ['ai','Unilever strategy','https://www.unilever.com/our-company/our-strategy/','Unilever describes AI-enabled marketing production and a Beauty AI studio. This does not establish a particular London text workflow or a private LLM budget.']]],
 ['shell','Shell','Energy',46250966,'Shell Centre, London SE1 7NA','#ffd266',[
  ['office','Shell headquarters','https://www.shell.com/who-we-are/contact-us.html','Shell lists Shell Centre, London SE1 7NA as its headquarters.'],
  ['ai','Shell digitalisation','https://www.shell.com/what-we-do/digitalisation.html','Shell describes work with NVIDIA on generative AI and large language models for research documents and experimentation with custom models and retrieval. This does not establish current spend or London team deployment.']]],
 ['google','Google','AI and technology',4428875257,'6 Pancras Square, London N1C 4AG','#a8cf8c',[
  ['office','Google office locations','https://about.google/company-info/locations/','Google lists a London office at 6 Pancras Square.'],
  ['ai','Google DeepMind model cards','https://deepmind.google/models/model-cards/','Google DeepMind publishes model cards for its Gemini and Gemma models. Its own model platform is a potential build-versus-buy barrier for a Mubit pitch. Private office usage and spend remain unknown.']]],
];
const companies=rows.map(([id,name,sector,osmId,address,color,notes])=>{
 const obj=id==='google'?google:ways.find(w=>w.id===osmId);if(!obj)throw Error('OSM object missing');
 const pts=obj.type==='node'?[obj]:obj.nodes.map(id=>nodes.get(id));if(pts.some(p=>!p))throw Error('Incomplete geometry');
 const lat=(Math.min(...pts.map(p=>p.lat))+Math.max(...pts.map(p=>p.lat)))/2;
 const lon=(Math.min(...pts.map(p=>p.lon))+Math.max(...pts.map(p=>p.lon)))/2;
 if(lat<51.46||lat>51.55||lon<-.23||lon>.01)throw Error('Outside supported centre');
 const east=(lon+.1278)*Math.PI/180*6378137*Math.cos(51.5074*Math.PI/180),north=(lat-51.5074)*Math.PI/180*6378137;
 return {id,name,sector,address,color,lat,lon,east,north,height:Number(obj.tags.height)||Number(obj.tags['building:levels']||4)*3.2,
  location_precision:obj.type==='node'?'Mapped office node; not an entrance':'Centre of mapped office footprint; not an entrance',
  osm:{type:obj.type,id:obj.id,url:`https://www.openstreetmap.org/${obj.type}/${obj.id}`,object_timestamp:obj.timestamp,version:obj.version,name:obj.tags.name},
  facts:notes.map(([key,,,text])=>({text,source_ids:[id+'-'+key]})),sources:notes.map(([key,title,url])=>({id:id+'-'+key,title,url,checked_at})),
  image:null};
});
const result={version:'enterprise-london-v1',downloaded_at:checked_at,selection:'Seven distinct large enterprises with exact mapped London offices. OSM identities cross-checked against primary company contact sources. Meta/Rathbone Square rejected because occupancy was not currently verified. Small retail branches excluded.',attribution:'© OpenStreetMap contributors',license:'ODbL 1.0',license_url:'https://www.openstreetmap.org/copyright',query:{method:'Official OSM API exact object download plus all geometry nodes',bounded_selection:[51.46,-.23,51.55,.01],endpoints:['https://www.openstreetmap.org/api/0.6/ways.json?ways=159590822,46250966,5986805,5986929,172886760,140144145,648622768','https://www.openstreetmap.org/api/0.6/node/4428875257.json'],overpass_attempts:'Bounded query retained in query.overpass. overpass-api.de returned HTTP 406; kumi.systems and private.coffee timed out. Official OSM API succeeded.'},companies};
await writeFile(new URL('companies.json',dir),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({companies:companies.length,ids:companies.map(x=>x.id),downloaded_at:checked_at}));
