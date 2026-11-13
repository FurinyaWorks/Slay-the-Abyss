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
eq(#defs.cards,22);eq(#defs.unmapped,53)
print('PASS 14 base/upgrade native-queue cases; original registration untouched')

for _,up in ipairs({false,true})do
 local s,u=state('ganyu_lab_04',up);local enemy=s.enemies[1];enemy.block=2
 assert(Combat.play(s,u));eq(s.player.block,up and 8 or 6);eq(enemy.hp,up and 98 or 99);eq(s.energy,2)
 s,u=state('ganyu_lab_08',up);assert(Combat.play(s,u));eq(s.player.block,up and 8 or 5);eq(#s.hand,1)
 s,u=state('ganyu_lab_21',up);assert(Combat.play(s,u));eq(s.enemies[1].hp,up and 86 or 90);eq(s.energy,1)
 s,u=state('ganyu_lab_55',up);s.energy=0;assert(Combat.play(s,u));eq(s.player.block,up and 3 or 1);eq(#s.hand,1);eq(#s.exhaust,1);eq(s.energy,0)
end
print('PASS 8 additional base/upgrade AOE/defense-draw/free-exhaust native cases')

-- Independent literal expectations: id, cost, base/up damage, block, draw, exhaust.
local cases={
 {'07',1,0,0,0,0,2,3,false},{'11',0,0,0,3,5,0,0,false},
 {'12',1,4,6,3,4,0,0,false},{'13',2,0,0,14,18,0,0,false},
 {'15',2,14,18,0,0,0,0,false},{'57',2,6,9,0,0,1,1,false},
 {'61',3,8,11,12,16,0,0,false},{'63',2,0,0,8,11,2,2,true},
 {'73',1,4,6,0,0,2,2,true},
}
for _,c in ipairs(cases)do for _,up in ipairs({false,true})do
 local s,u=state('ganyu_lab_'..c[1],up);assert(Combat.play(s,u,1))
 eq(s.energy,3-c[2]);eq(s.enemies[1].hp,100-c[up and 4 or 3]);eq(s.player.block,c[up and 6 or 5]);eq(#s.hand,c[up and 8 or 7]);eq(#s.exhaust,c[9]and 1 or 0);eq(#s.discard,c[9]and 0 or 1)
 eq(#s.hand+#s.draw+#s.discard+#s.exhaust,10)
end end
print('PASS 18 further base/upgrade normal effect, energy and pile-conservation cases')

local retained={{'26',1,0,0,6,9,0,0,false},{'28',2,16,20,0,0,0,0,true},{'54',2,0,0,0,0,3,4,false},{'62',1,7,10,0,0,0,0,false},{'65',2,0,0,10,14,0,0,false}}
for _,c in ipairs(retained)do for _,up in ipairs({false,true})do
 local s,u=state('ganyu_lab_'..c[1],up);local initialBlock=s.player.block
 assert(Combat.endTurn(s));local found=false;for _,card in ipairs(s.hand)do if card.uid==u then found=true end end;assert(found,'selfRetain UID missing')
 eq(s.player.block,initialBlock) -- retaining never grants printed block
 local priorDraw=#s.draw;local priorHand=#s.hand;local enemyHp=s.enemies[1].hp
 assert(Combat.play(s,u,1));eq(s.energy,3-c[2]);eq(s.enemies[1].hp,enemyHp-c[up and 4 or 3]);eq(s.player.block,c[up and 6 or 5]);
 eq(#s.hand,priorHand-1+c[up and 8 or 7]);eq(#s.exhaust,c[9]and 1 or 0)
 local inHand=false;for _,card in ipairs(s.hand)do if card.uid==u then inHand=true end end;assert(not inHand,'played retain card stayed in hand')
 eq(#s.hand+#s.draw+#s.discard+#s.exhaust,10)
end end
print('PASS 10 base/upgrade retained UID endTurn-to-play lifecycle cases')
