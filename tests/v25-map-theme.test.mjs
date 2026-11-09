import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {mapLayout,mapGeometry} from '../scripts/map-ui-layout.mjs';
import {buildUiTheme} from '../scripts/build-ui-theme.mjs';
import {buildLuaData,toLua,luaString} from '../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);

test('V25 map runtime colours follow the authoritative theme input without generator overrides',()=>{
 const source=structuredClone(nativeTheme);
 assert.equal(source.v25Battle.color.mapCanvas.available,'#17212B');
 assert.equal(source.v25Battle.color.node.pathTaken,'#26373E');
 source.v25Battle.color.mapCanvas.available='#102030';
 source.v25Battle.color.node.pathTaken='#405060';
 const projected=v25Theme(source);
 assert.equal(projected.color.mapCanvas.available,'#102030');
 assert.equal(projected.color.node.pathTaken,'#405060');
 assert.equal(nativeTheme.color.node.pathTaken,'#FFD88A');
});

for(const v25 of [true,false])test(`${v25?'V25':'legacy'} generated theme drives actual MapUI room/path colour writers and widths without changing routes`,t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const dir=mkdtempSync(join(root,'map-theme-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const source=structuredClone(nativeTheme),before=structuredClone(source),theme=v25?v25Theme(source):source;
 assert.deepEqual(source,before,'V25 theme mutated the shared Enhanced source');
 const file=join(dir,'theme.json');writeFileSync(file,JSON.stringify(theme));
 buildUiTheme(file,'data',join(dir,'abyss_theme.lua'));buildLuaData('data',join(dir,'abyss_data.lua'));
 const expected=v25?{available:[23,33,43],current:[23,33,43],visited:[23,33,43],locked:[87,87,87],taken:[38,55,62],next:[38,55,62],future:[93,98,94],takenWidth:2.1,nextWidth:2,lockedWidth:1.85,futureAlpha:183}:
  {available:[255,216,138],current:[255,250,238],visited:[201,154,78],locked:[122,130,146],taken:[255,216,138],next:[236,230,218],future:[119,112,122],takenWidth:10.5,nextWidth:3,lockedWidth:2};
 const code=`
package.path=${luaString(dir.replaceAll('\\','/')+'/?.lua;src/lua/?.lua')}
package.preload.abyss_map_layout=function()return ${toLua(mapGeometry(theme))}end
local Map=require('abyss_map');local MapUI=require('abyss_map_ui');local Data=require('abyss_data')
local expected=${toLua(expected)};local schema=${toLua(mapLayout(theme))}
local function node(d)
 local c={children={},name=d.name,visible=d.visible~=false,text='',alive=true}
 function c:GetChild(name)return self.children[name]end
 function c:SetVisible(v)self.visible=v end
 function c:SetAnchoredPosition(x,y)self.x,self.y=x,y end
 function c:SetSizeDelta(w,h)self.w,self.h=w,h end
 function c:SetLocalScale(x,y)self.sx,self.sy=x,y end
 function c:SetImage(_,id)self.image=id end
 function c:AddCursorEventListener()end
 for _,d in ipairs(d.children or d.controls or {})do local child=node(d);c.children[d.name]=child end
 return c
end
local root=node(schema);local panel=root:GetChild('stage'):GetChild('mapPanel')
local function at(name)for _,g in pairs(panel.children)do if g.children[name]then return g.children[name]end end;error('missing '..name)end
local function rgb(actual,wanted,label)assert(actual and actual.r==wanted[1] and actual.g==wanted[2] and actual.b==wanted[3],label..' runtime RGB differs')end
local map=Map.generate(Data,42)
local ui=MapUI.new(root,map,function(n)return Map.choose(map,n.id)end,'click',{imageSource='static',color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end})
local function verifyNodes()
 local foundAvailable,foundLocked=false,false
 for i,n in ipairs(Map.view(map).nodes)do
  local box=at('node'..i)
  if box.visible then
   local state=n.id==map.currentNodeId and 'current' or n.visited and 'visited' or n.available and 'available' or 'locked'
   rgb(box:GetChild('icon').imageColor,expected[state],state..' node')
   if state=='available'then foundAvailable=true elseif state=='locked'then foundLocked=true end
  end
 end
 assert(foundAvailable and foundLocked,'real graph did not exercise available and locked writes')
end
ui:render();verifyNodes()
local first=Map.available(map)[1];assert(first and Map.choose(map,first.id));ui:render()
local second=Map.available(map)[1];assert(second and Map.choose(map,second.id));ui:render();verifyNodes()
local route=table.concat(map.path,',');local floor,current=map.floor,map.currentNodeId
local taken,nextEdge,future=0,0,0
for i=1,126 do local e=at('edge'..i);if e.visible then
 if math.abs(e.h-expected.takenWidth)<.0001 then rgb(e.imageColor,expected.taken,'taken edge');taken=taken+1
 elseif math.abs(e.h-expected.nextWidth)<.0001 then rgb(e.imageColor,expected.next,'reachable edge');nextEdge=nextEdge+1
 else assert(math.abs(e.h-expected.lockedWidth)<.0001,'locked line width differs');rgb(e.imageColor,expected.future,'future edge');future=future+1
  if expected.futureAlpha then assert(e.imageColor.a==expected.futureAlpha,'future path alpha differs')end
 end
end end
assert(taken>0 and nextEdge>0 and future>0,'actual graph omitted a path style')
for i=1,3 do ui:render()end
assert(map.floor==floor and map.currentNodeId==current and table.concat(map.path,',')==route,'colour refresh mutated actual route')
print('MAP_RUNTIME_THEME_WRITERS_PASS')
`;
 const probe=join(dir,'probe.lua');writeFileSync(probe,code);
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),probe],{cwd:process.cwd(),encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));assert.match(result.stdout,/MAP_RUNTIME_THEME_WRITERS_PASS/,result.stderr);
});
