const pinsOf=value=>(value?.scene?.places||[]).map(({id,name,role})=>({id,name:name||id,role:role||'context'}));
export function draftFrom(interaction){return {interaction,answer:interaction.result.answer,pins:pinsOf(interaction.result),response_kind:interaction.result.response_kind,static_access:interaction.result.static_access,note:'',reason:'wrong_place'};}
export function changed(draft){
 const before=draft.interaction.result;
 return draft.answer.trim()!==before.answer.trim()||JSON.stringify(draft.pins.map(({id,role})=>({id,role})))!==JSON.stringify(pinsOf(before).map(({id,role})=>({id,role})))||draft.response_kind!==before.response_kind||draft.static_access!==before.static_access;
}
export function sceneFor(draft){return {camera:draft.pins.length>1?'fit':draft.pins.length?'focus':'keep',places:draft.pins.map(({id,role})=>({id,role}))};}
export function previewFor(draft){return {...draft.interaction.result,question:draft.interaction.question,answer:draft.answer,scene:sceneFor(draft),inference:{route:'operator_preview',label:'Your edit · preview',detail:'Your unsaved edit. No model call or training.'},model_calls_this_request:0};}
export function correctionBody(draft,scope){
 if(!changed(draft))throw Error('Change a place or the answer first.');
 if(!draft.answer.trim())throw Error('Keep an answer, even if you are only changing places.');
 if(scope==='reusable'&&!draft.note.trim())throw Error('Add a short reason before sending.');
 const original=pinsOf(draft.interaction.result),old=new Set(original.map(p=>p.id)),next=new Set(draft.pins.map(p=>p.id));
 const removed=original.filter(p=>!next.has(p.id)).map(p=>p.name),added=draft.pins.filter(p=>!old.has(p.id)).map(p=>p.name);
 const edits=[removed.length?'Removed '+removed.join(', '):'',added.length?'Added '+added.join(', '):'',draft.answer.trim()!==draft.interaction.result.answer.trim()?'Edited answer':''].filter(Boolean).join('. ');
 return {interaction_id:draft.interaction.interaction_id,answer:draft.answer,scene:sceneFor(draft),response_kind:draft.response_kind,static_access:draft.static_access,reason:draft.reason,note:draft.note.trim()||'Personal edit: '+(edits||'updated answer labels'),scope};
}
export function correctionStatus(row){
 if(row.scope==='trip')return 'Saved for your map';
 if(row.status==='needs_review'&&row.teaching?.audit?.accepted===true&&row.teaching?.receipt&&row.teaching?.matched===false)return 'Audit passed · sent to Mubit · reply needs review';
 if(row.error||row.status==='needs_review'||row.teaching?.audit?.accepted===false)return 'Needs review · not learned';
 const review=row.stages?.mubit_review?.state;
 if(review==='rejected')return 'Not accepted for training';
 if(review==='kept')return 'Example accepted · model update unverified';
 if(review==='rated_good')return 'Marked good · model update unverified';
 if(row.teaching?.receipt)return 'Sent for review · not learned yet';
 return 'Saved · not sent for training';
}
