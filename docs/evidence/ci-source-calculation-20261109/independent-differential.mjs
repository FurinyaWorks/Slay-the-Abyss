import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const file='tests/helpers/combined-epoch/source-epoch-runtime.mjs';
const original=execFileSync('git',['show','8660380c1611c75c260db22d39ee65bfd8223a8d:'+file],{cwd:root,encoding:'utf8'});
const old=(await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'))).createSourceEpochProjector;
const fresh=(await import(pathToFileURL(root+'/'+file))).createSourceEpochProjector;
const hash=s=>createHash('sha256').update(s).digest('hex'),bind=source=>({source,sha256:hash(source)});
const path='config/architecture.json',owner='src/lua/owner.lua',absent='src/lua/absent.lua';
const sources=['{"x":1,"x":2,"s":"a b","escaped":"\\u0061"}\n','{"x":2,"s":"a b","escaped":"a"}\n','{"n":12,"b":true,"null":null,"exp":1e2}\n'];
let cases=0;
for(const source of sources)for(const allowConfigLayout of [false,true]) {
 const proof={schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[path,owner,absent],current:{[path]:bind(source),[owner]:bind('return 7\n'),[absent]:null},targets:{prior:{commit:'b'.repeat(40),files:{[path]:bind('{}\n'),[owner]:bind('return 6\n'),[absent]:null}},other:{commit:'c'.repeat(40),files:{[path]:bind('[]\n'),[owner]:bind('return 5\n'),[absent]:null}}}};
 const projectors=[old(proof,{allowConfigLayout}),fresh(proof,{allowConfigLayout})];
 proof.current[path].source='mutated caller proof';
 const inputs=[source,source.replaceAll('\n','\r\n'),source.replaceAll(':',': '),source+' \n\t',source.replace('"x":1,',''),source.replace('"x":1,"x":2','"x":2,"x":1'),source.replace('\\u0061','a'),source.replace('12','1 2'),source.replace('true','tr ue'),source+'\u00a0','\ufeff'+source,'','{}\n',null,undefined,17,{},new String(source),source.replace('a b','ab')];
 for(let repeat=0;repeat<3;repeat++)for(const input of inputs)for(const mode of ['exact','drift','missing','boxed','throw','absent-present','crlf','null-reader'])for(const target of ['prior','other','unknown']) {
  const outcomes=projectors.map(p=>{const reads=[];const readSource=mode==='null-reader'?null:q=>{reads.push(q);if(q===absent)return mode==='absent-present'?'':null;if(q===owner){if(mode==='throw')throw Error('read failed');if(mode==='drift')return 'return 8\n';if(mode==='missing')return null;if(mode==='boxed')return new String('return 7\n');}const s=q===path?source:'return 7\n';return mode==='crlf'?s.replaceAll('\n','\r\n'):s;};try{return {result:p.preCombinedSource(path,input,{target,readSource}),reads};}catch(e){return {error:[e.name,e.message],reads};}});
  assert.deepEqual(outcomes[1],outcomes[0]);cases++;
 }
}
const results={cases,conclusion:'pass',checks:['baseline differential return/error/owner read order','warm-cache repeated calls','two targets','caller proof mutation isolation','duplicate-key order and count','escape spelling','invalid JSON whitespace','non-string input and linked-owner types','owner drift, absence, throws and CRLF','missing linked owner remains absent']};
console.log(JSON.stringify(results));
