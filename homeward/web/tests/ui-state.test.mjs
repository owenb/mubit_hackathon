import test from 'node:test';
import assert from 'node:assert/strict';
import {draftFrom,changed,sceneFor,correctionBody,correctionStatus} from '../public/correction-state.mjs';
const interaction=()=>({interaction_id:'session-owned-answer',question:'Show two nearby stations.',result:{answer:'Use either station; check the onward route.',response_kind:'answer',static_access:'not_applicable',scene:{camera:'fit',places:[{id:'station-a',name:'Station A',role:'context'},{id:'station-b',name:'Station B',role:'context'}]}}});
test('a pin-only personal edit needs no written explanation and cannot become shared teaching',()=>{
 const source=interaction(),draft=draftFrom(source);assert.equal(changed(draft),false);assert.throws(()=>correctionBody(draft,'trip'),/Change/);
 draft.pins.pop();const body=correctionBody(draft,'trip');assert.equal(body.scope,'trip');assert.equal(body.answer,source.result.answer);assert.equal(body.note,'Personal edit: Removed Station B');assert.deepEqual(body.scene,{camera:'focus',places:[{id:'station-a',role:'context'}]});assert.equal(source.result.scene.places.length,2);
 assert.throws(()=>correctionBody(draft,'reusable'),/reason/);
});
test('sharing requires a separate explicit scope and human reason',()=>{
 const draft=draftFrom(interaction());draft.pins.pop();draft.note='Station B is not relevant to the requested area.';
 const personal=correctionBody(draft,'trip'),shared=correctionBody(draft,'reusable');assert.equal(personal.scope,'trip');assert.equal(shared.scope,'reusable');assert.equal(shared.note,draft.note);assert.deepEqual(Object.keys(shared).sort(),['interaction_id','answer','scene','response_kind','static_access','reason','note','scope'].sort());
});
test('removing every pin remains a valid empty preview without altering the original',()=>{
 const draft=draftFrom(interaction());draft.pins=[];assert.deepEqual(sceneFor(draft),{camera:'keep',places:[]});assert.deepEqual(correctionBody(draft,'trip').scene,{camera:'keep',places:[]});assert.equal(draft.interaction.result.scene.places.length,2);
});
test('edited wording and labels count as real changes; an explanation alone does not',()=>{
 const draft=draftFrom(interaction());draft.note='A note is not an edited target.';assert.equal(changed(draft),false);draft.static_access='partial';assert.equal(changed(draft),true);draft.static_access='not_applicable';draft.answer='Check the station and onward route.';assert.equal(changed(draft),true);
});
test('delivery, good ratings and a newer observed model never masquerade as demonstrated learning',()=>{
 const base={scope:'reusable',stages:{mubit_review:{state:'rated_good'},model_update:{newer_version_observed:true}}};assert.match(correctionStatus(base),/unverified/);assert.doesNotMatch(correctionStatus(base),/learned|improved/);assert.match(correctionStatus({...base,stages:{mubit_review:{state:'kept'}}}),/unverified/);assert.equal(correctionStatus({scope:'trip'}),'Saved for your map');assert.match(correctionStatus({...base,error:'Unknown delivery state'}),/Needs review/);
});
test('an audited correction Mubit received, but whose stored reply differs, says so without claiming learning',()=>{
 assert.equal(correctionStatus({scope:'reusable',status:'needs_review',error:'Recorded teacher reply differs from the reviewed target.',teaching:{audit:{accepted:true},receipt:'mreq_x',matched:false}}),'Audit passed · sent to Mubit · reply needs review');
 assert.match(correctionStatus({scope:'reusable',status:'needs_review',teaching:{audit:{accepted:false}}}),/Needs review/);
 assert.match(correctionStatus({scope:'reusable',status:'needs_review',error:'x',teaching:{audit:{accepted:true},receipt:'mreq_x'}}),/Needs review/);
});
