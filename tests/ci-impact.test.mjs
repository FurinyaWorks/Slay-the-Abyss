import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync } from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {qualityShardMatrices} from '../scripts/ci-quality-shape.mjs';
import { spawnSync } from 'node:child_process';
import { impact } from '../scripts/ci-impact.mjs';
const timing = { js: { win32: {}, linux: {} }, lua: {}, unknownJsMs: 1000, unknownLuaMs: 1000 };
const event = { eventName: 'pull_request', base: 'develop' };
const sources = { 'scripts/value.mjs': 'export const value=1;', 'tests/value.test.mjs': 'import {value} from "../scripts/value.mjs";' };
test('complete mapped set is eligible; unknown, deleted, core and release changes require full', () => {
  const plan = impact(['scripts/value.mjs'], sources, event, timing);
  assert.equal(plan.mode, 'fast');
  assert.deepEqual(plan.js, ['tests/value.test.mjs']);
  for (const path of ['data/cards.json', 'src/lua/abyss_combat.lua', '.github/workflows/quality.yml', 'deleted.mjs', 'docs/design/UI_DESIGN.md'])
    assert.equal(impact([path], sources, event, timing).mode, 'full', path);
  for (const ev of [{ ...event, forceFull: true }, { ...event, base: 'master' }, { ...event, eventName: 'push' }, { ...event, eventName: 'workflow_dispatch' }])
    assert.equal(impact(['scripts/value.mjs'], sources, ev, timing).mode, 'full');
  assert.equal(impact([], sources, event, timing).mode, 'full');
  assert.equal(impact(['scripts/value.mjs'], sources, event, { ...timing, unknownJsMs: 180001 }).mode, 'full');
});
test('prose allowlist cannot hide additional unmodelled changes', () => {
  assert.equal(impact(['docs/CI.md'], sources, event, timing).mode, 'fast');
  assert.equal(impact(['docs/CI.md', 'unknown'], sources, event, timing).mode, 'full');
});

test('admission control changes require Full even with proven tiny affected tests',()=>{
 for(const name of ['arm-auto-merge','verify-delivery','pr-quality-evidence','publish-pr-quality',
  'publish-full-quality','publish-merge-group','merge-queue-admission','merge-queue-policy',
  'ci-impact','ci-fast','ci-timeout-policy','write-ci-receipt','repository-identity']){
  const path=`scripts/${name}.mjs`,input={[path]:'export const value=1;',
   'tests/value.test.mjs':`import {value} from "../${path}";`};
  const selected=impact([path],input,event,timing);
  assert.equal(selected.mode,'full',path);assert.equal(selected.reason,'High risk or shared infrastructure');
 }
});

test('registered UI responsibilities share eligibility with their parent; unknown modules stay full', () => {
  const module = 'src/lua/abyss_battle_render_actors.lua';
  const input = { [module]: 'return {}', 'tests/lua/view.lua': 'require("abyss_battle_render_actors")' };
  const plan = impact([module], input, event, timing);
  assert.equal(plan.mode, 'fast');
  assert.deepEqual(plan.lua, ['tests/lua/view.lua']);
  for (const path of ['src/lua/abyss_new_unclassified.lua', 'src/lua/abyss_combat.lua', 'config/architecture.json'])
    assert.equal(impact([path], { ...input, [path]: 'return {}' }, event, timing).mode, 'full');
});
test('parallel platforms budget their complete selected sets, including identical Lua cost', () => {
  const input = {
    'scripts/value.mjs': 'export const value=1;',
    'tests/a.test.mjs': 'import "../scripts/value.mjs";',
    'tests/b.test.mjs': 'import "../scripts/value.mjs";',
    'tests/lua/check.lua': 'return true',
  };
  const weights = { ...timing, js: {
    win32: { 'tests/a.test.mjs': 120000, 'tests/b.test.mjs': 10000 },
    linux: { 'tests/a.test.mjs': 10000, 'tests/b.test.mjs': 120000 },
  }, lua: { 'tests/lua/check.lua': 50000 } };
  const changed = ['scripts/value.mjs', 'tests/lua/check.lua'];
  const plan = impact(changed, input, event, weights);
  assert.equal(plan.mode, 'fast', 'cross-platform slow files do not execute serially on one VM');
  assert.deepEqual(plan.js, ['tests/a.test.mjs', 'tests/b.test.mjs']);
  assert.deepEqual(plan.lua, ['tests/lua/check.lua']);
  assert.equal(plan.estimateMs, 180000);
  assert.deepEqual(plan.estimateByPlatformMs, { win32: 180000, linux: 180000 });
  for (const platform of ['win32', 'linux']) {
    const over = structuredClone(weights);
    over.js[platform]['tests/a.test.mjs']++;
    const full = impact(changed, input, event, over);
    assert.equal(full.mode, 'full', `${platform} alone exceeding budget must reject Fast`);
    assert.equal(full.estimateByPlatformMs[platform], 180001);
    assert.equal(full.estimateMs, 180001);
  }
  assert.equal(impact([...changed, 'unknown'], input, event, weights).mode, 'full');
  assert.equal(impact([...changed, 'src/lua/abyss_combat.lua'], input, event, weights).mode, 'full');
});
test('actual required gate commands reject every missing, failed, cancelled or skipped selected execution', () => {
  const workflow = readFileSync('.github/workflows/quality.yml', 'utf8').replaceAll('\r\n', '\n');
  const shell = process.platform === 'win32' ? `${process.env.ProgramFiles}/Git/bin/bash.exe` : '/bin/bash';
  for (const job of ['check', 'engineering-posix']) {
    const body = (workflow + '\n  end:\n').match(new RegExp(`^  ${job}:\\n([\\s\\S]*?)(?=^  [\\w-]+:)`, 'm'))[1];
    const command = body.match(/^        run: \|\n((?:^          .*\n|^\n)*)/m)[1].trim().replaceAll('${{ needs.impact.result }}', '$PLAN').replaceAll('${{ needs.impact.outputs.mode }}', '$MODE').replaceAll('${{ needs.fast.result }}', '$FAST');
    for (const mode of ['full', 'fast', '']) for (const result of ['success', 'failure', 'cancelled', 'skipped', '']) {
      const r = spawnSync(shell, ['-e', '-c', command], { env: { ...process.env, PLAN: 'success', MODE: mode, FAST: result, RULES_RESULT: result, ENGINEERING_RESULT: result }, encoding: 'utf8' });
      assert.ifError(r.error);
      assert.equal(r.status === 0, mode !== '' && result === 'success', `${job}/${mode}/${result}: ${r.stderr}`);
    }
    for (const status of ['failure', 'cancelled', 'skipped', '']) for (const mode of ['fast', 'full']) {
      const r = spawnSync(shell, ['-e', '-c', command], { env: { ...process.env, PLAN: status, MODE: mode, FAST: 'success', RULES_RESULT: 'success', ENGINEERING_RESULT: 'success' }, encoding: 'utf8' });
      assert.ifError(r.error);
      assert.notEqual(r.status, 0, `${job}/${mode} cannot accept ${status || 'missing'} plan`);
    }
    // A status function still runs the gate on failed/skipped dependencies;
    // cancellation must release obsolete runs instead of queuing a summary.
    assert.match(body, /^    if: \$\{\{ !cancelled\(\) \}\}$/m);
  }
});

test('actual impact CLI routes Full Fast unknown and merge-group through the complete current matrices',()=>{
 const root=mkdtempSync(join(tmpdir(),'impact-posix15-')),cli=resolve('scripts/ci-impact.mjs');
 const git=(...args)=>{const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.ifError(result.error);assert.equal(result.status,0,result.stderr);return result.stdout.trim();};
 try{
  for(const dir of ['src/lua','scripts','tests','docs'])mkdirSync(join(root,dir),{recursive:true});
  writeFileSync(join(root,'scripts/ci-test-timings.json'),JSON.stringify(timing));
  writeFileSync(join(root,'docs/CI.md'),'initial\n');
  git('init','--quiet');git('add','.');git('-c','user.name=CI Fixture','-c','user.email=ci@example.invalid','commit','--quiet','-m','initial');
  const base=git('rev-parse','HEAD'),head='a'.repeat(40),ref='refs/heads/gh-readonly-queue/develop/pr-1-fixture';
  for(const scenario of [
   {name:'fast',file:'docs/CI.md',mode:'fast'},
   {name:'full',file:'scripts/ci-quality-shape.mjs',mode:'full'},
   {name:'unknown',file:'unmapped-input',mode:'full'},
   {name:'merge-group',mode:'full',eventName:'merge_group'},
  ]){
   git('reset','--hard',base);git('clean','-fd');
   if(scenario.file){writeFileSync(join(root,scenario.file),'changed\n');git('add','.');git('-c','user.name=CI Fixture','-c','user.email=ci@example.invalid','commit','--quiet','-m',scenario.name);}
   // git does not retain empty directories. The real CLI still scans its three source roots.
   for(const dir of ['src/lua','scripts','tests'])mkdirSync(join(root,dir),{recursive:true});
   const eventPath=join(root,'event.json'),output=join(root,'output'),summary=join(root,'summary');
   const event=scenario.eventName?{action:'checks_requested',merge_group:{head_sha:head,base_sha:base,head_ref:ref,base_ref:'refs/heads/develop'}}:{pull_request:{base:{sha:base,ref:'develop'},head:{sha:head},labels:[]}};
   writeFileSync(eventPath,JSON.stringify(event));
   const env={...process.env,GITHUB_EVENT_PATH:eventPath,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary,GITHUB_EVENT_NAME:scenario.eventName??'pull_request',GITHUB_SHA:head,GITHUB_REF:ref,GITHUB_RUN_ID:'7',GITHUB_RUN_ATTEMPT:'1'};
   const actual=spawnSync(process.execPath,[cli],{cwd:root,env,encoding:'utf8'});assert.ifError(actual.error);assert.equal(actual.status,0,scenario.name+': '+actual.stderr);
   const plan=JSON.parse(readFileSync(join(root,'ci-impact.json'),'utf8'));assert.equal(plan.mode,scenario.mode);assert.equal(plan.sha,head);
   const emitted=Object.fromEntries(readFileSync(output,'utf8').trim().split('\n').map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
   assert.equal(emitted.mode,scenario.mode);assert.deepEqual(JSON.parse(emitted.windows_shards),qualityShardMatrices.windows);assert.deepEqual(JSON.parse(emitted.posix_shards),qualityShardMatrices.posix);
   assert.equal(JSON.parse(emitted.windows_shards).length,17);assert.equal(JSON.parse(emitted.posix_shards).length,15);
   if(scenario.eventName){
    writeFileSync(eventPath,JSON.stringify({...event,merge_group:{...event.merge_group,head_sha:'b'.repeat(40)}}));
    const denied=spawnSync(process.execPath,[cli],{cwd:root,env,encoding:'utf8'});assert.ifError(denied.error);assert.notEqual(denied.status,0);assert.match(denied.stderr,/Invalid native merge group identity/);
   }
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
