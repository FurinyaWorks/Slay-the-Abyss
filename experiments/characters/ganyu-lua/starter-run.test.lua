-- PENDING catalog admission. Execute against an exact shared host; do not bypass constructor.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Run=require('abyss_run')
local F=dofile(assert(GANYU_STARTER_FACTORY,'factory path required'));local spec=dofile(assert(GANYU_STARTER_SPEC,'spec path required'))
local before=C.copy(D);local r=F.new(D,42,spec)
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
same(D,before);eq(r.hp,60);eq(r.maxHp,60);eq(#r.deck,10);eq(#r.relics,0);eq(r.candidateLifecycle.relicEnabled,true)
local counts={};local ids={};for _,c in ipairs(r.deck)do assert(not ids[c.uid]);ids[c.uid]=true;counts[c.cardId]=(counts[c.cardId]or 0)+1 end
same(counts,{ganyu_lab_01=4,ganyu_lab_02=4,ganyu_lab_03=1,ganyu_lab_04=1})
assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.characterCandidate,'ganyu');eq(r.combat.player.hp,60);eq(r.combat.energy,3);eq(#r.combat.hand,5);eq(r.combat.ganyuRelicEnabled,true)
assert(Run.endTurn(r));eq(r.combat.ganyuResource.charge,2)
print('STARTER_RUN_PASS source deck/HP/no BurningBlood/real start and bank; virtual equipment, not natural pool')
