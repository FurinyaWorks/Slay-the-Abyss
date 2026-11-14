// Explicit immutable source views for the reviewed integration inputs.
// Production projectors never import this CI-only archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {integratedCiBytes} from './integrated-ci-binding.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const integratedCiProof=freeze(JSON.parse(gunzipSync(integratedCiBytes)));
assert.equal(integratedCiProof.schemaVersion,1);
assert.deepEqual(integratedCiProof.sources,{native:'97af2fed6db0d8c77ea29165ec6395bfb55e2161',closeout:'fdb91c7e30688f593728bde26db0e4d6f614d933',sts:'afd8834b1e7f613b7d68c7a4b6d68ca196f37064',menu:'ec0d0b990bb4baa7d45413101599ef3030f33892'});
for(const [path,row]of Object.entries(integratedCiProof.files))for(const binding of [row.current,...Object.values(row.views)].filter(Boolean)){
 assert.equal(binding.source,norm(binding.source));assert.equal(hash(binding.source),binding.sha256,path+' complete source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
}
export function integratedSource(path,source,target){
 assert(Object.hasOwn(integratedCiProof.sources,target),'known integration input');
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 const row=Object.hasOwn(integratedCiProof.files,path)?integratedCiProof.files[path]:null;
 if(!row?.views[target]||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256)return source;
 if(row.views[target].sha256===row.current.sha256)return source;
 return row.views[target].source;
}
export function integratedRead(target,{read=readFileSync}={}){return(path,encoding)=>{
 const raw=read(path,encoding);
 const binary=Object.hasOwn(integratedCiProof.binaryViews,path)?integratedCiProof.binaryViews[path]:null;
 if(Buffer.isBuffer(raw)&&binary?.views[target]&&hash(raw)===binary.current){
  const saved=binary.views[target],bytes=read(saved.path);assert.equal(hash(bytes),saved.sha256,'complete immutable integration binary predecessor');return bytes;
 }
 const text=typeof raw==='string'?raw:raw.toString('utf8'),prior=integratedSource(path,text,target);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function assertIntegratedCurrent(read=readFileSync){
 for(const [path,row]of Object.entries(integratedCiProof.files))assert.equal(hash(norm(read(path,'utf8'))),row.current.sha256,'fresh complete integration source: '+path);
 for(const [path,row]of Object.entries(integratedCiProof.closure))assert.equal(hash(path.endsWith('.gz')?read(path):norm(read(path,'utf8'))),row.after,'fresh integration copy owner: '+path);
}
export function extendIntegratedHelperClosure(original){
 const current={...original},patch=integratedCiProof.closure;
 assert.deepEqual(Object.keys(patch).sort(),['tests/helpers/closeout-source-epoch.mjs','tests/helpers/menu-presentation-source.json.gz','tests/helpers/menu-red-production-source.json.gz','tests/helpers/menu-red-source-epoch.mjs']);
 for(const [path,row]of Object.entries(patch)){assert.equal(row.before,original[path]??null,'exact integration copy predecessor: '+path);assert.match(row.after,/^[a-f0-9]{64}$/);current[path]=row.after;}
 return freeze(current);
}
export function renderIntegratedCiBinding(sha){
 assert.match(sha,/^[a-f0-9]{64}$/);
 return `// Fixed trust leaf; excluded from its own archive.\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\nexport const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));\nassert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),${JSON.stringify(sha)},'complete reviewed integration CI sources');\n`;
}
