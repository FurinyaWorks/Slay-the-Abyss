import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {runLua} from '../scripts/test-lua.mjs';
import {mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

test('relic controller Confirm suppresses only its same-frame native Click across paging close and bar',()=>{
  buildLuaData();buildUI();
  const result=runLua('tests/lua/relic_view_controller_click.lua');
  assert.equal(result.status,0,result.stderr+result.stdout);
  assert.match(result.stdout,/RELIC_CONTROLLER_CLICK_PASS/);
});

test('official generated relic HUD uses native hover, raw counters and restores noncombat geometry',t=>{
  const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});
  const directory=mkdtempSync(join(parent,'relic-hud-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  buildLuaData('data',join(directory,'abyss_data.lua'));
  buildUI(directory,undefined,{officialAssets:true});
  const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
  const script=`local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
dofile('tests/lua/relic_view_controller_click.lua')`;
  const require=createRequire(import.meta.url);
  const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
    encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
  });
  assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
  assert.match(result.stdout,/RELIC_HUD_FEEDBACK_PASS/);
});
