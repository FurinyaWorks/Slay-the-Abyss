local M=require('abyss_silent_final_cards')
local realRequire=require
local trace,failAt,steps={},nil,0
local sentinel={error='injected action boundary'}
local function step(name,...)
 trace[#trace+1]={name=name,args=table.pack(...)};steps=steps+1
 if steps==failAt then error(sentinel,0)end
end
local function proxy(name,backing)
 return setmetatable({}, {__index=function(_,key)step('read:'..name,key);return backing[key]end,
  __newindex=function(_,key,value)step('write:'..name,key,value);backing[key]=value end,
  __len=function()return #backing end,__pairs=function()return pairs(backing)end})
end
local modules={}
modules.abyss_actor={
 applyPower=function(s,p,id,n,owner)step('power',p,id,n,owner);p.statuses[id]=(p.statuses[id]or 0)+n;return 'ignored',s end,
 isActive=function(enemy)step('active',enemy);return enemy.hp>0 and not enemy.escaped end,
 loseHp=function(_,enemy,n)step('loseHp',enemy,n);enemy.hp=enemy.hp-n end,
 applyNoDraw=function(_,p)step('noDraw',p);p.noDraw=true end,
 resolveDamageReactions=function(s,r,retaliate)step('reactions',r);s.reactions=r;retaliate(s,r)end,
}
modules.abyss_card_actions={
 fresh=function(_,s,id,template)step('fresh',id,template);s.nextUid=s.nextUid+1;return {cardId=id,uid=s.nextUid,template=template}end,
 created=function(_,s,c)step('created',c);c.upgrades=(c.upgrades or 0)+1;s.lastCreated=c end,
 toHand=function(s,c)step('toHand',c);s.hand[#s.hand+1]=c end,
 enqueue=function(s,e,a,b,c,top)step('enqueue',e,a,b,c,top);if top then table.insert(s.queue,1,e)else s.queue[#s.queue+1]=e end end,
}
modules.abyss_silent_potions={shivs=function(s,n)step('shivs',n);s.shivs=n;return false end}
modules.abyss_card_triggers={resolveDamageAll=function(s,a,c)step('damageAll',a,c);s.trigger=a end,
 expandStorm=function(s,a)step('storm',a);return s.storm end}
modules.abyss_enemy_ai={hpLost=function(s,e,n,yes)step('hpLost',e,n,yes);s.lost={e,n,yes}end}
modules.abyss_power_schedule={remove=function(s,p,id)step('remove',p,id);s.removed=id end}
modules.abyss_discard={begin=function(s,n)step('discard',n);s.discardCount=n;return not s.rejectDiscard end}
for name,mod in pairs(modules)do package.loaded[name]=mod end
require=function(name)step('require',name);return realRequire(name)end
local function state()
 local c={cardId='strike',uid=1,cost=1};local p={statuses={phantasmal=1,nightmare=3},nightmareCardName='Strike'}
 local s={player=p,enemies={{id=1,hp=0},{id=2,hp=8},{id=2,hp=9},{id=3,hp=4,escaped=true}},
  hand={c,{cardId='x',uid=2,cost=-1}},draw={},queue={},nextUid=2,relics={'Chemical X','chemical_x'},
  pendingPlay={energyOnUse=3},nightmareTemplate=c,catalog={cards={strike={name='Strike'}},potions={known={}}},
  storm={{effect={op='first'}},{effect={op='second'}}},turn=4,rng={seed=17,counter=0}}
 s.alias=c;s.self=s;return s
end
local combat={
 cardDefinition=function(_,c)step('definition',c);return {cost=c.cost}end,
 combatBaseCost=function(_,c)step('baseCost',c);return c.cost end,
 applyEffects=function(s,list,p,target,instance)step('applyEffects',list,p,target,instance);s.effects=list;return 'ignored' end,
 draw=function(s,n)step('draw',n);s.drawCount=n end,
 damage=function(_,from,enemy,n,yes,r)step('damage',from,enemy,n,yes,r);enemy.hp=enemy.hp-n;r[#r+1]={enemy=enemy}end,
 retaliate=function(s,r)step('retaliate',r);s.retaliated=true end,
}
local cases={
 {'gainSilentFinalPower',{status='burst',value=2}}, {'potionShivs',{value=3}},
 {'trigger',{action={op='cardTriggerDamageAll'}}}, {'trigger',{action={op='cardTriggerStorm'}}}, {'trigger',{action={op='block'}}},
 {'choke',{targetId=2,value=3}}, {'choke',{targetId=99,value=3}},
 {'setup',{},function(s)s.hand={}end}, {'setup',{},function(s)s.hand={s.hand[1]}end}, {'setup',{}},
 {'nightmare',{},function(s)s.hand={s.hand[1]};s.player.statuses.nightmare=nil end}, {'nightmare',{}},
 {'bulletTime',{}}, {'copyHand',{value=2,template={cardId='strike',uid=9}}}, {'copyHand',{value=0}},
 {'distraction',{cardId='strike'}}, {'distraction',{}},
 {'doppelganger',{energyOnUse=0,value=1}}, {'doppelganger',{value=2}},
 {'doppelganger',{value=0},function(s)s.pendingPlay=nil;s.relics=nil end},
 {'phantasmalGain',{value=3}}, {'phantasmalGain',{value=3},function(s)s.player.statuses.phantasmal=2;s.player.statuses.double_damage=2 end},
 {'remove',{status='nightmare'}}, {'remove',{status='burst'}},
 {'tools',{value=2}}, {'tools',{value=2},function(s)s.rejectDiscard=true end},
 {'startPower',{status='nightmare',value=2}}, {'startPower',{status='phantasmal',value=2}},
 {'corpseDamage',{value=4}}, {'corpseDamage',{value=4},function(s)s.enemies={}end},
 {'alchemize',{potionId='known'}}, {'alchemize',{potionId='unknown'}}, {'alchemize',{}}, {'unsupported',{}},
}
local function deepProxy(root)
 local seen,backings={},{}
 local wrap
 wrap=function(value)
  if type(value)~='table'then return value end
  if seen[value]then return seen[value]end
  local id=#backings+1;local out={};seen[value]=out
  backings[id]={proxy=out,backing=value}
  setmetatable(out,{__index=function(_,key)step('state read:'..id,key);return wrap(value[key])end,
   __newindex=function(_,key,v)step('state write:'..id,key,v);value[key]=v end,
   __len=function()step('state length:'..id);return #value end})
  return out
 end
 return wrap(root),backings
end
local function run(index,at,observableState)
 local case=cases[index];local s=state();if case[3]then case[3](s)end
 trace={};steps=0;failAt=at
 local backings;if observableState then s,backings=deepProxy(s)end
 local e={kind=case[1]};for k,v in pairs(case[2])do e[k]=v end
 local item=proxy('item',{effect=proxy('effect',e),target=s.enemies[2],instance=s.alias})
 local result=table.pack(pcall(M.apply,combat,s,item));failAt=nil
 local completed=steps
 -- The observer itself reads effect.kind after execution; that is outside the
 -- operation and a failure there is still visible in the final edge graph.
 if at then assert(not result[1] and result[2]==sentinel,'injected boundary must retain table error identity')end
 if not at and not observableState and result[1]then
  assert(result.n==1,'apply must return no values')
  if e.kind=='copyHand'and e.value>0 then
   assert(s.lastCreated.upgrades==2,'double created hooks')
   local imports=0;for _,row in ipairs(trace)do if row.name=='require'and row.args[1]=='abyss_card_actions'then imports=imports+1 end end
   assert(imports==8,'repeated lazy requires')
  end
  if e.kind=='trigger'and e.action.op=='cardTriggerStorm'then assert(s.queue[1].action.op=='second'and s.queue[2].action.op=='first','trigger top queue')end
  if e.kind=='choke'and e.targetId==2 then assert(s.enemies[2].hp==5 and s.enemies[3].hp==9,'first choke target')end
  if e.kind=='bulletTime'then assert(s.player.noDraw and s.hand[1].costForTurn==0 and s.hand[2].costForTurn==nil,'Bullet Time costs')end
  if e.kind=='doppelganger'and e.energyOnUse==0 then assert(s.player.statuses.energized==5 and s.player.statuses.draw_next_turn==5,'Doppelganger X bonus')end
  if e.kind=='corpseDamage'and #s.enemies>0 then assert(s.enemies[2].hp==4 and s.enemies[3].hp==5,'corpse damage amount')end
  if e.kind=='startPower'and e.status=='nightmare'then assert(s.nightmareTemplate==nil and s.player.nightmareCardName==nil,'Nightmare cleanup')end
 end
 local observed=result
 if not result[1]and type(result[2])=='string'then observed=table.pack(table.unpack(result,1,result.n));observed[2]=SILENT_ERROR(result[2])end
 SILENT_GRAPH_WRITE({state=s,backings=backings,item=item,effectBacking=e,trace=trace,returned=observed,sentinel=sentinel},'edge:'..index..':'..tostring(at)..':'..tostring(observableState))
 return completed
end
for i=1,#cases do
 local count=run(i,nil)
 -- Throw at every require/callback/metatable boundary, not just the happy path.
 for at=1,count-1 do run(i,at)end
 run(i,nil,true)
end
-- Public recursion must use the current exported function, not a closed-over
-- helper. A replacement is installed while startPower's effect.status is read.
for _,status in ipairs({'nightmare','phantasmal'})do
 local original=M.apply;local s=state();trace={};steps=0
 local e=setmetatable({kind='startPower',value=2},{__index=function(_,key)
  if key=='status'then M.apply=function(c,current,item)step('public replacement',c,current,item);current.recursed=item;return 'ignored' end;return status end
 end})
 local result=table.pack(pcall(original,combat,s,{effect=e}));M.apply=original
 assert(result[1]and s.recursed and result.n==1,'dynamic public recursion')
 assert(s.recursed.effect.kind==(status=='nightmare'and 'copyHand'or 'phantasmalGain'))
 SILENT_GRAPH_WRITE({state=s,returned=result,trace=trace},'dynamic-public:'..status)
end
print('SILENT_APPLY_EDGES all kinds, lazy imports, metatable order, partial failures and public recursion')

-- Non-string unknown kinds retain the original tostring/error path. Stable
-- custom tostring labels prevent VM-local pointer text masking graph equality.
local realTostring=tostring
local kinds={false,7,0/0,setmetatable({},{__tostring=function()return 'table-kind'end}),function()end}
for i=0,#kinds do
 local kind=kinds[i];local s=state();trace={};steps=0
 tostring=function(value)if type(value)=='function'and value==kind then return 'function-kind'end;return realTostring(value)end
 local result=table.pack(pcall(M.apply,combat,s,{effect={kind=kind}}))
 assert(not result[1] and result.n==2 and result[2]:find('unknown Silent final action '..tostring(kind),1,true),'unknown kind error')
 result[2]=SILENT_ERROR(result[2]);SILENT_GRAPH_WRITE({state=s,kind=kind,returned=result,trace=trace},'unknown-kind:'..i)
 tostring=realTostring
end
local malformed={
 {kind='copyHand',value=1}, {kind='copyHand'}, {kind='doppelganger'},
 {kind='doppelganger',value='invalid'}, {kind='phantasmalGain',value=1},
}
for i,e in ipairs(malformed)do
 local s=state();trace={};steps=0;if i==5 then s.player.statuses.phantasmal=nil end
 local result=table.pack(pcall(M.apply,combat,s,{effect=e}))
 assert(not result[1]and type(result[2])=='string','malformed input must fail')
 result[2]=SILENT_ERROR(result[2]);print('MALFORMED '..i..' '..result[2])
 SILENT_GRAPH_WRITE({state=s,effect=e,returned=result,trace=trace},'malformed:'..i)
end
