import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {battleLayout} from '../scripts/ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {assertNativeUiCapacity,buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,toLua,luaString} from '../scripts/build-lua-data.mjs';
import {applyV25NodeLayout,applyV25RewardLayout,v25NodeSource,v25NodeThemePatch} from '../scripts/v25-node-layout.mjs';

const require=createRequire(import.meta.url),parts=n=>n.controls??n.children??[];
const all=n=>[n,...parts(n).flatMap(all)],find=(n,name)=>all(n).find(c=>c.name===name);
const paths=(n,p='')=>Object.fromEntries(parts(n).flatMap(c=>[[p+c.name,c],...Object.entries(paths(c,p+c.name+'/'))]));
const merge=(a,b)=>{for(const[k,v]of Object.entries(b))a[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(a[k]??{},v):structuredClone(v);return a;};
const theme=()=>merge(v25Theme(nativeTheme),v25NodeThemePatch);

test('V25 node surfaces retain all original objects, paths, live text and legal pool sizes',()=>{
 const t=theme(),layout=nodeLayout(t),before=paths(layout),snapshot=structuredClone(nativeTheme);
 assert(t.layout.nativeNode.event.options.title[3]>=18*2,'runtime option placement must retain the transparent native text height');
 const contents=new Map(Object.values(before).filter(n=>n.text).map((n,i)=>{n.text.content='live '+i;return[n,n.text.content];}));
 applyV25NodeLayout(layout,t);const after=paths(layout);
 assert(!('opacity'in find(layout,'eventView').children.find(n=>n.name==='caption')),'native text cannot use image opacity');
 assert.equal(find(layout,'eventView').children.find(n=>n.name==='caption').text.opacity,0,'caption alpha must survive runtime SetVisible(true)');
 for(const[path,node]of Object.entries(before))assert.equal(after[path],node,path);
 for(const[node,copy]of contents)assert.equal(node.text.content,copy);
 const root=find(layout,'nodePanel');assert.equal(root.children[0].name,'v25NodeBackdrop');
 assert.equal(parts(find(root,'shopView')).filter(n=>/^card\d+$/.test(n.name)).length,7);
 assert.equal(parts(find(root,'shopView')).filter(n=>/^relic\d+$/.test(n.name)).length,3);
 assert.equal(parts(find(root,'shopView')).filter(n=>/^potion\d+$/.test(n.name)).length,3);
 assert.equal(parts(find(root,'eventView')).filter(n=>/^option\d+$/.test(n.name)).length,4);
 assert.equal(parts(find(root,'forgeGrid')).filter(n=>/^card\d+$/.test(n.name)).length,12);
 assert.deepEqual(nativeTheme,snapshot);assertNativeUiCapacity(layout);
});

test('shop cloth, campfire and event parchment contain bounded layered native geometry',()=>{
 const t=theme(),layout=nodeLayout(t),original=new Set(all(layout));applyV25NodeLayout(layout,t);
 for(const name of ['v25ShopCloth','v25CampScene','v25EventParchment','v25TreasureField']){
  const n=find(layout,name);assert(n,name);assert(all(n).filter(c=>c.kind==='image').length>=5,name);
 }
 assert(find(layout,'fireOuter'));assert(find(layout,'fireInner'));assert(find(layout,'fireCore'));
 assert(all(find(layout,'v25CampScene')).some(n=>n.fill?.amount===.5),'curved silhouette must use sampled polygons, not a box');
 assert(all(find(layout,'v25ShopCloth')).some(n=>n.image===106095),'cloth lighting needs a continuous ramp');
 for(const n of all(layout).filter(n=>!original.has(n))){assert(!n.script&&!n.scripts&&!n.focusable);assert(['image','container'].includes(n.kind));}
 const event=find(layout,'eventView'),option=find(event,'option1');
 const states=['normal','hover','pressed','disabled'].map(s=>find(option,s));
 assert.equal(new Set(states.map(s=>s.colour)).size,4,'state materials must actually differ');
 assert(states.every(s=>s.kind==='image'),'legacy imageColor feedback targets must remain images');
 const treasure=find(layout,'treasureView'),closed=find(treasure,'closed'),open=find(treasure,'open');
 assert.equal(closed.kind,'container');assert.equal(open.kind,'container');
 assert.notDeepEqual(find(closed,'lid').position,find(open,'lid').position,'actual chest visibility owners must carry distinct poses');
 assert.equal(find(treasure,'chest').children.length,1,'input host must not permanently display a closed chest');
});

test('wrapped full game rebuilds the actual reward stage without touching combat or choice ownership',()=>{
 const t=theme(),layout=withViewport(gameLayout(t),t),battle=find(layout,'battlePanel');
 const snapshot=new Map(['hero','enemies','endTurn','choicePanel','mapPanel'].map(n=>[n,structuredClone(find(layout,n))]));
 const before=paths(layout);applyV25NodeLayout(layout,t);const after=paths(layout);
 for(const[path,node]of Object.entries(before))assert.equal(after[path],node,path);
 for(const[name,value]of snapshot)assert.deepEqual(find(layout,name),value,name);
 const stage=find(battle,'rewardStage');assert.equal(stage.visible,false);assert(find(stage,'v25RewardPaper'));
 assert(find(stage,'v25RewardField'));assert.equal(find(battle,'skip').kind,'presetButton');
 for(const state of parts(find(battle,'skip')))assert(find(state,'v25StateChrome'));
 assert.equal(parts(battle).filter(n=>/^card\d+$/.test(n.name)).length,10);
 assertNativeUiCapacity(layout);
});

test('duplicate and malformed input fail before mutation and source gaps are explicit',()=>{
 const t=theme(),layout=nodeLayout(t);applyV25NodeLayout(layout,t);const snapshot=structuredClone(layout);
 assert.throws(()=>applyV25NodeLayout(layout,t),/already/);assert.deepEqual(layout,snapshot);
 const broken=nodeLayout(t);find(broken,'option4').children=find(broken,'option4').children.filter(n=>n.name!=='hit');
 const prior=structuredClone(broken);assert.throws(()=>applyV25NodeLayout(broken,t),/hit/);assert.deepEqual(broken,prior);
 for(const key of ['scriptSha256','stylesSha256'])assert.match(v25NodeSource[key],/^[a-f0-9]{64}$/);
 assert.match(v25NodeSource.differences,/portrait|人物/);assert.match(v25NodeSource.differences,/treasure|宝箱/);
});

test('standalone battle reward transform matches the full game and rejects duplicate application',()=>{
 const t=theme(),solo=battleLayout(),full=gameLayout(t);applyV25RewardLayout(solo,t);applyV25NodeLayout(full,t);
 const battle=find(full,'battlePanel');assert.deepEqual(find(solo,'rewardStage'),find(battle,'rewardStage'));
 assert.deepEqual(find(solo,'skip'),find(battle,'skip'));const before=structuredClone(solo);
 assert.throws(()=>applyV25RewardLayout(solo,t),/already/);assert.deepEqual(solo,before);assertNativeUiCapacity(solo);
});

test('isolated generated V25 nodes execute original shop, camp, event and chest transactions',t=>{
 const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});const directory=mkdtempSync(join(parent,'v25-node-layout-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));buildLuaData('data',join(directory,'abyss_data.lua'));buildUI(directory,undefined,{v25BattleChrome:true});
 const layout=JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8'));assert(find(layout,'v25NodeBackdrop'));
 const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4)),dir=directory.replaceAll('\\','/');
 const source=`package.path=${luaString(dir+'/?.lua;src/lua/?.lua')}
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(${luaString(dir)}..'/'..name..'.lua'))end
dofile('tests/lua/support/node_ui_cases.lua')(1,9)
dofile('tests/lua/support/node_ui_cases.lua')(13,22)
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local h,u,p,event,tap,finish=H.setup({'bludgeon'},{'acid_slime_s'})
tap('card1',40);tap('enemy1',40);finish()
assert(h.run.phase=='reward' and p:GetChild('rewardList').visible)
p:GetChild('cardReward').click()
assert(p:GetChild('rewardStage').visible and not p:GetChild('rewardList').visible)
local skip=p:GetChild('skip');assert(skip.interactable)
for _,state in ipairs({'normal','hover','pressed','disabled'})do
 local face=skip:GetChild(state)
 assert(not face:GetChild('border').visible and not face:GetChild('plate').visible,'legacy skip plate obscures native ellipse after real refresh')
 assert(face:GetChild('v25StateChrome') and face:GetChild('label').text=='跳过')
end
-- Existing SkipCardButton closes the picker; the unclaimed CARD row remains.
tap('skip',41);assert(not h.run.rewards.cardResolved and not p:GetChild('rewardStage').visible and p:GetChild('rewardList').visible)
print('V25_NODE_TRANSACTIONS_PASS')`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{encoding:'utf8',maxBuffer:4*1024*1024,
  env:{...process.env,LUA_PATH:dir+'/?.lua;src/lua/?.lua',LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));assert.match(result.stdout,/V25_NODE_TRANSACTIONS_PASS/);
});
