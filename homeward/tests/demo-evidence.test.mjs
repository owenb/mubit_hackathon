import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluationPendingReason} from '../src/demo-evidence.mjs';

test('a dated backend blocker explains the pending comparison without overwriting new results',()=>{
 const readiness={status:'blocked',summary:'Fixture: refresh scheduled, adapter unpromoted'};
 assert.equal(evaluationPendingReason({status:'pending_verified_adapter'},readiness),readiness.summary);
 assert.equal(evaluationPendingReason({status:'complete'},readiness),null);
 assert.match(evaluationPendingReason({status:'running'},readiness),/Collecting/);
 assert.match(evaluationPendingReason({status:'awaiting_adjudication'},readiness),/adjudication/);
 assert.equal(evaluationPendingReason({status:'incomplete',error:'Version changed'},readiness),'Version changed');
 assert.match(evaluationPendingReason({status:'pending_verified_adapter'},null),/two verifiable/);
});
