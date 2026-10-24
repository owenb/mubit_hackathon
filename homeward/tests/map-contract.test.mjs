import test from 'node:test';
import assert from 'node:assert/strict';
import {candidatesFor,validateScene,resolvedScene,contextFor,catalog} from '../src/map-contract.mjs';
import {cacheKey} from '../src/core.mjs';

test('place candidates distinguish Canary Wharf stations and preserve multiple destinations',()=>{
 const c=candidatesFor('Show Bank and Waterloo');assert(c.some(p=>p.id==='station:bank'));assert(c.some(p=>p.id==='station:waterloo'));
 const wharf=candidatesFor('Canary Wharf Jubilee');assert.equal(wharf[0].id,'station:canary-wharf-jubilee');assert(wharf.some(p=>p.id==='station:canary-wharf-elizabeth'));
});
test('unknown or adversarial model place IDs never become coordinates',()=>{
 const c=candidatesFor('Bank');
 for(const id of ['station:waterloo','javascript:alert(1)','https://example.com','station:invented'])assert.throws(()=>validateScene({camera:'focus',places:[{id,role:'context'}]},c));
 assert.throws(()=>validateScene({camera:'focus',places:[]},c));
});
test('duplicate pins and invented roles are rejected atomically',()=>{
 const c=candidatesFor('Bank');const p={id:'station:bank',role:'context'};
 assert.throws(()=>validateScene({camera:'fit',places:[p,p]},c));
 assert.throws(()=>validateScene({camera:'focus',places:[{...p,role:'accessible_entrance'}]},c));
});
test('follow-up context is bounded and participates in the answer cache',()=>{
 const ids=contextFor(['station:bank']);assert(candidatesFor('closer please',ids).some(p=>p.id==='station:bank'));
 assert.notEqual(cacheKey('closer','grounded',['station:bank']),cacheKey('closer','grounded',['station:waterloo']));
 assert.throws(()=>contextFor(['made-up']));
});
test('coordinates come from the pinned database, never the model',()=>{
 const scene={camera:'focus',places:[{id:'station:bank',role:'context',east:999999}]};validateScene(scene,candidatesFor('Bank'));
 const p=resolvedScene(scene).places[0];assert.notEqual(p.east,999999);assert.equal(p.lat,51.51310430205415);
 assert.equal(catalog.database_sha256,'b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719');
});
