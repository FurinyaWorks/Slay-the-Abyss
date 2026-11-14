import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const mode=process.argv[2]??'--check';assert(['--check','--write'].includes(mode));
const baseCommit='b427ac7ce8c947b06e1f27ae1625a26bc2f80270',currentCommit='a3f0295829eda4e7e342e1edab69fa892606d63a';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const binding=source=>({source,sha256:hash(source),gitBlob:createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')});
const git=(revision,path)=>norm(execFileSync('git',['show',revision+':'+path],{encoding:'utf8',maxBuffer:8*1024*1024}));
const inventoryBefore=execFileSync('git',['ls-tree','-r','--name-only',baseCommit,'--','config/architecture.json','src/lua'],{encoding:'utf8'})
 .trim().split('\n').filter(path=>path==='config/architecture.json'||path.endsWith('.lua')).sort();
const prior=Object.fromEntries(inventoryBefore.map(path=>[path,binding(git(baseCommit,path))]));
const inventoryAfter=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
const current={},before={};
for(const path of inventoryAfter){
 const source=norm(readFileSync(path,'utf8'));assert.equal(source,git(currentCommit,path),'exact frozen release source: '+path);
 if(hash(source)!==prior[path]?.sha256){current[path]=binding(source);before[path]=prior[path]??null;}
}
for(const path of inventoryBefore)assert(inventoryAfter.includes(path),'no unregistered source removal');
const bytes=gzipSync(JSON.stringify({schemaVersion:1,baseCommit,currentCommit,inventoryBefore,inventoryAfter,current,before}));
const path='tests/helpers/release-source-epoch.json.gz';
if(mode==='--write')writeFileSync(path,bytes);else assert.deepEqual(readFileSync(path),bytes);
console.log(JSON.stringify({owners:Object.keys(current).length,paths:inventoryAfter.length,sha256:hash(bytes)}));
