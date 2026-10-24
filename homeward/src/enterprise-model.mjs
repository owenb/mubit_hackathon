import OpenAI from 'openai';
import {instructions,schema,responseName,generation,validate,taskHash} from '../experiments/enterprise-prospecting/contract.mjs';
import {createMubitFetch,inferenceHeaders} from './mubit-telemetry.mjs';
import {describeInference} from './inference.mjs';
export {taskHash};
export async function enterpriseModel(input,{recording='metadata',source='enterprise-lens',apiKey=process.env.ENTERPRISE_MUBIT_API_KEY||process.env.BANK_DEMO_MUBIT_API_KEY}={}){
 if(!apiKey)throw Error('Enterprise teaching key is not configured on this server.');
 const client=new OpenAI({apiKey,baseURL:'https://api.mubit.ai/openai/v1',fetch:createMubitFetch({source}),maxRetries:0,timeout:60000});
 const started=performance.now();
 const {data,response}=await client.chat.completions.create({...generation,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_schema',json_schema:{name:responseName,strict:true,schema}}},{headers:{'x-middleware-record':recording}}).withResponse();
 const receipt={requested_model:generation.model,completion_model:data.model,request_id:response.headers.get('x-middleware-request-id'),provider_request_id:response.headers.get('x-request-id'),response_headers:inferenceHeaders(response.headers),recording};
 const result={output:null,raw:data.choices[0]?.message?.content,finish_reason:data.choices[0]?.finish_reason,usage:data.usage,...receipt,inference:describeInference(receipt),elapsed_ms:Math.round(performance.now()-started),task_hash:taskHash};
 if(result.finish_reason!=='stop')throw Error('Enterprise answer was incomplete. No automatic retry was made.');
 result.output=validate(JSON.parse(result.raw),input);return result;
}
