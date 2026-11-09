-- Full production modules in independent VMs; replace only public observation seams.
local C,A,D=require('abyss_combat'),require('abyss_actor'),require('abyss_data')
local AP,S=require('abyss_act2_powers'),require('abyss_act2_stasis')
local function eq(a,b,label)assert(a==b,'STASIS_OWNER '..label..': '..tostring(a)..' ~= '..tostring(b))end
local cases={
 {'normal',0,1,true,'replace'}, {'full',10,1,true,'replace'},
 {'overflow',11,1,true,'replace'}, {'master-zero',0,0,true,'replace'},
 {'missing',0,1,false,'replace'}, {'false',0,1,true,'false'},
 {'can-error',0,1,true,'can-error'}, {'upgrade-error',0,1,true,'upgrade-error'},
}
for _,case in ipairs(cases)do
 local name,hand,master,custody,mode=table.unpack(case)
 local s=C.new(D,{enemies={'bronze_orb','cultist'},deck={},seed=42})
 local orb=s.enemies[1];orb.hp=1;orb.statuses.stasis=1;orb.powerOrder={'stasis'}
 local held={uid=900,cardId='defend',upgraded=false};s.act2StasisCards={[orb.id]=custody and held or nil}
 s.player.statuses.master_reality=master;s.hand={};for i=1,hand do s.hand[i]={uid=i,cardId='strike'}end
 local handAlias,custodyAlias=s.hand,s.act2StasisCards
 local trace,loads,token={},0,{sentinel=name};local can,upgrade=C.canUpgrade,C.upgrade
 local oldPreload=package.preload.abyss_combat
 package.loaded.abyss_combat=nil
 package.preload.abyss_combat=function()loads=loads+1;trace[#trace+1]='load';return C end
 C.upgrade=function()error('STASIS_OWNER stale upgrade slot')end
 C.canUpgrade=function(state,card)
  eq(state,s,'state alias');eq(card,held,'card alias');trace[#trace+1]='can'
  if mode=='can-error'then card.prefix='can';error(token,0)end
  C.upgrade=function(ss,cc)
   eq(ss,s,'upgrade state alias');eq(cc,held,'upgrade card alias');trace[#trace+1]='upgrade';cc.upgraded=true
   if mode=='upgrade-error'then cc.prefix='upgrade';error(token,0)end
  end
  return mode~='false'
 end
 local died,death=AP.stasisDied,S.death
 AP.stasisDied=function(...)
  trace[#trace+1]='powers';local result=table.pack(died(...));eq(result.n,0,'powers return count');return table.unpack(result,1,result.n)
 end
 S.death=function(...)
  trace[#trace+1]='stasis';local result=table.pack(death(...))
  eq(result.n,custody and 1 or 0,'death return count');return table.unpack(result,1,result.n)
 end
 STASIS_GRAPH_WRITE({s=s,held=held,hand=handAlias,custody=custodyAlias},name..':before',true)
 local result=table.pack(pcall(A.instantKill,s,orb));local eligible=custody and hand~=10 and master>0
 eq(loads,eligible and 1 or 0,'lazy threshold '..name)
 local throws=eligible and (mode=='can-error'or mode=='upgrade-error')
 eq(result[1],not throws,'error outcome '..name);eq(result.n,throws and 2 or 1,'actor return count')
 if throws then eq(result[2],token,'error identity');eq(held.prefix,mode=='can-error'and 'can'or 'upgrade','partial prefix')end
 eq(s.hand,handAlias,'hand retained');eq(s.act2StasisCards,custodyAlias,'custody retained');eq(s.act2StasisCards[orb.id],custody and held or nil,'held retained')
 eq(held.upgraded,eligible and mode~='false'and mode~='can-error','dynamic upgrade '..name)
 local expected=custody and not throws and 1 or 0;eq(#(s.cardActions or {}),expected,'queue count '..name)
 if expected==1 then eq(s.cardActions[1].effect.op,'stasis_return','queue op');eq(s.cardActions[1].effect.forceDiscard,hand==10,'equality threshold')end
 STASIS_GRAPH_WRITE({s=s,held=held,hand=handAlias,custody=custodyAlias,trace=trace,returned=result,token=token,loads=loads},name..':after',true)
 C.canUpgrade,C.upgrade=can,upgrade;AP.stasisDied,S.death=died,death;package.loaded.abyss_combat=C;package.preload.abyss_combat=oldPreload
end
print('STASIS_OWNER_EDGES_PASS 8')
