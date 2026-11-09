import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root=resolve('.');
const work=mkdtempSync(join(tmpdir(),'figma-nested-negative-'));
try {
 const source=join(work,'source');
 cpSync(join(root,'experiments/figma-map-native-spike'),source,{recursive:true});
 const file=join(source,'tests/inspector-pointer.test.mjs');
 writeFileSync(file,readFileSync(file,'utf8')+"\ntest('injected nested rejection',()=>assert.fail('FIGMA_EXPECTED_NESTED_FAILURE'));\n");
 const old=spawnSync(process.execPath,['--test','--test-reporter=tap',file],{env:{...process.env,NODE_TEST_CONTEXT:'child-v8'},encoding:'utf8',timeout:30000});
 console.log('OLD_CONTEXT_EXIT',old.status,old.stdout,old.stderr);
 assert.ifError(old.error);assert.equal(old.status,0);assert.match(old.stderr,/skipping running files/);assert.doesNotMatch(old.stdout,/FIGMA_EXPECTED_NESTED_FAILURE/);
 const wrapper=join(root,'.artifacts/round20/nested-negative-wrapper.mjs');
 const original=readFileSync(join(root,'tests/figma-map-native-spike.test.mjs'),'utf8');
 writeFileSync(wrapper,original.replace("const root = fileURLToPath(new URL('..', import.meta.url));",'const root = '+JSON.stringify(root)+';').replace("const source = join(root, 'experiments/figma-map-native-spike');",'const source = '+JSON.stringify(source)+';'));
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap',wrapper],{cwd:root,env,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 console.log('NEW_WRAPPER_EXIT',result.status,result.stdout,result.stderr);
 assert.ifError(result.error);assert.notEqual(result.status,0);assert.match(result.stdout,/FIGMA_EXPECTED_NESTED_FAILURE/);assert.match(result.stdout,/javascript-regressions/);assert.doesNotMatch(result.stdout,/lua-regressions:/);assert.doesNotMatch(result.stderr,/skipping running files/);
 rmSync(wrapper);
 console.log('NESTED_NEGATIVE_PASS old false green -> current real failure, before Lua stage');
} finally { rmSync(work,{recursive:true,force:true}); }
