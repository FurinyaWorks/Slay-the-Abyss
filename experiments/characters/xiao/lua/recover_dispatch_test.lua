package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X,B=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch'),require('abyss_xiao_play_bridge')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(up)
 local data=C.copy(D);for _,d in ipairs(B.definitions())do d.color='colorless';d.rarity='special';data.cards.cards[#data.cards.cards+1]=d end
 local s=C.new(data,{deck={{cardId='xiao_candidate_x06',upgraded=up},{cardId='xiao_candidate_x06',upgraded=false},{cardId='xiao_candidate_x01',upgraded=up},{cardId='xiao_candidate_x02'}},enemies={'cultist'},seed=42})
 s.xiao={relicUsed=true,startingRelic=true};local all=s.hand;s.hand={};s.discard={}
 local first,second,attack,paid
 for _,c in ipairs(all)do if c.cardId=='xiao_candidate_x06'then if not first then first=c else second=c end elseif c.cardId=='xiao_candidate_x01'then attack=c else paid=c end end
 if up and second.upgraded then first,second=second,first end
 s.discard={attack,first,second};s.cardInUse=paid;s.pendingPlay={uid=paid.uid,targetId=s.enemies[1].id};return s,first,second,attack
end
local function run(s,kind)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind=kind,value=1,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)return X.dispatch(C,st,a.effect,q)end})
end
for _,up in ipairs({false,true})do
 local s,first,second= fresh(up);local uid=first.uid;local flag=first.upgraded;eq(flag==true,up);run(s,'recoverExit')
 eq(s.hand[1],first);eq(s.hand[1].uid,uid);eq(s.hand[1].upgraded,flag);eq(s.hand[1].costForTurn,nil);eq(s.discard[2],second)
 local n,_,_,attack=fresh(up);local index=#n.draw+1;run(n,'topdeckAttack');eq(n.draw[index],attack)
 local cards=C.draw(n,1);eq(cards[1],attack);eq(n.hand[1],attack)
end
print('PASS x16 visible discard first exit preserves UID upgrade and cost; x39 topdeck actual next draw')
local s,first,second=fresh(false);s.exhaust={first,second};s.discard={s.discard[1]};local before=C.copy(s);run(s,'recoverExit');eq(#s.hand,0);eq(#s.exhaust,2)
s,first=fresh(false);for i=1,s.rules.player.maxHand do s.hand[i]={uid=1000+i,cardId='xiao_candidate_x01'}end
before=C.copy(s);run(s,'recoverExit');same(s,before)
print('PASS recovery never reads exhaust and full hand does not move discard or charge free cost')
s,first=fresh(true);before=C.copy(s);local discard=s.discard;local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'recoverExit');error('after recovery')end));restore();same(s,before);eq(s.discard,discard);eq(s.discard[2],first)
print('PASS actual host snapshot restores same recovered entity and original pile references')
