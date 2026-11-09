import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const path='tests/ci-complete-calibration.test.mjs',prefix='docs/evidence/m7-stasis-owner-20261109/independent-ci-';
const original=readFileSync(path,'utf8');
const relocated=original.replace(/from '([^']+)'/g,(whole,ref)=>ref.startsWith('.')?`from '${new URL(ref,pathToFileURL(resolve(path))).href}'`:whole).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(resolve(path)).href));
const variants=[['control',s=>s],['missing-inventory',s=>s.replace('discoverJs as actualDiscoverJs','discoverJs as originalDiscoverJs')+'\nconst actualDiscoverJs=(...args)=>originalDiscoverJs(...args).slice(1);'],['changed-unknown',s=>s.replace('timings as liveCurrentTimings','timings as originalLiveTimings')+'\nconst liveCurrentTimings=structuredClone(originalLiveTimings);liveCurrentTimings.unknownJsMs=9999;'],['changed-old-floor',s=>s.replace('timings as liveCurrentTimings','timings as originalLiveTimings')+'\nconst liveCurrentTimings=structuredClone(originalLiveTimings);liveCurrentTimings.jsPlanning.localLowerBounds[Object.keys(liveCurrentTimings.jsPlanning.localLowerBounds)[0]].durationMs--;'],['historical-shape-as-current',s=>s.replace('qualityShardMatrices as currentQualityShardMatrices','qualityShardMatrices as originalMatrices')+'\nconst currentQualityShardMatrices={...originalMatrices,posix:originalMatrices.posix.slice(0,14)};']];
const results=[];
for(const [name,mutate]of variants){
 const file=prefix+name+'.mjs';writeFileSync(file,mutate(relocated));
 const r=spawnSync(process.execPath,['--test','--test-name-pattern=^Stasis803 retains',file],{encoding:'utf8',timeout:30000});
 writeFileSync(prefix+name+'.log',r.stdout+r.stderr);unlinkSync(file);
 assert.equal(r.error,undefined,name);assert.equal(r.signal,null,name);
 assert.equal(r.status,name==='control'?0:1,name+'\n'+r.stdout+r.stderr);
 if(name!=='control'){assert.match(r.stdout,/ERR_ASSERTION/);assert.doesNotMatch(r.stdout,/ReferenceError|SyntaxError|ERR_MODULE_NOT_FOUND/);}
 results.push({name,status:r.status,expected:name==='control'?'pass':'assertion rejection',log:prefix+name+'.log'});
}
writeFileSync(prefix+'results.json',JSON.stringify({scope:'One exact current Stasis803 contract, relocated imports. Four input-only negatives. Original tests unchanged; not Full.',results},null,2)+'\n');console.log(JSON.stringify(results));
