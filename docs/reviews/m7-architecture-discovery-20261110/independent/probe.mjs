import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const repo=resolve(process.argv[2]??process.cwd());
const {checkArchitecture}=await import(pathToFileURL(join(repo,'scripts/check-architecture.mjs')).href);
const {discoverSources}=await import(pathToFileURL(join(repo,'scripts/lua-quality-metrics.mjs')).href);
const {collectEngineeringInputs}=await import(pathToFileURL(join(repo,'scripts/check-engineering-quality.mjs')).href);
const root=mkdtempSync(join(tmpdir(),'architecture-review-probe-'));
try {
const put=(f,s)=>{mkdirSync(dirname(join(root,f)),{recursive:true});writeFileSync(join(root,f),s)};
let p={layers:{'dotted.name':'core','nest.a':'core','nest.b':'core'}};
const policy=()=>put('config/architecture.json',JSON.stringify(p));policy();
const shared=()=>collectEngineeringInputs({discover:()=>discoverSources(root),policy:()=>JSON.parse(readFileSync(join(root,'config/architecture.json'),'utf8')),lint:()=>({diagnostics:[]}),measure:()=>({})}).architecture;
const both=()=>{const r=checkArchitecture(root);assert.deepEqual(r,shared());return r};
const cli=(status,match)=>{const r=spawnSync(process.execPath,[`${repo}/scripts/check-architecture.mjs`],{cwd:root,encoding:'utf8'});assert.equal(r.status,status, r.stderr);assert.match(r.stdout+r.stderr,match);};
put('src/lua/dotted.name.lua','return game.GetPlayer()');
assert.equal(both().errors[0].file,'src/lua/dotted.name.lua');cli(1,/dotted.name.lua:1: core cannot access/);console.log('PASS dotted filename original path and CLI violation');
put('src/lua/dotted.name.lua','return {}');cli(0,/Architecture passed/);
put('src/lua/nest/a.lua','return require("nest.b")');put('src/lua/nest/b.lua','return require("nest.a")');
assert(both().errors.some(e=>/Dependency cycle/.test(e.message)&&e.file==='src/lua/nest/a.lua'));console.log('PASS added files and nested cycle path');
rmSync(join(root,'src/lua/nest/b.lua'));assert(both().errors.some(e=>/unknown module nest.b/.test(e.message)));assert(!both().nodes.includes('nest.b'));console.log('PASS source removal freshness');
p.layers['nest.a']='ui';policy();put('src/lua/nest/a.lua','return game.GetPlayer()');assert.deepEqual(both().errors,[]);p.layers['nest.a']='core';policy();assert(both().errors.some(e=>/platform global/.test(e.message)));console.log('PASS policy freshness');
put('src/lua/nest.a.lua','return {}');assert.throws(both,/Ambiguous Lua module identity/);cli(1,/Ambiguous Lua module identity/);rmSync(join(root,'src/lua/nest.a.lua'));console.log('PASS collision and CLI rejection');
for(const [name,target,type] of [['file.lua',join(root,'src/lua/dotted.name.lua'),'file'],['ignored.txt',join(root,'src/lua/dotted.name.lua'),'file'],['dangling.lua',join(root,'absent'),'file'],['linked',join(root,'src/lua/nest'),'dir']]){const f=join(root,'src/lua',name);symlinkSync(target,f,type);assert.throws(()=>checkArchitecture(root),/Linked source/);assert.throws(shared,/Linked source/);cli(1,/Linked source/);rmSync(f);}
console.log('PASS file, non-Lua, dangling, directory symlink rejection');
rmSync(join(root,'src/lua'),{recursive:true});mkdirSync(join(root,'src/lua'));assert.throws(()=>checkArchitecture(root),/No Lua/);assert.throws(shared,/No Lua/);cli(1,/No Lua/);console.log('PASS empty tree CLI rejection despite earlier successful build report');
console.log('PASS all independent probes');

} finally {rmSync(root,{recursive:true,force:true});}
