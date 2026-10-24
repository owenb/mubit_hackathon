import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import { ask, knowledge, redact, inferenceMetrics, currentTrainingStatus } from '../src/core.mjs';
import { evaluationReport, demoEvidence } from '../src/demo-evidence.mjs';

const defaultRoot=fileURLToPath(new URL('./dist/',import.meta.url));
export function createWebApp({root=defaultRoot,askFn=ask,trainingFn=currentTrainingStatus}={}) {
  const app=new Hono();
  app.use('*',async(c,next)=>{
    c.header('X-Content-Type-Options','nosniff');
    c.header('Referrer-Policy','same-origin');
    c.header('Cross-Origin-Resource-Policy','same-origin');
    await next();
  });
  const health=c=>c.json({status:'ok',app:'homeward-webgpu',knowledge_version:knowledge.version,scope:knowledge.scope});
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
      if(!valid)return c.json({error:'Use the Homeward page to ask a question'},403);
    }
    try{
      const {question,mode='grounded',context_ids=[],use_cache=false}=await c.req.json();
      if(typeof question!=='string'||!question.trim()||question.length>2000)return c.json({error:'Please ask a question of 1–2000 characters'},400);
      if(!['grounded','memory'].includes(mode)||!Array.isArray(context_ids)||context_ids.length>6||context_ids.some(v=>typeof v!=='string'))return c.json({error:'Invalid question context'},400);
      return c.json(await askFn(question,{mode,context_ids,use_cache:use_cache===true}));
    }catch(e){return c.json({error:redact(e.message)},400);}
  });
  // Explicit packed assets carry their actual byte length. The browser's loader
  // counts compressed bytes itself, so HTTP decoding cannot distort progress.
  app.all('/api/*',c=>c.json({error:'Unknown endpoint'},404));
  app.use('/assets/*',async(c,next)=>{await next();if(c.res.status===200)c.header('Cache-Control','public,max-age=31536000,immutable');});
  app.use('/assets/*',serveStatic({root,precompressed:false}));
  app.all('/assets/*',c=>c.notFound());
  app.use('*',serveStatic({root,precompressed:true}));
  app.get('*',serveStatic({path:root+'index.html'}));
  app.onError((error,c)=>c.json({error:redact(error.message)},500));
  return app;
}
