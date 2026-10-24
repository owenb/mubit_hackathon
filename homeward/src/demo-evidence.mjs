import {readFile} from 'node:fs/promises';
import {heldoutHash} from './evaluation.mjs';
const read=async(path,fallback)=>{try{return JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
export function evaluationPendingReason(report,readiness){
 if(report.status==='complete')return null;
 if(report.error)return report.error;
 if(report.status==='running')return 'Collecting matched responses from verified serving paths; final scores are not available.';
 if(report.status==='awaiting_adjudication')return 'Both models have answered. Full-task scores await model-blinded adjudication.';
 if(report.status==='pending_verified_adapter'&&readiness?.status==='blocked')return readiness.summary;
 return 'The frozen comparison needs two verifiable API serving paths with matched inputs. A Mubit receipt alone is insufficient.';
}
export async function evaluationReport(){
 const report=await read('../data/evaluation-latest.json',{schema_version:1,status:'pending_verified_adapter',checked_at:null,test:{id:'travel-final-20',sha256:heldoutHash,cases:20},complete:false,adjudicated:false,arms:{mubit_adapter:null,luna:null},rows:[],error:null});
 const training=await read('../results/travel/mubit-status.json',await read('../data/training-status-snapshot.json',null));
 const probe=await read('../results/travel/latest-serving-probe.json',null);
 const backend_readiness=await read('../data/backend-readiness.json',null);
 return {...report,checked_at:report.checked_at||training?.checked_at||probe?.checked_at||null,training:training||report.training||null,latest_serving_probe:probe?{checked_at:probe.checked_at,inference:probe.inference,latency_ms:probe.elapsed_ms}:report.latest_serving_probe||null,
  backend_readiness,pending_reason:evaluationPendingReason(report,backend_readiness)};
}
export async function demoEvidence(){
 const evaluation=await evaluationReport();
 const correction_replay=await read('../data/correction-replay.json',null);
 return {schema_version:1,checked_at:evaluation.checked_at,correction_replay,positioning:'Homeward: a city assistant that learns from its operators',recurring_task:'Interpret London travel questions against dated evidence, select the right places, and produce a validated map scene.',
  demo_claim:'One correction should improve unseen requests on an identifiable open model. This remains a claim to prove, not a completed result.',
  criteria:[
   {id:'mubit',label:'Use of Mubit',weight:0.25,status:'update_effect_unproven',evidence:['Luna calls recorded through Mubit','Bad feedback with explicit corrections saved','Real Qwen3-4B adapter v1 exists'],missing:['A post-correction model version','Verified adapter API inference','Improvement on untouched paraphrases with identical evidence']},
   {id:'usefulness',label:'Usefulness',weight:0.25,status:'prototype',evidence:['Repeated accessibility, payment, museum and airport questions','Sources and map anchors reused locally'],missing:['Operator/customer validation','Measured reduction in unresolved travel questions']},
   {id:'execution',label:'Technical execution',weight:0.25,status:'evidence_in_progress',evidence:['Typed scene IDs validated against a local catalogue','Serving provenance distinguishes Luna, unknown and cache','Frozen 20-case comparison with route and version checks'],missing:['Completed paired evaluation','Exported model run independently','Observed billing for cost comparison']},
   {id:'demo',label:'Demo',weight:0.25,status:'rehearsal_needed',evidence:['Full London renderer and conversational map','Live serving badge'],missing:['Timed end-to-end correction replay','Clear before/after model result','Fallback plan if retraining is not ready']}
  ],
  correction_story:{id:'chancery-lane-map-id',task_id:'ln_445191829380864c541213cd',adapter_id:'ad_lane_8bdd977d',before:{model:'gpt-6-luna',failure:'Invented station:chancery-lane instead of a supplied catalogue ID',request_id:'mreq_01a16acd84c07f70ae4cbca4ebea479f'},feedback:{status:'saved',correction:'Select the verified Chancery Lane candidate osm:2026-10-12:1621; never invent IDs.',console_url:'https://app.mubit.ai/console/projects/ws-1ac8e778cff912a3/requests/01a16acd-84c8-73c0-9ea2-8534358c50af'},model_update:{status:'not_verified',version:null},unseen_retest:{status:'not_run',score:null},warning:'Saved feedback is not proof of a trained improvement. Do not imply this exact row was used in a version without lineage evidence.'},
  proposed_demo:[
   {seconds:25,beat:'A visitor needs a useful answer with the correct station and venue pins.'},
   {seconds:25,beat:'Show a real failure and the precise operator correction.'},
   {seconds:35,beat:'Show the real update receipt/version. If pre-trained, state its actual elapsed time.'},
   {seconds:45,beat:'Ask an unseen paraphrase; inspect model identity and compare the old/new map and answer.'},
   {seconds:30,beat:'Show the full 20-case result, confidence interval, failures, latency and observed cost.'},
   {seconds:20,beat:'Explain the operator ownership story; show local inference only if it actually works.'}
  ],demo_duration_note:'180-second working storyboard; actual event time limit has not been supplied.',
  technical_priorities:[
   {priority:1,feature:'Correction-to-version trace',reason:'Proves the central Mubit criterion rather than only sending traffic.'},
   {priority:2,feature:'Paired map and answer replay',reason:'Makes a small semantic correction visible across an entire city interface.'},
   {priority:3,feature:'A narrower learned travel contract',reason:'Train interpretation and place selection; keep volatile facts in dated evidence. Prototype only after current serving/evaluation path works.'},
   {priority:4,feature:'Export and independent serving',reason:'An actual closed-provider-off demonstration would prove ownership; exporting weights alone is not that proof.'}
  ],non_claims:['Not a verified end-to-end accessible journey planner','No claim of lower price than OpenAI','No claim of offline live status','No model quality win before the paired results exist'],evaluation};
}
