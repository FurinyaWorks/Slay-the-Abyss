local trace,failCopy={},false
local copy=require('abyss_copy').copy
local failure={reason='injected failure'}
package.loaded.abyss_copy={copy=function(value)
 trace[#trace+1]={'copy',value}
 if failCopy then error(failure)end
 return copy(value)
end}
local loads=0
package.preload.abyss_writhing_mass=function()
 loads=loads+1
 return {advance=function(state,enemy,random)
  trace[#trace+1]={'delegate',state,enemy,random}
  return 'delegate',nil,enemy
 end}
end
local AI=AI_LOAD()
local ids={'roar','nom','drool','slam','tackle','smash','constrict','attack','daze','spike','wait','claw','laser'}
local function fixture(policy)
 local enemy={id='subject',ai={kind='act3',policy=policy},hp=50,spikeCount=0,exploderTurns=0,mawTurn=1,mawRoared=false,intentIndex=1,intents={}}
 local shared={tag='shared effect'}
 for _,id in ipairs(ids)do enemy.intents[#enemy.intents+1]={id=id,effects={{kind='damage',times=7,shared=shared}},shared=shared}end
 if policy=='transient'then enemy.intents[1],enemy.intents[8]=enemy.intents[8],enemy.intents[1]end
 local state={enemies={enemy},player={statuses={}}};state.self=state
 local root={state=state,enemy=enemy,oldIntents=enemy.intents,oldNom=enemy.intents[2],trace=trace,failure=failure}
 return state,enemy,root
end
local function call(root,callback)
 local out=table.pack(pcall(callback))
 if not out[1]and type(out[2])=='string'then AI_RAW_ERROR(out[2]);out[2]=AI_ERROR_LOCATIONS[out[2]]or out[2]end
 root.result=out
 return out
end
local counter=0
local function record(label,root)counter=counter+1;AI_GRAPH_WRITE(root,label,true)end
if AI_MODE=='matrix'then
 local variants={
  orb_walker={'none','claw','laser'},repulsor={'none','attack','daze'},spiker={'none','attack','spike'},
  exploder={'none'},transient={'none'},maw={'none','nom','slam','drool','roar'},spire_growth={'none','tackle','smash','constrict'}
 }
 for _,policy in ipairs({'orb_walker','repulsor','spiker','exploder','transient','maw','spire_growth'})do
  for _,roll in ipairs({1,20,21,40,41,50,51,100})do
   for _,last in ipairs(variants[policy])do
    for _,previous in ipairs(variants[policy])do
     for phase=0,2 do
      trace={};local state,enemy,root=fixture(policy)
      enemy.act3Last=last~='none'and last or nil;enemy.act3Previous=previous~='none'and previous or nil
      enemy.spikeCount=phase==0 and 0 or phase==1 and 5 or 6;enemy.exploderTurns=phase
      enemy.mawTurn=phase+1;enemy.mawRoared=phase>0;state.player.statuses.constricted=phase==0 and nil or phase-1
      local draws=0
      local out=call(root,function()return AI.advance(state,enemy,function(s,max)
       draws=draws+1;assert(s==state and max==100,'primary RNG boundary');trace[#trace+1]={'random',max,roll};return roll
      end)end)
      assert(out[1]and out.n==1,'advance returns no values');assert(draws==1,'exactly one primary roll')
      local id=enemy.intents[enemy.intentIndex].id
      if policy=='orb_walker'then
       local preferred=roll<=40 and 'claw'or 'laser'
       local expected=last==preferred and previous==preferred and (preferred=='claw'and 'laser'or 'claw')or preferred
       assert(id==expected,'Orb Walker third repeat prevented')
      elseif policy=='maw'then
       assert(root.oldNom.effects[1].times==7,'historical frame unchanged')
       assert(enemy.intents~=root.oldIntents and enemy.intents[2]~=root.oldNom,'Maw replaces graph')
       assert(enemy.intents[1]==root.oldIntents[1],'unmodified moves retain aliases')
       assert(enemy.intents[2].effects[1].times==math.floor(enemy.mawTurn/2),'Maw scales Nom')
      elseif policy=='spire_growth'and last=='tackle'and previous=='tackle'then assert(id~='tackle','Growth third tackle prevented')
      elseif policy=='spiker'and enemy.spikeCount>5 then assert(id=='attack','Spike cap selects attack')end
      record(policy..':'..roll..':'..last..':'..previous..':'..phase,root)
     end
    end
   end
  end
 end
 assert(counter==1680,'complete policy matrix')
else
 -- Lifecycle methods keep public late binding, RNG consumption and return arity.
 for _,policy in ipairs({'orb_walker','repulsor','spiker','exploder','transient','maw','spire_growth'})do
  trace={};local state,enemy,root=fixture(policy);local draws=0
  local function random(_,max)draws=draws+1;trace[#trace+1]={'random',max};return 50 end
  assert(call(root,function()return AI.initialize(state,enemy,random)end)[1]);record('initialize:'..policy,root)
  for turn=1,4 do
   local intent=enemy.intents[enemy.intentIndex]
   AI.beforeAction(state,enemy,random,intent)
   AI.afterAction(state,enemy,random);record('turn:'..policy..':'..turn,root)
  end
  if policy=='transient'then assert(draws==1,'Transient afterAction does not roll')end
 end
 trace={};local state,enemy,root=fixture('writhing_mass')
 local function unused()error('delegate must own random')end
 local out=call(root,function()return AI.advance(state,enemy,unused)end)
 assert(out[1]and out.n==4 and out[2]=='delegate'and out[3]==nil and out[4]==enemy,'delegate preserves multiple returns')
 assert(loads==1,'Writhing is lazy loaded');record('writhing delegation',root)
 local prior=package.loaded.abyss_writhing_mass.advance
 package.loaded.abyss_writhing_mass.advance=function()error(failure)end
 out=call(root,function()return AI.advance(state,enemy,unused)end);assert(out[2]==failure);record('dynamic delegate error',root)
 package.loaded.abyss_writhing_mass.advance=prior
 for _,policy in ipairs({'unknown','orb_walker','maw','spire_growth'})do
  trace={};state,enemy,root=fixture(policy)
  out=call(root,function()return AI.advance(state,enemy,function()trace[#trace+1]={'random'};error(failure)end)end)
  assert(not out[1]);if policy=='unknown'then assert(#trace==0,'unsupported policy before RNG')else assert(out[2]==failure)end
  record('RNG failure:'..policy,root)
 end
 trace={};state,enemy,root=fixture('maw');failCopy=true
 out=call(root,function()return AI.advance(state,enemy,function()return 50 end)end);failCopy=false
 assert(not out[1]and out[2]==failure and enemy.mawTurn==2 and enemy.intents==root.oldIntents,'Maw partial copy failure');record('copy failure',root)
 for _,policy in ipairs({'orb_walker','maw','spire_growth','repulsor','spiker','exploder','transient'})do
  trace={};state,enemy,root=fixture(policy);enemy.intents={};root.emptyIntents=enemy.intents
  out=call(root,function()return AI.advance(state,enemy,function()return 50 end)end)
  assert(not out[1]and tostring(out[2]):find('unknown Act3 intent',1,true));record('missing intent:'..policy,root)
 end
 -- The policy captured before the RNG callback owns this decision, even if the callback edits ai.
 trace={};state,enemy,root=fixture('maw')
 out=call(root,function()return AI.advance(state,enemy,function()enemy.ai.policy='transient';return 50 end)end)
 assert(out[1]and enemy.mawTurn==2 and enemy.intents[enemy.intentIndex].id=='roar','captured policy');record('callback mutation',root)
 local original=AI.advance;AI.advance=function(s,e,r)trace[#trace+1]={'replacement',s,e,r};return 99 end
 out=call(root,function()return AI.initialize(state,enemy,unused)end);assert(out[1]and out.n==1,'initialize drops advance result');record('initialize late binding',root)
 enemy.ai.policy='orb_walker';out=call(root,function()return AI.afterAction(state,enemy,unused)end)
 assert(out[1]and out.n==1,'afterAction drops advance result');record('afterAction late binding',root);AI.advance=original
end
