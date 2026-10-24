// A gateway receipt proves transport through Mubit, not adapter inference.
// Provider-specific headers plus its completion model are positive provider evidence.
export function describeInference(answer, { cache = false } = {}) {
  const headers = answer.response_headers || {};
  const pendingIdentityHeaders=Object.keys(headers).filter(name=>/^x-(middleware|mubit)-/.test(name)&&/model|adapter|served|serving|route|deployment/.test(name));
  const provider = pendingIdentityHeaders.length===0 && answer.completion_model === 'gpt-6-luna'
    && /^req_/.test(answer.provider_request_id || headers['x-request-id'] || '')
    && Number.isFinite(Number(headers['openai-processing-ms']))
    && headers['openai-processing-ms'] !== undefined;
  const route = provider ? 'luna' : 'unverified';
  const evidence = ['Mubit gateway receipt: '+(answer.request_id || 'not available')];
  if(pendingIdentityHeaders.length)evidence.push('New gateway identity headers retained; semantics await verification: '+pendingIdentityHeaders.join(', '));
  if (provider) evidence.push('Completion model gpt-6-luna', 'OpenAI request ID and processing-time response headers');
  else evidence.push('No verified serving-model signal; the requested model alone is insufficient');
  return {
    route: cache ? 'cache' : route,
    label: cache ? 'Saved answer' : provider ? 'Luna via Mubit' : 'Route unverified',
    detail: cache ? 'No model call on this request. Original response: '+route+'.'
      : provider ? 'OpenAI provider response received through Mubit. Luna is the configured upstream; this is not evidence of an adapter answer.'
      : 'Sent to Mubit with Luna as the upstream. The gateway did not identify the serving model.',
    requested_model: answer.requested_model || 'gpt-6-luna',
    response_model: answer.completion_model || null,
    request_id: cache ? null : answer.request_id || null,
    original_request_id: cache ? answer.request_id || null : null,
    recording: cache ? 'none' : answer.recording || 'unknown',
    adapter_id: null, uninterpreted_identity_headers:pendingIdentityHeaders, evidence, ...(cache ? {original_route:route} : {}),
  };
}

export function routeMetrics(history) {
  const calls=history.filter(r=>r.route!=='cache');
  const count=route=>history.filter(r=>r.route===route).length;
  return {requests:history.length,model_calls:calls.length,luna:count('luna'),mubit_adapter:count('mubit_adapter'),unverified:count('unverified'),cache:count('cache'),
    window:'last '+history.length+' recorded app attempts',
    median_latency_ms:calls.length?[...calls].sort((a,b)=>a.latency_ms-b.latency_ms)[Math.floor(calls.length/2)].latency_ms:null};
}
