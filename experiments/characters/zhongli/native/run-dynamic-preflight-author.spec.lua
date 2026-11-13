-- Pending shared fix; not a runtime gate implementation.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Run=require('abyss_run')
local function fresh()local r=Run.new(D,37,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}});r.floor=4;return r end
local function reject(r,encounter)
 local before=C.copy(r);local refs={r.deck,r.data,r.candidateLifecycle,r.miscRng};local new=C.new;local called=false
 C.new=function(...)called=true;return new(...)end
 local passed,ok,why=pcall(Run.startCombat,r,encounter);C.new=new
 assert(passed and ok==false and (why=='unsupported_zhongli_encounter'or why=='unsupported_zhongli_dynamic_encounter'));assert(not called,'rejection happened after Combat.new')
 same(r,before);eq(r.deck,refs[1]);eq(r.data,refs[2]);eq(r.candidateLifecycle,refs[3]);eq(r.miscRng,refs[4])
end
for _,id in ipairs({'large_acid','large_spike','louse_pair','small_slimes'})do reject(fresh(),id)end
local function aliasEnemy(r,kind)
 local source;for _,e in ipairs(r.data.enemies.enemies)do if e.id=='cultist'then source=e end end
 local d=C.copy(source);d.id='author_dynamic_'..kind;r.data.enemies.enemies[#r.data.enemies.enemies+1]=d
 local encounter={id=d.id,minFloor=1,maxFloor=14,tier='normal',enemies={d.id}};r.data.enemies.encounters[#r.data.enemies.encounters+1]=encounter
 return d,encounter.id
end
for _,op in ipairs({'enemyRally','enemyTorchSpawn','enemyTorchRevive','enemyBronzeSpawn','reptomancerSummon'})do
 local r=fresh();local d,id=aliasEnemy(r,op)
 -- Late declared move, not the current opening move. A name-only/opening-only check misses it.
 d.intents[#d.intents+1]={id='author_later_spawn',kind='buff',effects={{op=op,value=2}}};reject(r,id)
end
for _,field in ipairs({'splitEnemy','splitEnemies'})do
 local r=fresh();local d,id=aliasEnemy(r,field);d.ai.splitCount=2;d.ai[field]=field=='splitEnemy'and'cultist'or{'cultist','cultist'};reject(r,id)
end
for _,id in ipairs({'cultist_solo','jaw_solo'})do local r=fresh();assert(Run.startCombat(r,id))end
print('AUTHOR_ZL_DYNAMIC_PREFLIGHT_PASS 11 actual/catalog-variant rejects before Combat.new plus2 safe encounter controls')
