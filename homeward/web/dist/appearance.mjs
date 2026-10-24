import {HISTORY_KEY,restoreAppearance,selectedAppearance,keepAppearance,undoAppearance} from './appearance-state.mjs';
const root=document.documentElement,dial=document.getElementById('ambience'),follow=document.getElementById('appearance-system'),undo=document.getElementById('appearance-undo');
const system=matchMedia('(prefers-color-scheme:light)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
let history;try{history=restoreAppearance(localStorage.getItem(HISTORY_KEY));}catch{history=restoreAppearance(null);}
let preview=selectedAppearance(history);
function londonDate(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'numeric',day:'numeric'}).formatToParts().map(p=>[p.type,p.value]));return Math.floor(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day))/86400000);}
function send({instant=false,slow=false}={}){if(!globalThis.londonMap)return;globalThis.londonMap({type:'appearance',value:preview??(system.matches?2:1),date:londonDate(),system:slow,instant:instant||motion.matches});}
function controls(){const value=preview??(system.matches?2:1);dial.value=String(value);dial.setAttribute('aria-valuetext',value<0.5?'Deep night':value<1.25?'Night':value<1.75?'Twilight':value<2.5?'Day':'Clean white');follow.setAttribute('aria-pressed',String(preview===null));follow.textContent=preview===null?'Following system':'Follow system';undo.hidden=history.index===0;}
function keep(value){history=keepAppearance(history,value);preview=selectedAppearance(history);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history));}catch{}controls();}
dial.oninput=()=>{preview=Number(dial.value);controls();send();};dial.onchange=()=>keep(Number(dial.value));
follow.onclick=()=>{keep(null);send({slow:true});};undo.onclick=()=>{history=undoAppearance(history);preview=selectedAppearance(history);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history));}catch{}controls();send();};
motion.addEventListener('change',()=>send({instant:motion.matches,slow:preview===null}));
system.addEventListener('change',()=>{if(preview===null){controls();send({slow:true});}});
window.addEventListener('storage',event=>{if(event.key===HISTORY_KEY){history=restoreAppearance(event.newValue);preview=selectedAppearance(history);controls();send();}});
window.addEventListener('london:appearance',event=>{const v=event.detail;for(const [name,value]of Object.entries(v.vars))root.style.setProperty(name,value);root.style.colorScheme=v.dark_ink?'light':'dark';root.dataset.ambience=v.ambience.toFixed(4);root.dataset.day=v.ui.toFixed(4);const proof=document.getElementById('appearance-proof');proof.textContent=JSON.stringify({...v,vars:undefined});});
window.addEventListener('london:engine',()=>send({instant:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)send({slow:preview===null});});
controls();
