import './appearance.mjs';
import {el,button,api,sourceList} from './ui.mjs';
import {createEditor,correctionHistory,correctionProof} from './corrections.mjs';
import {correctionStatus} from './correction-state.mjs';
import {loadEvaluation} from './evaluation.mjs';
const $=id=>document.getElementById(id),card=$('answer-card'),view=$('answer-view'),learning=$('learning'),evidence=$('evidence'),menu=$('view-menu');
let answer=null,editingBase=null,pending=false,editing=false,lastQuestion='',mapState={},selectedTab='answer',lastCorrection=null,noticeTimer;
const command=value=>{if(!globalThis.londonMap)throw Error('The map is still loading.');globalThis.londonMap(value);};
const showMap=value=>globalThis.homewardPreviewAnswer?.(value);
function notice(text){clearTimeout(noticeTimer);$('app-message').replaceChildren(el('span',text));$('app-message').hidden=false;noticeTimer=setTimeout(()=>$('app-message').hidden=true,7000);}
window.addEventListener('london:notice',event=>notice(event.detail));
const editor=createEditor({container:learning,
 onPreview:showMap,
 onApply:(value,original,row)=>{lastCorrection=row;if(editing&&!pending){answer={...value,interaction_id:row.interaction_id,_row:row,_undo:original};showMap(answer);editing=false;renderAnswer();}else notice('Personal edit saved. Find it in Evidence.');},
 onClose:({sent}={})=>{editing=false;if(sent)lastCorrection=sent;if(!pending){if(editingBase){answer=editingBase;showMap(answer);}else{answer=null;command({type:'new'});}}renderAnswer();if(sent&&!answer)notice(correctionStatus(sent));},
 onProgress:row=>{lastCorrection=row;},onChange:()=>{},
});
function sourceDisclosure(value){const details=el('details',null,'sources');details.append(el('summary',`Sources · ${value.sources?.length||0}`),sourceList(value.sources));return details;}
function renderAnswer(){
 if(pending){card.hidden=true;learning.hidden=true;$('examples').hidden=true;command({type:'card',value:false});return;}
 card.hidden=!answer&&!editing;view.hidden=editing;learning.hidden=!editing;$('examples').hidden=Boolean(answer||pending||editing);command({type:'card',value:!card.hidden});
 if(editing)return;view.replaceChildren();if(card.hidden)return;
 const value=answer||{},question=value.question||lastQuestion;
 const heading=el('div',null,'answer-heading'),q=el('details',null,'question');q.append(el('summary',question));heading.append(q);
 const close=button('×',newQuestion,'icon-button');close.setAttribute('aria-label','New question');heading.append(close);view.append(heading);
 const route=value.inference?.route,label=value.inference?.label||'Route unverified';
 if(route==='operator_preview'||route==='cache'||!['luna','mubit_adapter'].includes(route)||label.startsWith('Recorded'))view.append(el('p',label,'state-label'));
 const prose=el('div',null,'answer-prose');for(const paragraph of (value.answer||'').replaceAll('**','').replace(/\[([^\]]+)\]\(https:\/\/[^)]+\)/g,'$1').split(/\n\s*\n/))prose.append(el('p',paragraph));view.append(prose);
 if(value.live){const live=el('div',null,'live-update');live.append(el('span','Live lift check','state-label'));for(const n of value.live.notices||[])live.append(el('p',n.message));if(value.live.note)live.append(el('p',value.live.note,'muted'));if(value.live.checked_at)live.append(el('small','Checked '+value.live.checked_at));view.append(live);}
 const places=value.scene?.places||[];
 if(places.length){const list=el('div',null,'answer-places');list.append(el('p','Places · not entrances or routes','place-caption'));places.forEach((p,i)=>{const row=button('',()=>command({type:'focus',id:p.id}),'place-row');row.append(el('span',String(i+1).padStart(2,'0'),'place-number'),el('span',p.name||p.id));list.append(row);});view.append(list);}
 if(value.sources?.length)view.append(sourceDisclosure(value));
 const footer=el('div',null,'answer-footer');let provenance=label;
 const ms=value.total_ms??value.elapsed_ms;if(route!=='operator_preview'&&Number.isFinite(ms)&&ms>0)provenance+=' · '+(ms<1000?Math.round(ms)+' ms':(ms/1000).toFixed(1)+' s');
 const quietProof=route==='operator_preview'||route==='cache'||!['luna','mubit_adapter'].includes(route)||label.startsWith('Recorded');
 footer.append(button(quietProof?'Evidence':provenance,()=>openEvidence('answer'),'provenance'));
 if(value.interaction_id)footer.append(button('Fix this',startEdit,'text-button'));
 if(value._undo)footer.append(button('Undo map edit',()=>{answer={...value._undo,interaction_id:value.interaction_id};showMap(answer);renderAnswer();},'text-button'));
 view.append(footer);
 if(lastCorrection&&lastCorrection.scope!=='trip'&&lastCorrection.interaction_id===value.interaction_id)view.append(button(correctionStatus(lastCorrection),()=>{openEvidence('corrections');inspectCorrection(lastCorrection);},'correction-status'));
 if(editor.hasDraft())view.append(button('Resume unfinished edit',resumeEdit,'draft-link'));
}
function newQuestion(){if(pending||editor.isBusy())return;answer=null;editing=false;lastQuestion='';command({type:'new'});renderAnswer();if(editor.hasDraft())notice('Your unfinished edit is still in Evidence.');}
function resumeEdit(){if(!editor.current())return;editingBase=answer;editing=true;card.hidden=false;view.hidden=true;learning.hidden=false;evidence.hidden=true;if(!editor.resume())editing=false;command({type:'card',value:true});}
async function startEdit(){
 if(!answer?.interaction_id)return;
 if(editor.hasDraft()){const box=$('app-message');box.replaceChildren(el('span','An unfinished edit is saved.'),button('Resume',()=>{box.hidden=true;resumeEdit();},'text-button'),button('Discard and start this edit',()=>{editor.discard();box.hidden=true;startEdit();},'text-button'));box.hidden=false;return;}
 try{const interaction=await api('/api/learning/interactions/'+encodeURIComponent(answer.interaction_id));editingBase=answer;editing=true;evidence.hidden=true;learning.hidden=false;view.hidden=true;editor.open(interaction,answer._row?{...answer._row.target,scene:answer.scene}:undefined);command({type:'card',value:true});}
 catch(e){notice(e.message);}
}
function onAnswer(value,{preview=false}={}){
 pending=false;editing=false;answer=value;lastQuestion=value.question||lastQuestion;view.hidden=false;learning.hidden=true;
 if(preview)showMap(value);renderAnswer();if(!evidence.hidden&&selectedTab==='answer')renderAnswerEvidence();
}
window.addEventListener('homeward:answer',event=>onAnswer(event.detail));
window.addEventListener('london:asking',event=>{pending=true;lastQuestion=event.detail.question;editing=false;learning.hidden=true;renderAnswer();});
window.addEventListener('london:error',event=>{pending=false;editing=false;learning.hidden=true;card.hidden=false;view.hidden=false;view.replaceChildren();const heading=el('div',null,'answer-heading');heading.append(el('p',event.detail.question||lastQuestion,'question-text'),button('×',newQuestion,'icon-button'));view.append(heading,el('p','Could not get an answer.'),el('p',event.detail.message,'muted'),button('Try again',()=>command({type:'ask',question:event.detail.question||lastQuestion}),'quiet'));if(editor.hasDraft())view.append(button('Resume unfinished edit',resumeEdit,'text-button'));});
window.addEventListener('london:state',event=>{mapState=event.detail;$('overview').hidden=mapState.at_home;if(mapState.explored)$('gesture-hint').hidden=true;if(!evidence.hidden&&selectedTab==='map')updateMapNumbers();});
function renderAnswerEvidence(){const box=$('evidence-answer');box.replaceChildren();if(!answer){box.append(el('p','Ask a question to inspect its answer.','muted'));return;}box.append(el('h3',answer.inference?.label||'Serving identity unverified'));if(answer.inference?.detail)box.append(el('p',answer.inference.detail,'muted'));box.append(sourceList(answer.sources));const raw=el('details');raw.append(el('summary','Response and routing evidence'),el('pre',JSON.stringify(answer,(key,value)=>key.startsWith('_')?undefined:value,2)));box.append(raw);}
function updateMapNumbers(){for(const n of document.querySelectorAll('[data-metric]')){const key=n.dataset.metric;n.textContent=String(mapState[key]??'Not available').replace(/\s*·\s*·\s*/g,' · ')+(key==='gpu_ms'&&mapState[key]!=null?' ms':'');}const scene=$('scene-evidence');if(scene)scene.textContent=JSON.stringify(mapState.scene,null,2);}
function renderMapEvidence(){const box=$('renderer-data');box.replaceChildren();const dl=el('dl');for(const [key,label]of [['renderer','Renderer'],['draws','Visible batches'],['redraws','City redraws'],['reused','Reused frames'],['gpu_ms','Last geometry GPU interval']])if(mapState[key]!=null){const value=el('dd',String(mapState[key]).replace(/\s*·\s*·\s*/g,' · ')+(key==='gpu_ms'?' ms':''));value.dataset.metric=key;dl.append(el('dt',label),value);};box.append(dl);const light=el('details');light.append(el('summary','Light and sun'),el('pre',$('appearance-proof').textContent));box.append(light);const scene=el('details');const sceneText=el('pre',JSON.stringify(mapState.scene,null,2));sceneText.id='scene-evidence';scene.append(el('summary','Scene'),sceneText);box.append(scene);$('load-evidence').textContent=JSON.stringify(JSON.parse($('homeward-proof').textContent||'{}'),(key,value)=>key==='history'?undefined:value,2);$('closed-book').checked=mapState.closed_book===true;}
async function inspectCorrection(row){lastCorrection=row;$('correction-proof').replaceChildren(correctionProof(row,{onRefresh:async id=>inspectCorrection(await api('/api/learning/corrections/'+id)),onEdit:async r=>{if(editor.hasDraft()){notice('Resume or discard the unfinished edit first.');return;}const interaction=await api('/api/learning/interactions/'+r.interaction_id);editingBase=answer;editing=true;card.hidden=false;view.hidden=true;learning.hidden=false;evidence.hidden=true;editor.open(interaction,{...r.target,scene:r.resolved_target_scene});command({type:'card',value:true});},onPreview:async r=>{const value=await api('/api/learning/corrections/'+r.id+'/preview',{});onAnswer({...value,interaction_id:r.interaction_id,_row:r,_undo:r.original.result},{preview:true});evidence.hidden=true;}}));}
async function showTab(tab){selectedTab=tab;for(const section of document.querySelectorAll('.evidence-page'))section.hidden=section.id!=='evidence-'+tab;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===tab));if(tab==='answer')renderAnswerEvidence();if(tab==='map')renderMapEvidence();if(tab==='evaluation')loadEvaluation($('eval-content'));if(tab==='corrections'){
 $('operator-fields').replaceChildren(editor.operatorFields());try{await correctionHistory($('learning-history'),{onInspect:inspectCorrection});if(lastCorrection)inspectCorrection(lastCorrection);if(editor.hasDraft())$('learning-history').prepend(button('Resume unfinished edit',()=>{evidence.hidden=true;resumeEdit();},'quiet'));}catch(e){$('learning-history').replaceChildren(el('p',e.message,'form-message'));}
}}
document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.open=false;});
function openEvidence(tab='answer'){evidence.hidden=false;menu.open=false;showTab(tab);}
$('open-evidence').onclick=()=>openEvidence();$('evidence-close').onclick=()=>evidence.hidden=true;
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>showTab(b.dataset.tab);
for(const b of document.querySelectorAll('[data-question]'))b.onclick=()=>{if(!pending)command({type:'ask',question:b.dataset.question});};
$('overview').onclick=()=>{command({type:'overview'});menu.open=false;};
$('fullscreen').onclick=async()=>{menu.open=false;if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();};
document.addEventListener('fullscreenchange',()=>$('fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen');
$('closed-book').onchange=()=>command({type:'diagnostic',value:$('closed-book').checked});
$('replay-example').onclick=async()=>{if(editor.isBusy())return;try{const value=await api('/api/learning/replay',{});onAnswer(value,{preview:true});evidence.hidden=true;}catch(e){notice(e.message);}};
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&globalThis.londonMap){event.preventDefault();event.stopPropagation();menu.open=false;$('homeward').focus();command({type:'focus-input'});return;}if(event.key==='Escape'){if(!evidence.hidden){evidence.hidden=true;event.stopPropagation();}menu.open=false;}});
const reveal=()=>{if(document.documentElement.dataset.homewardReady==='true'){$('app-chrome').hidden=false;renderAnswer();if(new URLSearchParams(location.search).get('evidence')==='open')openEvidence();observer.disconnect();}};
const observer=new MutationObserver(reveal);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-homeward-ready']});reveal();
