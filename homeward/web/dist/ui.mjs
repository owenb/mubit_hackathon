import {friendlyMessage} from './friendly.mjs';
export {friendlyMessage};
export const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
export function button(text,fn,cls='quiet'){const b=el('button',text,cls);b.type='button';b.addEventListener('click',()=>Promise.resolve().then(fn).catch(error=>window.dispatchEvent(new CustomEvent('london:notice',{detail:friendlyMessage(error.message)}))));return b;}
export async function api(path,body){
 let response;try{response=await fetch(path,{cache:'no-store',...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});}catch{throw Error(friendlyMessage('Failed to fetch'));}
 let value;try{value=await response.json();}catch{throw Error(friendlyMessage(response.status>=500?'503':'not valid JSON'));}
 if(!response.ok)throw Error(friendlyMessage((value.error||'That did not work. Try again.').replaceAll('Homeward','London Guide')));
 return value;
}
export function sourceList(sources=[]){const box=el('div',null,'source-list');for(const s of sources){const p=el('p');try{const u=new URL(s.url);if(u.protocol!=='https:')continue;const a=el('a',s.title||s.id);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';p.append(a);}catch{continue;}if(s.retrieved_at)p.append(el('small','Checked '+s.retrieved_at.slice(0,10)));box.append(p);}return box;}
