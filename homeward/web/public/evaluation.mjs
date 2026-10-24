const panel=document.getElementById('evaluation'),content=document.getElementById('eval-content');
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n;};
document.getElementById('eval-close').onclick=()=>panel.open=false;
panel.addEventListener('toggle',async()=>{
  if(!panel.open)return;
  try{
    const response=await fetch('/api/evals',{cache:'no-store'});if(!response.ok)throw Error('The evaluation report is temporarily unavailable.');const report=await response.json();content.replaceChildren();
    content.append(node('p',report.complete?'Paired comparison available':'Waiting for a verified adapter',report.complete?'eval-status complete':'eval-status'));
    content.append(node('p',report.pending_reason||'Results below use the frozen held-out questions.','eval-note'));
    content.append(node('p',`${report.test?.cases||20} held-out questions · ${report.status?.replaceAll('_',' ')||'unknown'}`,'eval-note'));
    if(report.latest_serving_probe){const probe=report.latest_serving_probe;content.append(node('p',`Latest serving probe: ${probe.inference?.label||probe.inference?.response_model||'unverified'} · ${probe.checked_at||'time unavailable'}`,'eval-note'));}
    if(report.error)content.append(node('p',report.error,'eval-note'));
    if(report.complete){
      const table=node('table');const head=node('tr');head.append(node('th','Measure'),node('th','Mubit adapter'),node('th','Luna'));table.append(head);
      const arms=report.arms||{};
      const ratio=(n,d)=>Number.isFinite(n)&&d>0?String(n)+' / '+String(d)+' ('+Math.round(n/d*100)+'%)':'Awaiting adjudication';
      const metrics=[['Model',a=>[a.model,a.adapter_version].filter(Boolean).join(' · ')||'Unverified'],['Full-task accuracy',a=>ratio(a.full_task_passes,a.full_task_total)+(a.accuracy_ci95?' · 95% CI '+a.accuracy_ci95.map(v=>Math.round(v*100)+'%').join('–'):'')],['Map correctness',a=>ratio(a.map_correct,a.calls)],['Structure',a=>ratio(a.structural_passes,a.calls)],['Latency p50 / p95',a=>Number.isFinite(a.latency_p50_ms)?Math.round(a.latency_p50_ms)+' / '+Math.round(a.latency_p95_ms)+' ms':'Unavailable'],['Observed cost',a=>Number.isFinite(a.observed_cost_usd)?'$'+a.observed_cost_usd.toFixed(4):'Unavailable']];
      for(const [label,format] of metrics){const row=node('tr');row.append(node('th',label));for(const arm of [arms.mubit_adapter,arms.luna])row.append(node('td',arm?format(arm):'Unavailable'));table.append(row);}content.append(table);
      for(const row of report.rows||[]){const details=node('details');details.append(node('summary',row.question||row.id||'Case comparison'));details.append(node('pre',JSON.stringify(row,null,2)));content.append(details);}
    }
    if(!report.complete)for(const row of report.rows||[]){const details=node('details');details.append(node('summary',row.question||row.id||'Incomplete case'),node('pre',JSON.stringify(row,null,2)));content.append(details);}
    for(const caveat of report.caveats||[])content.append(node('p',caveat,'eval-note'));
    if(report.training){const details=node('details');details.append(node('summary','Latest training status'),node('pre',JSON.stringify(report.training,null,2)));content.append(details);}
    const note=node('p',report.complete?'Inspect each case for the answer, selected places and serving evidence.':'A recording receipt proves that a request passed through Mubit. Scores appear after the serving identity and paired results are verified.','eval-note');content.append(note);
  }catch(error){content.replaceChildren(node('p',error.message,'eval-note'));}
});
