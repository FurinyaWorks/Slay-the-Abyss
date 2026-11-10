import {readFileSync as read,writeFileSync as write,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['tests/ci-host-timing-calibration.test.mjs','tests/ci-windows-shape-expansion.test.mjs','scripts/ci-test-timings.json','tests/ci-complete-calibration.test.mjs','tests/ci-runtime.test.mjs','config/architecture.json','src/lua/abyss_run.lua','src/lua/abyss_uncommon_relics.lua','tests/helpers/combined-epoch/source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs','tests/encounter-formation-source-epoch.test.mjs','tests/defect-final-source-epoch.test.mjs','tests/silent-final-source-epoch.test.mjs','tests/seven-refactor-source-epoch.test.mjs'];
const files=Object.fromEntries(paths.map(path=>{const beforeSource=execFileSync('git',['show','ab65ed3b5b4240eb653af4651a13c1b8c72b2e04:'+path],{encoding:'utf8',maxBuffer:8*1024**2}),afterSource=read(path,'utf8').replaceAll('\r\n','\n');return [path,{beforeSource,beforeSha256:hash(beforeSource),afterSource,afterSha256:hash(afterSource)}];}));
const inventory={js:readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f).sort(),luaSha256:Object.fromEntries(readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).sort().map(f=>['tests/lua/'+f,hash(read('tests/lua/'+f,'utf8').replaceAll('\r\n','\n'))]))};
const addedPaths=["src/lua/abyss_run_health.lua","tests/helpers/run-healing-source-epoch.mjs","tests/helpers/run-healing-source-epoch.json.gz","tests/helpers/combined-epoch/pre-run-healing-source-epoch.mjs"];
const addedSha256=Object.fromEntries(addedPaths.map(path=>[path,hash(path.endsWith('.gz')?read(path):read(path,'utf8').replaceAll('\r\n','\n'))]));
const proof={schemaVersion:1,inventory,addedSha256,baseCommit:'ab65ed3b5b4240eb653af4651a13c1b8c72b2e04',currentCommitRole:'Uncommitted RunHealing slice; exact byte projection only.',files};
const bytes=Buffer.from(JSON.stringify(proof)),archive=gzipSync(bytes,{level:9});write('tests/helpers/run-healing-ci-source-epoch.json.gz',archive);
write('tests/helpers/run-healing-ci-source-inverse.mjs',`// Complete-byte local cost epoch. All predecessor data and assertions remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./run-healing-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'${hash(archive)}');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'${hash(bytes)}');
export const runHealingCiProof=JSON.parse(bytes);
for(const binding of Object.values(runHealingCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
}
export function preRunHealingCiSource(path,source){
 const binding=Object.hasOwn(runHealingCiProof.files,path)?runHealingCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\\r\\n','\\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
`);
console.log(JSON.stringify({paths,archiveSha256:hash(archive),bytesSha256:hash(bytes)}));
