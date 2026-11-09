import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {runLua} from '../scripts/test-lua.mjs';
import {componentPortraitInputPrelude} from './helpers/component-portrait-input.mjs';

test('full-source legacy portrait exposes a measurable partial reveal window',()=>{
  const fixture='tests/lua/support/component_portrait_diagnosis.lua';
  const build=resolve('build');mkdirSync(build,{recursive:true});
  const directory=mkdtempSync(join(build,'component-portrait-diagnosis-'));
  const script=join(directory,'diagnosis.lua');
  try {
    writeFileSync(script,componentPortraitInputPrelude(fixture)+`dofile('${fixture}')\n`);
    const result=runLua(script);
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/rows=4315 firstVisibleFrame=\d+ firstCompleteFrame=\d+ partialFrames=[1-9]\d*/);
    assert.match(result.stdout,/component-kit visual parity remains unverified/);
  } finally {
    unlinkSync(script);rmdirSync(directory);
  }
});
