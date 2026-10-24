import test from 'node:test';import assert from 'node:assert/strict';
import {collectEvaluation,summarizeEvaluation,loadHeldout,wilson,structuralGrade,evaluationPacket} from '../src/evaluation.mjs';
import {existsSync} from 'node:fs';
import {makeBlindReview,applyReview} from '../src/evaluation-review.mjs';
const cases=[{id:'test-1',question:'Is Bank Northern accessible from the street?',topic:'test',essential_points:[]},{id:'test-2',question:'Is Bank Central accessible from the street?',topic:'test',essential_points:[]}];
const reply=(arm,version='2')=>({finish_reason:'stop',output:JSON.stringify({static_access:'unknown',response_kind:'answer',answer:'Test fixture only.',source_ids:[],scene:{camera:'keep',places:[]}}),latency_ms:12,usage:{total_tokens:50},inference:{route:arm,request_id:'mreq_fixture',response_model:arm==='luna'?'gpt-6-luna':'fixture-qwen',adapter_id:arm==='mubit_adapter'?'fixture-adapter':null,adapter_version:version,evidence:['TEST FIXTURE — not real inference']}});
test('frozen final set checksum remains intact',{skip:!existsSync(new URL('../data/travel-final-heldout.json',import.meta.url))},async()=>assert.equal((await loadHeldout()).cases.length,20));
test('provider fallback stops before any final question is sent',async()=>{
 const seen=[];await assert.rejects(()=>collectEvaluation({cases,callers:{mubit_adapter:async b=>{seen.push(b);return reply('luna');},luna:async()=>reply('luna')}}),/Expected mubit_adapter/);
 assert.equal(seen.length,1);assert.match(seen[0].messages[1].content,/serving-canary/);
});
test('paired inputs match, order alternates, invalid output remains a failure',async()=>{
 const seen=[];const caller=arm=>async b=>{seen.push({arm,body:structuredClone(b)});let r=reply(arm);if(arm==='mubit_adapter'&&b.messages[1].content.includes('test-2'))r.output='{broken';return r;};
 const statuses=[];const run=await collectEvaluation({cases,callers:{mubit_adapter:caller('mubit_adapter'),luna:caller('luna')},checkpoint:async r=>statuses.push(r.summary.status)});
 assert.equal(statuses[0],'running');
 assert.equal(run.serving_probes.mubit_adapter.inference.adapter_id,'fixture-adapter');
 assert.deepEqual(seen.map(x=>x.arm),['mubit_adapter','luna','mubit_adapter','luna','luna','mubit_adapter']);
 assert.deepEqual(seen[2].body,seen[3].body);assert.deepEqual(seen[4].body,seen[5].body);
 assert.equal(run.summary.complete,true);assert.equal(run.summary.status,'awaiting_adjudication');assert.equal(run.summary.arms.mubit_adapter.structural_passes,1);assert.equal(run.summary.arms.mubit_adapter.full_task_passes,null);
 for(const row of run.rows)for(const arm of ['mubit_adapter','luna'])row[arm].grade={adjudicated:true,full_task_pass:true,map_correct:true};
 const summary=summarizeEvaluation(run);assert.equal(summary.arms.mubit_adapter.full_task_passes,1);assert.equal(summary.arms.luna.full_task_passes,2);assert.equal(summary.arms.luna.observed_cost_usd,null);
});
test('a version change halts evaluation and preserves the observed evidence',async()=>{
 let n=0;const run=await collectEvaluation({cases,callers:{mubit_adapter:async()=>reply('mubit_adapter',++n===1?'2':'3'),luna:async()=>reply('luna')}});
 assert.equal(run.summary.complete,false);assert.match(run.error,/version changed/);assert.equal(run.rows[0].mubit_adapter.inference.adapter_version,'3');assert.equal(run.rows[0].luna,undefined);
});
test('small-set uncertainty is retained even for a perfect observed score',()=>{
 const ci=wilson(20,20);assert.ok(ci[0]<0.85);assert.ok(ci[1]<=1);assert.equal(wilson(0,0),null);
});
test('extra output fields fail the same strict contract required from both models',()=>{
 const result=reply('luna');const answer=JSON.parse(result.output);answer.scene.unrequested_route=[[0,0],[1,1]];result.output=JSON.stringify(answer);
 assert.equal(structuralGrade(result,evaluationPacket(cases[0])).passed,false);
});
test('blinded review excludes model provenance and derives full-task grades',async()=>{
 const run=await collectEvaluation({cases,callers:{mubit_adapter:async()=>reply('mubit_adapter'),luna:async()=>reply('luna')}});
 const review=makeBlindReview(run);
 assert.equal(JSON.stringify(review).includes('fixture-adapter'),false);
 assert.equal(JSON.stringify(review).includes('mreq_fixture'),false);
 assert.equal(JSON.stringify(review).includes('latency_ms'),false);
 assert.throws(()=>applyReview(run,review),/identity/);
 review.reviewer='Test fixture adjudicator';review.reviewed_at='2026-10-24T00:00:00Z';
 for(const item of review.cases)for(const a of Object.values(item.answers))Object.assign(a.assessment,{evidence_correct:true,labels_correct:true,map_correct:true,unsupported_claims:false,rationale:'Fixture only.'});
 review.cases[0].answers.A.assessment.map_correct=false;
 const graded=applyReview(run,review);
 assert.equal(graded.summary.adjudicated,true);
 assert.equal(graded.summary.arms.luna.full_task_passes+graded.summary.arms.mubit_adapter.full_task_passes,3);
 const tampered=structuredClone(review);tampered.cases[0].answers.A.output='tampered';
 assert.throws(()=>applyReview(run,tampered),/answer changed/);
 const missing=structuredClone(review);missing.cases.pop();assert.throws(()=>applyReview(run,missing),/every case/);
});
