import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const cli=require.resolve('fengari-node-cli/src/lua-cli.js');
const baseline='903bf2a31e91f10fb24763ab4cea23d586d0bb83';
const paths=['src/lua/abyss_combat.lua','src/lua/abyss_actor.lua','src/lua/abyss_effects.lua','src/lua/abyss_effects_damage.lua','src/lua/abyss_effects_powers.lua','src/lua/abyss_combat_catalog.lua'];
const hashes={};
for(const path of paths){const bytes=readFileSync(path);const original=spawnSync('git',['show',`${baseline}:${path}`],{maxBuffer:2**24});if(original.status!==0||!bytes.equals(original.stdout))throw new Error(`native baseline drift: ${path}`);hashes[path]=createHash('sha256').update(bytes).digest('hex');}
const result=spawnSync(process.execPath,[cli,'-e',"dofile('experiments/characters/zhongli/native/test.lua')"],{encoding:'utf8',timeout:60000,maxBuffer:2**22});
const report={baseline,engineHashes:hashes,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr,scope:'16 opt-in native definitions / 32 base-upgrade executions, real Combat API; not character registration, all75 integration, full CI or device verification'};
writeFileSync(new URL('./native-evidence.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(result.error||result.status!==0)throw result.error??new Error(result.stderr||'native test failed');console.log(result.stdout);
