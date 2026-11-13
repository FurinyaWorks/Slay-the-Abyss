import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {stressOne} from './draft-stress.mjs';
const root=new URL('./evidence/draft-stress/',import.meta.url);
const rows=readdirSync(root).filter(x=>x.endsWith('.jsonl')).flatMap(f=>readFileSync(new URL(f,root),'utf8').trim().split('\n').map(x=>JSON.parse(x)));
test('held-out stress records all preregistered denominators and carried HP, no hidden heal',()=>{
 assert.equal(rows.length,576);assert.equal(new Set(rows.map(r=>[r.seed,r.policy,r.draft].join('/'))).size,576);
 for(const r of rows){assert.ok(r.seed>=10001&&r.seed<=10064);assert.equal(r.rejected,0);assert.equal(r.truncated,false);assert.equal(r.fights[0].startHp,70);for(let i=0;i<r.fights.length;i++){const f=r.fights[i];assert.equal(f.lost,f.startHp-f.endHp);if(i)assert.equal(f.startHp,r.fights[i-1].endHp);assert.ok(Object.keys(f.plays).every(id=>f.seen.includes(id)));}assert.ok(r.choices.every(c=>c.selected===null||c.offer.includes(c.selected)));}
});
test('fixed first seed replay for each policy/reward group exactly matches evidence',()=>{
 for(const r of rows.filter(x=>x.seed===10001))assert.deepEqual(stressOne(r.seed,r.policy,r.draft),r);
});
