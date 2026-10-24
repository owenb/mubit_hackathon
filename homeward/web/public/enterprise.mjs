import {el,button,api,sourceList} from './ui.mjs';
import {createEnterpriseMap} from './enterprise-gpu.mjs';
import {createModeFetch,companyForQuestion,initialEnterpriseMode,enterpriseModeUrl} from './enterprise-state.mjs';
const css=el('link');css.rel='stylesheet';css.href='/enterprise.css';document.head.append(css);
const mode=el('div',null,'enterprise-mode');mode.setAttribute('role','group');mode.setAttribute('aria-label','Map mode');const travelMode=button('Travel',()=>setMode(false),'enterprise-mode-option'),businessMode=button('Businesses',()=>setMode(true),'enterprise-mode-option');travelMode.setAttribute('aria-pressed','true');businessMode.setAttribute('aria-pressed','false');mode.append(travelMode,businessMode);document.getElementById('toolbar').append(mode);const travelTitle=document.title;
const canvas=el('canvas');canvas.id='enterprise-map';canvas.hidden=true;canvas.setAttribute('aria-label','Enterprise offices on the complete WebGPU London map');canvas.tabIndex=0;document.body.prepend(canvas);
const shell=el('section',null,'enterprise-shell');shell.hidden=true;shell.setAttribute('aria-label','Mubit business research');document.getElementById('app-chrome').append(shell);
const panel=el('aside',null,'enterprise-panel');panel.id='enterprise-panel';panel.setAttribute('aria-label','Company research');
const nav=el('div',null,'enterprise-nav');nav.append(el('span','MUBIT / LONDON','enterprise-eyebrow'),button('Training evidence',showTraining,'enterprise-link'));panel.append(nav);
const content=el('div',null,'enterprise-content');panel.append(content);shell.append(panel);
const mapControls=el('div',null,'enterprise-map-controls');mapControls.append(button('All businesses',()=>{sequence++;busy=false;submit.disabled=false;map?.overview();selected=null;result=null;renderDirectory();},'enterprise-control'),button('+',()=>map?.zoom(.7),'enterprise-control'),button('−',()=>map?.zoom(1.4),'enterprise-control'));shell.append(mapControls);
const attribution=el('p',null,'enterprise-attribution'),osm=el('a','© OpenStreetMap contributors');osm.href='https://www.openstreetmap.org/copyright';osm.target='_blank';osm.rel='noopener';attribution.append(osm,document.createTextNode(' · Offices, not entrances · Drag to orbit · Shift-drag to pan'));shell.append(attribution);
const composer=el('form',null,'enterprise-composer'),orb=el('span','✦','enterprise-orb'),input=el('input');input.id='enterprise-question';input.placeholder='Which business could own its next model?';input.setAttribute('aria-label','Ask about a verified company');input.maxLength=2000;const submit=el('button','↑','enterprise-send');submit.type='submit';submit.setAttribute('aria-label','Ask about this business');composer.append(orb,input,submit);shell.append(composer);
let active=false,data=null,map=null,mapPromise=null,selected=null,result=null,busy=false,sequence=0,correction=null;
const recentKey='mubit-enterprise-recent-correction-v1';
globalThis.fetch=createModeFetch(globalThis.fetch.bind(globalThis),()=>active,location.origin);
const signalText=c=>c.facts.some(f=>f.source_ids.some(id=>id.endsWith('-ai')))?'Public AI signal':'LLM use unknown';
function notice(message){window.dispatchEvent(new CustomEvent('london:notice',{detail:message}));}
function photo(c,cls='enterprise-photo'){
 const frame=el('div',null,cls);frame.style.setProperty('--company-color',c.color);frame.append(el('span',c.name.split(/[ .]/).filter(Boolean).map(x=>x[0]).slice(0,2).join(''),'enterprise-monogram'));
 if(c.image){const image=el('img');image.src=c.image.url;image.alt=c.image.alt||c.name+' London office';image.loading='lazy';image.onerror=()=>image.remove();frame.append(image);}return frame;
}
function caption(c){const p=el('p',null,'enterprise-photo-credit');if(c.image){const a=el('a',c.image.author+' · '+c.image.license);a.href=c.image.source_url;a.target='_blank';a.rel='noopener';p.append(a);}else p.textContent='Company monogram · no photograph available';return p;}
function renderDirectory(){
 content.replaceChildren();content.scrollTop=0;let recent;try{recent=localStorage.getItem(recentKey);}catch{}if(recent)content.append(button('Resume your saved correction',async()=>{correction=await api('/api/enterprise/corrections/'+encodeURIComponent(recent));selected=data.companies.find(c=>c.id===correction.company_id);map?.select(selected);renderReceipt();},'enterprise-link'));const intro=el('div',null,'enterprise-intro');intro.append(el('h1','Find the next model\nworth owning.'),el('p','Real London offices. One repeatable task.\nAn informed pitch you can teach.'));content.append(intro);
 const count=el('p',`${data?.companies.length||0} verified enterprises · checked 24 Oct 2026`,'enterprise-kicker');content.append(count);
 const list=el('div',null,'enterprise-directory');for(const c of data?.companies||[]){const row=button('',()=>selectCompany(c),'enterprise-company');const words=el('span',null,'enterprise-company-copy');words.append(el('strong',c.name),el('span',c.sector),el('small',signalText(c)));row.append(photo(c,'enterprise-thumb'),words,el('span','↗','enterprise-arrow'));list.append(row);}content.append(list);
 const note=el('details',null,'enterprise-data-note');note.append(el('summary','How these businesses were selected'),el('p',data?.selection||'Loading verified offices…'),el('p','Usage estimates and pitches are hypotheses. No business has been contacted.'),sourceList([{title:'OpenStreetMap / ODbL',url:data?.license_url||'https://www.openstreetmap.org/copyright',retrieved_at:data?.downloaded_at}]));content.append(note);
}
function section(label,text,cls=''){const s=el('section',null,'enterprise-section '+cls);s.append(el('h3',label),el('p',text));return s;}
function companyHeader(c){
 const top=el('div',null,'enterprise-company-top');top.append(button('← All businesses',()=>{sequence++;busy=false;submit.disabled=false;selected=null;result=null;map?.overview();renderDirectory();},'enterprise-link'),el('span',c.sector,'enterprise-sector'));content.append(top);
 const hero=photo(c,'enterprise-hero');hero.append(el('span',c.name,'enterprise-photo-title'));content.append(hero,caption(c));
 const meta=el('div',null,'enterprise-office');meta.append(el('h2',c.name),el('p',c.address));const loc=el('a','OSM '+c.osm.type+' / '+c.osm.id+' ↗');loc.href=c.osm.url;loc.target='_blank';loc.rel='noopener';meta.append(loc);content.append(meta);
}
function renderCompany(){
 if(!selected)return renderDirectory();const c=selected;content.replaceChildren();content.scrollTop=0;companyHeader(c);
 if(busy){const line=el('div',null,'enterprise-answer-loading');line.setAttribute('role','status');line.setAttribute('aria-label','Assessing company');line.append(el('i'),el('span','Connecting public evidence to a possible pilot…'));content.append(line);return;}
 if(!result){for(const f of c.facts)content.append(section('PUBLIC FACT',f.text));content.append(button('Assess fit for Mubit',()=>assess(),'enterprise-primary'));return;}
 const a=result.assessment,fit=el('div',null,'enterprise-fit '+a.fit);fit.append(el('span','FIT / '+a.fit.toUpperCase()),el('small',a.llm_usage==='public_evidence'?'Public AI evidence · private usage unknown':'LLM adoption unknown'));content.append(fit);
 content.append(section('PUBLIC EVIDENCE',a.public_fact),section('RECURRING WORKLOAD · HYPOTHESIS',a.workload_hypothesis,'enterprise-workload'),section('WHY THIS FIT',a.fit_reason),section('THE PITCH · PROPOSAL',a.pitch,'enterprise-pitch'),section('BEFORE WE SELL',a.discovery_question),section('UNKNOWN',a.unknowns),section('PILOT SUCCESS CHECK',a.pilot_measure));
 const actions=el('div',null,'enterprise-actions');actions.append(button('Teach better judgement',renderEditor,'enterprise-primary'));content.append(actions);
 const sources=el('details',null,'enterprise-sources');sources.append(el('summary','Company sources & map provenance'),sourceList(c.sources),el('p',c.location_precision,'muted'),el('p','OSM object updated '+c.osm.object_timestamp.slice(0,10)+' · downloaded '+data.downloaded_at.slice(0,10),'muted'));content.append(sources);
 const provenance=el('details',null,'enterprise-provenance');provenance.append(el('summary',(result.inference?.label||'Route unverified')+' · '+(result.elapsed_ms/1000).toFixed(1)+'s'),el('p',result.inference?.detail||'Serving model not verified'),el('small',result.inference?.request_id||'Receipt unavailable'));content.append(provenance);
}
async function selectCompany(c){selected=c;result=null;correction=null;map?.select(c);await assess();}
async function assess(question){
 try{const found=companyForQuestion(question,data.companies,selected?.id);if(!found){notice('Select a business pin or name one of the seven verified companies.');return;}if(found.id!==selected?.id){selected=found;map?.select(found);}}catch(e){notice(e.message);return;}
 const n=++sequence,company=selected;busy=true;submit.disabled=true;renderCompany();
 try{const value=await api('/api/enterprise/assess',{company_id:company.id,question:question||undefined});if(n!==sequence||selected?.id!==company.id)return;result=value;busy=false;renderCompany();}
 catch(e){if(n!==sequence)return;busy=false;renderCompany();const box=el('div',null,'enterprise-error');box.setAttribute('role','alert');box.append(el('p',e.message),button('Try a new request',()=>assess(question),'enterprise-link'));content.append(box);}
 finally{if(n===sequence){busy=false;submit.disabled=false;}}
}
function renderEditor(){
 if(!result||!selected)return;content.replaceChildren();content.scrollTop=0;content.append(button('← Back to assessment',renderCompany,'enterprise-link'),el('h2','What should it learn?'),el('p','Teach a judgement you would reuse when qualifying the next business. Public company facts still need a source.','enterprise-editor-intro'));
 content.append(section('CURRENT WORKLOAD HYPOTHESIS',result.assessment.workload_hypothesis));
 const label=el('label','Your correction'),note=el('textarea');note.id='enterprise-lesson';label.htmlFor=note.id;note.maxLength=2400;note.rows=6;note.placeholder='For this kind of buyer, focus on… Avoid assuming… A useful pilot would…';content.append(label,note);
 const suggested=button('Use a suggested example',()=>{note.value='Focus on one repeated text task with an accountable reviewer. Keep changing policy facts in fresh retrieval, and teach stable response judgement through corrections. Validate data rights and compare the trained adapter on separate fresh questions. Never infer private spend from company size or promise savings.';},'enterprise-link');content.append(suggested,el('p','The suggested example was written by the coding assistant. Edit it to reflect your expertise.','enterprise-small'));
 const save=button('Save this correction',async()=>{save.disabled=true;try{correction=await api('/api/enterprise/corrections',{interaction_id:result.interaction_id,note:note.value});try{localStorage.setItem(recentKey,correction.id);}catch{}renderReceipt();}finally{save.disabled=false;}},'enterprise-primary');content.append(save,el('p','Saving is local. You decide separately whether to send it for Mubit teaching.','enterprise-small'));
}
function renderReceipt(){
 content.replaceChildren();content.scrollTop=0;content.append(button('← Back to assessment',renderCompany,'enterprise-link'),el('h2',correction.state==='received'?'Teaching received.':'Your correction.'));
 content.append(section('JUDGEMENT TO TEACH',correction.note),el('p',correction.detail,'enterprise-receipt-state'));
 const steps=el('ol',null,'enterprise-training-steps');for(const [label,done]of [['Correction saved',true],['Mubit receipt',correction.state==='received'],['Kept review & adapter',false],['Fresh quality check',false]])steps.append(el('li',(done?'✓ ':'○ ')+label,done?'done':''));content.append(steps);
 if(correction.receipt)content.append(el('code',correction.receipt,'enterprise-receipt'));
 if(correction.state==='saved'){const teach=button('Teach this judgement',async()=>{teach.disabled=true;try{correction=await api('/api/enterprise/corrections/'+correction.id+'/teach',{});renderReceipt();}finally{teach.disabled=false;}},'enterprise-primary');content.append(teach,el('p','Sends the question, company evidence and your correction through Luna via Mubit with full training recording. Review and training happen asynchronously.','enterprise-small'));}
 if(correction.assessment){const revised=el('details',null,'enterprise-sources');revised.append(el('summary',correction.inference?.route==='luna'?'Inspect Luna’s teaching example':'Inspect the recorded teaching response'),section('REVISED HYPOTHESIS',correction.assessment.workload_hypothesis),section('REVISED PITCH',correction.assessment.pitch),el('p','This response was generated with your correction in context. It is not evidence of an updated adapter.','enterprise-small'));content.append(revised);}
 content.append(button('Check observed training evidence',showTraining,'enterprise-link'));
}
async function showTraining(){
 content.replaceChildren();content.scrollTop=0;content.append(button('← Back to businesses',()=>selected?renderCompany():renderDirectory(),'enterprise-link'),el('h2','Follow the learning.'));
 try{const s=await api('/api/enterprise/status');content.append(section('OBSERVED STATE',s.detail));if(s.adapter)content.append(section('TRAINED MODEL',typeof s.adapter==='string'?s.adapter:`Qwen3 4B · version ${s.adapter.version} · ${s.adapter.internal_pass}/${s.adapter.internal_total} internal checks`));
 if(s.evaluation){const e=s.evaluation;const counts=el('div',null,'enterprise-evaluation-counts');for(const [value,label]of [[e.counts.semantic_pass+'/6','judgement'],[e.counts.contract_pass+'/6','response format'],[e.counts.full_task_pass+'/6','complete task']]){const stat=el('div');stat.append(el('strong',value),el('small',label));counts.append(stat);}content.append(counts,section('FRESH QUALITY CHECK',e.summary),el('p',e.scope,'enterprise-small'));
 const examples=el('details',null,'enterprise-evaluation');examples.append(el('summary','Inspect all six fresh answers'));
 for(const item of e.cases){const example=el('details',null,'enterprise-evaluation-case'),name=data.companies.find(c=>c.id===item.company_id)?.name||item.company_id;example.append(el('summary',name+' · '+(item.full_task_pass?'Pass':'Needs work')),section('QUESTION',item.question),section('REVIEW',item.reason),el('p','Required response format: '+(item.contract_pass?'passed':'failed')+'.','enterprise-small'));try{const answer=JSON.parse(item.raw);example.append(section('ADAPTER WORKLOAD',answer.workload_hypothesis),section('ADAPTER PITCH',answer.pitch),section('ADAPTER SUCCESS CHECK',answer.pilot_measure||'Missing from this reply.'));}catch{}examples.append(example);}content.append(examples,el('p',e.schema_diagnostic,'enterprise-small'),el('p',e.limitations,'enterprise-small'));}
 if(s.checked_at)content.append(el('small','Observed '+new Date(s.checked_at).toLocaleString('en-GB',{timeZone:'Europe/London'})+' London'));
 const details=el('details');details.append(el('summary','Full evidence record'),el('pre',JSON.stringify(s,null,2)));content.append(details);}catch(e){content.append(el('p',e.message));}
}
composer.onsubmit=e=>{e.preventDefault();if(!busy&&input.value.trim())assess(input.value.trim());};
async function setMode(value){
 active=value;travelMode.setAttribute('aria-pressed',String(!active));businessMode.setAttribute('aria-pressed',String(active));document.title=active?'London Businesses':travelTitle;try{localStorage.setItem('mubit-map-mode-v1',active?'enterprise':'travel');history.replaceState(null,'',enterpriseModeUrl(location.href,active));}catch{};document.documentElement.dataset.enterprise=String(active);shell.hidden=!active;document.getElementById('homeward').style.visibility=active?'hidden':'';
 for(const id of ['examples','answer-card','evidence','gesture-hint']){const n=document.getElementById(id);if(active){n.dataset.enterpriseHidden=String(n.hidden);n.hidden=true;}else if(n.dataset.enterpriseHidden){n.hidden=n.dataset.enterpriseHidden==='true';delete n.dataset.enterpriseHidden;}}
 if(!active){map?.setActive(false);return;}
 document.activeElement?.blur();input.focus({preventScroll:true});
 if(!data){try{data=await api('/api/enterprise/companies');renderDirectory();}catch(e){content.replaceChildren(el('p',e.message));return;}}
 if(document.documentElement.dataset.homewardReady!=='true')return;
 try{if(!map){mapPromise??=createEnterpriseMap({canvas,companies:data.companies,onSelect:selectCompany});map=await mapPromise;}if(active)map.setActive(true);}catch(e){mapPromise=null;notice(e.message);}
}
const restoreMode=()=>{let saved;try{saved=localStorage.getItem('mubit-map-mode-v1');}catch{}if(active||initialEnterpriseMode(location.href,saved))setMode(true);};window.addEventListener('london:ready',restoreMode);if(document.documentElement.dataset.homewardReady==='true')restoreMode();
window.addEventListener('keydown',e=>{if(active&&(e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();input.focus();}});
