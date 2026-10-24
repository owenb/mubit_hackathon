import {writeFile} from 'node:fs/promises';
import {packet,validate,taskHash,instructions,schema} from './contract.mjs';
const bank='station:bank',nhm='osm:2026-10-12:18306',science='osm:2026-10-12:20531',va='osm:2026-10-12:180927';
const groups=[
 {name:'payment-device',facts:['tfl-payment-1','tfl-payment-2','tfl-payment-3'],selected:['tfl-payment-2'],questions:[
 'I tapped into the Tube with my phone. Can I touch out using my watch on the same bank account?',
 'For one rail journey, may I enter with my plastic bank card and leave with its phone wallet version?',
 'My bank card and smart watch share an account. Do they count as the same contactless payment device?',
 'Which device should I use to leave the station if I entered with my phone?',
 'Can I change contactless devices halfway through a single rail journey without changing my payment identity?']},
 {name:'payment-touch',facts:['tfl-payment-1','tfl-payment-2','tfl-payment-3'],selected:['tfl-payment-1'],questions:[
 'Do I touch out when leaving a London bus?',
 'On a London tram, should I tap both before and after my ride?',
 'The rail station gates are open. Must I still touch in and touch out?',
 'How does touching on a bus differ from touching on the Tube?',
 'Do buses and trams require the same touch-in and touch-out pattern as trains?']},
 {name:'bank-interchange',facts:['bank','bank-entrance','bank-wc','waterloo'],selected:['bank-wc'],places:[bank],questions:[
 'At Bank, can my step-free interchange from Waterloo & City to DLR remain wholly indoors?',
 'What street section is involved in the step-free Bank change from Waterloo & City to the Northern line?',
 'Which entrance and operating days apply to the Waterloo & City lifts at Bank?',
 'I am already at Bank on Waterloo & City. Does the lift route to DLR involve going outside?',
 'For my wheelchair interchange at Bank from Waterloo & City to Northern, how long is the street section?']},
 {name:'bank-line',facts:['bank','bank-entrance','bank-wc','waterloo'],selected:['bank'],places:[bank],questions:[
 'Does Bank have a street-to-platform lift route for the Central line?',
 'Can I get from street level to Bank Northern line platforms using lifts?',
 'Does Bank DLR have street-to-platform step-free access?',
 'Are all lines at Bank equally step-free from the street?',
 'Compare Bank Central line street access with Bank Northern and DLR.']},
 {name:'museum-booking',facts:['science-museum-1','natural-history-1','va-museum-1'],selected:['science-museum-1'],places:[science],questions:[
 'Does free general admission at the Science Museum mean I do not need to pre-book?',
 'What should I book for the Science Museum if I only want free general admission?',
 'The Science Museum costs nothing to enter generally. Is reserving a free ticket still requested?',
 'Can I infer from free Science Museum entry that every exhibition is free?',
 'What are the Science Museum general-entry booking and separately ticketed experience rules?']},
 {name:'museum-fashion',facts:['va-museum-1','va-museum-3','natural-history-1'],selected:['va-museum-1','va-museum-3'],places:[va],questions:[
 'I want to visit the V&A Fashion Gallery during October 2026. Is free general entry enough to make that visit possible?',
 'Can I see the V&A Fashion Gallery in 2027, and does general admission require booking?',
 'Is the free V&A South Kensington general-admission policy a reason to promise access to its Fashion Gallery in November 2026?',
 'Before I plan a V&A fashion visit in 2026, explain general booking and the Fashion Gallery closure.',
 'I want free V&A entry in early 2028 specifically for the Fashion Gallery. What exception matters?']},
 {name:'night',facts:['tfl-night-1','tfl-night-2','tfl-night-lines-1'],selected:['tfl-night-1','tfl-night-2'],questions:[
 'On a Tuesday night, can I depend on Night Tube, and can I hail a minicab without booking?',
 'For Wednesday overnight travel, does Night Tube run and how must private hire be booked?',
 'Is Night Tube a Monday-night option, and can an unbooked private-hire driver take a street hail?',
 'What should I know about Night Tube on Thursday and booking a minicab?',
 'Compare Friday/Saturday Night Tube availability with a Tuesday night, and explain black taxi versus private hire booking.']},
 {name:'live-lifts',facts:['bank','bank-wc','waterloo'],selected:[],places:[bank],kind:'live_check',questions:[
 'Are the lifts at Bank working right now?',
 'Can you check whether Bank station has any broken lifts today?',
 'Is the Bank Northern line street lift operational at this moment?',
 'Please check current lift outages at Bank before I travel.',
 'Does Bank have a lift disruption right now?']}
];
const names={[bank]:'Bank station',[nhm]:'Natural History Museum',[science]:'Science Museum',[va]:'V&A South Kensington'};
const rows=groups.flatMap(g=>g.questions.map((question,i)=>({id:`decision-train-${g.name}-${i+1}`,family:g.name,question,
 input_facts:g.facts,input_places:[...new Set([...(g.places||[]),...(g.name==='bank-interchange'||g.name==='bank-line'?['station:waterloo']:[]),...(g.name.startsWith('museum')?[nhm,science,va]:[])])],place_names:{...names,'station:waterloo':'Waterloo station'},
 expected:{kind:g.kind||'answer',fact_ids:g.selected,place_ids:g.places||[]}})));
for(const row of rows)validate(row.expected,packet(row));
await writeFile(new URL('./curriculum.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
await writeFile(new URL('./manifest.json',import.meta.url),JSON.stringify({status:'prepared_not_submitted',task_hash:taskHash,training_examples:rows.length,families:groups.map(g=>g.name),instructions,schema,
 app_integration:false,existing_adapter_version_2:false,existing_task_unchanged:true,final_heldout_questions_loaded:0,
 note:'A narrower successor task, not a v2 claim or a replacement benchmark. Manual expected plans are audit rubrics only; Mubit would record actual Luna responses, not these expectations. Training acceptance and first-version timing are unconfirmed.'},null,2)+'\n');
console.log(JSON.stringify({prepared:rows.length,task_hash:taskHash,max_user_message_bytes:Math.max(...rows.map(r=>Buffer.byteLength(JSON.stringify(packet(r))))),network_calls:0}));
