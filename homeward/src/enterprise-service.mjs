import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {packet,taskHash} from '../experiments/enterprise-prospecting/contract.mjs';
import {enterpriseModel} from './enterprise-model.mjs';
export const enterpriseData=JSON.parse(await readFile(new URL('../experiments/enterprise-prospecting/companies.json',import.meta.url),'utf8'));
const enterpriseImages=JSON.parse(await readFile(new URL('../experiments/enterprise-prospecting/images.json',import.meta.url),'utf8').catch(()=>'{}'));
for(const company of enterpriseData.companies)company.image=enterpriseImages[company.id]||null;
const companyById=new Map(enterpriseData.companies.map(c=>[c.id,c]));
const defaultDirectory=new URL('../experiments/enterprise-prospecting/results/interactions/',import.meta.url);
const clean=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
export function createEnterpriseService({model=enterpriseModel,directory=defaultDirectory}={}){
 const interactions=new Map(),corrections=new Map(),loading=new Map();
 const store=async(row)=>{await mkdir(directory,{recursive:true,mode:0o700});await writeFile(new URL(row.id+'.json',directory),JSON.stringify(row,null,2)+'\n',{mode:0o600});};
 const owned=async(map,id,session)=>{if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('This item is not in your current session.');let row=map.get(id);if(!row){if(!loading.has(id))loading.set(id,(async()=>{try{return JSON.parse(await readFile(new URL(id+'.json',directory),'utf8'));}catch{return null;}})());row=await loading.get(id);if(row?.id===id)map.set(id,row);}if(!row||row.session!==session||row.kind!==(map===corrections?'correction':'assessment'))throw Error('This item is not in your current session.');return row;};
 const publicCorrection=row=>({id:row.id,company_id:row.company_id,note:row.note,state:row.state,created_at:row.created_at,receipt:row.receipt||null,inference:row.result?.inference||null,assessment:row.assessment||null,error:row.error||null,task_hash:taskHash,detail:row.state==='received'?'Mubit received this teaching example. Review and training are asynchronous; no adapter or quality improvement has been verified.':row.state==='saved'?'Saved locally. Choose Teach this judgement to send the example to Mubit.':row.state==='sending'?'Teaching request in progress.':'Teaching did not return a verified receipt. Inspect evidence before trying another example.'});
 return {
  companies:()=>enterpriseData,
  async assess(session,body){
   const company=companyById.get(body.company_id);if(!company)throw Error('Select one of the verified company offices.');
   const question=clean(body.question||'Would this business be a good fit for Mubit? Suggest one recurring workload and a tailored pilot pitch.',2000);if(!question)throw Error('Ask a question of 1–2000 characters.');
   const input=packet(company,question),result=await model(input,{recording:'metadata',source:'enterprise-interactive'});
   const row={id:randomUUID(),session,kind:'assessment',created_at:new Date().toISOString(),company_id:company.id,input,result};await store(row);interactions.set(row.id,row);
   return {interaction_id:row.id,company_id:company.id,question,assessment:result.output,sources:company.sources,inference:result.inference,elapsed_ms:result.elapsed_ms,task_hash:taskHash};
  },
  async save(session,body){
   const interaction=await owned(interactions,body.interaction_id,session),note=clean(body.note,2400);if(!note)throw Error('Describe the judgement to teach in 1–2400 characters.');
   const row={id:randomUUID(),session,kind:'correction',interaction_id:interaction.id,company_id:interaction.company_id,note,state:'saved',created_at:new Date().toISOString(),input:{...interaction.input,expert_note:note}};
   await store(row);corrections.set(row.id,row);return publicCorrection(row);
  },
  async teach(session,id){
   const row=await owned(corrections,id,session);if(row.state!=='saved')return publicCorrection(row);
   row.state='sending';await store(row);
   try{row.result=await model(row.input,{recording:'full',source:'enterprise-user-teaching'});row.receipt=row.result.request_id;row.assessment=row.result.output;if(!row.receipt)throw Error('No Mubit receipt was returned.');row.state='received';}
   catch(e){row.state='unconfirmed';row.error='No confirmed teaching receipt. No automatic retry was made.';}
   await store(row);return publicCorrection(row);
  },
  async get(session,id){return publicCorrection(await owned(corrections,id,session));},
  async status(){
   let observation={state:'not_observed',adapter:null,detail:'No enterprise adapter has been verified.'};
   try{observation=JSON.parse(await readFile(new URL('../experiments/enterprise-prospecting/observed-status.json',import.meta.url),'utf8'));}catch{}
   return {task_hash:taskHash,...observation,meaning:'A gateway receipt is not proof of kept review, adapter training or improved quality. Live assessments request Luna; adapter evaluation has a separate evidence path.'};
  }
 };
}
