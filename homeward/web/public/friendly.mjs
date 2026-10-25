// Plain-language messages for failures people can actually hit. Shared by the server and the browser.
// Messages written for people (validation, flow guidance) pass through unchanged; raw service and
// network errors are replaced, and callers keep the original as technical detail.
const rules=[
 [/^(?:401|403)\b|authenticat|unauthori[sz]ed|invalid api key/i,'London Guide’s AI service turned the request away just now. Please try again in a few minutes.'],
 [/^429\b|rate limit|too many requests|quota/i,'Lots of questions at once. Wait a few seconds, then try again.'],
 [/^5\d\d\b|bad gateway|service unavailable|gateway time|overloaded|engine timeout/i,'Mubit, the service that runs our AI, didn’t answer just now. Please try again in a minute.'],
 [/timed? ?out|timeout|ETIMEDOUT|aborted/i,'That took too long, so we stopped waiting. Please try again.'],
 [/^Connection error|fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up/i,'London Guide couldn’t reach its AI service. Please try again in a minute.'],
 [/Failed to fetch|NetworkError|Load failed|error sending request|network ?error|Could not connect/i,'Can’t reach London Guide. Check your connection and try again.'],
 [/error decoding response body|Unexpected end of JSON|<!DOCTYPE|not valid JSON/i,'London Guide didn’t respond properly. Please try again in a minute.'],
 [/Set MUBIT_API_KEY|inference key is required|Add a Mubit inference key|teaching key is not configured/i,'This copy of London Guide isn’t connected to Mubit yet, so it can’t ask the AI.'],
 [/not positively identified as Luna/i,'We couldn’t confirm which model answered, so we didn’t use the reply. Please try again.'],
 [/needs revalidation/i,'The saved sources for this need re-checking before London Guide can answer from them.'],
 [/Invalid structured response|Incomplete model answer|Citation not supplied|invented source provenance|contradicts its response kind|Unexpected token|violates the strict answer contract|Invalid audit|audit did not complete|answer was incomplete|reply was incomplete|Missing Mubit request receipt|recording receipt missing|No Mubit receipt/i,'The AI’s reply didn’t pass our checks, so we didn’t use it. Please try again.'],
];
export function friendlyMessage(raw){
 const text=String(raw??'').trim();
 if(!text)return 'Something went wrong. Please try again.';
 for(const [pattern,message] of rules)if(pattern.test(text))return message;
 return text;
}
// True when the message was replaced, so the original is worth showing as technical detail.
export const isTechnical=raw=>friendlyMessage(raw)!==String(raw??'').trim();
