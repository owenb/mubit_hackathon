export const HISTORY_KEY='london-travel-appearance-v1';
const valid=v=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=3);
export function restoreAppearance(text){try{const s=JSON.parse(text);if(!Array.isArray(s.entries)||!s.entries.length||s.entries.length>64||!s.entries.every(valid)||!Number.isInteger(s.index)||s.index<0||s.index>=s.entries.length)throw Error();return {entries:s.entries,index:s.index};}catch{return {entries:[null],index:0};}}
export function selectedAppearance(s){return s.entries[s.index];}
export function keepAppearance(s,value){if(!valid(value))throw Error('Invalid appearance');if(selectedAppearance(s)===value)return s;const entries=[...s.entries.slice(0,s.index+1),value].slice(-64);return {entries,index:entries.length-1};}
export function undoAppearance(s){return s.index?{entries:s.entries,index:s.index-1}:s;}
