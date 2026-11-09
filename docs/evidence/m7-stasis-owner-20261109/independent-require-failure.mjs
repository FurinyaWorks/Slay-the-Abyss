import assert from 'node:assert/strict';
import {sources,runStasis} from '../../../tests/helpers/stasis-owner-vm.mjs';
import {writeFileSync} from 'node:fs';
const fixture='docs/evidence/m7-stasis-owner-20261109/independent-require-failure.lua';
const before=runStasis(sources(true),fixture),after=runStasis(sources(),fixture);
for(const result of [before,after])assert.equal(result.status,0,result.error);
assert.deepEqual(after,before);
writeFileSync('docs/evidence/m7-stasis-owner-20261109/independent-require-failure.json',JSON.stringify({pass:true,fixture,independentVMs:2,completeGraphsEqual:true,scope:'Lazy require failure identity, death prefix, custody retention, and queue placement. Not Full.'},null,2)+'\n');
console.log('Independent loader-failure before/after graph parity PASS');
