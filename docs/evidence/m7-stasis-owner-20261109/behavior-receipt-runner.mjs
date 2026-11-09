import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=[];function walk(p){for(const e of readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else if(e.isFile())paths.push(f);}}
walk('src/lua');walk('build/lua');
paths.push('tests/lua/death_power_order.lua','tests/helpers/lua-graph-observer.mjs','scripts/build-lua-data.mjs','tests/stasis-owner-behavior.test.mjs','package-lock.json');
for(const p of readdirSync('tests/helpers'))if(p.startsWith('stasis-owner'))paths.push('tests/helpers/'+p);
paths.sort();const snapshot=()=>Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))]));
const before=snapshot(),start=performance.now();const r=spawnSync(process.execPath,['--test','--test-concurrency=1','tests/stasis-owner-behavior.test.mjs'],{encoding:'utf8',maxBuffer:32*1024*1024});const wallMs=performance.now()-start,after=snapshot();
writeFileSync('/tmp/stasis-owner-behavior-final.log',r.stdout+r.stderr);
const receipt={command:'node --test --test-concurrency=1 tests/stasis-owner-behavior.test.mjs',wallMs,status:r.status,signal:r.signal,inputsUnchanged:JSON.stringify(before)===JSON.stringify(after),inputCount:paths.length,before,after,logSha256:hash(r.stdout+r.stderr),priorRuns:[{durationMs:10006.990139,tests:3,pass:3,revision:'initial, real fixture logs only; no prehash'},{durationMs:12038.525476,tests:3,pass:3,revision:'added full whole-fixture action graph observations; no prehash'}]};
writeFileSync('/tmp/stasis-owner-behavior-final-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({wallMs,status:r.status,inputsUnchanged:receipt.inputsUnchanged,inputCount:paths.length}));console.log(r.stdout+r.stderr);if(r.status||!receipt.inputsUnchanged)process.exit(1);
