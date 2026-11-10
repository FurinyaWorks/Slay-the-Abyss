import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const heavyCurrentProof=/helpers\/(?:combined-epoch|(?:joint|room|component)-ui-source-epoch)/;
function coldImport(moduleName,{entry=false}={}){
 const url=new URL('./helpers/'+moduleName,import.meta.url).href;
 const source=`import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const reads=[],read=fs.readFileSync;
fs.readFileSync=function(file,...args){reads.push(String(file));return read.call(this,file,...args);};
syncBuiltinESMExports();
${entry?"process.argv=[process.execPath,'entry','not-a-historical-fixture','30000'];":''}
let failure;
try{await import(${JSON.stringify(url)});}catch(error){failure=error.message;}
process.stdout.write(JSON.stringify({reads,failure}));`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 return JSON.parse(result.stdout);
}

test('frozen monster materializer imports only its historical epoch proofs',()=>{
 const result=coldImport('historical-monster-ui-materialize.mjs');
 assert.equal(result.failure,undefined);
 assert.deepEqual(result.reads.filter(path=>heavyCurrentProof.test(path)),[],'current multi-epoch archives must not be loaded for historical-only projection');
 assert.ok(result.reads.some(path=>path.includes('/epochs/develop/tests/fixtures/delivery-source-composition.json.gz')),'the actual frozen inverse proof is loaded');
});

test('historical entry validates its exact fixture before loading the unrelated current battle differential',()=>{
 const result=coldImport('historical-monster-ui-entry.mjs',{entry:true});
 assert.match(result.failure,/only exact historical monster UI fixtures/);
 assert.deepEqual(result.reads.filter(path=>heavyCurrentProof.test(path)),[],'entry startup must not eagerly load current source epochs');
 assert.deepEqual(result.reads.filter(path=>path.endsWith('/tests/fixtures/battle-ui-approved-responsibility-layer.json')),[],'only battle-refactor-render needs the current differential');
});
