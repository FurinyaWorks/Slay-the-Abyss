import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {preparationVm} from '../../../tests/helpers/warrior-status-preparation-vm.mjs';
const file='src/lua/abyss_warrior_status_cards.lua';
const raw=readFileSync(file,'utf8');
const test=readFileSync('tests/warrior-status-preparation.test.mjs','utf8');
const mutants=runInNewContext(test.match(/const mutants=(\[[\s\S]*?\n \]);/)[1]);
assert.equal(mutants.length,6);
const canonical=raw.replaceAll('\r\n','\n');
const graphs=[];const results=[];
for(const [label,eol] of [['LF','\n'],['CRLF','\r\n']]){
 const source=canonical.replaceAll('\n',eol);
 const clean=preparationVm(source);assert.equal(clean.status,0,clean.error);assert.equal(clean.graphs.length,68);graphs.push(clean);
 for(const [from,to,marker] of mutants){
  const anchor=from.replaceAll('\n',eol),replacement=to.replaceAll('\n',eol);
  assert.equal(source.split(anchor).length,2);
  // The retained uniqueness contract must reject both missing and duplicated anchors.
  assert.throws(()=>assert.equal(source.replace(anchor,'').split(anchor).length,2));
  assert.throws(()=>assert.equal((source+eol+anchor).split(anchor).length,2));
  const mutant=source.replace(anchor,replacement);assert.notEqual(mutant,source);
  const result=preparationVm(mutant);assert.notEqual(result.status,0);assert(result.error.includes('STATUS_SEMANTIC '+marker),result.error);
  results.push({label,marker,error:result.error});
 }
}
assert.deepEqual(graphs[0],graphs[1]);
// This probe never writes production.
writeFileSync('docs/evidence/m7-warrior-status-crlf-20261110/independent-eol-probe.json',JSON.stringify({platform:process.platform,cleanGraphsPerEol:68,cleanLfCrlfEquivalent:true,mutants:results,missingAndDuplicateAnchorRejections:24},null,2)+'\n');
console.log('PASS: two clean 68-graph executions equivalent; 12 real semantic mutants killed; 24 absent/duplicate anchor guards rejected. Linux in-memory probe only.');
