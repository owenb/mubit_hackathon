export const HISTORY_KEY='london-travel-appearance-v1';
const valid=v=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=3);
export function restoreAppearance(text){try{const s=JSON.parse(text);if(!Array.isArray(s.entries)||!s.entries.length||s.entries.length>64||!s.entries.every(valid)||!Number.isInteger(s.index)||s.index<0||s.index>=s.entries.length)throw Error();return {entries:s.entries,index:s.index};}catch{return {entries:[null],index:0};}}
export function selectedAppearance(s){return s.entries[s.index];}
export function keepAppearance(s,value){if(!valid(value))throw Error('Invalid appearance');if(selectedAppearance(s)===value)return s;const entries=[...s.entries.slice(0,s.index+1),value].slice(-64);return {entries,index:entries.length-1};}
export function undoAppearance(s){return s.index?{entries:s.entries,index:s.index-1}:s;}

// Aether's arc: deep at the bottom, night left, day top, clean right.
export const dialAngle=value=>Math.PI*(1+0.5*Math.max(0,Math.min(3,value)));
export function dialValue(x,y){const a=((Math.atan2(x,-y)-Math.PI+Math.PI*2)%(Math.PI*2))/(Math.PI/2);return a<=3?a:a<3.5?3:0;}
export function turnDial(value,from,to){const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));return Math.max(0,Math.min(3,value+delta/(Math.PI/2)));}
