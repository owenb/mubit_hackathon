import {createMubitFetch, inferenceHeaders} from './mubit-telemetry.mjs';
import OpenAI from 'openai';
import {describeInference} from './inference.mjs';
import {collectEvaluation,saveEvaluation} from './evaluation.mjs';
import {pathToFileURL} from 'node:url';

export async function gatewayCall(body){
 if(!process.env.MUBIT_API_KEY?.trim().startsWith('mbt_'))throw Error('A Mubit inference key is required');
 const client=new OpenAI({ fetch: createMubitFetch({source:'evaluation-gateway'}),apiKey:process.env.MUBIT_API_KEY,baseURL:'https://api.mubit.ai/openai/v1',maxRetries:0,timeout:60000});
 const start=performance.now();
 const {data,response}=await client.chat.completions.create(body,{headers:{'x-middleware-record':'metadata'}}).withResponse();
 const headers=inferenceHeaders(response.headers);
 const telemetry={requested_model:body.model,completion_model:data.model,request_id:response.headers.get('x-middleware-request-id'),provider_request_id:response.headers.get('x-request-id'),response_headers:headers,recording:'metadata'};
 return {output:data.choices[0]?.message?.content||'',finish_reason:data.choices[0]?.finish_reason,latency_ms:Math.round(performance.now()-start),usage:data.usage,inference:describeInference(telemetry),response_headers:headers};
}
// Until a documented way to select/identify the adapter exists, this can only
// pass the canary gate if the actual response is attributable to that adapter.
// No invented model ID, header, or assertion overrides the observed route.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const run=await collectEvaluation({callers:{mubit_adapter:gatewayCall,luna:gatewayCall},checkpoint:saveEvaluation});console.log(JSON.stringify(run.summary));if(run.error)process.exitCode=1;}
 catch(error){console.error(error.message);process.exitCode=1;}
}
