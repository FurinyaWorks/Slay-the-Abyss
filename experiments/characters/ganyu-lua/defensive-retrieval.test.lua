package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local X=require('abyss_exhaust')
local M=dofile('experiments/characters/ganyu-lua/retrieval-card.lua')
local defs=dofile('experiments/characters/ganyu-lua/defensive-retrieval-definitions.lua').cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,mode)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_03',name='arrow fixture',type='attack',cost=1,target='ENEMY',rarity='common',effects={{op='damage',value=7}}}
 local deck={};for i=1,20 do deck[i]='strike'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=41})
 local card=table.remove(s.hand,1);card.cardId=def.id;card.upgraded=up;s.cardInUse=card;s.pendingPlay={uid=card.uid,cardType='skill'}
 local target=s.draw[2];target.cardId=def.exhaust and'defend'or'ganyu_lab_03';target.upgraded=up
 if mode=='missing'then target.cardId='strike' elseif mode=='full'then C.draw(s,6);target=s.draw[2];target.cardId=def.exhaust and'defend'or'ganyu_lab_03';target.upgraded=up end
 s.player.noDraw=true;s.player.statuses.dexterity=2
 s.player.statuses.feel_no_pain=3;s.exhaustPowerOrder={'feel_no_pain'}
 return s,card,target,C.cardDefinition(s,card)
end
local function run(s,card,fault)
 local retrieval=M.prepare(C,s,card.effects[2],s.cardInUse.uid)
 local shield=card.effects[1].value+2
 local actions={{kind='effect',effect=card.effects[1]},{kind='effect',effect=retrieval}}
 if card.exhaust then actions[#actions+1]={kind='useCard'}end
 Q.start(s,actions)
 return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuRetrieve'then eq(st.player.block,shield);local ok=M.dispatch(C,st,a.effect,q);if fault=='retrieve'then error('after retrieval')end;return ok end
  E.apply(C,st,{a.effect},st.player,nil);return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after exhaust')end;return ok end})
end
local count=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for _,mode in ipairs({'normal','missing','full'})do
 local s,c,target,card=fresh(def,up,mode);local hand=#s.hand;local draw=#s.draw;local seed=s.seed
 assert(run(s,card));eq(s.player.block,(def.exhaust and 2 or up and 7 or 4)+2+(def.exhaust and 3 or 0))
 eq(#s.hand,hand+(mode=='normal'and 1 or 0));eq(#s.draw,draw-(mode=='normal'and 1 or 0));eq(s.seed,seed)
 if mode=='normal'then eq(s.hand[#s.hand],target);eq(target.upgraded,up)elseif mode=='full'then eq(s.draw[2],target);eq(target.upgraded,up)end
 if def.exhaust then eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil)else eq(s.cardInUse,c)end
 count=count+1
end
 for _,fault in ipairs(def.exhaust and{'retrieve','exhaust'}or{'retrieve'})do
 local s,c,target,card=fresh(def,up,'normal');local before=C.copy(s);local hand=s.hand;local draw=s.draw;local restore=S.capture(s)
 s.energy=s.energy-card.cost;assert(not pcall(run,s,card,fault));restore();same(s,before);eq(s.hand,hand);eq(s.draw,draw);eq(s.cardInUse,c);eq(s.draw[2],target)
 assert(run(s,card));eq(s.hand[#s.hand],target)
 end
end end
print('PASS '..count..' compound shield-before-retrieval variants/full/missing/NoDraw +6 post-move Snapshot rollback/retry; manual payment/use context')
-- Retain is exercised by the ordinary real endTurn lifecycle without casting the card.
for _,up in ipairs({false,true})do
 local def=defs[2];local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local s=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm'},seed=41})
 local c;for _,v in ipairs(s.hand)do if v.cardId==def.id then c=v end end;assert(c);c.upgraded=up
 assert(C.endTurn(s));local found=false;for _,v in ipairs(s.hand)do if v==c then found=true end end;assert(found);eq(c.upgraded,up);eq(s.player.block,0)
end
print('PASS2 actual unplayed68 endTurn retains original UID without automatic shield/retrieval; no public compound C.play')
