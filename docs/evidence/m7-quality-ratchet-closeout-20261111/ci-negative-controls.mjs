import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {beforeQualityRatchetWorkflow as project,qualityRatchetWorkflowGates as gates} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/tests/helpers/quality-ratchet-workflow.mjs';
import {beforeDraftQualityWorkflow as draft} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/tests/helpers/draft-quality-workflow.mjs';
import {preRatchetInventory,jointCiInventoryAt,jointCiSourceAt,ratchetInventoryFile} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/tests/helpers/joint-ui-ci-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),results=[];
const check=(name,run)=>{run();results.push(name);};
const live=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
const proof=JSON.parse(gunzipSync(readFileSync('tests/helpers/joint-ui-ci-source-epoch.json.gz')));
const files=readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f).sort();
check('raw 835 -> exact 834 -> historical 829',()=>{assert.equal(files.length,835);assert.equal(preRatchetInventory(files).length,834);assert.equal(jointCiInventoryAt(files,'officialAssetsFlow').length,829);});
for(const file of [ratchetInventoryFile,...Object.keys(proof.added)]){
 for(const mode of ['missing','duplicate','reader-mutation','reader-throw','reader-null','reader-buffer'])check(`${file}: ${mode}`,()=>{
  if(mode==='missing')assert.throws(()=>jointCiInventoryAt(files.filter(f=>f!==file),'officialAssetsFlow'));
  else if(mode==='duplicate')assert.throws(()=>jointCiInventoryAt([...files,file],'officialAssetsFlow'));
  else assert.throws(()=>jointCiInventoryAt(files,'officialAssetsFlow',(p,e)=>{if(p!==file)return readFileSync(p,e);if(mode==='reader-throw')throw Error('reader failure');if(mode==='reader-null')return null;if(mode==='reader-buffer')return readFileSync(p);return readFileSync(p,e)+'\n';}));
 });
}
check('unknown inventory entry',()=>assert.throws(()=>preRatchetInventory([...files,'tests/unknown.test.mjs'])));
check('reader called afresh after warm projection',()=>{jointCiInventoryAt(files,'officialAssetsFlow');assert.throws(()=>jointCiInventoryAt(files,'officialAssetsFlow',()=>{throw Error('fresh failure')}),/fresh failure/)});
for(const eol of ['\n','\r\n']){
 const text=live.replaceAll('\n',eol),canonical=s=>s.replaceAll('\r\n','\n');
 check(`exact workflow and Draft hashes ${JSON.stringify(eol)}`,()=>{assert.equal(hash(canonical(project(text))),'28957431693a0c07dedcda5a1b8ffff031f94f93ca838203d65661343b46709d');assert.equal(hash(canonical(draft(text))),'aeb022f9209eda1311f3893acefc2c55a8d75c497b3b950a276d609964ea7535');});
 for(const [index,raw]of gates.entries()){
  const block=raw.replaceAll('\n',eol);
  const variants={missing:text.replace(block,''),duplicate:text+block,moved:text.replace(block,'')+block,partial:text.replace(block,block.slice(0,-10)),condition:text.replace(block,block.replace('if:','if: false &&')),base:text.replace(block,block.replace('base.sha','head.sha').replace('base_sha','head_sha')),extra:text.replace(block,block+'        continue-on-error: true'+eol)};
  for(const [name,changed]of Object.entries(variants))check(`gate ${index} ${name} ${JSON.stringify(eol)}`,()=>{assert.notEqual(changed,text);assert.equal(project(changed),changed);assert.notEqual(hash(canonical(draft(changed))),'aeb022f9209eda1311f3893acefc2c55a8d75c497b3b950a276d609964ea7535');});
 }
}
check('new exact calibration source projects; any extra bytes do not',()=>{const file='tests/ci-complete-calibration.test.mjs',src=readFileSync(file,'utf8');assert.notEqual(jointCiSourceAt(file,src,'officialAssetsFlow'),src);assert.equal(jointCiSourceAt(file,src+'\n','officialAssetsFlow'),src+'\n');});
console.log(JSON.stringify({scope:'CI projection independent negative controls only',checks:results.length,results},null,2));
