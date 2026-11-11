// Reuse the frozen #621 whole-page SDK benchmark, adding one isolated call census.
import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const [save,sdk,output]=process.argv.slice(2);assert(save&&sdk&&output);
let source=gunzipSync(fs.readFileSync('docs/evidence/battle-piles-final-20261111/whole-page-runner.mjs.gz')).toString();
assert.equal(createHash('sha256').update(source).digest('hex'),'c7a52bbeb92fc4458fc70bab5a1a17ef7815fad9b932ff4c658bec0f3c1dd5b9');
const anchor=" stage('engine-root-cleanup',";assert.equal(source.split(anchor).length,2);
source=source.replace(anchor,` stage('actual-idle-native-call-census',()=>{
  session.runtime.runChunk(L,\`__IDLE_WRITES=0;__IDLE_PAINTS=0;__IDLE_CREATES=0
   local idle=require('abyss_lumine_idle');local paint=idle.paint
   idle.paint=function(data,pages,clock,enabled,write)
    __IDLE_PAINTS=__IDLE_PAINTS+1
    return paint(data,pages,clock,enabled,function(...)__IDLE_WRITES=__IDLE_WRITES+1;return write(...)end)
   end
   local create=game.InstantiateClientUIControl
   game.InstantiateClientUIControl=function(...)__IDLE_CREATES=__IDLE_CREATES+1;return create(...)end
   function __IDLE_COUNTS()return {writes=__IDLE_WRITES,paints=__IDLE_PAINTS,creates=__IDLE_CREATES}end\`,'CALL_CENSUS_ONLY');
  const count=session.runtime.controlsById.size;for(let i=0;i<120;i++)step();assert.equal(session.runtime.controlsById.size,count);
  const top=d.lua_gettop(L);d.lua_getglobal(L,enc('__IDLE_COUNTS'));assert.equal(d.lua_pcall(L,0,1,0),0);
  const counts=luaValue(-1);d.lua_settop(L,top);assert.equal(counts.creates,0);return counts;
 });
`+anchor);
const runner=path.resolve('.artifacts/lumine-idle/whole-page-census.mjs');fs.writeFileSync(runner,source);
const result=spawnSync(process.execPath,[runner,save,sdk,output],{stdio:'inherit',windowsHide:true,timeout:180000});
if(result.error)throw result.error;process.exitCode=result.status??1;
