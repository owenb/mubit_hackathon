import test from 'node:test';
import assert from 'node:assert/strict';
import {compactPayload} from '../src/payload.mjs';
test('inference compaction retains all source facts and map identities',()=>{
 const p={question:'Bank?',map_candidates:[{id:'bank',name:'Bank',aliases:['Bank station'],lines:['Northern']}],research:{version:'v1',facts:[{id:'f',text:'Exception applies.',source_ids:['s'],place_ids:['bank'],tags:['retrieval-only']}],rules:['duplicate system rule'],reviewed_examples:[{answer:'Corrected'}],sources:[{id:'s',url:'https://tfl.gov.uk',retrieved_at:'date'}]}};
 const c=compactPayload(p);assert.equal(c.research.facts[0].text,p.research.facts[0].text);assert.deepEqual(c.research.sources,p.research.sources);assert.deepEqual(c.research.reviewed_examples,p.research.reviewed_examples);assert.deepEqual(c.map_candidates[0].lines,['Northern']);assert.equal(c.map_candidates[0].id,'bank');assert.ok(p.research.facts[0].tags);assert.ok(!c.research.facts[0].tags);
});
