import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const out='docs/evidence/lumine-convergence-20261111';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const candidate=read('.artifacts/lumine-convergence-20261111/edge-2283-final/gil/candidate.json');
for(const input of candidate.inputs.filter(x=>x.path.endsWith('.lua')))
 assert.equal(hash(input.path),input.sha256,'runtime changed after measurement');
const regressions=fs.readFileSync('.artifacts-lumine-r2-related.log','utf8');
assert.match(regressions,/# pass 69\r?\n/);assert.match(regressions,/# fail 0\r?\n/);
const logs=['related','engineering','platform-daily','backlog','guidance','sampling-test'];
for(const name of logs){
 const file='.artifacts-lumine-r2-'+name+'.log';
 fs.writeFileSync(out+'/'+name+'.log.gz',gzipSync(fs.readFileSync(file)));
}
const sources=['src/lua/abyss_lumine_idle.lua','src/lua/abyss_traveler_portraits.lua','tests/lumine-idle.test.mjs',
 ...fs.readdirSync('experiments/lumine-idle').filter(x=>/\.(mjs|py)$/.test(x)).map(x=>'experiments/lumine-idle/'+x)];
fs.writeFileSync(out+'/validation-summary.json',JSON.stringify({
 runtimeMatchesMeasuredInputs:true,runtimeRegressions:{tests:69,passed:69,failed:0},
 engineering:'passed including critical mutations and native lifecycle contract',
 platformDaily:'passed for the unchanged formal asset/build manifest; not official capacity of the experimental overlay',
 backlog:'passed',guidance:'passed',nodePythonSyntax:'passed',
 fullCi:'not_completed',officialImport:'not_run',officialReady:'not_run',officialPC:'not_run',phone:'not_run',officialCapacity:'not_measured',
 sourceHashes:sources.map(file=>({file,sha256:hash(file)}))
},null,2)+'\n');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name);
 if(entry.isDirectory())walk(file);
 else if(file!==path.join(out,'manifest.json'))files.push({file:path.relative(out,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:hash(file)});
}}
walk(out);fs.writeFileSync(out+'/manifest.json',JSON.stringify({scope:'byte identities, not acceptance certification',files},null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((a,x)=>a+x.bytes,0),runtimeMatchesMeasuredInputs:true}));
