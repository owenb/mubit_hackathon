import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {knowledge,retrieveResearch,researchFresh} from '../src/research.mjs';
import {mapCandidates} from '../src/core.mjs';

test('retrieval preserves source exceptions beside headline venue advice',()=>{
 for(const question of ['Can I visit the Science Museum without booking?','Can I visit the V&A fashion gallery?','What is the bus fare in October?']){
  const research=retrieveResearch(question);
  assert.ok(research.sources.length);
  for(const source of research.sources){
   const expected=knowledge.facts.filter(f=>f.source_ids.includes(source.id));
   assert.ok(expected.every(f=>research.facts.some(x=>x.id===f.id)),`Dropped exception for ${source.id}`);
  }
 }
});
test('held-out travel cases retrieve their required map anchors',async()=>{
 const cases=JSON.parse(await readFile(new URL('../data/travel-eval.json',import.meta.url),'utf8'));
 for(const c of cases){
  const ids=mapCandidates(c.question).map(p=>p.id);
  for(const id of c.places||[])assert.ok(ids.includes(id),`${c.id} missing ${id}`);
 }
});
test('rainy dinosaur recommendation can retrieve a museum absent from the question',()=>{
 const question='A rainy afternoon with children who love dinosaurs';
 assert.ok(mapCandidates(question).some(p=>p.name==='Natural History Museum'));
});
test('source freshness checks the selected evidence and rejects future timestamps',()=>{
 const now=Date.now(),source={id:'sample',retrieved_at:new Date(now-1000).toISOString()};
 assert.equal(researchFresh({sources:[source]},now),true);
 assert.equal(researchFresh({sources:[{...source,retrieved_at:new Date(now-8*86400000).toISOString()}]},now),false);
 assert.equal(researchFresh({sources:[{...source,retrieved_at:new Date(now+1000).toISOString()}]},now),false);
});
test('reviewed interchange corrections follow the station and question, not every travel request',()=>{
 assert.ok(retrieveResearch('Can I transfer entirely underground at Bank?').reviewed_examples.some(e=>e.station==='Bank'));
 assert.ok(retrieveResearch('Can I change Northern to Victoria at Euston?').reviewed_examples.some(e=>e.station==='Euston'));
 assert.equal(retrieveResearch('Is there a lift from Bank Northern to the street?').reviewed_examples.length,0);
 assert.equal(retrieveResearch('Can I visit a dinosaur museum?').reviewed_examples.length,0);
});
