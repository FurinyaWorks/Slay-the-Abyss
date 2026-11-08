import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runLua} from '../scripts/test-lua.mjs';
import {luaString} from '../scripts/build-lua-data.mjs';
import {runStatic,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {discoverSources,measureSources} from '../scripts/lua-quality-metrics.mjs';
const file='src/lua/abyss_enemy_ai.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const frozen=read('tests/fixtures/enemy-ai-lifecycle-before.lua');
const names=['M.initialize','M.advance','initializeScriptedPolicy','initializeAct1Policy',
  'initializeOpeningPolicy','advanceShield','advanceCharge','advanceSleepCycle','advanceAct1Policy','advanceFixedPolicy'];
function replay(source){
  const dir=mkdtempSync(join(tmpdir(),'enemy-lifecycle-'));
  try{
    const path=join(dir,'driver.lua');
    writeFileSync(path,`ABYSS_ENEMY_TRACE=true\npackage.preload.abyss_enemy_ai=function() return assert(load(${luaString(source)},'enemy-lifecycle-source'))() end\ndofile('tests/lua/enemy_ai_lifecycle.lua')\n`);
    return runLua(path,{maxBuffer:4*1024*1024});
  }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Enemy AI full frozen source remains authenticated to develop d8a57cae',()=>{
  assert.equal(createHash('sha256').update(frozen).digest('hex'),'3bfec14ef91be048c5fce7d807955c0c24beda4b98da27b91b1aff12a1ff5bf2');
});
test('independent old/new VMs preserve policy precedence, all reads, writes, RNG, returns and errors',()=>{
  const before=replay(frozen),after=replay(read(file));
  for(const r of [before,after]){assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/ENEMY_LIFECYCLE_PASS 79/);}
  assert.equal(after.stdout,before.stdout);
});
test('Enemy lifecycle production gates require each helper and reject old hotspots',()=>{
  const sources=discoverSources(),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics;
  const measured=measureSources(sources,diagnostics);assert.deepEqual(measured.errors,[]);
  const module=measured.modules.find(m=>m.file===file);
  for(const name of names){
    const rows=module.functions.filter(f=>f.name===name);assert.equal(rows.length,1,name);
    assert(rows[0].complexity<=(name==='M.initialize'?21:15),name);
    const removed=diagnostics.filter(d=>!(d.file===file && d.message.includes(`function '${name}'`)));
    assert(reviewResponsibilityComplexity(removed,sources).errors.some(e=>e.file===file&&e.message.includes('entry missing')),name);
    const excessive=diagnostics.map(d=>d.file===file&&d.message.includes(`function '${name}'`)?{...d,message:d.message.replace(/\(\d+ > 0\)/,`(${name==='M.initialize'?40:43} > 0)`)}:d);
    assert(reviewResponsibilityComplexity(excessive,sources).errors.some(e=>e.file===file&&e.message.includes('exceeds')),name);
  }
  assert.deepEqual(reviewResponsibilityComplexity(diagnostics,sources).errors,[]);
});
for(const [name,from,to]of [
  ['opening roll','random(state, enemy.ai.rollRange)\n    select(enemy, enemy.ai.attackIntent)','-- roll removed\n    select(enemy, enemy.ai.attackIntent)'],
  ['shield living allies','alive > 1','alive > 2'],
  ['sleep natural wake','enemy.aiTurns < enemy.ai.sleepTurns','enemy.aiTurns <= enemy.ai.sleepTurns'],
  ['delegated multi-return','return JawWorm.initialize(state, enemy, random)','JawWorm.initialize(state, enemy, random); return'],
  ['delegated graph alias','return JawWorm.advance(state, enemy, random)','local a,b,c,d,e,f,g=JawWorm.advance(state, enemy, random); return a,b,c,{payload=d.payload,owner=d.owner},e,f,g'],
  ['callback identity','return Sentry.initialize(state, enemy, random, Actors.applyPower)','return Sentry.initialize(state, enemy, random, function(...) return Actors.applyPower(...) end)'],
  ['queue owner death','enemy.hp > 0 or (enemy.ai and queuedRoll[enemy.ai.kind])','enemy.hp > 0'],
])test(`Enemy behavioral differential rejects mutation: ${name}`,()=>{
  const source=read(file);assert.equal(source.split(from).length,2);
  const before=replay(frozen),after=replay(source.replace(from,to));
  assert.equal(before.status,0,before.stdout+before.stderr);
  if(after.status!==0)assert.match(after.stdout+after.stderr,/\[ENEMY_LIFECYCLE\]/);
  else assert.notEqual(after.stdout,before.stdout,'behavior mutant survived');
});

test('Enemy raw regression remains concise and nested lifecycle callbacks cannot escape budgets',()=>{
  const raw=runLua('tests/lua/enemy_ai_lifecycle.lua');
  assert.equal(raw.status,0,raw.stdout+raw.stderr);assert.match(raw.stdout,/ENEMY_LIFECYCLE_PASS 79/);
  assert(Buffer.byteLength(raw.stdout)<1024);
  const source='local function advanceShield() return function() end end';
  const row=(column,subject,cc)=>({file,line:1,column,code:'W561',message:`cyclomatic complexity of ${subject} is too high (${cc} > 0)`});
  const diagnostics=[row(1,'main chunk',1),row(7,"function 'advanceShield'",6),row(source.indexOf('function()')+1,'function',16)];
  const errors=reviewResponsibilityComplexity(diagnostics,{[file]:source}).errors;
  assert(errors.some(e=>e.file===file&&e.message.includes('16 exceeds 15')));
});
