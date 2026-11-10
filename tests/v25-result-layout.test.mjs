import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {assertNativeUiCapacity,buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {mkdtempSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {applyV25ResultLayout,v25ResultReference,v25ResultRuntimeLayout} from '../scripts/v25-result-layout.mjs';
const children=n=>n?.controls??n?.children??[];
const get=(n,name)=>children(n).find(c=>c.name===name);
const all=n=>[n,...children(n).flatMap(all)];
const paths=(n,p='',m=new Map())=>{m.set(p,n);for(const c of children(n))paths(c,p+'/'+c.name,m);return m;};
const build=wrapped=>wrapped?withViewport(gameLayout(),nativeTheme):gameLayout();
const menu=l=>get(get(l,'stage')??l,'menuPanel');
const frame=(x,y,w,h)=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});

test('real V25 Host binds six result rows and button states while retaining menu and settlement transactions',t=>{
 const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});
 const dir=mkdtempSync(join(parent,'v25-result-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 buildLuaData('data',join(dir,'abyss_data.lua'));buildUI(dir,undefined,{v25BattleChrome:true});
 const generated=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const source=`
local directory=${luaString(dir.replaceAll('\\','/'))}
package.path=directory..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(generated)})do package.preload[name]=assert(loadfile(directory..'/'..name..'.lua'))end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local calls=0
local cursor={CursorEnter='enter',CursorExit='exit',CursorDown='down',CursorUp='up'}
local h,root=F.fixture(nil,function()calls=calls+1;return true end,nil,cursor)
local menu=root:GetChild('menuPanel');local start=menu:GetChild('start')
assert(start:GetChild('label').text=='开始游戏')
local quit=menu:GetChild('titleQuit')
quit:GetChild('hit').listeners.down({touchId=1});quit:GetChild('hit').listeners.up({touchId=1})
assert(quit:GetChild('hit').click({touchId=1}) and h.exitOpen and calls==0)
assert(h:closeExit() and calls==0)
assert(F.start(h));h.run.phase='victory';h.run.ending='two_act_complete';h.run.hp=23
h.run.victories=16;h.run.elapsedSeconds=2440;h.map.floor=34;h:refresh();h:update(1)
local result=menu:GetChild('result')
assert(result.visible and not quit.visible and start:GetChild('label').text=='重新启程')
assert(start:GetChild('hit').size[1]==176 and start:GetChild('hit').size[2]==53,'menu hit bounds leaked into restart')
assert(result:GetChild('stat_relics'):GetChild('value').text==tostring(#h.run.relics))
assert(result:GetChild('stat_health'):GetChild('value').text=='23 / '..tostring(h.run.maxHp))
assert(result:GetChild('stat_time'):GetChild('value').text=='40:40')
local positions=require('abyss_theme').layout.v25Result.positions
for i,key in ipairs({'floor','victories','time','deck','relics','health'})do
 local row=result:GetChild('stat_'..key);assert(row.x==positions[i][1] and row.y==positions[i][2],'legacy entrance overwrote result row '..key)
end
local settle=menu:GetChild('settle');local hit=settle:GetChild('hit');local face=settle:GetChild('v25Face')
hit.listeners.enter({touchId=2});assert(face:GetChild('hover').visible)
hit.listeners.down({touchId=2});assert(face:GetChild('pressed').visible and calls==0)
hit.listeners.up({touchId=2});assert(face:GetChild('hover').visible and calls==0)
assert(hit.click({touchId=2}) and calls==1 and h.settlementRequested)
assert(face:GetChild('disabled').visible and not settle:GetChild('normal').visible)
assert(not hit.click({touchId=2}) and calls==1)
print('V25_RESULT_RUNTIME_PASS')
`;
 const require=createRequire(import.meta.url);
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{cwd:process.cwd(),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));assert.match(result.stdout,/V25_RESULT_RUNTIME_PASS/);
});

test('result layout preserves every live result and transaction object and introduces no input',()=>{
 for(const wrapped of [true,false]){
  const layout=build(wrapped),before=paths(layout),inputs=all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind));
  const battle=structuredClone(get(get(layout,'stage')??layout,'battlePanel'));
  applyV25ResultLayout(layout,nativeTheme);
  const after=paths(layout);for(const [path,node]of before)assert.equal(after.get(path),node,path);
  assert.deepEqual(all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind)),inputs);
  assert.deepEqual(get(get(layout,'stage')??layout,'battlePanel'),battle);
  assertNativeUiCapacity(layout);
 }
});
test('measured six-row composition preserves dynamic values and exposes genuinely empty new bindings',()=>{
 const l=build(true),m=menu(l),r=get(m,'result');
 get(get(r,'stat_floor'),'value').text.content='真实楼层';get(r,'detail').text.content='真实结算';
 applyV25ResultLayout(l,{...nativeTheme,v25Result:{supportHeading:'批准标题',supportBody:'批准文案'}});
 const keys=['floor','victories','time','deck','relics','health'];
 for(let i=0;i<keys.length;i++){
  const row=get(r,'stat_'+keys[i]),y=i===5?463.5:258+i*35;
  assert.deepEqual(row.position,frame(493,y,294,35).position);
  assert.equal(get(row,'label').text.align,'left');assert.equal(get(row,'value').text.align,'right');
  assert.equal(get(row,'value').text.fontSize,23);
  assert(get(row,'value').size[1]>=46);assert(get(row,'label').size[1]>=46);
 }
 assert.equal(get(get(r,'stat_floor'),'value').text.content,'真实楼层');
 for(const key of ['relics','health'])assert.equal(get(get(r,'stat_'+key),'value').text.content,'');
 assert.equal(get(r,'detail').text.content,'真实结算');
 assert.equal(get(get(r,'v25ResultChrome'),'supportHeading').text.content,'批准标题');
 assert.deepEqual(get(r,'subtitle').position,v25ResultRuntimeLayout.subtitle.slice(0,2));
 assert.deepEqual(get(m,'title').position,v25ResultRuntimeLayout.title.slice(0,2));
 assert(children(m).indexOf(get(m,'title'))>children(m).indexOf(r),'full result backdrop covers the shared title');
});
test('existing hits receive distinct four-state native hex decoration without prototype transaction copy',()=>{
 const l=build(true);applyV25ResultLayout(l,nativeTheme);const m=menu(l);
 for(const [key,rect]of [['start',[342,599,176,53]],['settle',[542,590.5,204,70]]]){
  const b=get(m,key),hit=get(b,'hit');assert.deepEqual(b.position,frame(...rect).position);
  assert.deepEqual(hit.size,rect.slice(2));
  assert.equal(hit.kind,'cursorArea');assert.equal(hit.children,undefined);
  const face=get(b,'v25Face');assert.deepEqual(children(face).map(s=>s.name),['normal','hover','pressed','disabled']);
  assert.equal(new Set(children(face).map(s=>JSON.stringify(s.children))).size,4);
  assert.equal(children(b).at(-1),get(b,'label'));
 }
 const strings=all(l).flatMap(n=>n.text?[n.text.content]:[]).join('\n');
 assert(!strings.includes('原型演示'));assert(!strings.includes('独立结算样例'));assert(!strings.includes('浏览器原型不会提交战绩'));
});
test('unbound reference subject and outcome HUD remain empty, hidden and explicitly unverified',()=>{
 const unboundTheme={...nativeTheme,v25Result:{}};
 const l=build(true);applyV25ResultLayout(l,unboundTheme);const r=get(menu(l),'result'),c=get(r,'v25ResultChrome');
 const subject=get(c,'subject');assert.equal(subject.visible,false);assert.deepEqual(subject.children,[]);
 assert.equal(get(c,'supportBody').text.content,'');
 for(const name of ['name','hp','gold','floor','deck'])assert.equal(get(get(c,'hud'),name).text.content,'');
 const snapshot=structuredClone(l);applyV25ResultLayout(l,unboundTheme);assert.deepEqual(l,snapshot);
 assert.equal(v25ResultReference.stylesSha256,'fd155f1e98942f7eff6eacc35c0ca619705cd3f94aca12a22297c8f51cc8ace8');
 assert(v25ResultReference.unverified.includes('outcome-subject-binding'));
});
