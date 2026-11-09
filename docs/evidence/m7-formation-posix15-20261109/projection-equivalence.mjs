// Offline bounded proof. Run from the repository root; never executes discovered test files.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {posix,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import * as current from '../../../tests/helpers/ci-complete-calibration-source-inverse.mjs';
import {prePosix15ShapeSource,posix15ShapeProof} from '../../../tests/helpers/posix15-shape-source-inverse.mjs';
import {preEncounterFormationCiSource} from '../../../tests/helpers/encounter-formation-ci-source-inverse.mjs';
const base='841510b78172b923b1a613216b5c3dcb2c3e062e',root='tests/helpers/ci-complete-calibration-source-inverse.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(directory+'/'+e.name):e.isFile()&&e.name.endsWith('.mjs')?[directory+'/'+e.name]:[]);
const modules=[...walk('tests'),...walk('scripts')],graph=new Map(),texts=new Map();
for(const file of modules){
 const text=read(file);texts.set(file,text);
 graph.set(file,[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)].map(m=>posix.normalize(posix.join(posix.dirname(file),m[1]))).filter(p=>p.endsWith('.mjs')&&existsSync(p)));
}
const downstream=new Set([root]);let expanded=true;while(expanded){expanded=false;for(const [file,deps]of graph)if(!downstream.has(file)&&deps.some(p=>downstream.has(p))){downstream.add(file);expanded=true;}}
const upstream=new Set();function visit(file){if(upstream.has(file))return;upstream.add(file);for(const dep of graph.get(file)??[])visit(dep);}visit(root);
const archives=new Set();for(const file of upstream)for(const m of (texts.get(file)??'').matchAll(/new URL\(['"]([^'"]+\.(?:json|json\.gz))['"],\s*import\.meta\.url\)/g))archives.add(posix.normalize(posix.join(posix.dirname(file),m[1])));
const inputs=[...upstream,...archives],before=Object.fromEntries(inputs.sort().map(p=>[p,hash(readFileSync(p))]));
const originalText=execFileSync('git',['show',base+':'+root],{encoding:'utf8'});
const moduleUrl=pathToFileURL(resolve(root)).href;
const detached=originalText.replace(/(\bfrom\s*['"])(\.[^'"]+)(['"])/g,(_m,a,p,z)=>a+new URL(p,moduleUrl).href+z).replaceAll('import.meta.url',JSON.stringify(moduleUrl));
const original=await import('data:text/javascript,'+encodeURIComponent(detached));
const strings=new Map(),valid=p=>typeof p==='string'&&/^(?:scripts|tests|src|config)\//.test(p);
function add(path,source,origin){if(!valid(path)||typeof source!=='string')return;const key=path+'\0'+hash(source);if(!strings.has(key))strings.set(key,{path,source,origins:[]});strings.get(key).origins.push(origin);}
function sources(value,path,origin){
 if(!value||typeof value!=='object')return;
 if(valid(value.path))path=value.path;
 for(const [key,child]of Object.entries(value)){
  const next=valid(key)?key:path;
  if(typeof child==='string'&&(valid(key)||['source','beforeSource','afterSource'].includes(key))&&!/^[a-f0-9]{40,64}$/.test(child))add(next,child,origin+':'+key);
  else if(child&&typeof child==='object')sources(child,next,origin+':'+key);
 }
}
for(const archive of [...archives].sort())sources(JSON.parse(archive.endsWith('.gz')?gunzipSync(readFileSync(archive)):read(archive)),null,archive);
// Inline/decoded complete bindings exposed by the loaded original helper also belong to the set.
for(const [key,value]of Object.entries(original))if(typeof value!=='function')sources(value,null,'published POSIX15 export '+key);
const registeredPaths=[...new Set([...strings.values()].map(x=>x.path))];
for(const path of registeredPaths)if(existsSync(path)){add(path,read(path),'current disk');try{add(path,execFileSync('git',['show',base+':'+path],{encoding:'utf8'}),'published POSIX15 Git');}catch{}}
const exports=Object.keys(original).sort();assert.deepEqual(Object.keys(current).sort(),exports);
for(const name of exports)if(typeof original[name]!=='function')assert.deepEqual(current[name],original[name],name+' immutable export');
const options={originalPlanningSource:[undefined,'develop','seven','unknown'],preCombinedPlanningSource:[undefined,'base','flow','silent','effects','unknown'],preCombinedGateSource:[undefined,'flow','silent','effects','unknown']};
const layered=new Set(['originalPlanningSource','preCurrentCiPlacementSource','preCiCompleteCalibrationSource','preCombinedPlanningSource','preCombinedGateSource']);
const resultHash=createHash('sha256');let comparisons=0,thrownComparisons=0,projectedComparisons=0;
function outcome(fn,args){try{const value=fn(...args);return {value};}catch(error){return {error:{name:error.name,code:error.code??null,message:error.message}};}}
function compare(path,input,label){
 for(const name of exports)if(typeof original[name]==='function')for(const epoch of options[name]??[undefined]){
  const eligible=layered.has(name)&&path===(name==='preCombinedGateSource'?'scripts/check-lua-static.mjs':'scripts/ci-test-timings.json');
  const projected=eligible?preEncounterFormationCiSource(path,input):input;
  const expected=outcome(original[name],[path,projected,epoch]),actual=outcome(current[name],[path,input,epoch]);
  assert.deepEqual(actual,expected,`${name}: ${path}: ${label}: ${String(epoch)}`);
  comparisons++;if(actual.error)thrownComparisons++;if(projected!==input)projectedComparisons++;
  const value=actual.error?actual:typeof actual.value==='string'?{sha256:hash(actual.value),bytes:Buffer.byteLength(actual.value)}:{type:typeof actual.value,value:actual.value??null};
  resultHash.update(JSON.stringify({name,path,label,epoch:epoch??null,result:value})+'\n');
 }
}
for(const {path,source}of strings.values()){
 for(const [label,value]of [['LF',source],['CRLF',source.replaceAll('\n','\r\n')],['trailing-byte drift',source+'\n'],['missing-first-byte drift',source.slice(1)]])compare(path,value,label);
 compare('foreign-path',source,'foreign full source');
}
for(const path of [...registeredPaths,'foreign-path','__proto__'])for(const [label,input]of [['null',null],['undefined',undefined],['number',17],['false',false],['object',{}]])compare(path,input,label);
const after=Object.fromEntries(inputs.sort().map(p=>[p,hash(readFileSync(p))]));assert.deepEqual(after,before,'all tested boundary inputs remain unchanged');
const report={schemaVersion:1,kind:'Static dependency closure and complete source-boundary equivalence, not a broad test execution',sourceBaseCommit:base,entrypoint:root,originalModuleSha256:hash(originalText),currentModuleSha256:hash(read(root)),staticParsing:'Literal relative import/export-from/dynamic-import edges only. Template or computed imports are outside this static closure; live inventory consumers are separately executed.',downstreamModules:[...downstream].sort(),downstreamTestFiles:[...downstream].filter(p=>/^tests\/[^/]+\.test\.mjs$/.test(p)).sort(),upstreamModules:[...upstream].sort(),sourceArchives:[...archives].sort(),completeSourceInputs:[...strings.values()].map(({path,source,origins})=>({path,sha256:hash(source),bytes:Buffer.byteLength(source),origins})),registeredSourcePaths:registeredPaths.sort(),comparisonFunctions:exports.filter(k=>typeof original[k]==='function'),comparisons,thrownComparisons,projectedComparisons,resultSha256:resultHash.digest('hex'),beforeInputSha256:before,afterInputSha256:after,beforeAfterHashesMatched:true,equivalent:true,actualFullPassClaim:false};


// Independently compare the complete current textual input domain to published
// Formation HEAD. Only exact shape15 is projected to its immutable shape14.
const formation='d21be2fb2d84f68767c3b1ef827b61a2b63aa323';
const formationSource=execFileSync('git',['show',formation+':'+root],{encoding:'utf8'});
assert.equal(read(root),formationSource.replace("import {preEncounterFormationCiSource} from './encounter-formation-ci-source-inverse.mjs';", "import {preEncounterFormationCiSource} from './encounter-formation-ci-source-inverse.mjs';\nimport {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';").replace('export function preCurrentCiPlacementSource(path,source){','export function preCurrentCiPlacementSource(path,source){\n source=prePosix15ShapeSource(path,source);'),'exact composition of both published helpers');
const formationModule=formationSource.replace(/(\bfrom\s*['"])(\.[^'"]+)(['"])/g,(_m,a,p,z)=>a+new URL(p,moduleUrl).href+z).replaceAll('import.meta.url',JSON.stringify(moduleUrl));
const previous=await import('data:text/javascript,'+encodeURIComponent(formationModule));
const textRoots=['scripts','tests','config','src/lua','data','.github','package.json','package-lock.json'];
const tracked=execFileSync('git',['ls-files','-z','--',...textRoots],{encoding:'utf8'}).split('\0').filter(Boolean);
const domain=[...new Set(tracked)].filter(p=>/\.(?:mjs|lua|json|yml|yaml|txt|md)$/.test(p)).sort();
const fullRecords=[];
for(const path of domain){
 const raw=readFileSync(path,'utf8'),prior=prePosix15ShapeSource(path,raw),outputs={};
 for(const name of ['preCurrentCiPlacementSource','preCiCompleteCalibrationSource']){
  const actual=current[name](path,raw),expected=previous[name](path,prior);
  assert.equal(actual,expected,`published Formation equivalent: ${name}: ${path}`);outputs[name]=hash(actual);
 }
 fullRecords.push({path,inputSha256:hash(raw),formationInputSha256:hash(prior),outputSha256:outputs});
}
const shapePath=posix15ShapeProof.path;
assert.equal(readFileSync(shapePath,'utf8'),posix15ShapeProof.afterSource);
assert.equal(execFileSync('git',['show',formation+':'+shapePath],{encoding:'utf8'}),posix15ShapeProof.beforeSource);
assert.equal(read('tests/helpers/reward-query-planning-contract.mjs'),execFileSync('git',['show',base+':tests/helpers/reward-query-planning-contract.mjs'],{encoding:'utf8'}),'POSIX15 reward contract retained exactly');
report.publishedFormationCommit=formation;
report.formationHelperSha256=hash(formationSource);
report.completeCurrentTextInputCount=fullRecords.length;
report.completeCurrentTextComparisons=fullRecords.length*2;
report.completeCurrentTextRecords=fullRecords;
for(const row of fullRecords)assert.equal(hash(readFileSync(row.path)),row.inputSha256,'complete text input unchanged during proof: '+row.path);
report.completeTextBeforeAfterHashesMatched=true;
report.scope='Two independent complete-source equivalence boundaries: all exported historical functions versus published POSIX15 with exact Formation projection, plus two placement entrypoints across current complete textual domain versus published Formation with exact POSIX15 projection. Not execution of 91 transitive test files.';
const output=process.argv[2]??`build/formation-posix15-projection-${Date.now()}.json.gz`;
assert.equal(process.argv.length<=3,true,'Usage: node projection-equivalence.mjs [new-output.json.gz]');
assert.ok(!existsSync(output),'never overwrite evidence');
const bytes=JSON.stringify(report,null,2)+'\n';writeFileSync(output,gzipSync(bytes,{mtime:0}),{flag:'wx'});
console.log(JSON.stringify({downstreamTests:report.downstreamTestFiles.length,downstreamModules:downstream.size,sourceArchives:archives.size,completeSources:strings.size,comparisons,thrownComparisons,projectedComparisons,completeCurrentTextInputCount:fullRecords.length,completeCurrentTextComparisons:fullRecords.length*2,equivalent:true,output,receiptSha256:hash(bytes)},null,2));
