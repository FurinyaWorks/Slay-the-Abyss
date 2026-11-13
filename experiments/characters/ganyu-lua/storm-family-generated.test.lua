package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local X=require('abyss_exhaust')
local M=dofile('experiments/characters/ganyu-lua/storm-card.lua');local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local defs=dofile('experiments/characters/ganyu-lua/storm-family-definitions.lua').cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local s=C.new(d,{deck={def.id,def.id,def.id},enemies={'jaw_worm'},seed=42});local c=s.hand[1];c.upgraded=up
 if def.selfRetain then assert(C.endTurn(s));local present=false;for _,x in ipairs(s.hand)do if x==c then present=true end end;assert(present);eq(s.ganyuResource,nil)end
 for i,x in ipairs(s.hand)do if x==c then table.remove(s.hand,i);break end end
 s.cardInUse=c;s.pendingPlay={uid=c.uid};s.ganyuResource={charge=1};s.enemies[1].hp=100;s.enemies[1].block=0
 local card=C.cardDefinition(s,c);local e=M.prepare(C,s,card.effects[1],c.uid)
 local actions={{kind='effect',effect=e}};if card.exhaust then actions[#actions+1]={kind='useCard'}end
 Q.start(s,actions);assert(Q.run(s,{effect=function(st,a,q)return M.dispatch(C,st,a.effect,q)end,useCard=function(st,a,q)return X.move(st,st.cardInUse,'using',q)end}))
 eq(s.enemies[1].hp,100);eq(s.ganyuResource.charge,1)
 if card.exhaust then eq(s.exhaust[#s.exhaust],c)end
 local amount=card.effects[1].amount;local duration=card.effects[1].turns
 for turn=1,duration do
  local bank=R.bankBeforeDiscard(s.ganyuResource,turn,0,false);local tick=R.stormAfterDiscard(bank.after,turn);s.ganyuResource=tick.after;E.apply(C,s,tick.afterDiscard,s.player,nil)
  eq(s.enemies[1].hp,100-amount*turn)
 end
 eq(s.ganyuResource.storm,nil)
end end
print('PASS6 generated storm-family isolated setup/ticks, native retention/exhaust; no public payment')
