-- Exercise the actual experimental module with a small native-boundary fixture.
local Actors=require('abyss_battle_render_actors')
local function fixture()
 local node={visible=true,writes=0}
 function node:SetVisible(value)
  self.writes=self.writes+1
  if self.callback then local fn=self.callback;self.callback=nil;fn()end
  if self.failure=='throw' then self.failure=nil;error('injected name setter throw')end
  if self.failure=='false' then self.failure=nil;return false end
  self.visible=value
 end
 function node:SetAnchoredPosition()end
 local owner={active=true,feedback={dying={},escaping={}}}
 local box={GetChild=function(_,name)if name=='name'then return node end;return{x=0}end}
 local entry={id='fungi_beast_1',actor={id='fungi_beast_1',definitionId='fungi_beast'}}
 local host={platform={},monsterSurfaces={each=function(_,fn)fn(box,1,entry)end}}
 local api=Actors.install(owner,{},host,{ink=function()end})
 return node,api.updateEnemyNames,owner
end
for _,failure in ipairs({'false','throw'})do
 local node,update=fixture();node.failure=failure
 local ok,why=pcall(update,1/60)
 assert(not ok,'experimental failed setter must be observable')
 assert(tostring(why):find(failure=='false'and'name visibility rejected'or'injected name setter throw',1,true))
 assert(node.visible==true);update(1/60);assert(node.visible==false)
 local writes=node.writes;update(1/60);assert(node.writes==writes,'warm same-value write repeated')
 node.visible=true;update(1/60);assert(node.visible==false,'other writer was hidden by cache')
end
local node,update,owner=fixture()
for _=1,20 do node.visible=true;update(1/60);assert(not node.visible)end
node.visible=true;node.callback=function()owner.active=false end
update(1/60);update(1/60);assert(not node.visible,'latest state did not reconcile')
print('NAME_DIFF_BOUNDARIES_PASS false/throw/retry/other-writer/20-reentries/reentrant-next-update')
