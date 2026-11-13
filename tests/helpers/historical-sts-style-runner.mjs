import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {luaTimeoutMs} from '../../scripts/ci-timeout-policy.mjs';
export const historicalStsStyleFixtures=Object.freeze(['tests/lua/competition_roster_ui.lua','tests/lua/deck_browse_filters.lua']);
export function runHistoricalStsStyle(script,{timeout=luaTimeoutMs.default,cwd,caseName,maxBuffer=1024*1024}={}){
 script=script.replaceAll('\\','/');
 assert(historicalStsStyleFixtures.includes(script),'only the exact frozen starter-deck contracts');
 assert.equal(caseName,undefined,'the complete historical starter-deck fixture must execute');
 const entry=fileURLToPath(new URL('./historical-sts-style-entry.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[entry,script,String(timeout)],{cwd,encoding:'utf8',timeout,maxBuffer,windowsHide:true});
 if(result.error)throw new Error('Historical StS replay failed within the original total deadline: '+result.error.message+'\n'+result.stdout+'\n'+result.stderr,{cause:result.error});
 return result;
}
