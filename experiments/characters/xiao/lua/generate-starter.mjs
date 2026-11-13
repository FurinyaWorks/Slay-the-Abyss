import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const raw=readFileSync(new URL('../cards.json',import.meta.url),'utf8'),c=JSON.parse(raw);
const lua=v=>typeof v==='string'?JSON.stringify(v):typeof v==='number'||typeof v==='boolean'?String(v):Array.isArray(v)?'{'+v.map(lua).join(',')+'}':'{'+Object.entries(v).map(([k,x])=>'['+lua(k)+']='+lua(x)).join(',')+'}';
const manifest={sourceSha256:createHash('sha256').update(raw).digest('hex'),version:c.version,maxHp:c.maxHp,starter:c.starter,startingRelic:c.startingRelic,cards:c.cards.slice(0,8).map(({id,rarity})=>({id,rarity}))};
writeFileSync(new URL('./abyss_xiao_starter_data.lua',import.meta.url),'-- Generated from cards.json, candidate provenance not official-source approval.\nreturn '+lua(manifest)+'\n');
