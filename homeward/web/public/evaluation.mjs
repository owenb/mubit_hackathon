import {el,api} from './ui.mjs';
export async function loadEvaluation(content){
 content.replaceChildren(el('p','Loading…','muted'));
 try{const r=await api('/api/evals');content.replaceChildren();
  if(!r.complete){
   content.append(el('h3','No verified comparison yet.'),el('p','A new model and matched tests are needed to show improvement.','muted'));
   if(r.development){const d=r.development;content.append(el('h4','Development check'),el('p',`Version ${d.version_before}: ${d.before.valid_answer_and_scene} of ${d.cases} replies had a usable answer and map.`),el('p','This is a development diagnostic, not an accuracy claim. Failed and interrupted calls remain in the results.','muted'));}
   content.append(el('p','The final 20 questions are still unused.','muted'));
  }else{
   const table=el('table'),head=el('tr');head.append(el('th','Measure'),el('th','Travel model'),el('th','Luna'));table.append(head);
   const ratio=(n,d)=>Number.isFinite(n)&&d>0?`${n} / ${d}`:'Not reviewed';
   for(const [label,format]of [['Model',a=>[a.model,a.adapter_version].filter(Boolean).join(' · ')],['Complete answers',a=>ratio(a.full_task_passes,a.full_task_total)],['Correct maps',a=>ratio(a.map_correct,a.calls)],['Valid output',a=>ratio(a.structural_passes,a.calls)],['Latency p50 / p95',a=>Number.isFinite(a.latency_p50_ms)?`${Math.round(a.latency_p50_ms)} / ${Math.round(a.latency_p95_ms)} ms`:'Not measured'],['Observed cost',a=>Number.isFinite(a.observed_cost_usd)?'$'+a.observed_cost_usd.toFixed(4):'Not measured']]){const row=el('tr');row.append(el('th',label));for(const arm of [r.arms?.mubit_adapter,r.arms?.luna])row.append(el('td',arm?format(arm):'Unavailable'));table.append(row);}content.append(table);
  }
  const details=el('details');details.append(el('summary','Methods and evidence'),el('p',r.pending_reason||'Matched inputs and identified serving models are required.','muted'));for(const note of r.caveats||[])details.append(el('p',note,'muted'));details.append(el('pre',JSON.stringify(r,null,2)));content.append(details);
 }catch(e){content.replaceChildren(el('p',e.message,'form-message'));}
}
