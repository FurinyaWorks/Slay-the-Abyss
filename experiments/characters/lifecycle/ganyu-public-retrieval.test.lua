-- Actual explicit shared retrieval acceptance.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
GANYU_RETRIEVAL_RUN_FACTORY=require('abyss_ganyu_retrieval_reward_run')

local C=require('abyss_combat');local D=require('abyss_data');local R=require('abyss_sts_random');local X=require('abyss_exhaust')
local F=assert(GANYU_RETRIEVAL_RUN_FACTORY,'closed shared factory required')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local targets={['10']='03',['25']='03',['39']='05',['48']='06'}
local count=0
for _,id in ipairs({'10','25','39','48'})do for _,up in ipairs({false,true})do for _,targetUp in ipairs({false,true})do for _,noDraw in ipairs({false,true})do for _,mode in ipairs({'normal','full','missing'})do
 local run=F.new(D,101);local deck={{cardId='ganyu_lab_'..id,upgraded=up},{cardId='ganyu_lab_'..targets[id],upgraded=targetUp},{cardId='ganyu_lab_'..targets[id],upgraded=not targetUp}}
 for i=1,17 do deck[#deck+1]='ganyu_lab_02'end
 local s=C.new(run.data,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local all={};for _,pile in ipairs({s.hand,s.draw})do for _,c in ipairs(pile)do all[#all+1]=c end end
 s.hand={};s.draw={};s.discard={};local card;local matches={};local fillers={}
 for _,c in ipairs(all)do if c.cardId=='ganyu_lab_'..id then card=c elseif c.cardId=='ganyu_lab_'..targets[id]then matches[#matches+1]=c else fillers[#fillers+1]=c end end
 assert(card and #matches==2);table.sort(matches,function(a,b)return a.upgraded==targetUp and b.upgraded~=targetUp end)
 s.hand[1]=card;for i=1,(mode=='full'and 9 or 4)do s.hand[#s.hand+1]=table.remove(fillers)end
 local zone=id=='25'and'discard'or'draw';local pile=s[zone]
 pile[#pile+1]=table.remove(fillers);local first=matches[1];local second=matches[2]
 if mode=='missing'then s.exhaust[#s.exhaust+1]=first;s.exhaust[#s.exhaust+1]=second else pile[#pile+1]=first;pile[#pile+1]=second end
 for _,c in ipairs(fillers)do s.draw[#s.draw+1]=c end
 s.player.noDraw=noDraw;s.player.statuses.feel_no_pain=3;X.rememberPower(s,'feel_no_pain')
 local prior={};for i,c in ipairs(pile)do prior[i]=c end;local rng=C.copy(s.rng);local cardRng=C.copy(s.cardRng);local handCount=#s.hand
 assert(C.play(s,card.uid,1));eq(s.energy,3-(up and 0 or 1));eq(#s.hand,handCount-1+(mode=='missing'and 0 or 1))
 if mode~='missing'then eq(s.hand[#s.hand],first);eq(first.upgraded,targetUp);eq(pile[1],prior[1]);eq(pile[2],second)end
 same(s.rng,rng);same(s.cardRng,cardRng);eq(s.ganyuResource.charge,0);eq(s.ganyuResource.storm,nil)
 local dest=id=='10'and s.discard or s.exhaust;eq(dest[#dest],card);eq(s.player.block,id=='10'and 0 or 3);eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
 local before=C.copy(s);eq(C.play(s,card.uid,1),false);same(s,before);count=count+1
end end end end end
print('PUBLIC_RETRIEVAL_PASS '..count..' actual paid first-instance/upgrade/NoDraw/payment-freed-slot/missing/UID disposal/RNG cases; controlled pile fixtures')
