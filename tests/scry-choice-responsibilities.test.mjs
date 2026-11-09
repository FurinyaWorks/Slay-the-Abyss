import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {beforeSource,choiceVm} from './helpers/scry-choice-responsibilities.mjs';
const before=beforeSource();
const current=readFileSync('src/lua/abyss_scry.lua','utf8');
for(const mode of ['direct','combat'])test(`Scry.choose frozen full-graph differential: ${mode}`,()=>{
 const old=choiceVm(before,mode),actual=choiceVm(current,mode);
 assert.equal(old.status,0,old.error);assert.equal(actual.status,0,actual.error);
 assert.ok(old.graphs.length>=(mode==='direct'?80:4));assert.deepEqual(actual,old);
 if(process.env.SCRY_CHOICE_EVIDENCE){
  const dir=process.env.SCRY_CHOICE_EVIDENCE;mkdirSync(dir,{recursive:true});
  const json=JSON.stringify(old.graphs);
  writeFileSync(`${dir}/${mode}-equal-graphs.json.gz`,gzipSync(json));
  const location=source=>'src/lua/abyss_scry.lua:'+(source.split('\n').findIndex(line=>line.includes('assert(type(state.events)=="table","missing scry events")'))+1)+': missing scry events';
  writeFileSync(`${dir}/${mode}-manifest.json`,JSON.stringify({mode,checkpoints:old.graphs.length,bytes:Buffer.byteLength(json),sha256:createHash('sha256').update(json).digest('hex'),beforeSourceSha256:createHash('sha256').update(before).digest('hex'),afterSourceSha256:createHash('sha256').update(current).digest('hex'),missingEventsError:{before:location(before),after:location(current)}},null,2)+'\n');
 }
});
function reverseSelection(source){
 const loop=/for _,card in ipairs\(selected\) do(\r?\n)        for i,current/g;
 assert.equal([...source.matchAll(loop)].length,1,'one selected-card loop must be mutated');
 return source.replace(loop,(_,eol)=>`for selectedIndex=#selected,1,-1 do${eol}        local card=selected[selectedIndex]${eol}        for i,current`);
}
const mutations=[
 ['candidate-validation',source=>source.replace('or state.draw[n-i+1].uid~=uid',''),'draw-reordered: priority'],
 ['reverse-selection',reverseSelection,'selection order'],
 ['early-clear',source=>source.replace('-- Validation of every candidate and UID finishes before the first move.','state.pendingScry=nil\n    -- Validation of every candidate and UID finishes before the first move.'),'pending retained through callbacks'],
];
for(const [variant,original]of [['before',before],['current',current]])for(const [name,mutate,diagnostic]of mutations)test(`Scry.choose semantic negative control: ${variant}/${name}`,()=>{
 const source=mutate(original);assert.notEqual(source,original);
 const result=choiceVm(source);assert.notEqual(result.status,0);assert.ok(result.error.includes(diagnostic),result.error);
});
for(const [variant,original]of [['before',before],['current',current]])for(const [name,eol]of [['LF','\n'],['CRLF','\r\n']])test(`Scry.choose reverse-selection preserves ${variant}/${name} source bytes and semantic rejection`,()=>{
 const lf=original.replaceAll('\r\n','\n'),source=lf.replaceAll('\n',eol);
 const expected=lf.replace('for _,card in ipairs(selected) do\n        for i,current','for selectedIndex=#selected,1,-1 do\n        local card=selected[selectedIndex]\n        for i,current').replaceAll('\n',eol);
 const mutated=reverseSelection(source);assert.notEqual(mutated,source);assert.equal(mutated,expected);
 const result=choiceVm(mutated);assert.notEqual(result.status,0);assert.ok(result.error.includes('selection order'),result.error);
});
test('Scry.choose reverse-selection refuses absent or ambiguous mutation targets',()=>{
 assert.throws(()=>reverseSelection('return {}\n'),/one selected-card loop/);
 assert.throws(()=>reverseSelection(current+'\n'+current),/one selected-card loop/);
});
