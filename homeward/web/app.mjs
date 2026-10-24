import { Hono } from 'hono';
import {enterpriseRoutes} from '../src/enterprise-routes.mjs';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import { ask, knowledge, redact, inferenceMetrics, currentTrainingStatus } from '../src/core.mjs';
import { evaluationReport, demoEvidence } from '../src/demo-evidence.mjs';
import {getCookie,setCookie} from 'hono/cookie';
import {randomUUID} from 'node:crypto';
import {createFeedbackStore,searchPlaces} from '../src/feedback.mjs';
import {readFile} from 'node:fs/promises';

const defaultRoot=fileURLToPath(new URL('./dist/',import.meta.url));
export function createWebApp({root=defaultRoot,askFn=ask,trainingFn=currentTrainingStatus,feedback=createFeedbackStore({training:trainingFn})}={}) {
  const app=new Hono();
  app.use('*',async(c,next)=>{
    c.header('X-Content-Type-Options','nosniff');
    c.header('Referrer-Policy','same-origin');
    c.header('Cross-Origin-Resource-Policy','same-origin');
    await next();
  });
  const health=c=>c.json({status:'ok',app:'homeward-webgpu',knowledge_version:knowledge.version,scope:knowledge.scope});
  app.use('/api/*',async(c,next)=>{
    let session=getCookie(c,'homeward_session');
    if(!/^[a-f0-9-]{36}$/.test(session||'')){session=randomUUID();setCookie(c,'homeward_session',session,{httpOnly:true,sameSite:'Strict',secure:c.req.url.startsWith('https:'),path:'/',maxAge:86400});}
    c.set('session',session);await next();
  });
  const jsonRequest=async c=>{
    if(c.req.header('content-type')?.split(';')[0]!=='application/json')throw Error('Send JSON');
    const origin=c.req.header('origin');if(origin){const u=new URL(origin);if(!['http:','https:'].includes(u.protocol)||u.host!==c.req.header('host'))throw Error('Use the London Travel page');}
    return c.req.json();
  };
  enterpriseRoutes(app);
  app.get('/api/places',c=>c.json({places:searchPlaces(c.req.query('q'))}));
  app.get('/api/learning',async c=>{c.header('Cache-Control','no-store');return c.json({corrections:await feedback.list(c.get('session'))});});
  app.get('/api/learning/interactions/:id',async c=>{c.header('Cache-Control','no-store');try{return c.json(await feedback.getInteraction(c.req.param('id'),c.get('session')));}catch(e){return c.json({error:redact(e.message)},404);}});
  app.use('/api/learning/*',bodyLimit({maxSize:16_000,onError:c=>c.json({error:'Correction is too large'},413)}));
  app.post('/api/learning/replay',async c=>{try{await jsonRequest(c);return c.json(await feedback.replay(c.get('session')));}catch(e){return c.json({error:redact(e.message)},400);}});
  app.post('/api/learning/corrections',async c=>{c.header('Cache-Control','no-store');try{return c.json(await feedback.save(c.get('session'),await jsonRequest(c)),201);}catch(e){return c.json({error:redact(e.message)},400);}});
  app.get('/api/learning/corrections/:id',async c=>{c.header('Cache-Control','no-store');try{return c.json(await feedback.get(c.get('session'),c.req.param('id')));}catch(e){return c.json({error:redact(e.message)},404);}});
  for(const action of ['preview','teach'])app.post('/api/learning/corrections/:id/'+action,async c=>{c.header('Cache-Control','no-store');try{const body=await jsonRequest(c);return c.json(action==='preview'?await feedback.preview(c.get('session'),c.req.param('id')):await feedback.submit(c.get('session'),c.req.param('id'),body));}catch(e){return c.json({error:redact(e.message)},400);}});
  app.get('/health',health);app.get('/api/health',health);
  app.get('/api/metrics',async c=>{c.header('Cache-Control','no-store');return c.json({inference:inferenceMetrics(),training_status:await trainingFn()});});
  for(const path of ['/api/evals','/evals'])app.get(path,async c=>{c.header('Cache-Control','no-store');return c.json(await evaluationReport());});
  for(const path of ['/api/demo-evidence','/demo-evidence'])app.get(path,async c=>{c.header('Cache-Control','no-store');return c.json(await demoEvidence());});
  app.use('/api/ask',bodyLimit({maxSize:10_000,onError:c=>c.json({error:'Question is too large'},413)}));
  app.post('/api/ask',async c=>{
    c.header('Cache-Control','no-store');
    if(c.req.header('content-type')?.split(';')[0]!=='application/json')return c.json({error:'Send a JSON question'},415);
    const origin=c.req.header('origin');
    if(origin){
      let valid=false;try{const u=new URL(origin);valid=['https:','http:'].includes(u.protocol)&&u.host===c.req.header('host');}catch{}
      if(!valid)return c.json({error:'Use the London Travel page to ask a question'},403);
    }
    try{
      const {question,mode='grounded',context_ids=[],use_cache=false}=await c.req.json();
      if(typeof question!=='string'||!question.trim()||question.length>2000)return c.json({error:'Please ask a question of 1–2000 characters'},400);
      if(!['grounded','memory'].includes(mode)||!Array.isArray(context_ids)||context_ids.length>6||context_ids.some(v=>typeof v!=='string'))return c.json({error:'Invalid question context'},400);
      const options={mode,context_ids,use_cache:use_cache===true};
      return c.json(feedback.record(c.get('session'),question,options,await askFn(question,options)));
    }catch(e){return c.json({error:redact(e.message)},400);}
  });
  // Explicit packed assets carry their actual byte length. The browser's loader
  // counts compressed bytes itself, so HTTP decoding cannot distort progress.
  app.all('/api/*',c=>c.json({error:'Unknown endpoint'},404));
  // The editable shell changes independently of the immutable map/engine. Serve
  // it without date-based 304s, which can retain an old correction UI after a
  // rebuild or when a deployment's file timestamps move backwards.
  for(const [path,type] of [['/','text/html'],['/index.html','text/html'],['/style.css','text/css'],['/loader.mjs','text/javascript'],['/worker.mjs','text/javascript'],['/evaluation.mjs','text/javascript'],['/corrections.mjs','text/javascript'],['/experience.mjs','text/javascript'],['/correction-state.mjs','text/javascript'],['/ui.mjs','text/javascript'],['/appearance.mjs','text/javascript'],['/appearance-state.mjs','text/javascript'],['/enterprise.mjs','text/javascript'],['/enterprise-gpu.mjs','text/javascript'],['/enterprise-state.mjs','text/javascript'],['/enterprise.css','text/css'],['/enterprise-city.wgsl','text/plain'],['/city-composite.wgsl','text/plain'],['/map-ask.mjs','text/javascript'],['/map-ask.wgsl','text/plain'],['/intro.mjs','text/javascript'],['/intro.css','text/css']])app.get(path,async c=>{
    c.header('Cache-Control','no-store');c.header('Content-Type',type+'; charset=utf-8');
    return c.body(await readFile(root+(path==='/'?'index.html':path.slice(1))));
  });
  app.use('/assets/*',async(c,next)=>{await next();if(c.res.status===200)c.header('Cache-Control','public,max-age=31536000,immutable');});
  app.use('/assets/*',serveStatic({root,precompressed:false}));
  app.all('/assets/*',c=>c.notFound());
  app.use('*',serveStatic({root,precompressed:true}));
  app.get('*',serveStatic({path:root+'index.html'}));
  app.onError((error,c)=>c.json({error:redact(error.message)},500));
  return app;
}
