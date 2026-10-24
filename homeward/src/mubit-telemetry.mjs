import {mkdir,open} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const defaultDirectory=new URL('../results/mubit-headers/',import.meta.url);
const sensitiveName=/authorization|cookie|token|api[-_]?key|secret|credential|password|signature|location/i;
export function safeResponseHeaders(headers,{secrets=[]}={}){
 const hidden=[process.env.MUBIT_API_KEY,process.env.OPENAI_API_KEY,...secrets].filter(Boolean);
 return Object.fromEntries([...new Headers(headers)].map(([name,value])=>{
  if(sensitiveName.test(name))return [name,'[REDACTED]'];
  for(const secret of hidden)value=value.replaceAll(secret,'[REDACTED]');
  return [name,value.replace(/\b(?:mbt_|sk-)[\w-]+/g,'[REDACTED]').replace(/\bBearer\s+\S+/gi,'Bearer [REDACTED]')];
 }));
}
// Safe diagnostic subset for existing answer/receipt records. The complete
// redacted header set stays in the private journal, not a public API response.
export function inferenceHeaders(headers){
 return Object.fromEntries(Object.entries(safeResponseHeaders(headers)).filter(([name,value])=>value!=='[REDACTED]' &&
  (/^x-(middleware|mubit)-/.test(name)||['x-request-id','openai-model','openai-processing-ms'].includes(name))));
}
export async function appendHeaderRecord(record,directory=defaultDirectory){
 await mkdir(directory,{recursive:true,mode:0o700});
 const file=await open(new URL(record.at.slice(0,10)+'.jsonl',directory),'a',0o600);
 try{await file.chmod(0o600);await file.writeFile(JSON.stringify(record)+'\n');}finally{await file.close();}
}

// Observe each HTTP attempt before SDK parsing, including errors and streams.
// Never consume bodies, change routing, add retries, or log prompts/answers.
export function createMubitFetch({source='homeward',fetcher=globalThis.fetch,write=appendHeaderRecord,onLogError=()=>console.error('Homeward: Mubit header journal could not be written; inspect local storage.')}={}){
 return async(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  if(url.protocol!=='https:'||url.hostname!=='api.mubit.ai')return fetcher(input,init);
  const started=performance.now();
  const requestHeaders=new Headers(init?.headers||input?.headers);
  const authorization=requestHeaders.get('authorization')||'';
  const secrets=[authorization,authorization.replace(/^Bearer\s+/i,'')].filter(Boolean);
  const record={schema_version:1,id:randomUUID(),at:new Date().toISOString(),source,
   method:init?.method||input?.method||'GET',path:url.pathname,
   recording_requested:requestHeaders.get('x-middleware-record')||'default',
   status:null,request_id:null,response_headers:{},response_header_names:[],identity_header_candidates:[]};
  const save=async()=>{try{await write(record);}catch{try{onLogError();}catch{/* Logging must never duplicate a paid call. */}}};
  let response;
  try{response=await fetcher(input,init);}catch(error){
   record.outcome='network_error';record.headers_received=false;
   record.elapsed_to_headers_ms=Math.round(performance.now()-started);
   await save();throw error;
  }
  record.outcome=response.ok?'http_success':'http_error';record.headers_received=true;
  record.status=response.status;record.elapsed_to_headers_ms=Math.round(performance.now()-started);
  record.response_headers=safeResponseHeaders(response.headers,{secrets});
  record.response_header_names=Object.keys(record.response_headers);
  record.request_id=record.response_headers['x-middleware-request-id']||null;
  // Discovery only: names/values do not establish undocumented semantics.
  record.identity_header_candidates=record.response_header_names.filter(name=>/model|adapter|version|serv(?:ed|ing)|route|deployment/i.test(name));
  await save();return response;
 };
}
