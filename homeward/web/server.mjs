import { serve } from '@hono/node-server';
import { createWebApp } from './app.mjs';
const server=serve({fetch:createWebApp().fetch,port:Number(process.env.PORT||3000),hostname:'0.0.0.0'},info=>console.log(`London Guide: http://localhost:${info.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
