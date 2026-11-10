import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const out=process.argv[2]?resolve(process.argv[2]):mkdtempSync(join(tmpdir(),'architecture-iterator-review-'));
mkdirSync(out,{recursive:true});
const hash=s=>createHash('sha256').update(s).digest('hex');
const source=readFileSync(root+'/scripts/check-architecture.mjs','utf8');
const tests=readFileSync(root+'/tests/architecture.test.mjs','utf8');
const req=createRequire(root+'/package.json');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=req('fengari');
const baseline=execFileSync('git',['show','ab65ed3b5b4240eb653af4651a13c1b8c72b2e04:scripts/check-architecture.mjs'],{cwd:root,encoding:'utf8'});
async function moduleFor(s,name){
 const absolute=s.replace(/from '\.\/([^']+)'/g,(_,path)=>`from '${pathToFileURL(root+'/scripts/'+path).href}'`).replace("from 'luaparse'",`from '${pathToFileURL(root+'/node_modules/luaparse/luaparse.js').href}'`);
 const p=out+'/'+name+'.mjs';writeFileSync(p,absolute);return import(pathToFileURL(p).href);
}
const policy={layers:{a:'core',b:'core'},deferredImports:[{from:'a',to:'b',reason:'Reviewed callback after initialization'}]};
const cases=[
 ['direct-local','local function iter() require("b"); return nil end; for value in iter do end',[false],1],
 ['anonymous','for value in function() require("b"); return nil end do end',[false],1],
 ['alias','local function iter() require("b"); return nil end; local alias=iter; for value in alias do end',[false],1],
 ['assigned','local iter; iter=function() require("b"); return nil end; for value in iter do end',[false],1],
 ['forward-local-declaration','local iter; function iter() require("b"); return nil end; for value in iter do end',[false],1],
 ['factory','local function make() return function() require("b"); return nil end end; for value in make() do end',[false],1],
 ['factory-alias','local function make() local function iter() require("b"); return nil end; return iter end; local alias=make(); for value in alias do end',[false],1],
 ['double-factory','local function make() return function() return function() require("b"); return nil end end end; for value in make()() do end',[false],1],
 ['same-loop-variable','local function iter() require("b"); return nil end; for iter in iter do end',[false],1],
 ['multiple-loop-variables','local function iter() require("b"); return nil end; for iter,other in iter,{},0 do end',[false],1],
 ['local-initializer-scope','local function iter() require("b"); return nil end; do local iter=iter; for value in iter do end end',[false],1],
 ['called-containing-owner','local function outer() local function iter() require("b"); return nil end; for value in iter do end end; outer()',[false],1],
 ['returned-containing-owner','local function make() return function() local function iter() require("b"); return nil end; for value in iter do end end end; make()()',[false],1],
 ['nested-generic-loop','local function inner() require("b"); return nil end; local function outer() for value in inner do end; return nil end; for value in outer do end',[false],1],
 ['conditional-initialization','if true then local function iter() require("b"); return nil end; for value in iter do end end',[false],1],
 ['numeric-contained-generic','for n=1,1 do local function iter() require("b"); return nil end; for value in iter do end end',[false],1],
 ['repeat-contained-generic','repeat local function iter() require("b"); return nil end; for value in iter do end until true',[false],1],
 ['factory-plus-iterator','local function make() require("b"); return function() require("b"); return nil end end; for value in make() do end',[false,false],2],
 ['state-call','local function state() require("b"); return nil end; for value in function() end,state() do end',[false],1],
 ['control-call','local function control() require("b"); return nil end; for value in function() end,{},control() do end',[false],1],
 ['extra-expression-call','local function extra() require("b"); return nil end; for value in function() end,{},0,extra() do end',[false],1],
 ['state-value','local function later() require("b"); return nil end; for value in function() end,later do end',[true],0],
 ['control-value','local function later() require("b"); return nil end; for value in function() end,{},later do end',[true],0],
 ['extra-value','local function later() require("b"); return nil end; for value in function() end,{},0,later do end',[true],0],
 ['factory-second-result','local function make() return function() end,function() require("b"); return nil end end; for value in make() do end',[true],0],
 ['factory-third-result','local function make() return function() end,{},function() require("b"); return nil end end; for value in make() do end',[true],0],
 ['returned-callback-value','local function iter() return function() require("b"); return nil end end; for value in iter do break end',[true],0],
 ['uninvoked-containing-owner','return function() local function iter() require("b"); return nil end; for value in iter do end end',[true],0],
 ['shadowed-iterator','local function iter() require("b"); return nil end; do local function iter() end; for value in iter do end end; return iter',[true],0],
 ['reassigned-unknown','local iter=function() end; local old=iter; iter=function() require("b"); return nil end; for value in old do end; return iter',[true],0],
 ['parameter-shadow','local function iter() require("b"); return nil end; local function loop(iter) for value in iter do end end; loop(function() end); return iter',[true],0],
 ['numeric-loop','local function later() require("b"); return nil end; for value=1,2 do end; return later',[true],0],
 ['uninvoked-factory-loop','local function make() local function iter() require("b"); return nil end; for value in iter do end end; return make',[true],0],
 ['mixed-eager-deferred','local function iter() require("b"); return nil end; for value in iter do end; return function() require("b") end',[false,true],1],
 ['explicit-call-preserved','local function now() require("b"); return nil end; now()',[false],1],
 ['string-call-preserved','local function now(x) require("b"); return nil end; now "argument"',[false],1],
 ['table-call-preserved','local function now(x) require("b"); return nil end; now {}',[false],1],
];
function runtime(a){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const code='local hits=0; require=function(name) assert(name=="b"); hits=hits+1; return {} end; (function() '+a+' end)(); return hits';
 let status=lauxlib.luaL_loadstring(L,to_luastring(code));if(status===lua.LUA_OK)status=lua.lua_pcall(L,0,1,0);
 if(status!==lua.LUA_OK)throw new Error(to_jsstring(lua.lua_tolstring(L,-1)));
 const result=lua.lua_tonumber(L,-1);lua.lua_close(L);return result;
}
function evaluate(mod){return cases.map(([label,a,expected,hits])=>{const report=mod.analyzeSources({a,b:'return require("a")'},policy,{}),actual=report.edges.filter(x=>x.from==='a').map(x=>x.reviewedDeferred);const cycle=report.errors.some(x=>x.message.includes('Dependency cycle'));const stale=report.errors.some(x=>x.message.includes('Stale deferred'));return {label,expected,actual,expectedHits:hits,cycle,stale,pass:JSON.stringify(actual)===JSON.stringify(expected)&&cycle===expected.includes(false)&&stale===!expected.includes(true)};});}
const candidate=await moduleFor(source,'candidate'),prior=await moduleFor(baseline,'baseline');
const probes=evaluate(candidate).map((r,i)=>({...r,runtimeHits:runtime(cases[i][1])}));for(const r of probes)r.pass&&=r.runtimeHits===r.expectedHits;
const priorResults=evaluate(prior);
const mutations=[
 ['remove-implicit-call',source.replace("if(node.type==='ForGenericStatement')add(calls,owner,node.iterators[0]);",'')],
 ['invoke-state-as-iterator',source.replace("if(node.type==='ForGenericStatement')add(calls,owner,node.iterators[0]);","if(node.type==='ForGenericStatement')for(const callee of node.iterators)add(calls,owner,callee);")],
 ['lose-containing-owner',source.replace("if(node.type==='ForGenericStatement')add(calls,owner,node.iterators[0]);","if(node.type==='ForGenericStatement')add(calls,null,node.iterators[0]);")],
 ['wrong-second-expression',source.replace("if(node.type==='ForGenericStatement')add(calls,owner,node.iterators[0]);","if(node.type==='ForGenericStatement')add(calls,owner,node.iterators[1]);")],
 ['break-explicit-call',source.replace("includes(node.type))add(calls,owner,node.base);","includes(node.type))add(calls,owner,node);")],
];
const kills=[];for(const [name,s] of mutations){if(s===source)throw Error('Mutation not applied: '+name);const r=evaluate(await moduleFor(s,name));kills.push({name,sha256:hash(s),rejectedBy:r.filter(x=>!x.pass).map(x=>x.label)});}
const before=prior.checkArchitecture(root),after=candidate.checkArchitecture(root);
const result={baseline:'ab65ed3b5b4240eb653af4651a13c1b8c72b2e04',sourceHash:hash(source),testHash:hash(tests),sourceUnchanged:hash(readFileSync(root+'/scripts/check-architecture.mjs'))===hash(source),testUnchanged:hash(readFileSync(root+'/tests/architecture.test.mjs'))===hash(tests),node:process.version,probeCount:probes.length,passed:probes.filter(x=>x.pass).length,probes,priorRejected:priorResults.filter(x=>!x.pass).map(x=>x.label),mutations:kills,repository:{moduleCount:after.nodes.length,edgeCount:after.edges.length,errorCount:after.errors.length,byteIdentical:JSON.stringify(before)===JSON.stringify(after),reportSha256:hash(JSON.stringify(after))}};
writeFileSync(out+'/results.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,probes:undefined},null,2));
if(result.passed!==cases.length||kills.some(x=>!x.rejectedBy.length)||!result.repository.byteIdentical||result.repository.errorCount||!result.sourceUnchanged||!result.testUnchanged)process.exitCode=1;
