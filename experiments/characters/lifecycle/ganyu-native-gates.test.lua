package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Native=require('abyss_ganyu_native_cards');local defs=Native.definitions();local Actions=require('abyss_card_actions')
local function fresh(id,up,active)
 local d=C.copy(D);for _,c in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=C.copy(c)end
 local s=C.new(d,{deck={{cardId=id,upgraded=up},'defend','defend','defend','defend','defend','defend','defend'},enemies={'jaw_worm'},seed=42,candidateLifecycle=active~=false and{kind='ganyu',relicEnabled=false}or nil})
 local c;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==id then c=table.remove(pile,i);break end end end
 for i=#s.hand,1,-1 do s.draw[#s.draw+1]=table.remove(s.hand,i)end;s.hand[1]=c;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 return s,c
end
for _,def in ipairs(defs.cards)do for _,up in ipairs({false,true})do
 local s,c=fresh(def.id,up);local resource=C.copy(s.ganyuResource)
 table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1,exhaustCards=def.exhaust});Actions.drain(C,s);eq(s.energy,3);same(s.ganyuResource,resource);eq(s.pendingPlay,nil)
 local found=false;for _,v in ipairs(def.exhaust and s.exhaust or s.discard)do if v==c then found=true end end;assert(found,'original auto UID disposition')
 s,c=fresh(def.id,up,false);local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end
for _,mode in ipairs({'unmarked','wrongMarker','native','extra','face','retain','exhaust','type','target'})do
 local s,c=fresh('ganyu_lab_01',false);local d=s.catalog.cards[c.cardId]
 if mode=='unmarked'then d.ganyuCandidate=nil;d.ganyuNativeCandidate=nil elseif mode=='wrongMarker'then d.ganyuNativeCandidate=false
 elseif mode=='native'then d.silentFinalCard=true elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='face'then d.effects[1].value=9
 elseif mode=='retain'then d.selfRetain=true elseif mode=='exhaust'then d.exhaust=true elseif mode=='type'then d.type='skill'else d.target='SELF'end
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before);table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1});Actions.drain(C,s);eq(s.enemies[1].hp,100);eq(s.energy,3)
end
-- The experiment switch must be the actual boolean true, not truthy data.
for _,flag in ipairs({'yes',1,0,{}})do
 local s,c=fresh('ganyu_lab_01',false);s.experimentalMechanics=flag;local before=C.copy(s)
 eq(C.canPlay(s,c.uid,1),false);eq(C.play(s,c.uid,1),false);same(s,before)
 table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1});Actions.drain(C,s);eq(s.enemies[1].hp,100);eq(s.energy,3)
end
-- Paid queue preparation fault restores original hand and resource objects.
do
 local s,c=fresh('ganyu_lab_24',false);local before=C.copy(s);local h,d,r=s.hand,s.draw,s.ganyuResource
 local Paid=require('abyss_ganyu_paid_cards');local prepare=Paid.prepare
 Paid.prepare=function(...)prepare(...);error('after actual native candidate prepare')end
 eq(pcall(C.play,s,c.uid),false);Paid.prepare=prepare;same(s,before);eq(s.hand,h);eq(s.draw,d);eq(s.ganyuResource,r);eq(s.hand[1],c)
 assert(C.play(s,c.uid));eq(s.exhaust[1],c)
end
-- Terminal native behavior stays explicit: no resource postprocessing introduced.
for _,id in ipairs({'12','57','61','73'})do
 local s,c=fresh('ganyu_lab_'..id,false);s.enemies[1].hp=1;local r=C.copy(s.ganyuResource);assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);same(s.ganyuResource,r)
 eq(#s.hand,0);eq(s.player.block,id=='12'and 3 or id=='61'and 12 or 0)
end
print('GANYU_NATIVE_GATES_PASS 44 auto and44 noncandidate refusals, mutation/transaction/terminal probes')
