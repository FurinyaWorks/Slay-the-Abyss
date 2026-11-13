package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,F,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_attack_finish'),require('abyss_action_queue')
D.statuses.statuses[#D.statuses.statuses+1]={id='xiao_masked_attack_draw',priority=5,kind='buff',stack='intensity',decay='none'}
local function fresh()
 local deck={};for i=1,20 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid};s.player.statuses.xiao_mask=2;return s
end
local function install(s,n)X.dispatch(C,s,{op='xiaoCard',kind='maskedAttackDraw',value=n,uid=s.pendingPlay.uid},Q)end
for _,n in ipairs({1,2})do
 local s=fresh();install(s,n);local count=#s.hand;F.capture(C,s);s.player.statuses.xiao_mask=nil;F.finish(C,s);eq(#s.hand,count+n)
 local before=C.copy(s);assert(not pcall(F.finish,C,s));same(s,before)
 s.player.statuses.xiao_mask=1;F.capture(C,s);F.finish(C,s);eq(#s.hand,count+n)
 s.turn=s.turn+1;F.capture(C,s);F.finish(C,s);eq(#s.hand,count+n*2)
end
print('PASS x36 base/up captures pre-effect mask and draws once per attack and turn even after exit')
local s=fresh();F.capture(C,s);F.finish(C,s);eq(s.xiao.maskedDrawTurn,nil);install(s,1)
F.capture(C,s);local count=#s.hand;F.finish(C,s);eq(#s.hand,count+1);install(s,2)
F.capture(C,s);F.finish(C,s);eq(#s.hand,count+1)
print('PASS attacks before Power do not spend eligibility and added Power cannot reset spent turn')
s=fresh();install(s,2);F.capture(C,s);local before=C.copy(s);s.pendingPlay.uid=999;local bad=C.copy(s);assert(not pcall(F.finish,C,s));same(s,bad);s.pendingPlay.uid=s.cardInUse.uid
local restore=require('abyss_snapshot').capture(s);assert(not pcall(function()F.finish(C,s);error('after native draw')end));restore();same(s,before);F.finish(C,s);eq(#s.hand,#before.hand+2)
print('PASS wrong UID rejects before mutation and real Snapshot restores capture eligibility and draw')
for _,mode in ipairs({'calm','dead','skill'})do
 s=fresh();install(s,2)
 if mode=='calm'then s.player.statuses.xiao_mask=nil elseif mode=='skill'then s.cardInUse.cardId='defend' end
 F.capture(C,s);if mode=='dead'then s.player.hp=0 end;count=#s.hand;F.finish(C,s);eq(#s.hand,count);eq(s.xiao.maskedDrawTurn,nil)
end
print('PASS calm attack skill and dead player cannot collect masked attack draw')
