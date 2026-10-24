// Retrieval-only tags, duplicate policy text and matched aliases are not needed
// by inference. Preserve every fact, exception, source, candidate ID and line.
export function compactPayload(payload){
 return {...payload,map_candidates:payload.map_candidates.map(({aliases,...p})=>p),research:payload.research?{
  version:payload.research.version,
  facts:payload.research.facts.map(({tags,...f})=>f),
  reviewed_examples:payload.research.reviewed_examples,
  sources:payload.research.sources,
 }:null};
}
