import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCandidates,researchFor} from '../src/core.mjs';

test('gallery comparison supplies the documented Trafalgar Square area anchor',()=>{
 const q='Compare the National Gallery and Tate Modern and show both on the map.';
 const candidates=mapCandidates(q);
 const square=candidates.find(p=>p.aliases.includes('Trafalgar Square'));
 assert.ok(square,'A primary-name-only lookup lost the square alias');
 assert.equal(square.name,"Nelson's Column");
 assert.ok(candidates.some(p=>p.name==='Tate Modern'));
 assert.ok(researchFor(q).facts.filter(f=>f.source_ids.includes('national-gallery')).every(f=>f.place_ids.includes(square.id)));
});

test('Borough Market arrival advice supplies a London Bridge station anchor',()=>{
 const candidates=mapCandidates('Which station is beside Borough Market?');
 assert.ok(candidates.some(p=>p.name==='London Bridge'&&p.kind===5));
 assert.ok(candidates.some(p=>p.name==='Borough Market'));
});
