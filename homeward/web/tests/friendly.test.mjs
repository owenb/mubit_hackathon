import {test} from 'node:test';
import assert from 'node:assert/strict';
import {friendlyMessage,isTechnical} from '../public/friendly.mjs';
import {createWebApp} from '../app.mjs';

const raw=['503 The gateway could not check this key just now.','502 Bad Gateway','401 Invalid API key','429 Too many requests','Connection error.','Request timed out.','fetch failed',
 'Failed to fetch','error sending request for url (http://localhost:3000/api/ask)','error decoding response body','Invalid structured response','Incomplete model answer: length',
 'Citation not supplied for this question','Set MUBIT_API_KEY in the existing .env','Audit answer was not positively identified as Luna','Relevant research needs revalidation before a model call'];

test('raw service, network and model-output errors become plain messages',()=>{
  for(const text of raw){const message=friendlyMessage(text);assert.notEqual(message,text,text);assert.ok(isTechnical(text));assert.doesNotMatch(message,/\b\d{3}\b|fetch|JSON|MUBIT_API_KEY|Luna/,text);}
  assert.match(friendlyMessage('503 The gateway could not check this key just now.'),/Mubit.*try again in a minute/);
  assert.match(friendlyMessage('Failed to fetch'),/Can’t reach London Guide/);
});

test('messages already written for people pass through, and mapping is stable',()=>{
  for(const text of ['Please ask a question of 1–2000 characters','Review the correction before teaching','Select one of the verified company offices.','This correction already has an attempt; it will not be resent.'])
   {assert.equal(friendlyMessage(text),text);assert.equal(isTechnical(text),false);}
  for(const text of raw)assert.equal(friendlyMessage(friendlyMessage(text)),friendlyMessage(text));
  assert.equal(friendlyMessage(''),'Something went wrong. Please try again.');
});

test('a failed model call returns a plain error with the original as detail',async()=>{
  const app=createWebApp({askFn:async()=>{throw Error('503 The gateway could not check this key just now.');}});
  const r=await app.request('https://homeward.example/api/ask',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://homeward.example',Host:'homeward.example'},body:JSON.stringify({question:'Is Bank step-free?'})});
  const body=await r.json();
  assert.equal(r.status,400);assert.match(body.error,/^Mubit, the service that runs our AI/);assert.equal(body.detail,'503 The gateway could not check this key just now.');
});
