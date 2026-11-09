import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {colorlessCatalogBefore,preColorlessCatalogSource as project,colorlessCatalogReader, colorlessCatalogSourceProof as proof,prepareColorlessCatalogRetirement as retire} from './helpers/colorless-catalog-source-inverse.mjs';
import {preM7FinalSource,m7FinalReader} from './helpers/m7-core-final-source-inverse.mjs';
import {preRelicQuerySource,relicQueryReader} from './helpers/relic-query-source-inverse.mjs';
import {preColorlessCatalogSource as frozenProject,colorlessCatalogReader as frozenReader} from './helpers/epochs/colorless/tests/helpers/colorless-catalog-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
const owners=Object.keys(proof.files),originals=owners.filter(p=>Object.hasOwn(proof.files[p],'beforeSource'));
const leaf='src/lua/abyss_colorless_catalog.lua',config='config/architecture.json';
const projectCurrent=project,readCurrent=read;
const historicalRead=path=>{const source=sourceEpoch.proof.targets.colorless.files[path]?.source;assert.equal(hash(source),proof.files[path].afterSha256,'authenticated original Colorless after source: '+path);return source;};
test('the independent archive authenticates all 333 complete source files and cannot authorize unknown history',()=>{
 assert.equal(Object.keys(colorlessCatalogBefore.files).length,333);
 assert.equal(colorlessCatalogBefore.revision,'2ad07111e3d5b5cb52b4229860b3b780941e29a9');
 for(const [name,row]of Object.entries(colorlessCatalogBefore.files)){assert.equal(row.path,'src/lua/'+name+'.lua');assert.equal(hash(row.source),row.sha256);assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),row.gitBlob);}
 assert.equal(colorlessCatalogBefore.files.abyss_colorless_catalog,undefined);
});
test('exact four-owner projection is fresh for every entry and every wrapped reader',()=>{
 // The original four-owner contract belongs to its authenticated source epoch.
 const project=frozenProject,colorlessCatalogReader=frozenReader,read=historicalRead;
 assert.equal(sourceEpoch.proof.targets.colorless.commit,'90c5a89a5765545f689abc6e03f27e1f3f7cccbf');
 assert.equal(owners.length,4);assert.equal(originals.length,3);
 for(const path of originals){
  for(const wrapper of [r=>r,colorlessCatalogReader,r=>colorlessCatalogReader(colorlessCatalogReader(r))]){
   const count=new Map(),reader=wrapper(p=>{count.set(p,(count.get(p)??0)+1);return read(p);});
   for(let repeat=1;repeat<=2;repeat++){
    assert.equal(project(path,read(path),{readSource:reader}),proof.files[path].beforeSource);
    assert.deepEqual([...count.keys()].sort(),[...owners].sort());
    assert.deepEqual([...count.entries()],owners.map(owner=>[owner,repeat]),'each warm call reads the original four owners once in order');
   }
  }
  for(const bad of owners)for(const kind of ['changed','missing','null','buffer','throw']){
   let broken=false;const raw=p=>{if(p===bad&&broken){if(kind==='throw')throw Error('sentinel');return kind==='changed'?read(p)+'\n':kind==='missing'?undefined:kind==='buffer'?Buffer.from(read(p)):null;}return read(p);};
   const wrapped=colorlessCatalogReader(raw);
   assert.equal(project(path,read(path),{readSource:wrapped}),proof.files[path].beforeSource);broken=true;
   assert.throws(()=>project(path,read(path),{readSource:wrapped}),/Colorless catalog linked owner/);
   broken=false;assert.equal(project(path,read(path),{readSource:wrapped}),proof.files[path].beforeSource);
  }
 }
});
test('old, foreign, partial and witness-only inputs never grant linked I/O',()=>{
 for(const [project,read]of [[frozenProject,historicalRead],[projectCurrent,readCurrent]]){
 let reads=0;const readSource=()=>{reads++;throw Error('unexpected');};
 for(const path of originals)for(const source of [proof.files[path].beforeSource,read(path)+'\n-- foreign',null,undefined,false,17,{},Buffer.from(read(path)),'',read(path).slice(1)])assert.equal(project(path,source,{readSource}),source);
 assert.equal(project(leaf,read(leaf),{readSource}),read(leaf));assert.equal(project('foreign',read(originals[0]),{readSource}),read(originals[0]));assert.equal(reads,0);
 for(const path of originals)for(const value of [proof.files[path].beforeSource,read(path)+'\n-- foreign',null,undefined])assert.equal(project(path,value,{readSource:null}),value);
 for(const readSource of [null,{},'invalid'])for(const path of originals)assert.throws(()=>project(path,read(path),{readSource}),/linked (?:owner )?reader/);
 }
});
test('CRLF and exact input-only JSON formatting retain prior strict token behavior',()=>{
 for(const [project,read]of [[frozenProject,historicalRead],[projectCurrent,readCurrent]]){
 for(const path of originals)assert.equal(project(path,read(path).replaceAll('\n','\r\n'),{readSource:p=>read(p).replaceAll('\n','\r\n')}),proof.files[path].beforeSource);
 const path=config,formatted=JSON.stringify(JSON.parse(read(path)));
 assert.equal(project(path,formatted,{readSource:read}),proof.files[path].beforeSource);
 assert.throws(()=>project(path,formatted,{readSource:p=>p===path?formatted:read(p)}),/linked owner identity/);
 const duplicate=formatted.replace('{','{"schemaVersion":1,');assert.equal(project(path,duplicate),duplicate);
 const source=read(path),reordered=Object.fromEntries(Object.entries(JSON.parse(source)).reverse());
 const variants=[duplicate,source.replace('"layers"','"laye\\u0072s"'),source.replace('"abyss_colorless_catalog"','"abyss_colorless_catalo\\u0067"'),JSON.stringify(reordered),'\ufeff'+source,source+'-- invalid'];
 let reads=0;for(const value of variants){assert.notEqual(value,source);assert.equal(project(path,value,{readSource:()=>{reads++;throw Error('unexpected');}}),value);}assert.equal(reads,0);
 }
});
test('existing final M7 and relic lifecycle chains consume exact pre-extraction owners',()=>{
 for(const path of originals){assert.equal(preM7FinalSource(path,read(path)),proof.files[path].beforeSource);assert.equal(m7FinalReader(read)(path),proof.files[path].beforeSource);}
 const path='src/lua/abyss_colorless_cards.lua';const baseline=readFileSync('tests/helpers/relic-lifecycle-baseline-391306af.json.gz');assert(baseline.length>0);
 const projected=preRelicQuerySource(path,read(path));assert.notEqual(projected,read(path));assert.notEqual(projected,proof.files[path].beforeSource);
 assert.equal(relicQueryReader(read)(path),projected);
});
test('new catalog retirement checks bytes twice and cannot delete a live-file alias',t=>{
 assert.throws(()=>retire(process.cwd()),/separate historical destination/);
 const directory=mkdtempSync(join(tmpdir(),'colorless-retirement-')),target=join(directory,leaf);
 try{
  mkdirSync(join(directory,'src/lua'),{recursive:true});writeFileSync(target,read(leaf));
  const cleanup=retire(directory);assert(existsSync(target));writeFileSync(target,read(leaf)+'\n');assert.throws(cleanup,/unreviewed/);assert(existsSync(target));
  writeFileSync(target,read(leaf));retire(directory)();assert(!existsSync(target));assert(existsSync(leaf));
  try{symlinkSync(join(process.cwd(),leaf),target);}catch(error){if(['EPERM','EACCES','ENOTSUP'].includes(error.code)){t.skip('file symlink unavailable: '+error.code);return;}throw error;}
  assert.throws(()=>retire(directory),/aliases live source/);assert(existsSync(leaf));
 }finally{rmSync(directory,{recursive:true,force:true});}
});


test('every current Colorless entry freshly authenticates the full dynamic owner set through all reader forms',()=>{
 const current=Object.fromEntries(sourceEpoch.proof.owners.map(p=>[p,read(p)]));
 for(const path of originals)for(const wrap of [r=>r,colorlessCatalogReader,r=>colorlessCatalogReader(colorlessCatalogReader(r))]){
  let bad=null,mode='good',seen=[];
  const raw=p=>{seen.push(p);if(p===bad){
   if(mode==='throw')throw Error('expanded reader sentinel');
   if(mode==='missing')return undefined;if(mode==='null')return null;
   if(mode==='buffer')return Buffer.from(current[p]);if(mode==='changed')return current[p]+'\n';
  }return current[p]??read(p);};
  const wrapped=wrap(raw),check=()=>assert.equal(project(path,read(path),{readSource:wrapped}),proof.files[path].beforeSource);
  check();const first=[...seen];
  for(const owner of sourceEpoch.proof.owners)assert(first.includes(owner),'fresh current owner: '+owner);
  seen=[];check();assert.deepEqual(seen,first,'warm calls repeat the entire raw-read sequence');
  for(bad of sourceEpoch.proof.owners)for(mode of ['changed','missing','null','buffer','throw']){
   seen=[];assert.throws(check,error=>{assert.match(error.message,/linked owner/);assert(error.message.includes(bad));if(mode==='throw')assert.match(error.message,/expanded reader sentinel/);return true;});
   assert(seen.includes(bad));mode='good';seen=[];check();assert.deepEqual(seen,first,'recovery rereads the entire closure');
  }
  const formatted=JSON.stringify(JSON.parse(read(config)));
  assert.throws(()=>project(path,read(path),{readSource:wrap(p=>p===config?formatted:read(p))}),/linked owner identity/,'input formatting cannot authorize a reformatted raw configuration');
 }
});
