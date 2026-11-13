package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Combat=require('abyss_combat')
local Copy=require('abyss_copy').copy
local data=require('abyss_data')
local defs=dofile('experiments/characters/ganyu-lua/definitions.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local bundle=Copy(data)
for _,c in ipairs(defs.cards)do bundle.cards.cards[#bundle.cards.cards+1]=c end
local function state(id,up)
 local s=Combat.new(bundle,{deck={id,'defend','defend','defend','defend','defend','defend','defend','defend','defend'},enemies={'jaw_worm'},seed=42})
 -- Fixture selects a real existing instance from either pile, no fake UID/card.
 local found
 for i,c in ipairs(s.hand)do if c.cardId==id then found=c;table.remove(s.hand,i);break end end
 if not found then for i,c in ipairs(s.draw)do if c.cardId==id then found=c;table.remove(s.draw,i);break end end end
 for _,c in ipairs(s.hand)do s.draw[#s.draw+1]=c end;s.hand={found};found.upgraded=up
 s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
 return s,found.uid
end
for _,up in ipairs({false,true})do
 local s,u=state('ganyu_lab_01',up);s.enemies[1].block=2
 assert(Combat.play(s,u,1));eq(s.energy,2);eq(s.enemies[1].hp,up and 93 or 96);eq(#s.discard,1)
 s,u=state('ganyu_lab_02',up);assert(Combat.play(s,u));eq(s.player.block,up and 8 or 5);eq(s.energy,2)
 s,u=state('ganyu_lab_22',up);assert(Combat.play(s,u,1));eq(s.enemies[1].hp,up and 94 or 96);eq(#s.hand,1);eq(#s.discard,1)
 s,u=state('ganyu_lab_24',up);assert(Combat.play(s,u));eq(#s.hand,up and 4 or 3);eq(#s.exhaust,1);eq(#s.discard,0)
 s,u=state('ganyu_lab_01',up);local seed=s.seed;local ok=Combat.play(s,u,99);eq(ok,false);eq(s.energy,3);eq(#s.hand,1);eq(s.seed,seed)
 s.energy=0;ok=Combat.play(s,u,1);eq(ok,false);eq(#s.hand,1);eq(s.enemies[1].hp,100)
 -- Native terminal queue intentionally clears draw after killing last enemy.
 s,u=state('ganyu_lab_22',up);s.enemies[1].hp=1;assert(Combat.play(s,u,1));eq(#s.hand,0)
end
for _,c in ipairs(data.cards.cards)do assert(not c.id:match('ganyu_lab'))end
eq(#defs.cards,4);eq(#defs.unmapped,71)
print('PASS 14 base/upgrade native-queue cases; original registration untouched')
