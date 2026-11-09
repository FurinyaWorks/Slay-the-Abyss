import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
import {createHash} from 'node:crypto';
import luaparse from 'luaparse';
import {observeTargetGroups} from './helpers/effects-target-group-vm.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
const file='src/lua/abyss_effects.lua',read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=JSON.parse(read('tests/helpers/effects-target-group-before.json'));
const source=read(file),hash=s=>createHash('sha256').update(s).digest('hex');
const names=['visitTargetGroup','discoverTargetGroup','targetGroupCount','validTargetGroupMember','targetGroupMembers','validTargetGroupPair','targetGroup'];
const span=s=>{const ast=luaparse.parse(s,{luaVersion:'5.3',ranges:true});const first=ast.body.find(n=>n.type==='FunctionDeclaration'&&['visitTargetGroup','targetGroup'].includes(n.identifier?.name));const last=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.identifier?.name==='targetGroup');return [first.range[0],last.range[1]];};
test('target-group frozen full Git source authenticates and all unrelated bytes remain identical',()=>{
 assert.equal(before.revision,'7821a7f44b518c09f6b565860e04e4823bc95153');
 assert.equal(before.sha256,'aa1c507c56ee8b1794641f710c4e2e2b603f52f3c29b51096f8860df58c74a71');
 assert.equal(before.gitBlob,'51114ce0adb61aded6c070e9cff72b205c34b4f0');
 assert.equal(before.path,file);assert.equal(hash(before.source),before.sha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before.source)}\0`).update(before.source).digest('hex'),before.gitBlob);
 const [a,b]=span(before.source),[c,d]=span(source);
 assert.equal(source.slice(0,c),before.source.slice(0,a));assert.equal(source.slice(d),before.source.slice(b));
 const ast=luaparse.parse(source.slice(c,d),{luaVersion:'5.3'});
 assert.deepEqual(ast.body.map(n=>n.identifier.name),names);assert(ast.body.every(n=>n.isLocal));
});
test('target-group complete original/current VM graphs preserve arity aliases dynamic reads errors and real partial writes',t=>{
 const old=observeTargetGroups(before.source),current=observeTargetGroups(source);
 assert.equal(current.length,306);assert.deepEqual(current,old);
 t.diagnostic(`51 scenarios x 3 entry points x 2 complete checkpoints; SHA256 ${hash(JSON.stringify(current))}`);
});
test('target-group real semantic regressions are detected',t=>{
 const baseline=observeTargetGroups(before.source);
 const mutants=[
  ['table keys','graph.pending[#graph.pending + 1] = {value=key}','-- omit table keys'],
  ['seen marker reread','if value.targetGroup ~= nil then','if not graph.seen[value] and value.targetGroup ~= nil then'],
  ['cycle admission','if graph.misplaced or graph.cyclic then','if graph.misplaced then'],
  ['misplaced marker','if not visit.topMember then graph.misplaced = true end','-- admit misplaced marker'],
  ['integer keys','or key % 1 ~= 0','or false'],
  ['allowed fields','if not allowed[key] then return false end','if false then return false end'],
  ['adjacent pair','or members[2] ~= members[1] + 1','or false'],
  ['matching amounts','or first.value ~= second.value','or false'],
  ['dynamic value reads','local function validTargetGroupMember(effect, allowed)\n','local function validTargetGroupMember(effect, allowed)\n    effect = setmetatable({value=effect.value}, {__index=effect})\n'],
  ['return arity','    return members[1]\nend','    return members[1], nil\nend'],
  ['discovery order','table.remove(graph.pending)','table.remove(graph.pending, 1)'],
 ];
 for(const [label,a,b]of mutants){
  // Integer-key condition also exists in unrelated supported validation: mutate first only.
  assert(source.includes(a),label);const mutant=source.replace(a,b);luaparse.parse(mutant,{luaVersion:'5.3'});
  let observed;try{observed=observeTargetGroups(mutant);}catch(error){assert.match(error.message,/valid pair succeeds|group index\/arity|support arity|real pair applied|unmarked later failure retains earlier energy/);t.diagnostic(label+' killed by explicit oracle');continue;}
  assert(!JSON.stringify(observed).includes('target-group instruction budget'),label+' must fail semantically without timeout');
  assert.notDeepEqual(observed,baseline,label+' survived');t.diagnostic(label+' killed by complete observation');
 }
});
const row=(line,column,subject,value)=>({file,line,column,code:'W561',message:`cyclomatic complexity of ${subject} is too high (${value} > 0)`});
test('every target-group helper is required and CC16 or nested CC16 is rejected',()=>{
 for(const name of names){
  const s=`local function ${name}() return function() end end`;
  const rows=[row(1,1,'main chunk',1),row(1,7,`function '${name}'`,15),row(1,s.indexOf('function()')+1,'function',16)];
  let report=reviewResponsibilityComplexity(rows,{[file]:s});
  assert(report.errors.some(e=>e.file===file&&e.message.includes('16 exceeds 15')),name+' nested');
  rows[1]=row(1,7,`function '${name}'`,16);rows[2]=row(1,s.indexOf('function()')+1,'function',1);
  report=reviewResponsibilityComplexity(rows,{[file]:s});
  assert(report.errors.some(e=>e.file===file&&e.message.includes('16 exceeds 15')),name+' helper');
  assert(reviewResponsibilityComplexity([],{[file]:s}).errors.some(e=>e.file===file&&e.message.includes(name)&&e.message.includes('missing')),name+' required');
 }
});

test('pinned Luacheck rejects original CC33 and real over-budget helper and nested mutations',()=>{
 const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'effects-group-cc-'));
 const measure=s=>{
  const input=join(dir,'effects.lua');writeFileSync(input,s);
  const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
  assert([0,1].includes(result.status),result.stderr);assert.equal(result.stderr,'');
  return parseDiagnostics(result.stdout).map(r=>({...r,file}));
 };
 const errors=(s,rows)=>reviewResponsibilityComplexity(rows,{[file]:s}).errors.filter(e=>e.file===file&&e.message.includes('exceeds 15'));
 try{
  assert.deepEqual(errors(source,measure(source)),[]);
  const oldRows=measure(before.source);assert(oldRows.some(r=>r.message.includes("function 'targetGroup'")&&r.message.includes('(33 > 0)')));
  assert(errors(before.source,oldRows).some(e=>e.message.includes('33 exceeds 15')));
  const branches=Array.from({length:16},(_,i)=>`if _G.groupProbe==${i} then _G.groupProbe=${i+1} end`).join('\n');
  for(const name of names){
   const signature=new RegExp(`local function ${name}\\([^\\n]*\\)\\n`),match=source.match(signature);assert(match,name);
   const mutant=source.replace(signature,match[0]+branches+'\n');
   assert(errors(mutant,measure(mutant)).some(e=>e.message.includes(`function '${name}'`)&&e.message.includes('exceeds 15')),name);
  }
  const nested=source.replace('local function targetGroup(effects)\n','local function targetGroup(effects)\n    local probe=function()\n'+branches+'\n    end\n    probe()\n');
  assert(errors(nested,measure(nested)).some(e=>e.message.includes('17 exceeds 15')),'real nested anonymous function');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
