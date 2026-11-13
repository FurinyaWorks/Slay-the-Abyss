package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Q=require('abyss_action_queue');local S=require('abyss_snapshot')
local M=dofile('experiments/characters/ganyu-lua/retrieval-card.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(zone,up)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_03',name='arrow retrieval fixture',type='attack',cost=1,target='ENEMY',rarity='common',effects={{op='ganyuCard',kind='chargedShot',direct=7,bloom=6}}}
 local deck={'ganyu_lab_03','ganyu_lab_03'};for i=1,13 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42});local all={};for _,p in ipairs({s.hand,s.draw})do for _,c in ipairs(p)do all[#all+1]=c end end
 s.hand={};s.draw={};local arrows={}
 for _,c in ipairs(all)do if c.cardId=='ganyu_lab_03' then arrows[#arrows+1]=c else s.draw[#s.draw+1]=c end end
 s.cardInUse=table.remove(s.draw,1);s.pendingPlay={uid=s.cardInUse.uid};s.ganyuResource={charge=2}
 arrows[1].upgraded=up;arrows[2].upgraded=not up
 if zone=='discard'then s.discard[1]=table.remove(s.draw,1)end
 table.insert(s[zone],2,arrows[1]);s[zone][#s[zone]+1]=arrows[2]
 return s,arrows
end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(state,a,queue)local ok=M.dispatch(C,state,a.effect,queue);if fault then error('after retrieval')end;return ok end})
end
for _,zone in ipairs({'draw','discard'})do for _,up in ipairs({false,true})do
 local s,a=fresh(zone,up);local before=C.copy(s);local e=M.prepare(C,s,{op='ganyuRetrieve',zone=zone},s.cardInUse.uid)
 s.player.noDraw=true;assert(run(s,e));eq(s.hand[1],a[1]);eq(s.hand[1].upgraded,up);eq(s.ganyuResource.charge,2)
 local remaining=s[zone];eq(remaining[#remaining],a[2]);eq(s.seed,before.seed)
 local n,b=fresh(zone,up);local original=C.copy(n);local pile=n[zone];local restore=S.capture(n)
 assert(not pcall(run,n,M.prepare(C,n,{op='ganyuRetrieve',zone=zone},n.cardInUse.uid),true));restore();same(n,original);eq(n[zone],pile)
 -- Full hand leaves the first arrow in its original source position.
 local f,fa=fresh(zone,up)
 for i=#f.draw,1,-1 do local c=f.draw[i];if c.cardId~='ganyu_lab_03'and #f.hand<10 then f.hand[#f.hand+1]=table.remove(f.draw,i)end end
 eq(#f.hand,10);local old=C.copy(f[zone]);assert(run(f,M.prepare(C,f,{op='ganyuRetrieve',zone=zone},f.cardInUse.uid)));same(f[zone],old)
end end
print('PASS4 first-arrow original-UID retrieval variants, full hand, NoDraw and Snapshot rollback')
for _,zone in ipairs({'draw','discard'})do
 local s,a=fresh(zone,false)
 for i=#s[zone],1,-1 do if s[zone][i].cardId=='ganyu_lab_03'then s.exhaust[#s.exhaust+1]=table.remove(s[zone],i)end end
 local old=C.copy(s[zone]);assert(run(s,M.prepare(C,s,{op='ganyuRetrieve',zone=zone},s.cardInUse.uid)));same(s[zone],old);eq(#s.hand,0)
 local n,b=fresh(zone,false);n.hand[1]=b[1];Q.start(n,{})
 local e=M.prepare(C,n,{op='ganyuRetrieve',zone=zone},n.cardInUse.uid)
 assert(not pcall(M.dispatch,C,n,e,Q));eq(#n.actionQueue.actions,0);eq(n.ganyuResource.charge,2)
 assert(not pcall(M.prepare,C,n,{op='ganyuRetrieve',zone='exhaust'},n.cardInUse.uid))
end
print('PASS absent match does not touch other zones; duplicate instances and unsupported source rejected')
