import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {assertOfficialRunContracts} from '../scripts/official-run-layout.mjs';
import {deckCardTemplate,battlePileCardTemplate} from '../scripts/deck-ui-layout.mjs';
import {toLua,luaString} from '../scripts/build-lua-data.mjs';
import {colourToLua} from '../scripts/build-ui-theme.mjs';

const child=(node,name)=>(node?.children??node?.controls??[]).find(part=>part.name===name);
const all=node=>[node,...(node.children??node.controls??[]).flatMap(all)];

test('official composition rejects a missing run page before mutating any host',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout();
 const stage=child(layout,'stage')??layout,key=stage.children?'children':'controls';
 stage[key]=stage[key].filter(node=>node.name!=='mapPanel');
 const before=structuredClone(layout);
 assert.throws(()=>applyOfficialAssets([layout],theme),/official run root.*mapPanel/i);
 assert.deepEqual(layout,before,'missing roles cannot leave a partly restyled tree');
});

test('official composition rejects unregistered roots rather than treating them as templates',()=>{
 const root={name:'UnregisteredRunRoot',controls:[]};
 assert.throws(()=>applyOfficialAssets([root],officialAssetsTheme(nativeTheme)),/unregistered official root/i);
});

test('official composition validates the whole batch and rejects repeated composition',()=>{
 const first=gameLayout(),second=gameLayout(),before=structuredClone(first);
 second.controls=second.controls.filter(node=>node.name!=='relicPanel');
 const theme=officialAssetsTheme(nativeTheme);
 assert.throws(()=>applyOfficialAssets([first,second],theme),/missing relicPanel/);
 assert.deepEqual(first,before);
 applyOfficialAssets([first],theme);
 const applied=structuredClone(first);
 assert.throws(()=>applyOfficialAssets([first],theme),/already applied/);
 assert.deepEqual(first,applied);
 const nested=deckCardTemplate();child(nested,'face').children=[];
 const valid=gameLayout(),untouched=structuredClone(valid);
 assert.throws(()=>applyOfficialAssets([valid,nested],theme),/missing roundFrame/);
 assert.deepEqual(valid,untouched,'a malformed later card cannot partly convert earlier run roots');
 const template={name:'AbyssReadyCardGroup',kind:'container',children:[],size:[144,64]};
 applyOfficialAssets([template],theme);
 assert.throws(()=>applyOfficialAssets([template],theme),/already applied/);
});

test('final contracts cover every card host and reject local skin, bar and relic regressions',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout(),deck=deckCardTemplate();
 applyOfficialAssets([layout,deck],theme);
 const pile=battlePileCardTemplate(layout,deck),trees=[layout,deck,pile];
 assert.doesNotThrow(()=>assertOfficialRunContracts(trees));
 // A page cannot preserve the old compatibility handles while replacing the
 // actual visible shell with its own geometry or palette.
 for(const template of [deck,pile])for(const role of ['stsReferenceBack','stsReferenceChrome']){
  const shell=child(child(template,'face'),role),old=shell.position;
  shell.position=[1,0];
  assert.throws(()=>assertOfficialRunContracts(trees),new RegExp('Shared card material drift.*'+role));
  shell.position=old;
 }
 for(const face of all(layout).filter(node=>child(node,'nativeCardBody'))){
  const bevel=child(child(face,'nativeCardBody'),'outerBevel'),old=bevel.size;
  bevel.size=[151,210];
  assert.throws(()=>assertOfficialRunContracts(trees),/Shared card material drift/);
  bevel.size=old;
 }
 for(const template of [deck,pile]){
  const body=child(child(template,'face'),'nativeCardBody'),old=body.size;
  body.size=[151,210];assert.throws(()=>assertOfficialRunContracts(trees),/Shared card material drift/);body.size=old;
 }
 const map=child(layout,'mapPanel'),index=map.children.findIndex(node=>node.name==='officialRunBar');
 const [bar]=map.children.splice(index,1);map.children.unshift(bar);
 assert.throws(()=>assertOfficialRunContracts(trees),/bar covered/);
 map.children.shift();map.children.splice(index,0,bar);
 const relic=child(layout,'relicPanel');relic.children.push({name:'regressedCatalog',kind:'image',image:107311,size:[600,400]});
 assert.throws(()=>assertOfficialRunContracts(trees),/Shared relic surface/);
 relic.children.pop();assert.doesNotThrow(()=>assertOfficialRunContracts(trees));
});
test('reward overview retains live rows while adopting measured compact rows and the shared flag',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme),battle=child(layout,'battlePanel');
 const list=child(battle,'rewardList'),live=[list,child(list,'title'),child(list,'subtitle'),...['goldReward','cardReward','claimPotion','continue'].map(name=>child(battle,name))];
 const geometry=new Map(live.map(n=>[n,{position:n.position?.slice(),size:n.size?.slice()}]));
 applyOfficialAssets([layout],theme);
 const token=theme.officialAssets.rewardRows;
 for(const node of live){
  assert(all(battle).includes(node));
  const before=geometry.get(node),isRow=['goldReward','cardReward','claimPotion'].includes(node.name);
  const position=node.name==='title'?[before.position[0],token.titleY-list.position[1]]:
   node.name==='subtitle'?[before.position[0],token.subtitleY-list.position[1]]:before.position;
  assert.deepEqual(node.position,position,node.name+' measured placement');
  assert.deepEqual(node.size,isRow?token.rowSize:node.name==='continue'?[180,60]:before.size,node.name+' shared size');
 }
 assert.equal(token.rowSize[0],296);assert.equal(token.rowSize[1],56);
 assert.equal(child(list,'title').text.content,'战斗奖励');
 assert.equal(child(list,'plate').opacity,0);assert.equal(child(list,'border').opacity,0);
 const field=child(list,'v25RewardField'),paper=child(list,'v25RewardPaper');
 assert.equal(child(field,'dark').colour,'#070B0B');
 assert.equal(field.position[1]+list.position[1],0);
 assert.equal(paper.position[1],child(list,'title').position[1]);
 assert(child(paper,'paperCore'));
 const visibleCatalog=all(list).filter(n=>n.kind==='image'&&n.image===theme.officialAssets.images.panel&&n.opacity!==0&&n.visible!==false);
 assert.deepEqual(visibleCatalog,[],'summary must not expose the catalog plaque');
 const picking=child(battle,'rewardStage');assert(child(picking,'v25RewardPaper'));assert(child(picking,'v25RewardField'));
});
test('real reward layout keeps the shared host aligned through expanded and ordinary lists',()=>{
 const f=createRequire(import.meta.url)('fengari'),L=f.lauxlib.luaL_newstate();f.lualib.luaL_openlibs(L);
 const theme=officialAssetsTheme(nativeTheme),source=readFileSync(new URL('../src/lua/abyss_battle_reward_layout.lua',import.meta.url),'utf8');
 applyOfficialAssets([gameLayout()],theme);
 const script=`
local theme=${toLua(theme)}
package.preload.abyss_theme=function()return theme end
-- Resolve the real RelicView and its complete transitive Lua dependencies.
package.path='src/lua/?.lua;'..package.path
local Layout=assert(load(${luaString(source)}))()
local function node()
 local n={children={}}
 function n:GetChild(k)if not self.children[k]then self.children[k]=node()end;return self.children[k]end
 function n:SetAnchoredPosition(x,y)self.x,self.y=x,y end
 function n:SetSizeDelta(w,h)self.w,self.h=w,h end
 function n:SetVisible(v)self.visible=v end
 function n:SetLocalScale(x,y,z)self.scale={x,y,z}end
 return n
end
local root=node();local function child(k)return root:GetChild(k)end
local box=child('rewardList');local owner={}
for _,expanded in ipairs({false,true,true,false})do
 local rewards={goldClaimed=false,cardResolved=false,relics=expanded and {{},{}}or{},emeraldKey=expanded and {}or nil}
 local frame={run={rewards=rewards},listing=true,manual=true,pendingPotion=expanded}
 Layout.render(frame,child,owner)
 local contract=expanded and theme.layout.battleRewards.expanded or theme.layout.battleRewards
 assert(frame.rewardRows==(expanded and 6 or 2))
 assert(box.x==contract.stage[1]and box.y==contract.stage[2])
 local field,paper=box:GetChild('v25RewardField'),box:GetChild('v25RewardPaper')
 assert(box.x+field.x==0 and box.y+field.y==0,'dark field canvas placement must not jump or cover battle bar')
 assert(box.x+paper.x==contract.title[1]and box.y+paper.y==contract.title[2],'paper follows actual title writer')
 assert(child('goldReward').y==contract.rowOrigin[2])
 assert(child('continue').y==contract.continue[2])
 assert(box.w==contract.stage[3]and box.h==contract.stage[4])
 local panel=box:GetChild('stsRewardPanel');local token=theme.officialAssets.rewardRows
 assert(box.x+panel.x==token.panelPosition[1]and box.y+panel.y==token.panelPosition[2])
 assert(panel.scale[2]==(token.panelSize[2]+contract.stage[4]-theme.layout.battleRewards.stage[4])/token.panelSize[2])
end
`;
 try{const code=f.lauxlib.luaL_dostring(L,f.to_luastring(script));assert.equal(code,0,code===0?'':f.to_jsstring(f.lua.lua_tostring(L,-1)));}finally{f.lua.lua_close(L);}
});
function painted(node,y=0,root=true){
 if(!root&&node.visible===false)return [];
 const centre=y+(node.position?.[1]??0);
 return [{node,y:centre},...(node.children??node.controls??[]).flatMap(part=>painted(part,centre,false))];
}
function officialLayout(){
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout();
 applyOfficialAssets([layout],theme);
 return {layout,theme};
}

test('official build adopts the existing paper map without replacing graph or input owners',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout(),map=child(layout,'mapPanel');
 const nodes=all(map).filter(n=>/^node\d+$/.test(n.name));
 const edges=all(map).filter(n=>/^edge\d+$/.test(n.name));
 const hits=all(map).filter(n=>n.kind==='cursorArea');
 applyOfficialAssets([layout],theme);
 assert(child(map,'v25MapPaper'),'official candidate must include the adopted map, not the old black fallback');
 const group=child(map,'mapGroup1'),legend=child(group,'typeLegend');
 assert(child(legend,'v25LegendPaper'));
 assert.equal(child(legend,'bossLabel').text.content,'首领');
 assert.equal(child(legend,'bossIcon').visible,true);
 for(const [expected,selected]of [[nodes,n=>/^node\d+$/.test(n.name)],[edges,n=>/^edge\d+$/.test(n.name)],[hits,n=>n.kind==='cursorArea']]){
  const current=all(map).filter(selected);assert.equal(current.length,expected.length);
  current.forEach((node,index)=>assert.strictEqual(node,expected[index],'retain live graph/input owner '+node.name));
 }
 assert(edges.every(n=>n.children?.length===8),'reuse the existing dashed-ink edge adapter');
});

test('run headers paint above opaque page backgrounds and below their live resource text',()=>{
 const {layout}=officialLayout();
 for(const pageName of ['mapPanel','nodePanel']){
  const page=child(layout,pageName),paint=painted(page),parts=paint.map(row=>row.node),bar=child(page,'officialRunBar');
  const barPaint=parts.indexOf(child(bar,'steel'));
  assert(barPaint>=0);
  const backgrounds=paint.filter(({node:n,y})=>n.kind==='image'&&n.size?.[0]>=1200&&n.size?.[1]>=600
   &&Math.abs(y-bar.position[1])<(n.size[1]+bar.size[1])/2);
  for(const {node:background} of backgrounds)assert(parts.indexOf(background)<barPaint,pageName+'/'+background.name+' covers the canonical header');
  const title=pageName==='mapPanel'?child(child(page,'mapGroup1'),'title'):child(page,'title');
  const resources=child(page,'resources')??page;
  for(const text of [title,child(resources,'hp'),child(resources,'gold')])assert(parts.indexOf(text)>barPaint,pageName+'/'+text.name+' is behind the opaque header');
  assert(!all(bar).some(n=>n.kind==='cursorArea'),'decorative copies must not add unbound actions');
 }
});

test('official shop has an explicit reachable map shortcut outside its decorative header',()=>{
 const {layout,theme}=officialLayout(),node=child(layout,'nodePanel'),route=child(node,'runRoute');
 assert(route,'shop must expose the same direct map action as combat');
 assert.equal(child(route,'label').text.content,'地图');
 assert.deepEqual(route.position,theme.officialAssets.battleHud.route.slice(0,2));
 assert(child(route,'hit').size.every(value=>value>=44),'direct map needs a touch target');
 assert(node.children.indexOf(route)>node.children.indexOf(child(node,'officialRunBar')));
 assert(!child(child(layout,'mapPanel'),'runRoute'),'map cannot preview itself');
});

test('official potion slots survive battle rewards, map, node and return-to-combat transitions',()=>{
 const {theme}=officialLayout(),require=createRequire(import.meta.url),f=require('fengari');
 const L=f.lauxlib.luaL_newstate();f.lualib.luaL_openlibs(L);
 const modules=['abyss_game_ui_view','abyss_game_ui_overlays','abyss_potion_discard_ui'];
 const sources=Object.fromEntries(modules.map(name=>[name,readFileSync('src/lua/'+name+'.lua','utf8')]));
 const deps=new Set(Object.values(sources).flatMap(source=>[...source.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match=>match[1])));
 const selected={presentationProfile:theme.presentationProfile,officialAssets:theme.officialAssets,layout:theme.layout,icon:theme.icon,color:theme.color};
 selected.icon=structuredClone(selected.icon);selected.color=structuredClone(selected.color);
 for(const [id,hex]of Object.entries(selected.icon.potionTint))selected.icon.potionTint[id]=colourToLua(hex);
 for(const key of ['normal','fire'])selected.color.potionShell[key].ink=colourToLua(selected.color.potionShell[key].ink);
 const script=`
local theme=${toLua(selected)}
package.preload.abyss_theme=function()return theme end
package.preload.abyss_numbers=function()return{integer=tostring}end
package.preload.abyss_run=function()return{potionCapacity=function(run)return run.capacity end,potionCount=function()return 0 end}end
${[...deps].filter(name=>!modules.includes(name)&&!['abyss_theme','abyss_numbers','abyss_run'].includes(name)).map(name=>`package.preload[${luaString(name)}]=function()return{}end`).join('\n')}
${Object.entries(sources).map(([name,source])=>`package.preload[${luaString(name)}]=assert(load(${luaString(source)},${luaString(name)}))`).join('\n')}
local function node()
 local n={children={},visible=true}
 function n:GetChild(name)if not self.children[name]then self.children[name]=node()end;return self.children[name]end
 function n:SetVisible(value)self.visible=value end
 function n:SetAnchoredPosition(x,y)self.x,self.y=x,y end
 function n:SetSizeDelta(w,h)self.width,self.height=w,h end
 function n:SetAsLastSibling()end
 function n:SetImage(source,id)self.image=id end
 return n
end
local root=node();local function child(name)return root:GetChild(name)end
local View=require('abyss_game_ui_view');local Overlays=require('abyss_game_ui_overlays')
local self={battleUI={busy=false},potionUI={},relicUI={refreshBar=function()end}}
local platform={imageSource='static',color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end}
local inCombat=Overlays.inCombat(self)
local refreshPotion=View.refreshPotionEntry(child,inCombat,function()return true end,platform)
local refreshDeck=View.refreshDeckEntry(child,self)
local refresh=View.refreshUtilities(child,self,inCombat,refreshPotion,refreshDeck)
local scenarios={{'battle','combat',false},{'battle','reward',true},{'map','map',true},{'node','node',true},{'battle','combat',false},{'battle','reward',true}}
for _,capacity in ipairs({3,5})do
 for _,inventory in ipairs({{}, {[1]='fire_potion',[3]='strength_potion'}, {[2]='energy_potion'}})do
 for _,case in ipairs(scenarios)do
  self.mode=case[1];self.run={phase=case[2],capacity=capacity,potions=inventory,deck={},relics={}}
  refresh(self.run,false,false,false,false,false,false)
  local entry=child('potionEntry');assert(entry.visible==case[3],'potion action availability '..case[1]..'/'..case[2])
  if entry.visible then
   local open,hud=entry:GetChild('open'),theme.officialAssets.battleHud
   for _,state in ipairs({'normal','hover','pressed','disabled'})do
    local variant=open:GetChild('hit'):GetChild(state)
    for _,name in ipairs({'label','entryFace','officialButtonBacking'})do assert(variant:GetChild(name).visible==false,case[2]..' revived '..name)end
    for i=1,5 do
     local slot=variant:GetChild('slot'..i)
     assert(slot.visible==(i<=capacity),'physical capacity')
     if i<=capacity then assert(math.abs(open.x+slot.x-(hud.potionX+(i-1)*hud.potionStep))<.0001,'shared slot position')end
     local id=i<=capacity and inventory[i] or nil
     assert(slot:GetChild('emptyShell').visible==(id==nil),'empty slot paint')
     assert(slot:GetChild('filledShell').visible==(id~=nil and id~='fire_potion'),'normal filled paint')
     assert(slot:GetChild('fireShell').visible==(id=='fire_potion'),'fire slot paint')
     assert(slot:GetChild('bottle').visible==(id~=nil),'sparse inventory bottle paint')
     if id then
      local bottle=slot:GetChild('bottle');assert(bottle.image==theme.icon.potion[id],'current bottle image')
      local expected=theme.icon.potionTint[id]
      for _,channel in ipairs({'r','g','b','a'})do assert(bottle.imageColor[channel]==expected[channel],'shared current potion tint '..id..'/'..channel)end
     end
    end
   end
  end
 end
 end
end
`;
 try{const result=f.lauxlib.luaL_dostring(L,f.to_luastring(script));assert.equal(result,0,result===0?'':f.to_jsstring(f.lua.lua_tostring(L,-1)));}
 finally{f.lua.lua_close(L);}
});
