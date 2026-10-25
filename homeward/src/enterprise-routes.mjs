import {friendlyMessage} from '../web/public/friendly.mjs';
import {bodyLimit} from 'hono/body-limit';
import {createEnterpriseService} from './enterprise-service.mjs';
export function enterpriseRoutes(app,{service=createEnterpriseService()}={}){
 app.use('/api/enterprise/*',bodyLimit({maxSize:16_000,onError:c=>c.json({error:'Enterprise request is too large'},413)}));
 const json=async c=>{if(c.req.header('content-type')?.split(';')[0]!=='application/json')throw Error('Send JSON');const origin=c.req.header('origin');if(origin&&new URL(origin).host!==c.req.header('host'))throw Error('Use the enterprise page');return c.req.json();};
 const route=fn=>async c=>{c.header('Cache-Control','no-store');try{return c.json(await fn(c));}catch(e){const raw=String(e.message).replace(/\b(?:mbt_|sk-)[\w-]+/g,'[REDACTED]'),error=friendlyMessage(raw);if(error!==raw)console.error('[london-guide]',c.req.method,c.req.path,raw);return c.json(error===raw?{error}:{error,detail:raw},400);}};
 app.get('/api/enterprise/companies',route(()=>service.companies()));
 app.get('/api/enterprise/status',route(()=>service.status()));
 app.post('/api/enterprise/assess',route(async c=>service.assess(c.get('session'),await json(c))));
 app.post('/api/enterprise/corrections',route(async c=>service.save(c.get('session'),await json(c))));
 app.get('/api/enterprise/corrections/:id',route(c=>service.get(c.get('session'),c.req.param('id'))));
 app.post('/api/enterprise/corrections/:id/teach',route(async c=>{await json(c);return service.teach(c.get('session'),c.req.param('id'));}));
}
