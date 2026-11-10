-- Fixed terminal evidence, never a claim of a naturally completed game.
local H=require('abyss_ending_history')
local count=0
local function scenario(writer)
 local writes={}
 local owner=H.new({write=function(delta)
  writes[#writes+1]=delta
  if writer then return writer(delta)end
  return true
 end})
 local run={character='ironclad',campaign=true,act=1,floor=1,phase='map',runSeed='42'}
 assert(H.begin(owner,run,{seedSet=false,isDailyRun=false,isTrial=false}))
 run.act,run.floor,run.phase=3,51,'victory';run.encounterTier,run.encounterId='boss','actual_boss'
 run.lastResult={outcome='victory',encounterId='actual_boss'}
 local id='f51_l4'
 local map={act=3,floor=51,currentNodeId=id,runSeed='42',sourceSignature='source-map',
  path={'f50_l4',id},nodes={{id=id,floor=51,type='event',roomKind='ending'}}}
 run.nodeFlow={id=id,floor=51,type='event',roomKind='ending',complete=true,result='normal_victory',
  mapSeed='42',mapSignature=map.sourceSignature}
 return owner,run,map,writes
end
local function reject(name,change)
 local owner,run,map,writes=scenario();local changed=change(owner,run,map);if changed~=nil then map=changed end
 local ok,why=H.finish(owner,run,map)
 assert(ok==false and #writes==0 and next(owner.wins)==nil,name)
 ENDING_GRAPH_WRITE({owner=owner,run=run,map=map,writes=writes,ok=ok,why=why},name,true);count=count+1
end
reject('registered run identity',function(_,r)r.runSeed='foreign'end)
reject('terminal event completion',function(_,r)r.nodeFlow.complete=false end)
reject('boss result identity',function(_,r)r.lastResult.encounterId='foreign'end)
reject('escaped enemies cannot win',function(_,r)r.lastResult.allEnemiesEscaped=true end)
reject('authenticated map signature',function(_,r)r.nodeFlow.mapSignature='foreign'end)
reject('authenticated map seed',function(_,r)r.nodeFlow.mapSeed='foreign'end)
reject('current path endpoint',function(_,_,m)m.path[#m.path]='foreign'end)
reject('unique ending node',function(_,_,m)m.nodes[2]=m.nodes[1]end)
reject('ending node provenance',function(_,_,m)m.nodes[1].roomKind='foreign'end)
-- Snapshot before identity validation remains material even with late getters.
do
 local owner,run,map,writes=scenario();local savedFlow,savedResult=run.nodeFlow,run.lastResult
 run.campaign=nil
 setmetatable(run,{__index=function(_,key)
  if key=='campaign'then run.nodeFlow={};run.lastResult={};return true end
 end})
 assert(H.finish(owner,run,map)==true and #writes==1,'capture flow before identity reads')
 ENDING_GRAPH_WRITE({owner=owner,run=run,map=map,writes=writes,savedFlow=savedFlow,savedResult=savedResult},'captured evidence',true);count=count+1
end
local fields={
 {'run','campaign'},{'run','act'},{'run','floor'},{'run','runSeed'},{'run','character'},
 {'run','encounterTier'},{'run','encounterId'},
 {'flow','type'},{'flow','roomKind'},{'flow','complete'},{'flow','result'},{'flow','floor'},{'flow','id'},
 {'result','outcome'},{'result','encounterId'},
 {'map','act'},{'map','floor'},{'map','runSeed'},{'map','sourceSignature'},{'map','currentNodeId'},
 {'flow','mapSignature'},{'flow','mapSeed'},
 {'node','floor'},{'node','type'},{'node','roomKind'},
}
for _,field in ipairs(fields)do for _,value in ipairs({false,0,'',{},function()end})do
 reject(field[1]..'.'..field[2]..':'..type(value),function(_,run,map)
  local containers={run=run,flow=run.nodeFlow,result=run.lastResult,map=map,node=map.nodes[1]}
  containers[field[1]][field[2]]=value
 end)
end end
for _,field in ipairs(fields)do
 reject(field[1]..'.'..field[2]..':nil',function(_,run,map)
  local containers={run=run,flow=run.nodeFlow,result=run.lastResult,map=map,node=map.nodes[1]}
  containers[field[1]][field[2]]=nil
 end)
end
for _,key in ipairs({'nodeFlow','lastResult'})do for _,value in ipairs({false,7,'',{},setmetatable({},{})})do
 reject('nonplain '..key..':'..type(value),function(_,run)run[key]=value end)
end end
for _,key in ipairs({'path','nodes'})do for _,value in ipairs({false,7,'',setmetatable({},{})})do
 reject('nonplain map '..key..':'..type(value),function(_,_,map)map[key]=value end)
end end
for _,value in ipairs({false,7,'',setmetatable({},{})})do
 reject('nonplain map:'..type(value),function()return value end)
 reject('nonplain node:'..type(value),function(_,_,map)map.nodes[2]=value end)
end
reject('missing matched node',function(_,_,map)map.nodes={}end)
reject('empty path',function(_,_,map)map.path={}end)
reject('unregistered role',function(owner,run)owner.runs[run].role=nil end)
reject('registered role conflict',function(owner,run)owner.runs[run].role='silent'end)
reject('nonstandard run',function(owner,run)owner.runs[run].standard=false end)
-- Every run read is observable after registration. Include exact table errors
-- and all partial traces, with raw backing state available to the graph oracle.
local function traced(failAt,marker)
 local owner,run,map,writes=scenario();local backing,trace={},{}
 for key,value in pairs(run)do backing[key]=value;run[key]=nil end
 setmetatable(run,{__index=function(_,key)
  trace[#trace+1]=key
  if #trace==failAt then error(marker,0)end
  return backing[key]
 end})
 local result=table.pack(pcall(H.finish,owner,run,map))
 if failAt then assert(result[1]==false and result[2]==marker,'injected error identity')
 else assert(result[1]and result[2],'getter success')end
 ENDING_GRAPH_WRITE({owner=owner,run=run,map=map,writes=writes,backing=backing,trace=trace,result=result,marker=marker},'getter:'..tostring(failAt)..':'..type(marker),true)
 count=count+1;return #trace
end
local reads=traced(nil,nil)
for failAt=1,reads do traced(failAt,'read failed');traced(failAt,{at=failAt})end
-- Persistence is one monotonic update even on refusal/error/non-boolean truth.
for _,mode in ipairs({'true','false','nil','number','throw-string','throw-table','mutate'})do
 local marker={failure='writer'}
 local owner,run,map,writes=scenario(function(delta)
  if mode=='throw-string'then error('writer failed',0)end
  if mode=='throw-table'then error(marker,0)end
  if mode=='mutate'then delta.wins.ironclad=false;return true end
  if mode=='number'then return 1 end
  if mode=='true'then return true end
  if mode=='false'then return false end
 end)
 local result=table.pack(H.finish(owner,run,map));assert(result[1]and #writes==1)
 assert(owner.wins.ironclad==true,'provider mutation cannot change local wins')
 assert(H.finish(owner,run,map)==false and #writes==1,'finish idempotence')
 ENDING_GRAPH_WRITE({owner=owner,run=run,map=map,writes=writes,result=result,marker=marker},'writer:'..mode,true);count=count+1
end
print('ENDING_TERMINAL '..count..' cases')
