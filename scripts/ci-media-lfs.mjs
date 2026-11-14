// Existing media and native state evidence: exact manifest-only LFS I/O.
import assert from 'node:assert/strict';
import {readFileSync, lstatSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {lfsArguments,lfsEnvironment} from './ci-reviewed-lfs.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=readFileSync(new URL('../config/ci-media-lfs.json',import.meta.url));
assert.equal(hash(bytes),'9e144aa53d856dd7f14402f30365168229e1957bf83f0b5bb7926256a6f66279','exact media and evidence manifest');
const manifest=JSON.parse(bytes);
assert.equal(manifest.schemaVersion,1);
const original={...manifest};delete original.evidenceExtension;delete original.archiveExtension;
assert.equal(hash(JSON.stringify(original,null,2)+'\n'),'732a8b8b64611a2a3f714bf41a7c2bc1f458b1a6f9dfb86f5d37d0dc0c3a715a','complete original media contract');
const freeze=row=>Object.freeze({...row,oldBinaryGitBlobs:Object.freeze(row.oldBinaryGitBlobs)});
export const originalMediaFiles=Object.freeze(manifest.files.map(freeze));
export const evidenceFiles=Object.freeze(manifest.evidenceExtension.files.map(freeze));
export const archiveFiles=Object.freeze(manifest.archiveExtension.files.map(freeze));
export const mediaFiles=Object.freeze([...originalMediaFiles,...evidenceFiles,...archiveFiles]);
const mediaMap=new Map(mediaFiles.map(row=>[row.path,row]));
export const mediaByPath=Object.freeze({size:mediaMap.size,has:path=>mediaMap.has(path),get:path=>mediaMap.get(path)});
export const maxMediaPayloadBytes=117369505;
export const maxEvidencePayloadBytes=37495268;
export const maxArchivePayloadBytes=6584075;
assert.equal(manifest.maxPayloadBytes,maxMediaPayloadBytes);
assert.equal(manifest.evidenceExtension.maxPayloadBytes,maxEvidencePayloadBytes);
assert.equal(manifest.evidenceExtension.sourceCommit,'f34723b6d54b6153de8a333a8abcc77884737f8f');
assert.equal(evidenceFiles.length,76);
assert.equal(manifest.archiveExtension.sourceCommit,'9f2f44e4c79789fbcb64a515938765dbc240f830');
assert.equal(manifest.archiveExtension.maxPayloadBytes,maxArchivePayloadBytes);
assert.deepEqual(archiveFiles.map(row=>row.path),['docs/evidence/m7-reward-query-cards-graph-20261107.jsonl.gz','docs/evidence/m9-ci-20261103/raw-ci.json.gz','docs/evidence/pr621-deck-sort-20261111/validation.tar.gz']);
assert.equal(mediaByPath.size,mediaFiles.length);
const unique=new Map();
for(const row of mediaFiles){
 assert(typeof row.path==='string'&&!isAbsolute(row.path)&&!/[\\\s,:*?\[\]\0]/u.test(row.path)&&row.path.split('/').every(p=>p!=='.'&&p!=='..'&&p!==''),'exact safe media path');
 const scoped=evidenceFiles.includes(row)?/^docs\/evidence\/.+\.json\.gz$/.test(row.path)&&row.sourceCommit===manifest.evidenceExtension.sourceCommit
  :archiveFiles.includes(row)?row.sourceCommit===manifest.archiveExtension.sourceCommit:/\.(png|jpe?g|gif)$/i.test(row.path);
 assert(scoped&&/^[0-9a-f]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0);
 assert(row.oldBinaryGitBlobs.length>0&&row.oldBinaryGitBlobs.every(id=>/^[0-9a-f]{40}$/.test(id))&&typeof row.category==='string');
 if(unique.has(row.sha256))assert.equal(unique.get(row.sha256),row.bytes);unique.set(row.sha256,row.bytes);
}
const payload=rows=>[...new Map(rows.map(row=>[row.sha256,row.bytes])).values()].reduce((a,b)=>a+b,0);
assert.equal(payload(originalMediaFiles),maxMediaPayloadBytes,'distinct original media payload');
assert.equal(new Set(evidenceFiles.map(row=>row.sha256)).size,58);
assert.equal(payload(evidenceFiles),maxEvidencePayloadBytes,'distinct exact evidence payload');
assert.equal(payload(archiveFiles),maxArchivePayloadBytes,'distinct exact existing history payload');
const maxStoragePayloadBytes=maxMediaPayloadBytes+maxEvidencePayloadBytes+maxArchivePayloadBytes;
assert.equal([...unique.values()].reduce((a,b)=>a+b,0),maxStoragePayloadBytes,'distinct exact storage payload');
export const mediaPointer=row=>Buffer.from(`version https://git-lfs.github.com/spec/v1\noid sha256:${row.sha256}\nsize ${row.bytes}\n`);
export function validateMediaPointers(pointers){
 assert.equal(pointers.size,mediaFiles.length,'complete media pointer inventory');
 for(const row of mediaFiles)assert(Buffer.isBuffer(pointers.get(row.path))&&pointers.get(row.path).equals(mediaPointer(row)),'exact frozen media index pointer: '+row.path);
 return {files:mediaFiles.length,objects:unique.size,bytes:maxStoragePayloadBytes};
}
export function validateMediaIndex(root,env=process.env){
 const staged=spawnSync('git',['ls-files','--stage','-z'],{cwd:root,env:lfsEnvironment({...env,CI_LFS_TOKEN:''}),windowsHide:true,timeout:30000,maxBuffer:8*1024*1024});
 assert(!staged.error&&staged.status===0,'complete media index modes');
 const modes=new Map();
 for(const line of staged.stdout.toString('utf8').split('\0').filter(Boolean)){
  const match=/^(\d+) [0-9a-f]{40} ([0-3])\t(.+)$/.exec(line);assert(match,'ordinary staged entry');
  if(mediaByPath.has(match[3])){assert.equal(match[2],'0','no conflicted media pointer');assert(!modes.has(match[3]),'one media pointer stage');modes.set(match[3],match[1]);}
 }
 for(const row of mediaFiles)assert.equal(modes.get(row.path),'100644','ordinary media index mode: '+row.path);
 const result=spawnSync('git',['cat-file','--batch'],{cwd:root,env:lfsEnvironment({...env,CI_LFS_TOKEN:''}),
  input:mediaFiles.map(row=>':'+row.path+'\n').join(''),windowsHide:true,timeout:30000,maxBuffer:1024*1024});
 if(result.error||result.status!==0)throw Error('Cannot read complete media index pointers');
 const output=result.stdout;let offset=0;const pointers=new Map();
 for(const row of mediaFiles){
  const end=output.indexOf(10,offset);assert(end>=0,'complete media object header');
  const match=/^[0-9a-f]{40} blob ([0-9]+)$/.exec(output.subarray(offset,end).toString());assert(match&&Number(match[1])<=200,'small media pointer blob: '+row.path);
  const length=Number(match[1]);offset=end+1;pointers.set(row.path,output.subarray(offset,offset+length));offset+=length;assert.equal(output[offset++],10);
 }
 assert.equal(offset,output.length);validateMediaPointers(pointers);
}
function mediaPath(root,row){
 const path=resolve(root,row.path),rel=relative(root,path);
 assert(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../')&&!rel.startsWith('..\\'),'media stays inside checkout');
 const stat=lstatSync(path);assert(stat.isFile()&&!stat.isSymbolicLink(),'media must be a regular checkout file: '+row.path);
 assert.equal(realpathSync.native(path),path,'media cannot alias another destination');return path;
}
export function verifyMediaAssets(root){
 for(const row of mediaFiles){const data=readFileSync(mediaPath(root,row));assert.equal(data.length,row.bytes,'exact media size: '+row.path);assert.equal(hash(data),row.sha256,'complete media bytes: '+row.path);}
 return {files:mediaFiles.length,objects:unique.size,bytes:maxStoragePayloadBytes};
}
export function prepareMediaAssets({root=process.cwd(),env=process.env}={}){
 root=realpathSync.native(root);validateMediaIndex(root,env);
 const needed=[];
 for(const row of mediaFiles){const data=readFileSync(mediaPath(root,row));if(data.equals(mediaPointer(row)))needed.push(row.path);else{assert.equal(data.length,row.bytes,'changed media size');assert.equal(hash(data),row.sha256,'changed media content: '+row.path);}}
 if(!needed.length)return {status:'cached',...verifyMediaAssets(root)};
 const batches=[];let batch=[],length=0;
 for(const path of needed){if(length+path.length+1>12000){batches.push(batch);batch=[];length=0;}batch.push(path);length+=path.length+1;}if(batch.length)batches.push(batch);
 const deadline=Date.now()+90000;
 for(const paths of batches){
  const remaining=deadline-Date.now();assert(remaining>0,'bounded media preparation deadline');
  const prefix=lfsArguments.slice(0,lfsArguments.indexOf('--include'));
  const result=spawnSync('git',[...prefix,'--include',paths.join(','),'--exclude',''],{cwd:root,env:lfsEnvironment(env),windowsHide:true,timeout:remaining,maxBuffer:1024*1024});
  if(result.error||result.status!==0)throw Error('Exact existing media LFS materialization failed; no verified media result');
 }
 return {status:'materialized',...verifyMediaAssets(root)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{assert.equal(process.argv.length,2);console.log(JSON.stringify(prepareMediaAssets()));}catch(error){console.error(error.message);process.exitCode=1;}
}
