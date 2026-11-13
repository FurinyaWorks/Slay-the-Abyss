import {readFileSync,writeFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../cards.json',import.meta.url),'utf8'));
const lua=v=>v===null?'nil':typeof v==='boolean'||typeof v==='number'?String(v):typeof v==='string'?JSON.stringify(v):Array.isArray(v)?'{'+v.map(lua).join(',')+'}':'{'+Object.entries(v).map(([k,x])=>'['+lua(k)+']='+lua(x)).join(',')+'}';
const projection={version:catalog.version,cards:catalog.cards.slice(0,16).map(({id,cost,kind,exhaust,base,upgrade})=>({id,cost,kind,exhaust,base,upgrade})),maskRules:catalog.maskRules,startingRelic:catalog.startingRelic};
writeFileSync(new URL('./abyss_xiao_core_data.lua',import.meta.url),'-- Generated from cards.json by generate-core.mjs. Candidate data only.\nreturn '+lua(projection)+'\n');
