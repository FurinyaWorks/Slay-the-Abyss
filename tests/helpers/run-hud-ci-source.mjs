// Exact outer continuation into the immutable 903bf closeout CI corpus.
// New files remain unmeasured raw Full work; no historical archive is rewritten.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./run-hud-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'fa385b20797f37ca5a8c0a406d6ecdad6b4c0539c27a825e751b7eadeb4f5408','complete run HUD CI continuation');
export const runHudCiProof=JSON.parse(gunzipSync(bytes));
assert.equal(runHudCiProof.schemaVersion,1);
assert.equal(runHudCiProof.normalization,'LF');
assert.equal(runHudCiProof.base,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
for(const [path,row]of Object.entries(runHudCiProof.files))for(const side of ['before','after']){
 const binding=row[side];if(binding===null)continue;
 assert.equal(hash(binding.source),binding.sha256,path+'/'+side);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
 Object.freeze(binding);
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(runHudCiProof);
export function preRunHudCiSource(path,source){
 const row=Object.hasOwn(runHudCiProof.files,path)?runHudCiProof.files[path]:null;
 if(!row||!row.before||typeof source!=='string'||hash(normalize(source))!==row.after.sha256)return source;
 return row.before.source;
}
export function runHudPriorRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding),text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=preRunHudCiSource(path,text);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function runHudPriorInventory(paths,read=readFileSync){
 const sorted=[...paths].sort(),p=runHudCiProof;
 if(!p.addedTests.some(path=>sorted.includes(path)))return [...paths];
 assert.deepEqual(sorted,p.afterInventory,'complete run HUD inventory');
 for(const path of p.addedTests){
  assert.equal(hash(normalize(read(path,'utf8'))),p.files[path].after.sha256,'run HUD added inventory source: '+path);
 }
 return [...p.beforeInventory];
}
