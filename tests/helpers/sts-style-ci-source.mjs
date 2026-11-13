import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {stsStyleCiBytes} from './sts-style-ci-binding.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
export const stsStyleCiProof=JSON.parse(gunzipSync(stsStyleCiBytes));
assert.equal(stsStyleCiProof.schemaVersion,1);assert.equal(stsStyleCiProof.normalization,'LF');
assert.equal(stsStyleCiProof.baseCommit,'cb1eac63620b908d880b8a339ab834b1b533dfc1');
for(const [path,row]of Object.entries(stsStyleCiProof.files))for(const side of ['before','after']){
 const binding=row[side];if(binding===null)continue;
 assert.equal(hash(binding.source),binding.sha256,path+'/'+side);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
}
for(const [path,row]of Object.entries(stsStyleCiProof.helperSources??{})){
 assert.equal(hash(row.source),row.sha256,path+' complete helper record');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),row.gitBlob);
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(stsStyleCiProof);
export function preStsStyleCiSource(path,source){
 const row=Object.hasOwn(stsStyleCiProof.files,path)?stsStyleCiProof.files[path]:null;
 return row?.before&&typeof source==='string'&&hash(norm(source))===row.after.sha256?row.before.source:source;
}
export function stsStylePriorRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding),text=typeof raw==='string'?raw:raw.toString('utf8'),prior=preStsStyleCiSource(path,text);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function stsStylePriorInventory(paths,read=readFileSync){
 const proof=stsStyleCiProof;if(!proof.addedTests.some(path=>paths.includes(path)))return [...paths];
 assert.deepEqual([...paths].sort(),proof.afterInventory,'complete StS Full inventory');
 for(const p of proof.addedTests)assert.equal(hash(norm(read(p,'utf8'))),proof.files[p].after.sha256,'StS added inventory source: '+p);
 return [...proof.beforeInventory];
}
export function assertStsStyleCiCurrent(paths,read=readFileSync){
 assert.deepEqual([...paths].sort(),stsStyleCiProof.afterInventory,'complete StS current Full inventory');
 for(const [p,row]of Object.entries(stsStyleCiProof.files))assert.equal(hash(norm(read(p,'utf8'))),row.after.sha256,'fresh complete StS CI source: '+p);
 for(const [p,row]of Object.entries(stsStyleCiProof.helperSources))assert.equal(hash(norm(read(p,'utf8'))),row.sha256,'fresh StS helper source: '+p);
}
