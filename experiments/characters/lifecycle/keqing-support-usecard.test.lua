package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local F=require('abyss_keqing_native_support');local A=require('abyss_card_actions')
local function fresh(id,up,mods,drawId)
 local d=C.copy(D);for _,v in ipairs(F.definitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={id,'defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local card;for _,v in ipairs(s.hand)do if v.cardId==id then card=v end end;card.upgraded=up
 s.keqingResource.infusion=2;s.keqingResource.wedgeUntil=s.turn+1
 if mods then s.player.statuses.dexterity=10;s.player.statuses.frail=1 end
 if drawId then local v;for i,x in ipairs(s.hand)do if x~=card then v=table.remove(s.hand,i);break end end;assert(v);v.cardId=drawId;s.draw[#s.draw+1]=v end
 return s,card
end
local count=0
for _,id in ipairs({'KQ039','KQ049'})do for _,up in ipairs({false,true})do for _,mods in ipairs({false,true})do
 local s,c=fresh(id,up,mods,'defend');local base=id=='KQ039'and(up and 6 or 4)or(up and 7 or 4)
 local expected=mods and math.floor((base+10)*.75)or base
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.player.block,expected);eq(s.keqingResource.infusion,2);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.discard[#s.discard],c)
 if id=='KQ039'then eq(s.player.statuses.next_turn_block,expected);assert(C.endTurn(s));eq(s.player.block,expected);assert(not s.player.statuses.next_turn_block or s.player.statuses.next_turn_block==0);assert(C.endTurn(s));eq(s.player.block,0)end
 count=count+1
end end end
for _,up in ipairs({false,true})do for _,mode in ipairs({'attack','noDraw','empty'})do
 local s,c=fresh('KQ049',up,false,mode=='attack'and 'strike'or mode=='noDraw'and 'defend'or nil)
 if mode=='noDraw'then s.player.noDraw=true end
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.player.block,0);eq(s.discard[#s.discard],c)
end end
-- Fail after actual native side effects: complete command rollback including aliases.
for _,id in ipairs({'KQ039','KQ049'})do
 local s,c=fresh(id,true,true,'defend');local before=C.copy(s);local hand,draw,res=s.hand,s.draw,s.keqingResource
 local old=C.block;local reached=false;C.block=function(...)old(...);reached=true;error('native_support_block_fault')end
 assert(not pcall(C.play,s,c.uid));C.block=old;assert(reached);same(s,before);assert(s.hand==hand and s.draw==draw and s.keqingResource==res);assert(C.play(s,c.uid))
end
-- Deferred shield installation itself fails after the real native write.
do local s,c=fresh('KQ039',true,true,'defend');local before=C.copy(s);local ref=s.player.statuses
 local N=require('abyss_silent_attack_cards');local old=N.applyNextBlock;local reached=false
 N.applyNextBlock=function(...)old(...);reached=true;error('after_real_next_block')end
 assert(not pcall(C.play,s,c.uid));N.applyNextBlock=old;assert(reached);same(s,before);assert(s.player.statuses==ref);assert(C.play(s,c.uid))
end
for _,id in ipairs({'KQ039','KQ049'})do for _,mode in ipairs({'normal','unmarked','fixed','captured','wrongFace','badUpgrade','silentFinalCard','runNativeABI','cross'})do
 local s,c=fresh(id,false,false,'defend');local d=s.catalog.cards[id]
 if mode=='unmarked'then d.keqingCandidate=nil elseif mode=='fixed'then d.effects[1].fixed=true elseif mode=='captured'then d.effects[1].blockAmount=999 elseif mode=='wrongFace'then d.effects[1].value=999 elseif mode=='badUpgrade'then c.upgraded='false'elseif mode=='cross'then d.ganyuCandidate=false elseif mode~='normal'then d[mode]=true end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 C.queueCard(s,c,{exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.player.block,mode=='normal'and 4 or 0)
end end
print('KQ_SUPPORT_NATIVE_PASS '..count..' modifiers; conditional draw, next-turn and strict paid/auto rollback')
