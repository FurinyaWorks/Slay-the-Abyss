-- Verified on exact663a294 candidate host; uses legal pre-constructor candidate color, never post-injection.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Run=require('abyss_run')
local F=require('abyss_ganyu_starter_run');local spec=require('abyss_ganyu_starter_source')
local before=C.copy(D);local r=F.new(D,42,spec)
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
same(D,before);eq(r.hp,60);eq(r.maxHp,60);eq(#r.deck,10);eq(#r.relics,0);eq(r.candidateLifecycle.relicEnabled,true)
local counts={};local ids={};for _,c in ipairs(r.deck)do assert(not ids[c.uid]);ids[c.uid]=true;counts[c.cardId]=(counts[c.cardId]or 0)+1 end
same(counts,{ganyu_lab_01=4,ganyu_lab_02=4,ganyu_lab_03=1,ganyu_lab_04=1})
assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.characterCandidate,'ganyu');eq(r.combat.player.hp,60);eq(r.combat.energy,3);eq(#r.combat.hand,5);eq(r.combat.ganyuRelicEnabled,true)
assert(Run.endTurn(r));eq(r.combat.ganyuResource.charge,2)
print('STARTER_RUN_PASS source deck/HP/no BurningBlood/real start and bank; virtual equipment, not natural pool')
local count=0
for _,id in ipairs({'01','02','03','04'})do
 local run=F.new(D,42,spec);assert(Run.startCombat(run,'cultist_solo'));local s=run.combat
 if id=='03'then assert(Run.endTurn(run));eq(s.ganyuResource.charge,2)end
 local c;for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,v in ipairs(pile)do if v.cardId=='ganyu_lab_'..id then c=table.remove(pile,i);break end end;if c then break end end;assert(c)
 if #s.hand==10 then s.draw[#s.draw+1]=table.remove(s.hand)end;s.hand[#s.hand+1]=c
 s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
 local def=C.cardDefinition(s,c);eq(def.color,'ganyu_candidate');eq(def.sourceId,'ganyu-'..id);eq(def.ganyuSourceSHA256,spec.sourceSHA256)
 local energy=s.energy;assert(Run.play(run,c.uid,1));eq(s.energy,energy-1)
 eq(s.enemies[1].hp,id=='01'and 94 or id=='03'and 87 or id=='04'and 97 or 100)
 eq(s.player.block,id=='02'and 5 or id=='04'and 6 or 0)
 if id=='03'then eq(s.ganyuResource.charge,0)end
 local found=false;for _,v in ipairs(s.discard)do if v==c then found=true end end;assert(found)
 local beforeRun=C.copy(run);eq(Run.play(run,c.uid,1),false);same(run,beforeRun);count=count+1
end
-- No inherited Burning Blood victory heal in this starter.
local victory=F.new(D,42,spec);assert(Run.startCombat(victory,'cultist_solo'));victory.combat.player.hp=33
for _,enemy in ipairs(victory.combat.enemies)do C.damage(victory.combat,victory.combat.player,enemy,999,true)end
assert(Run.finishCombat(victory));eq(victory.hp,33)
-- Input bundle/source and independently constructed Runs never share editable cards/decks.
same(D,before);local second=F.new(D,43,spec);assert(second.data~=r.data);assert(second.deck~=r.deck);second.deck[1].upgraded=true;eq(r.deck[1].upgraded,false)
print('STARTER_PLAY_PASS '..count..' real Run.play initial kinds with actual bank-funded shot + source identity/no inherited heal/input isolation/rejections; hand placement fixtures')
-- Actual next encounter preserves the source deck/HP while rebuilding resources.
local carriedUid=victory.deck[1].uid;victory.combat.ganyuResource.charge=2;victory.combat.ganyuResource.storm={amount=9,turns=2}
assert(Run.leaveCombatRewards(victory));assert(Run.startCombat(victory,'cultist_solo'))
eq(victory.hp,33);eq(victory.combat.player.hp,33);eq(victory.combat.ganyuResource.charge,0);eq(victory.combat.ganyuResource.storm,nil);eq(victory.deck[1].uid,carriedUid);eq(#victory.relics,0)
-- The formal catalogue still has precisely 75 source cards per original color.
local formal=Run.new(D,42);eq(formal.maxHp,80);eq(formal.deck[1].cardId,'strike');eq(formal.relics[1],'burning_blood')
for _,color in ipairs({'red','green','blue','purple'})do
 local n=0;for _,card in ipairs(victory.data.cards.cards)do if card.color==color and card.type~='status'and card.type~='curse'and card.rarity~='special'then n=n+1 end end;eq(n,75)
end
local sourceBefore=C.copy(spec);local dataBefore=C.copy(D);local New=Run.new;local reached=false
Run.new=function(...)local created=New(...);reached=true;created.data.cards.cards[1].name='injected constructor failure';error('after real starter Run creation')end
eq(pcall(F.new,D,42),false);Run.new=New;assert(reached);same(D,dataBefore);same(spec,sourceBefore);local retry=F.new(D,42);eq(retry.maxHp,60)
print('GANYU_STARTER_LAUNCHER_PASS cross-battle/private-source/formal-catalog/constructor-failure')
