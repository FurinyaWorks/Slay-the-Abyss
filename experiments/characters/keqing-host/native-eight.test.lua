package.path='experiments/characters/keqing-host/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local N=require('native-eight');local F=require('abyss_keqing_starter_run')
-- Independent literal expectations; no simulator-derived oracle.
local spec={
 KQ005={cost=2,base=11,up=15,hits=3,all=true},KQ009={cost=1,base=3,up=5,hits=1,block=4,upBlock=6},
 KQ019={cost=2,base=12,up=16,hits=4},KQ034={cost=2,base=0,up=0,hits=0,block=13,upBlock=17},
 KQ052={cost=1,base=6,up=9,hits=1,all=true},KQ053={cost=2,base=16,up=20,hits=1},
 KQ054={cost=1,base=6,up=9,hits=3},KQ055={cost=1,base=9,up=12,hits=1,exhaust=true}}
local original=C.copy(D)
local function data()
 local d=C.copy(D);for _,v in ipairs(N.definitions().cards)do d.cards.cards[#d.cards.cards+1]=v end;return d
end
local count=0
for id,v in pairs(spec)do for _,up in ipairs({false,true})do for inf=0,2 do
 local s=C.new(data(),{deck={{cardId=id,upgraded=up},'defend','defend','defend'},enemies={'jaw_worm','jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=s.turn+1
 local c;for _,x in ipairs(s.hand)do if x.cardId==id then c=x end end
 assert(C.play(s,c.uid,1));eq(s.energy,3-v.cost)
 local damage=(up and v.up or v.base)+(inf>0 and 2*v.hits or 0)
 eq(s.enemies[1].hp,100-damage);eq(s.enemies[2].hp,100-(v.all and damage or 0))
 eq(s.player.block,up and(v.upBlock or 0)or(v.block or 0))
 eq(s.keqingResource.infusion,v.hits>0 and math.max(0,inf-1)or inf);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.keqingResource.relicUsed,false)
 eq(s[v.exhaust and'exhaust'or'discard'][#s[v.exhaust and'exhaust'or'discard']],c)
 local state=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,state);count=count+1
end end end;eq(count,48)
-- Real Run.obtainCard and unmodified subsequent shuffle; explicit acquisition, not natural reward pool.
for id,v in pairs(spec)do for _,up in ipairs({false,true})do
 local r=F.new(D,42);for _,d in ipairs(N.definitions().cards)do r.data.cards.cards[#r.data.cards.cards+1]=d end
 assert(R.obtainCard(r,id,{upgraded=up}));local owner=r.deck[#r.deck];eq(#r.deck,11)
 assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local used=false
 for turn=1,5 do
  while r.phase=='combat'and s.energy>0 and #s.hand>0 do
   local chosen=s.hand[1];for _,c in ipairs(s.hand)do if c.deckUid==owner.uid then chosen=c;break end end
   local cost=C.cardDefinition(s,chosen).cost
   if cost>s.energy then break end
   assert(R.play(r,chosen.uid,1))
   if chosen.deckUid==owner.uid then eq(chosen.cardId,id);eq(chosen.upgraded,up);used=true;break end
  end
  if used then break end
  assert(r.phase=='combat');assert(R.endTurn(r))
 end
 assert(used);local seen,n={},0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(pile)do assert(not seen[c.deckUid]);seen[c.deckUid]=true;n=n+1 end end;eq(n,11);assert(seen[owner.uid])
end end
-- Real native terminal paths, not post-return wrapper semantics.
local terminal=0
for id,v in pairs(spec)do if v.hits>0 then for _,up in ipairs({false,true})do for _,death in ipairs({false,true})do
 local s=C.new(data(),{deck={{cardId=id,upgraded=up},'defend','defend','defend'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 s.keqingResource.infusion=2;s.keqingResource.wedgeUntil=s.turn+1
 local c;for _,x in ipairs(s.hand)do if x.cardId==id then c=x end end
 if death then s.player.hp=1;s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].statuses.thorns=10 else s.enemies[1].hp=1 end
 assert(C.play(s,c.uid,1));eq(C.outcome(s),death and'defeat'or'victory');eq(s.energy,3-v.cost)
 eq(s.keqingResource.infusion,death and 2 or 1);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.keqingResource.relicUsed,false)
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before);terminal=terminal+1
end end end end;eq(terminal,28)
-- Independent returned definitions cannot mutate the reusable source.
local defs=N.definitions();defs.cards[1].effects[1].value=999;assert(N.definitions().cards[1].effects[1].value~=999)
same(D,original)
print('KQ_NATIVE_EIGHT_PUBLIC_48_RUN16_TERMINAL28_PASS')
