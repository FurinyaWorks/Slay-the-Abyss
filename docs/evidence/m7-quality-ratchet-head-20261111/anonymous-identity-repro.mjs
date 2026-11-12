import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {measureSources} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/scripts/lua-quality-metrics.mjs';
import {parseDiagnostics} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/scripts/check-lua-static.mjs';
import {evaluateQualityRatchet} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/scripts/quality-ratchet-policy.mjs';
const root=mkdtempSync('/tmp/ratchet-identity-');mkdirSync(root+'/src/lua',{recursive:true});
const fn=(n)=>`function(x)\n${Array.from({length:n-1},(_,i)=>`if x == ${i} then return ${i} end`).join('\n')}\nend`;
function measure(src){writeFileSync(root+'/src/lua/a.lua',src);const p=spawnSync('/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/build/tools/luacheck/luacheck',['src/lua','--no-config','--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{cwd:root,encoding:'utf8'});if(p.error)throw p.error;const m=measureSources({'src/lua/a.lua':src},parseDiagnostics(p.stdout));if(m.errors.length)throw Error(JSON.stringify(m.errors));return m.modules;}
const before=measure(`register_old(${fn(20)})\n`);
for(const [name,src] of [['insert-small-before-unchanged',`register_new(${fn(1)})\nregister_old(${fn(20)})\n`],['new-large-borrows-old',`register_new(${fn(20)})\nregister_old(${fn(1)})\n`]]){
const after=measure(src);console.log(JSON.stringify({name,before:before[0].functions.map(f=>[f.id,f.complexity]),after:after[0].functions.map(f=>[f.id,f.complexity]),errors:evaluateQualityRatchet({beforeModules:before,afterModules:after,beforeCycles:[],afterCycles:[]})}));}
rmSync(root,{recursive:true,force:true});
