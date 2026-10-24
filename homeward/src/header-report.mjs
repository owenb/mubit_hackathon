// Local journal inspection only: no network requests and no prompt/answer data.
import {readFile,readdir} from 'node:fs/promises';
const directory=new URL('../results/mubit-headers/',import.meta.url);
let files=[];try{files=await readdir(directory);}catch(error){if(error.code!=='ENOENT')throw error;}
const rows=[];let malformed=0;
for(const file of files.filter(n=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(n)).sort()){
 for(const line of (await readFile(new URL(file,directory),'utf8')).split('\n').filter(Boolean)){
  try{rows.push(JSON.parse(line));}catch{malformed++;}
 }
}
console.log(JSON.stringify({attempts:rows.length,malformed_records:malformed,
 header_names:[...new Set(rows.flatMap(r=>r.response_header_names||[]))].sort(),
 latest:rows.slice(-10).map(r=>({at:r.at,source:r.source,status:r.status,outcome:r.outcome,request_id:r.request_id,
  recording_requested:r.recording_requested,
  identity_header_candidates:Object.fromEntries((r.identity_header_candidates||[]).map(n=>[n,r.response_headers[n]]))})),
 note:'Candidates are observed header names, not verified adapter/model identity. No prompt or answer bodies are recorded.'},null,2));
