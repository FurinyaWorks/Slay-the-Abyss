package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Native=require('abyss_native_battle')
local G=require('abyss_native_battle_geometry')
local P=require('abyss_native_projection')
local camera={focus={3,1.3,0},distance=10,fieldOfView=42,yaw=0,pitch=12,canvas={1280,720}}
local body={width=1,height=1.7}
local planned=P.body({3.2,.4,0},body,camera)
local battle={player={id='player'},enemies={{id='enemy',hp=20}}}
local sent,refreshes={},0
local view={run={phase='combat',combat=battle},battleUI={feedback={start=function()end}},refresh=function()refreshes=refreshes+1 end}
local adapter=Native.attach(view,{GetChild=function()end},{log=function()end,send=function(command,model,actor,seq)sent[#sent+1]={command=command,seq=seq}end,
 config={maxActors=5,camera=camera,heroBody=body,heroFeet={0,.4,0},bodies={body},worldFeet={{3.2,.4,0}}}})
adapter:update(.01);local seq=sent[1].seq
assert(adapter:ack('ready',seq))
assert(adapter:position(-1,seq,3,-1.59,0),'actual camera focus is accepted even after ready completes')
assert(adapter:position(1,seq,3.2,-2.49,0),'actual native entity location replaces guessed feet plane')
assert(adapter:position(0,seq,0,-2.49,0))
assert(not adapter:position(1,seq,3.2,nil,0) and not adapter:position(1,seq,3.2,0,nil),'partial packet is rejected without a Lua exception')
local g=G.get(battle.enemies[1])
assert(math.abs(g.x-planned.x)<.00001 and math.abs(g.y-planned.y)<.00001,'common native ground shift must not shift targets relative to models')
local before=refreshes;adapter:update(0)
assert(refreshes==before+1,'camera and entity position batch refreshes the HUD only once')
local x,y,w,h=g.x,g.y,g.hitWidth,g.hitHeight
adapter:resize(1280,960)
local resized=G.get(battle.enemies[1]);local factor=4/3
assert(math.abs(resized.x-x*factor)<.00001 and math.abs(resized.y-y*factor)<.00001)
assert(math.abs(resized.hitWidth-w*factor)<.00001 and math.abs(resized.hitHeight-h*factor)<.00001,'4:3 uses actual vertical canvas pixels divided by stage scale')
adapter:resize(1600,900)
assert(math.abs(G.get(battle.enemies[1]).x-x)<.00001,'16:9 returns to the original shared target geometry')
battle.enemies[1]={id='replacement',hp=20};view.battleUI.feedback:start({},battle,1)
assert(not adapter:position(1,seq,999,999,999),'late old actor position cannot move replacement HUD')
adapter:destroy()
assert(not adapter:position(0,seq,0,0,0))
print('NATIVE_POSITION_PASS actual ground/focus, post-ready packets, stale slots, nil rejection, batched refresh, 4:3/16:9 stage projection')

do
 local requests,receive={},nil
 local active={player={id='native-player'},enemies={{id='native-enemy',hp=20}}}
 local nativeView={run={phase='combat',combat=active},battleUI={feedback={start=function()end}},refresh=function()end}
 local runtime=Native.attach(nativeView,{GetChild=function()end},{config={camera=camera,heroBody=body,heroFeet={0,.4,0},bodies={body},worldFeet={{3.2,.4,0}}},
  send=function()end,log=function()end,sampleCamera=function(s)requests[#requests+1]=s end,registerCamera=function(fn)receive=fn end})
 runtime:resize(1600,900);assert(#requests==0,'menu resize does not sample')
 runtime:update(.01);local current=requests[#requests]
 local points={{3,1,-9},{3,1,-8},{3.1,1,-9},{3,1.1,-9}}
 assert(not receive(current,0,3,nil,-9),'partial sample is rejected')
 for i=4,2,-1 do assert(receive(current,i-1,table.unpack(points[i])))end
 assert(not runtime.camera.nativeBasis,'partial sample cannot mix with fallback camera')
 assert(receive(current,0,table.unpack(points[1])))
 local actual=G.get(active.enemies[1])
 local expected=P.body({3.2,.4,0},body,runtime.camera,720,1280)
 assert(math.abs(actual.x-expected.x)<1e-8 and math.abs(actual.y-expected.y)<1e-8,'model and hit geometry share sampled projection')
 runtime:resize(1280,960);runtime:resize(1280,960);runtime:update(0);local newer=requests[#requests]
 assert(newer==current+1,'same-frame camera requests coalesce to one native skill cast')
 assert(newer>current and not receive(current,0,99,99,99),'resize rejects delayed packets from old viewport')
 assert(not receive(newer,4,0,0,0) and not receive(newer,nil,0,0,0),'invalid point identities are rejected')
 for i=1,4 do assert(receive(newer,i-1,table.unpack(points[i])))end
 assert(math.abs(G.get(active.enemies[1]).y-expected.y*4/3)<1e-8,'sample UV uses actual stage dimensions')
 local acceptedBasis=runtime.camera.nativeBasis
 local acceptedX=G.get(active.enemies[1]).x
 runtime:resize(1280,960);runtime:update(0);newer=requests[#requests]
 local behind={{3,1,-11},{3,1,-12},{3.1,1,-11},{3,1.1,-11}}
 for i=1,3 do assert(receive(newer,i-1,table.unpack(behind[i])))end
 local safe,rejected=pcall(receive,newer,3,table.unpack(behind[4]))
 assert(safe and rejected==false,'non-singular camera facing away is rejected inside callback')
 assert(runtime.camera.nativeBasis==acceptedBasis and G.get(active.enemies[1]).x==acceptedX,'invalid camera batch cannot partially replace geometry or basis')
 runtime:destroy();assert(not receive(newer,0,table.unpack(points[1])),'destroy rejects native sample callbacks')
 assert(not camera.nativeBasis,'runtime does not mutate shared configuration')
end
print('NATIVE_CAMERA_RUNTIME_PASS complete batch, current sequence, invalid packet, viewport resize, destroy')
