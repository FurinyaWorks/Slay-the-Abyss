package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Native=require('abyss_native_battle')
local battle={player={id='player'},enemies={}}
for i=1,5 do battle.enemies[i]={id='enemy'..i,hp=20}end
local requests={}
local view={run={phase='combat',combat=battle},battleUI={},refresh=function()end}
local adapter=Native.attach(view,{GetChild=function()end},{config={maxActors=5},log=function()end,
 send=function(command,model,actor,seq)requests[#requests+1]={command=command,actor=actor,seq=seq}end})
adapter:update(.01)
assert(#requests==5,'five enemies must be created together, not 4.5 seconds apart')
for i=5,1,-1 do
 assert(requests[i].command=='show' and requests[i].actor==i)
 assert(adapter:ack('ready',requests[i].seq),'out-of-order ready identifies its own spawn')
 assert(adapter.slots[i].ready)
end
assert(not adapter.pending and not next(adapter.showing),'all parallel spawns settle independently')
adapter:destroy()
assert(#requests==6 and requests[6].command=='hide','one teardown removes all native actors')
print('NATIVE_SPAWN_BATCH_PASS five same-update spawns, reversed ready, one cleanup')
