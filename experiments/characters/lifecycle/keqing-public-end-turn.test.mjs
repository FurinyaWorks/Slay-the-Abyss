import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {buildLuaData,luaString} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('real public endTurn and Codex continuation preserve whole-command snapshots',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/keqing-public-end-turn.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KEQING_PUBLIC_END_TURN_PASS/);
});
test('unchanged legacy full event and actor graph traces match exact develop',()=>{
 const dir=mkdtempSync(join(tmpdir(),'liyue-legacy-'));
 try{
  for(const name of ['abyss_combat','abyss_combat_effect_powers'])writeFileSync(join(dir,name+'.lua'),execFileSync('git',['show',`903bf2a31e91f10fb24763ab4cea23d586d0bb83:src/lua/${name}.lua`]));
  const current=runLua('experiments/characters/lifecycle/legacy-end-turn-trace.lua',{timeout:30000,maxBuffer:10*1024*1024});
  const wrapper=join(dir,'prior.lua');writeFileSync(wrapper,`LEGACY_ROOT=${luaString(dir)}\ndofile('experiments/characters/lifecycle/legacy-end-turn-trace.lua')\n`);
  const prior=runLua(wrapper,{timeout:30000,maxBuffer:10*1024*1024});
  assert.equal(current.status,0,current.stdout+current.stderr);assert.equal(prior.status,0,prior.stdout+prior.stderr);
  assert.equal(current.stdout,prior.stdout,'complete ordered events + actor/pile graph must match');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
