package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,R,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local F=require('abyss_xiao_next_reward_run');local Paid=require('abyss_xiao_paid_cards')
for _,id in ipairs({'xiao_candidate_x27','xiao_candidate_x28','xiao_candidate_x37'})do for _,up in ipairs({false,true})do for _,mode in ipairs(id=='xiao_candidate_x28'and not up and {'tail','value','kind'}or{'tail'})do
 local r=F.new(D,42);assert(R.obtainCard(r,id,{upgraded=up}));local uid=r.deck[#r.deck].uid;assert(R.startCombat(r,'cultist_solo'))
 local s=r.combat;local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].deckUid==uid then c=table.remove(pile,i)end end end
 assert(c);s.hand[#s.hand+1]=c;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 local snap=C.copy(r);local resource,hand,deck,combat=s.xiao,s.hand,r.deck,r.combat;local original=Paid.dispatch;local hit=false
 Paid.dispatch=function(core,state,e,q)
 if state==s and mode~='tail'then local bad=C.copy(e);if mode=='value'then bad.payload.value=999 else bad.payload.kind='damageAll'end;hit=true;return original(core,state,bad,q)end
 local out=original(core,state,e,q);if state==s and e.step==1then hit=true;error('after final next stage')end;return out end
 eq(pcall(R.play,r,c.uid,1),false);Paid.dispatch=original;assert(hit);same(r,snap);eq(r.deck,deck);eq(r.combat,combat);eq(s.hand,hand);eq(s.xiao,resource)
 assert(R.play(r,c.uid,1));eq(s.discard[#s.discard],c);eq(c.deckUid,uid)
end end end
print('XIAO_NEXT_RUN_ROLLBACK_PASS 8 base/up permanent UID whole graph rollback retry')
