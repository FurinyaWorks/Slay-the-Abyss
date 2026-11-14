// Exact complete-file continuation. Earlier source corpora remain immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./selection-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'02ba563b57383e8ab328051dfa29a3a0d57769a60b94cb4a265cb8ff7514881e');
export const selectionCiProof=JSON.parse(gunzipSync(bytes));
assert.equal(selectionCiProof.schemaVersion,1);assert.equal(selectionCiProof.normalization,'LF');
assert.equal(selectionCiProof.base,'9f2f44e4c79789fbcb64a515938765dbc240f830');
for(const [path,row]of Object.entries(selectionCiProof.files))for(const side of ['before','after']){
 const binding=row[side];assert.equal(hash(binding.source),binding.sha256,path+'/'+side);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
}
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
freeze(selectionCiProof);
export function selectionUpdatedProof(prior){
 return freeze({...prior,files:Object.fromEntries(Object.entries(prior.files).map(([path,row])=>{
  const next=Object.hasOwn(selectionCiProof.files,path)?selectionCiProof.files[path]:null;
  if(next)assert.deepEqual(next.before,row.after,path+' exact predecessor');
  return [path,next?{...row,after:next.after}:row];
 }))});
}
export function preSelectionCiSource(path,source){
 const row=Object.hasOwn(selectionCiProof.files,path)?selectionCiProof.files[path]:null;
 if(!row||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==row.after.sha256)return source;
 return row.before.source;
}
