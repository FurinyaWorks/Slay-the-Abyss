import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {menuRedEpoch} from './closeout-source-epoch.mjs';
const mode=process.argv[2]??'--check';assert(['--check','--write'].includes(mode));
const baseCommit='b427ac7ce8c947b06e1f27ae1625a26bc2f80270',currentCommit='0eac1d3c2f69cfcd865dae0d5657b449c2fc2d59';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const binding=source=>({source,sha256:hash(source),gitBlob:createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')});
const git=(revision,path)=>norm(execFileSync('git',['show',revision+':'+path],{encoding:'utf8',maxBuffer:8*1024*1024}));
const prior=menuRedEpoch.proof.current,inventoryBefore=Object.keys(prior).sort();
const inventoryAfter=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
const current={},before={};
for(const path of inventoryBefore)assert.equal(git(baseCommit,path),prior[path].source,'complete committed predecessor: '+path);
for(const path of inventoryAfter){
 const source=norm(readFileSync(path,'utf8'));assert.equal(source,git(currentCommit,path),'exact frozen release source: '+path);
 if(hash(source)!==prior[path]?.sha256){current[path]=binding(source);before[path]=prior[path]??null;}
}
for(const path of inventoryBefore)assert(inventoryAfter.includes(path),'no unregistered source removal');
const bytes=gzipSync(JSON.stringify({schemaVersion:1,baseCommit,currentCommit,inventoryBefore,inventoryAfter,current,before}));
const path='tests/helpers/release-source-epoch.json.gz';
if(mode==='--write')writeFileSync(path,bytes);else assert.deepEqual(readFileSync(path),bytes);
console.log(JSON.stringify({owners:Object.keys(current).length,paths:inventoryAfter.length,sha256:hash(bytes)}));
