import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {measureSources as measure} from './metrics.mjs';
import {measureSources as legacy} from './old-metrics.mjs';
import {evaluateQualityRatchet as policy} from './policy.mjs';
const base='/workspace/scratch/c1a4970a76e0/m7-ratchet-identities';
const dir=mkdtempSync('/tmp/identity-probe-');mkdirSync(dir+'/src/lua',{recursive:true});
const records=[];
function diagnostics(source){writeFileSync(dir+'/src/lua/a.lua',source);const r=spawnSync(base+'/build/tools/luacheck/luacheck',['src/lua/a.lua','--no-config','--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{cwd:dir,encoding:'utf8'});assert([0,1].includes(r.status));return r.stdout.trim().split('\n').map(x=>{const m=x.match(/^(.*?):(\d+):(\d+)(?:-(\d+))?: \(([WE]\d+)\) (.*)$/);assert(m,x);return {file:m[1],line:+m[2],column:+m[3],code:m[5],message:m[6]};});}
function measured(source){const s={'src/lua/a.lua':source},d=diagnostics(source),m=measure(s,d,{ratchetIdentity:true});assert.deepEqual(m.errors,[]);assert.deepEqual(measure(s,d),legacy(s,d));return m.modules;}
const fn=n=>'function(x)\n'+Array.from({length:n-1},(_,i)=>`if x==${i} then return ${i} end`).join('\n')+'\nreturn -1\nend';
const check=(name,b,a,blocked)=>{const errors=policy({beforeModules:measured(b),afterModules:measured(a),beforeCycles:[],afterCycles:[]});assert.equal(errors.length>0,blocked,name+JSON.stringify(errors));records.push({name,blocked,errors});};
try{
check('indexed assignment cannot borrow another key',`a['old']=${fn(20)}`,`a['new']=${fn(20)}\na['old']=${fn(1)}`,true);
check('table computed keys remain separate',`local a={['old']=${fn(20)}}`,`local a={['new']=${fn(20)},['old']=${fn(1)}}`,true);
check('argument position transfer is new debt',`register(${fn(20)},0)`,`register(0,${fn(20)})`,true);
check('literal escape spelling preserves ownership',`register('old',${fn(20)})`,`register("\\111ld",${fn(19)})`,false);
check('numeric sibling callback event separates identity',`register(1,${fn(20)})`,`register(2,${fn(20)})`,true);
check('else branch cannot borrow if branch',`if enabled then register(${fn(20)}) end`,`if enabled then register(${fn(1)}) else register(${fn(20)}) end`,true);
check('unmatched renamed outer owner cannot lend nested debt',`local a=function() return ${fn(20)} end`,`local b=function() return ${fn(20)} end`,true);
check('unchanged duplicate nested owner survives inserted twin',`register(function() return ${fn(20)} end)`,`register(function() return ${fn(1)} end)\nregister(function() return ${fn(20)} end)`,false);
check('same context reorder preserves exact functions',`register(${fn(20)})\nregister(${fn(18)})`,`register(${fn(18)})\nregister(${fn(20)})`,false);
const performance=[];
for(const file of ['abyss_combat','abyss_actor','abyss_map_ui']){const source=readFileSync(base+'/src/lua/'+file+'.lua','utf8'),s={'src/lua/a.lua':source};const t=performanceNow();const m=measure(s,[],{ratchetIdentity:true});performance.push({file,bytes:Buffer.byteLength(source),functions:m.modules[0].functions.length,identityMs:performanceNow()-t});assert.deepEqual(measure(s,[]),legacy(s,[]));}
console.log(JSON.stringify({commit:'5b4c90f46a4cff14aa7f0b9c2458cfd40c170a01',checks:records.length,records,legacyOutputComparison:'all probes and three largest files equal',performance},null,2));
}finally{rmSync(dir,{recursive:true,force:true});}
function performanceNow(){return Number(process.hrtime.bigint())/1e6;}
