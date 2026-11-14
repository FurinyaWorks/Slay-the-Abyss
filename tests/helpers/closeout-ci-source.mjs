// Exact named views for immutable receipts. Current Full uses raw discovery.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceSlice} from './closeout-source-epoch.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const namingBytes=readFileSync(new URL('./naming-package-source.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(hash(namingBytes),'c2f602587df404d4b7bf298406e8a288c8ad01038e9029c0b5ba7e3e4f1fe4d1');
const naming=JSON.parse(namingBytes);
assert.equal(hash(naming.source),naming.before);
const bytes=readFileSync(new URL('./closeout-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'cfc72306af30d0d4b0b61398e3ed0eea36767d6e005c146eb215897fc431a8f8');
const packed=JSON.parse(gunzipSync(bytes));
for(const [id,source]of Object.entries(packed.records))assert.equal(hash(source),id,'complete closeout CI record');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const closeoutCiProof=freeze(packed);
function target(name){assert(Object.hasOwn(packed.targets,name),'known closeout CI view');return packed.targets[name];}
export function preCloseoutCiSource(path,source,view){
 const before=target(view);
 if(before.scope==='workflow-only'&&path!=='.github/workflows/quality.yml')return source;
 if(path===naming.path&&typeof source==='string'&&!source.includes('\r\r\n')&&hash(source.replaceAll('\r\n','\n'))===naming.current)return naming.source;
 // Production sources belong to the complete freshly authenticated owner
 // closure; a CI receipt must never intercept them before that authorization.
 if(path==='config/architecture.json'||path.startsWith('src/lua/'))return source;
 const id=Object.hasOwn(packed.current,path)?packed.current[path]:null;
 if(!id||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==id)return source;
 const prior=before.files[path];
 return prior?packed.records[prior]:source;
}
export function closeoutInventory(paths,view,readSource=readFileSync){
 const before=target(view),sorted=[...paths].sort();
 assert.notEqual(before.scope,'workflow-only','workflow-only views cannot project test inventories');
 if(JSON.stringify(sorted)===JSON.stringify(before.inventory))return [...paths];
 assert.deepEqual(sorted,packed.inventory,'complete raw closeout inventory');
 for(const path of packed.inventory.filter(p=>!before.inventory.includes(p))){
  const source=readSource(path,'utf8');
  assert.equal(hash(source.replaceAll('\r\n','\n')),packed.current[path],'closeout added inventory source: '+path);
 }
 return [...before.inventory];
}
export function closeoutRead(view,read=readFileSync){
 const before=target(view);
 return (path,encoding)=>{
  const value=read(path,encoding),source=typeof value==='string'?value:value.toString('utf8');
  let prior=preCloseoutCiSource(path,source,view);
  if(before.scope!=='workflow-only'&&prior===source&&(path==='config/architecture.json'||path.startsWith('src/lua/')))
   prior=sourceSlice(path,source,view,p=>read(p,'utf8'));
  return typeof value==='string'?prior:prior===source?value:Buffer.from(prior);
 };
}
