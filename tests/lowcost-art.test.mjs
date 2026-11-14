import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {loadLowCostArt} from '../scripts/lowcost-art.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {runLua} from '../scripts/test-lua.mjs';
const require=createRequire(import.meta.url);
test('authored art covers every placeholder relic and every two-act enemy within small fixed pools',()=>{
 const art=loadLowCostArt(),id=v=>typeof v==='object'?v.id:v;
 const relics=JSON.parse(readFileSync('data/relics.json','utf8')).relics;
 const wanted=relics.filter(r=>id(nativeTheme.officialAssets.battleRelicIcons[r.id]??nativeTheme.icon.relic[r.id])===102028).map(r=>r.id).sort();
 assert.deepEqual(Object.keys(art.relic.assets).sort(),wanted);
 assert.deepEqual(Object.keys(art.enemy.assets).sort(),Object.keys(nativeTheme.icon.enemy).filter(id=>id!=='verify').sort());
 for(const registry of Object.values(art))for(const asset of Object.values(registry.assets)){
  assert(asset.shapes.length<=registry.capacity);
  for(const s of asset.shapes){
   const angle=(s.rotation??0)*Math.PI/180;
   assert(Math.abs(s.x)+(Math.abs(s.w*Math.cos(angle))+Math.abs(s.h*Math.sin(angle)))/2<=50.01,asset.name+' horizontal bounds');
   assert(Math.abs(s.y)+(Math.abs(s.h*Math.cos(angle))+Math.abs(s.w*Math.sin(angle)))/2<=50.01,asset.name+' vertical bounds');
  }
 }
});
test('real imported pools switch all illustrations, retain fallback on failure, and do not repaint cached shapes',()=>{
 const out=mkdtempSync(join(tmpdir(),'abyss-lowcost-'));
 buildUI(out,undefined,{officialAssets:true,nativePageLifecycle:true});
 const init=`package.path=${JSON.stringify(out.replaceAll('\\','/')+'/?.lua;'+resolve('build/lua').replaceAll('\\','/')+'/?.lua;'+resolve('src/lua').replaceAll('\\','/')+'/?.lua')};dofile('tests/lua/lowcost_art.lua')`;
 const r=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',init],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(r.status,0,r.stdout+r.stderr+String(r.error??''));assert.match(r.stdout,/LOWCOST_ART_PASS 88 42/);
});

test('default Quick Lua entry exercises fallback without installing official pools',()=>{
 const r=runLua('tests/lua/lowcost_art.lua');
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/LOWCOST_ART_DEFAULT_FALLBACK_PASS/);
 assert.doesNotMatch(r.stdout,/LOWCOST_ART_PASS 88 42/);
});
