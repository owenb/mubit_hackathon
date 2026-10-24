import {HISTORY_KEY,restoreAppearance,selectedAppearance,keepAppearance,dialAngle,dialValue,turnDial} from './appearance-state.mjs';
const root=document.documentElement,dial=document.getElementById('ambience');
const system=matchMedia('(prefers-color-scheme:light)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
let history;try{history=restoreAppearance(localStorage.getItem(HISTORY_KEY));}catch{history=restoreAppearance(null);}
let preview=selectedAppearance(history),drag=null;
const label=document.getElementById('dial-label'),needle=document.getElementById('dial-needle'),track=document.getElementById('dial-track');
const stops=[[.16,.02,280],[.36,.13,295],[.78,.09,235],[.97,.005,250]];
for(let i=0;i<60;i++){const value=i/20,j=Math.min(2,Math.floor(value)),f=value-j,c=stops[j].map((v,k)=>v+(stops[j+1][k]-v)*f);const a=dialAngle(value),b=dialAngle((i+1)/20),path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${22+15*Math.sin(a)} ${22-15*Math.cos(a)}A15 15 0 0 1 ${22+15*Math.sin(b)} ${22-15*Math.cos(b)}`);path.setAttribute('fill','none');path.setAttribute('stroke',`oklch(${c[0]} ${c[1]} ${c[2]})`);path.setAttribute('stroke-width','2.4');track.append(path);}
function name(value){return value<.5?'Deep':value<1.2?'Night':value<1.8?'Dawn':value<2.5?'Day':'Clean';}
function show(value){needle.setAttribute('transform',`rotate(${dialAngle(value)*180/Math.PI} 22 22)`);dial.style.setProperty('--dial-day',Math.max(0,Math.min(1,(value-1.2)/.6)));label.textContent=name(value);}
function londonDate(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'numeric',day:'numeric'}).formatToParts().map(p=>[p.type,p.value]));return Math.floor(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day))/86400000);}
function send({instant=false,slow=false}={}){if(!globalThis.londonMap)return;globalThis.londonMap({type:'appearance',value:preview??(system.matches?2:1),date:londonDate(),system:slow,instant:instant||motion.matches});}
function controls(){const value=preview??(system.matches?2:1);dial.setAttribute('aria-valuenow',value.toFixed(2));dial.setAttribute('aria-valuetext',`${name(value)}, ${Math.round(value/3*100)} percent`);}
function keep(value){history=keepAppearance(history,value);preview=selectedAppearance(history);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history));}catch{}controls();}
function point(event){const r=dial.getBoundingClientRect();return [event.clientX-r.left-r.width/2,event.clientY-r.top-r.height/2];}
function adjust(value){preview=value;controls();send();}
dial.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();dial.focus({preventScroll:true});dial.setPointerCapture(event.pointerId);dial.dataset.turning='';const [x,y]=point(event);drag={id:event.pointerId,angle:Math.hypot(x,y)>6?Math.atan2(x,-y):null};if(drag.angle!==null)adjust(dialValue(x,y));};
dial.onpointermove=event=>{if(!drag||drag.id!==event.pointerId)return;const [x,y]=point(event);if(Math.hypot(x,y)<6)return;const angle=Math.atan2(x,-y);adjust(drag.angle===null?dialValue(x,y):turnDial(preview,drag.angle,angle));drag.angle=angle;};
function finish(event,cancel=false){if(!drag||drag.id!==event.pointerId)return;drag=null;delete dial.dataset.turning;if(cancel){preview=selectedAppearance(history);controls();send();}else keep(preview);}
dial.onpointerup=event=>finish(event);dial.onpointercancel=event=>finish(event,true);dial.onlostpointercapture=event=>finish(event,true);
dial.onkeydown=event=>{const value=preview??(system.matches?2:1),step=event.shiftKey ? .1 : .02;let next;switch(event.key){case 'ArrowRight':case 'ArrowUp':next=value+step;break;case 'ArrowLeft':case 'ArrowDown':next=value-step;break;case 'PageUp':next=value+.25;break;case 'PageDown':next=value-.25;break;case 'Home':next=0;break;case 'End':next=3;break;default:return;}event.preventDefault();keep(Math.round(Math.max(0,Math.min(3,next))*100)/100);send();};
motion.addEventListener('change',()=>send({instant:motion.matches,slow:preview===null}));
system.addEventListener('change',()=>{if(preview===null){controls();send({slow:true});}});
window.addEventListener('storage',event=>{if(event.key===HISTORY_KEY){history=restoreAppearance(event.newValue);preview=selectedAppearance(history);controls();send();}});
window.addEventListener('london:appearance',event=>{const v=event.detail;show(v.ambience);for(const [name,value]of Object.entries(v.vars))root.style.setProperty(name,value);root.style.colorScheme=v.dark_ink?'light':'dark';root.dataset.ambience=v.ambience.toFixed(4);root.dataset.day=v.ui.toFixed(4);const proof=document.getElementById('appearance-proof');proof.textContent=JSON.stringify({...v,vars:undefined});});
window.addEventListener('london:engine',()=>send({instant:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)send({slow:preview===null});});
controls();show(preview??(system.matches?2:1));
