import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const files=['src/lua/abyss_wheel_event.lua','scripts/check-lua-static.mjs','tests/fixtures/wheel-event-before.lua','tests/wheel-event-responsibilities.test.mjs','tests/wheel-event-complexity.test.mjs','tests/helpers/wheel-event-vm.mjs','tests/helpers/wheel-event-boundaries.lua','tests/helpers/wheel-event-mutants.lua','tests/helpers/lua-graph-observer.mjs','tests/lua/wheel_event.lua','tests/lua/wheel_event_ui.lua'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
for(const test of ['responsibilities','complexity']){
 const before=hashes(),startedAt=new Date().toISOString(),start=performance.now();
 const result=spawnSync(process.execPath,['--test',`tests/wheel-event-${test}.test.mjs`],{encoding:'utf8',timeout:360000,maxBuffer:1024**2});
 const wallMs=performance.now()-start,after=hashes();
 writeFileSync(`build/wheel-owner/${test}-final.log`,result.stdout+'\n'+result.stderr);
 const fields=Object.fromEntries(['tests','pass','fail','skipped','cancelled','duration_ms'].map(k=>[k,Number(result.stdout.match(new RegExp(`(?:ℹ|#) ${k} ([\\d.]+)`))?.[1])]));
 const receipt={test:`tests/wheel-event-${test}.test.mjs`,startedAt,endedAt:new Date().toISOString(),wallMs,status:result.status,error:result.error?.message??null,...fields,before,after,hashesUnchanged:JSON.stringify(before)===JSON.stringify(after)};
 writeFileSync(`build/wheel-owner/${test}-receipt.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
 if(result.status!==0)process.exitCode=1;
}
