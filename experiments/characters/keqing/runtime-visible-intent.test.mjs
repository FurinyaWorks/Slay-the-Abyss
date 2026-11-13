import{buildUiTheme}from'../../../scripts/build-ui-theme.mjs';
import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{visibleIntentProbe}from'./runtime-visible-intent.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('intent exports reject unknown or sparse semantics',()=>{for(const id of ['KQ041','KQ058'])for(const f of[c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>delete c.effects.base[1],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);f(d[id]);assert.throws(()=>visibleIntentProbe(id,{definitions:d}),/unsupported/);}});
test('real public intent view drives branch and hidden faces reject without payment',()=>{
 buildLuaData();buildUiTheme();const p=fullStarterProbe(),defs=[p.definition,...['KQ041','KQ058'].map(id=>visibleIntentProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-intent-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-visible-intent');local C=require('abyss_combat');local D=require('abyss_data');local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function fresh(id,up,attacking)
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies={'jaw_worm'},seed=1});local e=s.enemies[1];e.hp=100;e.maxHp=100;e.block=0
 local found=false;for i,v in ipairs(e.intents)do if (attacking and v.kind=='attack')or(not attacking and v.kind=='buff')then e.intentIndex=i;found=true;break end end;assert(found,'fixture lacks real move');return s
end
for _,id in ipairs({'KQ041','KQ058'})do for _,up in ipairs({false,true})do for _,attacking in ipairs({false,true})do for inf=0,2 do
 local s=fresh(id,up,attacking);s.keqingResourceProbe.infusion=inf;local before=C.copy(s);local visible=assert(A.visibleDamage(s,1));eq(visible>0,attacking);same(s,before)
 local a=assert(A.play(s,s.hand[1].uid,1));local bonus=inf>0 and 2 or 0;local first=id=='KQ041'and(up and 7 or 4)or(up and 8 or 5);local extra=id=='KQ058'and not attacking and(4+bonus)or 0
 eq(a.enemies[1].hp,100-first-bonus-extra);eq(a.player.block,id=='KQ041'and attacking and 5 or 0);eq(a.energy,2);eq(a.keqingResourceProbe.infusion,math.max(0,inf-1));same(s,before);same(a.catalog.cards[id],s.catalog.cards[id])
 s.energy=0;before=C.copy(s);local no,why=A.play(s,s.hand[1].uid,1);eq(no,nil);eq(why,'insufficient_energy');same(s,before)
end end end end
-- A real renderer unknownEffect row mixed with a buff cannot mean zero.
local mixed=fresh('KQ058',false,false);local move=mixed.enemies[1].intents[mixed.enemies[1].intentIndex];move.effects[#move.effects+1]={op='unsupportedIntentFixture',value=1};local mixedBefore=C.copy(mixed)
local rejected,mixedReason=A.play(mixed,mixed.hand[1].uid,1);eq(rejected,nil);eq(mixedReason,'intent_projection_unsupported');same(mixed,mixedBefore)
-- Real acquired Runic Dome must avoid the private intent query entirely.
local Run=require('abyss_run');local run=Run.new(D,'1');assert(Run.obtainRelic(run,'runic_dome'));assert(Run.startCombat(run,'cultist_solo'))
local query=C.intent;C.intent=function()error('hidden intent queried')end
local hidden,reason=A.visibleDamage(run.combat,1);C.intent=query;eq(hidden,nil);eq(reason,'intent_hidden')
-- Unsupported projected faces are rejection fixtures, not real encounters.
local View=require('abyss_battle_intent_view');local old=View.intentView
for _,face in ipairs({{hidden=true},{kind='buff',value='',rows={{icon='unknown'}}},{kind='defend',value='',rows={{icon='block'},{icon='unknown'}}},{kind='attack',worldDamage=3,worldTimes=1,rows={{icon='attack'},{icon='unknown'}}},{kind='buff',value='',rows={}},{kind='unknown',value='?'},{kind='attack',worldDamage=0,worldTimes=2,rows={{icon='attack'}}},{kind='attack',worldDamage=0,worldTimes=1,rows={{icon='attack'},{icon='attack'}}}})do
 local s=fresh('KQ058',false,false);local before=C.copy(s);View.intentView=function()return face end
 local no,why=A.play(s,s.hand[1].uid,1);eq(no,nil);eq(why,face.hidden and'intent_hidden'or'intent_projection_unsupported');same(s,before)
end
View.intentView=old
print('VISIBLE_INTENT_PASS 24 real view cases')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/VISIBLE_INTENT_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
