import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,unlinkSync,rmdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
import {runLua} from '../scripts/test-lua.mjs';
import {componentPortraitInputPrelude} from './helpers/component-portrait-input.mjs';

const frozen=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/component-portrait-before.json.gz',import.meta.url))));
const hash=source=>createHash('sha256').update(source).digest('hex');
assert.equal(frozen.sourceCommit,'ae71692631e5a84c9716ea291dd1b32aa87281e0');
assert.equal(frozen.path,'src/lua/abyss_traveler_portraits.lua');
assert.equal(frozen.sha256,'e22fd53b643c6da54ab1a1d7228b581f1775546287a6c0743b9460ff6b89cf9f');
assert.equal(hash(frozen.source),frozen.sha256);
assert.equal(frozen.gitBlob,'8206756298b4420b9857672128a320c752723ae3');
assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(frozen.source)}\0`).update(frozen.source).digest('hex'),frozen.gitBlob);

for(const nativeLifecycle of [false,true])test(`original 4315 primitives reveal atomically, including resume (native lifecycle ${nativeLifecycle})`,()=>{
  const fixture='tests/lua/support/component_portrait_diagnosis.lua';
  const build=resolve('build');mkdirSync(build,{recursive:true});
  const directory=mkdtempSync(join(build,'component-portrait-diagnosis-'));
  const script=join(directory,'diagnosis.lua');
  try {
    const candidate=readFileSync('src/lua/abyss_traveler_portraits.lua','utf8');
    const run=(source,atomic)=>{
      writeFileSync(script,componentPortraitInputPrelude(fixture,{nativeLifecycle})+
        `ABYSS_EXPECT_ATOMIC=${atomic};package.loaded.abyss_traveler_portraits=nil;package.preload.abyss_traveler_portraits=function()\n${source}\nend\ndofile('${fixture}')\n`);
      const result=runLua(script,{maxBuffer:4*1024*1024});
      assert.equal(result.status,0,result.stderr);
      const metrics=/rows=4315 firstVisibleFrame=(\d+) firstCompleteFrame=(\d+) partialFrames=(\d+)/.exec(result.stdout);
      assert(metrics,'missing original art reveal metrics');
      const snapshot=/PORTRAIT_FINAL_STATE_BEGIN\r?\n([\s\S]+?)\r?\nPORTRAIT_FINAL_STATE_END/.exec(result.stdout);
      assert(snapshot,'missing exact final primitive/transform state');
      return {firstVisibleFrame:Number(metrics[1]),firstCompleteFrame:Number(metrics[2]),partialFrames:Number(metrics[3]),snapshot:snapshot[1]};
    };
    const before=run(frozen.source,false),after=run(candidate,true);
    assert(before.partialFrames>0,'frozen original implementation must fail complete-reveal invariant');
    assert.equal(after.partialFrames,0);
    assert.equal(after.firstVisibleFrame,after.firstCompleteFrame);
    assert.equal(after.snapshot,before.snapshot,'all original image/container properties and host pose must remain equal');
    console.log('H1_SAME_SOURCE',JSON.stringify({nativeLifecycle,before:{firstVisibleFrame:before.firstVisibleFrame,firstCompleteFrame:before.firstCompleteFrame,partialFrames:before.partialFrames},
      after:{firstVisibleFrame:after.firstVisibleFrame,firstCompleteFrame:after.firstCompleteFrame,partialFrames:after.partialFrames},
      beforeSourceSha256:frozen.sha256,afterSourceSha256:hash(candidate),finalPrimitiveStateSha256:hash(after.snapshot)}));
  } finally {
    unlinkSync(script);rmdirSync(directory);
  }
});

test('atomic original portrait publication retains failure and reentry protection',()=>{
  const result=runLua('tests/lua/support/component_portrait_atomic_failures.lua');
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/PASS portrait final publication false\/throw, reentrant cancellation\/restart and engine teardown/);
});
