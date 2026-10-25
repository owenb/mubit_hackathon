import {el,button,api,sourceList} from './ui.mjs';
import {draftFrom,changed,sceneFor,previewFor,correctionBody,correctionStatus} from './correction-state.mjs';
export function createEditor({container,onPreview,onApply,onClose,onProgress,onChange}){
 let draft=null,working=false,wording=false,sharing=false,attempted=false,sent=null;
 const message=el('p',null,'form-message');message.setAttribute('role','status');
 const say=(text,tone)=>{message.textContent=text;if(tone)message.dataset.tone=tone;else delete message.dataset.tone;};
 const editChanged=()=>{if(!working){attempted=false;sent=null;const b=container.querySelector('[data-send]');if(b)b.disabled=!changed(draft)||!draft.note.trim();const use=container.querySelector('[data-use]');if(use)use.disabled=!changed(draft);const discard=container.querySelector('[data-discard]');if(discard)discard.hidden=!changed(draft);}onChange?.();};
 function preview(){if(draft)onPreview(previewFor(draft));}
 function sources(){const details=el('details',null,'sources');details.append(el('summary','Sources (dated)'),sourceList(draft.interaction.evidence?.sources));for(const fact of draft.interaction.evidence?.facts||[])details.append(el('p',fact.text,'source-fact'));return details;}
 function pinRows(){
  const rows=el('div',null,'edit-places');
  for(const p of draft.pins){const row=el('div',null,'edit-place');row.append(el('span',p.name));const remove=button('×',()=>{draft.pins=draft.pins.filter(v=>v.id!==p.id);draft.reason='wrong_place';editChanged();preview();document.getElementById('edit-places').replaceChildren(pinRows());},'icon-button');remove.setAttribute('aria-label','Remove '+p.name);row.append(remove);rows.append(row);}
  if(!draft.pins.length)rows.append(el('p','No places','muted'));
  return rows;
 }
 async function useTrip(){
  if(working)return;say('');let body;try{body=correctionBody(draft,'trip');}catch(e){say(e.message);return;}
  working=true;container.inert=true;const original=draft.interaction.result;
  try{const row=await api('/api/learning/corrections',body),value=await api('/api/learning/corrections/'+row.id+'/preview',{});value.inference.label='Your edit · this map';draft=null;onApply(value,original,row);}
  catch(e){say(e.message);}
  finally{working=false;container.inert=false;}
 }
 async function send(){
  if(working||attempted)return;say('');let body;try{body=correctionBody(draft,'reusable');}catch(e){say(e.message);return;}
  working=true;container.inert=true;
  try{
   sent=await api('/api/learning/corrections',body);attempted=true;say('Checking the correction…');
   sent=await api('/api/learning/corrections/'+sent.id+'/teach',{reviewed:true});
   onProgress(sent);
   if(sent.status==='needs_review'){const audit=sent.teaching?.audit;if(audit?.accepted===true&&sent.teaching?.receipt&&sent.teaching?.matched===false)say(`Audit passed: ${audit.reason} Mubit received it as a teaching example (receipt ${sent.teaching.receipt}). Luna’s stored reply differs from your wording, so it needs review before training.`,'passed');else say(audit?.reason||sent.error||'The correction needs review. You can still use a personal edit.');}
   else{draft=null;onClose({sent});}
  }catch(e){say(attempted?'Could not confirm the result. Check Evidence before sending another correction.':e.message);if(sent){try{sent=await api('/api/learning/corrections/'+sent.id);onProgress(sent);}catch{}}}
  finally{working=false;container.inert=false;if(draft){const submit=container.querySelector('[data-send]');if(submit)submit.disabled=attempted;}}
 }
 function draw(){
  container.replaceChildren();say('');container.append(el('p','Your edit · preview','state-label'));
  const top=el('div',null,'edit-heading');top.append(el('h2','Fix this answer'));const back=button('Back',()=>onClose({draft:true}),'text-button');back.disabled=working;top.append(back);container.append(top);
  const body=el('div',null,'edit-body'),footer=el('div',null,'edit-footer');container.append(body,footer);
  const question=el('details',null,'edit-question question');question.append(el('summary',draft.interaction.question));body.append(question);
  const placesHeading=el('h3','Places');body.append(placesHeading);const places=el('div');places.id='edit-places';places.append(pinRows());body.append(places);
  const search=el('input');search.type='search';search.placeholder='Add a place…';search.setAttribute('aria-label','Add a place');const results=el('div',null,'place-results');let sequence=0;
  search.oninput=async()=>{const serial=++sequence;results.replaceChildren();if(search.value.trim().length<2)return;try{const data=await api('/api/places?q='+encodeURIComponent(search.value));if(serial!==sequence)return;const candidates=data.places.filter(p=>!draft.pins.some(v=>v.id===p.id));for(const p of candidates){const result=button(p.name,()=>{if(draft.pins.length>=6){say('Choose up to six places.');return;}draft.pins.push({...p,role:'context'});draft.reason='wrong_place';editChanged();preview();document.getElementById('edit-places').replaceChildren(pinRows());search.value='';results.replaceChildren();},'place-result');if(p.lines?.length)result.append(el('small',p.lines.join(' · ')));else if(candidates.some(other=>other.id!==p.id&&other.name===p.name))result.append(el('small','Map place'));results.append(result);}if(!results.children.length)results.append(el('p','No matching places','muted'));}catch(e){say(e.message);}};
  body.append(search,results);
  if(wording){const label=el('label','Answer');const text=el('textarea');text.value=draft.answer;text.rows=5;text.maxLength=3000;text.setAttribute('aria-label','Edited answer');text.oninput=()=>{draft.answer=text.value;draft.reason='unsupported_fact';editChanged();};text.onblur=preview;label.append(text);body.append(label,sources());}
  else placesHeading.append(button('Edit wording',()=>{wording=true;draw();},'text-button'));
  const original=el('details',null,'original-answer');original.append(el('summary','Original answer'),el('p',draft.interaction.result.answer));body.append(original);
  const actions=el('div',null,'editor-actions');footer.append(actions);
  if(sharing){
   const box=el('div',null,'share-confirm');const label=el('label','What was wrong?');const why=el('textarea');why.rows=2;why.maxLength=1000;why.value=draft.note;why.setAttribute('aria-label','Reason for sharing');why.oninput=()=>{draft.note=why.value;editChanged();};label.append(why);
   box.append(label,el('p','Luna checks the correction against the sources, then Mubit receives a teaching example. Uses up to two model calls. A new model and fresh tests are needed to show learning.','muted'));body.append(box);
   const sendButton=button('Send correction',send,'primary');sendButton.dataset.send='true';sendButton.disabled=attempted||!changed(draft)||!draft.note.trim();actions.append(sendButton,button('Keep edit personal',()=>{sharing=false;draw();},'text-button'));
   queueMicrotask(()=>box.scrollIntoView({block:'end'}));
  }else{
   const useButton=button('Use on my map',useTrip,'primary');useButton.dataset.use='true';useButton.disabled=!changed(draft);actions.append(useButton,button('Share as a correction…',()=>{sharing=true;draw();},'text-button'));
   footer.append(el('p','Only this map. No teaching.','muted'));
  }
  footer.append(message);
  const discard=button('Discard edit',()=>{if(working)return;draft=null;onClose({discard:true});},'text-button muted');discard.dataset.discard='true';discard.hidden=!changed(draft);footer.append(discard);

 }
 return {
  open(interaction,initialTarget){if(working)return false;if(draft&&changed(draft)&&draft.interaction.interaction_id!==interaction?.interaction_id)return false;if(interaction){draft=draftFrom(interaction);if(initialTarget){draft.answer=initialTarget.answer;draft.pins=initialTarget.scene.places.map(p=>({...p,name:p.name||p.id}));draft.response_kind=initialTarget.response_kind;draft.static_access=initialTarget.static_access;}wording=false;sharing=false;attempted=false;sent=null;}if(!draft)return false;draw();preview();return true;},
  resume(){if(!draft)return false;draw();preview();return true;},
  hasDraft:()=>Boolean(draft&&changed(draft)),isBusy:()=>working,current:()=>draft,
  discard(){if(working)return;draft=null;},
  operatorFields(){const box=el('div');if(!draft){box.append(el('p','Start an edit to inspect its fields.','muted'));return box;}const select=(label,values,value,change)=>{const l=el('label',label),s=el('select');for(const [id,title]of values){const o=el('option',title);o.value=id;s.append(o);}s.value=value;s.onchange=()=>{change(s.value);editChanged();preview();};l.append(s);return l;};
   box.append(select('Mistake type',[['wrong_place','Wrong place'],['unsupported_fact','Wrong fact'],['missed_requirement','Missed requirement'],['unnecessary_refusal','Unnecessary refusal'],['other','Other']],draft.reason,v=>draft.reason=v),select('Response kind',['answer','clarify','live_check','outside_scope'].map(v=>[v,v]),draft.response_kind,v=>draft.response_kind=v),select('Station access',['not_applicable','yes','no','partial','unknown'].map(v=>[v,v]),draft.static_access,v=>draft.static_access=v));for(const p of draft.pins)box.append(select(p.name,['context','origin','destination'].map(v=>[v,v]),p.role,v=>p.role=v));return box;
  }
 };
}
export async function correctionHistory(container,{onInspect,onEdit}){
 container.replaceChildren(el('p','Loading…','muted'));const rows=(await api('/api/learning')).corrections;container.replaceChildren();
 if(!rows.length)container.append(el('p','No saved corrections.','muted'));
 for(const row of rows){const item=el('div',null,'history-item');item.append(button(row.original.question,()=>onInspect(row),'history-question'),el('p',correctionStatus(row),'muted'));container.append(item);}return rows;
}
export function correctionProof(row,{onRefresh,onPreview,onEdit}){
 const box=el('section',null,'correction-proof');box.append(el('h3',correctionStatus(row)),el('p',row.original.question));
 const stages=row.stages||{},observed=row.platform_observation;
 const facts=[['Saved',row.created_at],['Delivery',stages.mubit_recording?.content_stored_verified?'Content verified in Mubit':row.teaching?.receipt?'Receipt received':'Not sent'],['Review',stages.mubit_review?.state||'Unverified'],['Model update',stages.model_update?.newer_version_observed?'Newer version observed; inclusion unverified':'Not verified'],['Transfer test',stages.transfer_test?.state||'Not run']];
 const dl=el('dl');for(const [name,value]of facts)dl.append(el('dt',name),el('dd',value));box.append(dl,el('p','Delivery, review, a weight update and better answers are separate claims.','muted'));
 if(row.error)box.append(el('p',row.error,'form-message'));if(row.teaching?.audit)box.append(el('p','Luna check: '+row.teaching.audit.reason,'muted'));
 const actions=el('div',null,'inline-actions');actions.append(button('Show edit',()=>onPreview(row),'quiet'),button('Edit',()=>onEdit(row),'quiet'),button('Refresh',()=>onRefresh(row.id),'quiet'));box.append(actions);
 const details=el('details');details.append(el('summary','Evidence'),el('pre',JSON.stringify({stages:row.stages,teaching:row.teaching,platform_observation:observed,source:row.original.evidence},null,2)));const link=el('a','Open in Mubit ↗');link.href=row.console_url;link.target='_blank';link.rel='noopener noreferrer';details.append(link);box.append(details);return box;
}
