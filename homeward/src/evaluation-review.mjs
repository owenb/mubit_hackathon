import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {digest,summarizeEvaluation,saveEvaluation} from './evaluation.mjs';

const arms=['mubit_adapter','luna'];
const reviewId=(run,row)=>digest([run.run_id,row.id,row.input_hash]);
const orderFor=(run,row)=>parseInt(reviewId(run,row).slice(0,2),16)%2?[...arms].reverse():arms;
function completed(run){if(!summarizeEvaluation(run).complete)throw Error('Collect a complete, verified paired run before reviewing it');}

// The reviewer receives both outputs and the same evidence, without model names,
// latency, request IDs, scores, or arm order. The private run holds the mapping.
export function makeBlindReview(run){
 completed(run);
 return {schema_version:1,run_id:run.run_id,test_sha256:run.test_sha256,reviewer:null,reviewed_at:null,
  instruction:'Assess every essential point, cited evidence, labels, unsupported claims and map intent. Equivalent wording is acceptable. A valid place ID alone is not a correct map. Record your identity (including if an AI) and rationale. This is a small development-team adjudication, not independent expert validation.',
  cases:run.rows.map(row=>({id:row.id,review_id:reviewId(run,row),question:row.question,essential_points:row.essential_points,
   evidence:row.packet.payload.research,map_candidates:row.packet.payload.map_candidates,
   output_contract:{instructions:row.packet.body.messages.find(m=>m.role==='system').content,schema:row.packet.body.response_format.json_schema.schema},
   answers:Object.fromEntries(orderFor(run,row).map((arm,i)=>[i?'B':'A',{
    output:row[arm].output,output_sha256:digest(row[arm].output),
    assessment:{essential_points:row.essential_points.map(point=>({point,met:null})),evidence_correct:null,labels_correct:null,map_correct:null,unsupported_claims:null,rationale:null}
   }]))}))};
}
export function applyReview(run,review){
 completed(run);
 if(review.run_id!==run.run_id||review.test_sha256!==run.test_sha256)throw Error('Review does not match the evaluation');
 if(typeof review.reviewer!=='string'||!review.reviewer.trim()||!Number.isFinite(Date.parse(review.reviewed_at)))throw Error('Reviewer identity and review timestamp are required');
 if(review.cases?.length!==run.rows.length||new Set(review.cases.map(c=>c.id)).size!==run.rows.length)throw Error('Review must contain every case exactly once');
 const result=structuredClone(run);
 for(const row of result.rows){
  const item=review.cases.find(c=>c.id===row.id);
  if(item?.review_id!==reviewId(run,row))throw Error('Review case or input changed');
  for(const [i,arm] of orderFor(run,row).entries()){
   const answer=item.answers[i?'B':'A'],grade=answer?.assessment;
   if(answer?.output_sha256!==digest(row[arm].output)||digest(answer.output)!==answer.output_sha256)throw Error('Reviewed answer changed');
   if(grade?.essential_points?.length!==row.essential_points.length||grade.essential_points.some((p,j)=>p.point!==row.essential_points[j]||typeof p.met!=='boolean'))throw Error('Every essential point needs a boolean decision');
   if(['evidence_correct','labels_correct','map_correct','unsupported_claims'].some(k=>typeof grade[k]!=='boolean')||!grade.rationale?.trim())throw Error('All grading dimensions and a rationale are required');
   row[arm].grade={...grade,adjudicated:true,reviewer:review.reviewer,reviewed_at:review.reviewed_at,
    full_task_pass:row[arm].structural.passed&&grade.essential_points.every(p=>p.met)&&grade.evidence_correct&&grade.labels_correct&&grade.map_correct&&!grade.unsupported_claims};
  }
 }
 result.summary=summarizeEvaluation(result);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [command,runPath,reviewPath]=process.argv.slice(2);
 if(!['prepare','apply'].includes(command)||!runPath||!reviewPath)throw Error('Usage: node homeward/src/evaluation-review.mjs prepare|apply RUN.json REVIEW.json');
 const run=JSON.parse(await readFile(runPath,'utf8'));
 if(command==='prepare')await writeFile(reviewPath,JSON.stringify(makeBlindReview(run),null,2),{flag:'wx'});
 else {const reviewed=applyReview(run,JSON.parse(await readFile(reviewPath,'utf8')));await saveEvaluation(reviewed);console.log(JSON.stringify(reviewed.summary));}
}
