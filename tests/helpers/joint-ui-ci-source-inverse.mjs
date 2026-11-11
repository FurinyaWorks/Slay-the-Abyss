import {preJoustCiSource} from './joust-ci-source-inverse.mjs';
// Exact source and inventory views for immutable CI receipts; current Full stays raw.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./joint-ui-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'9fee4e85665d37746b68368fced892a316db490c8e01273328391bc57acfd840','joint CI compressed identity');
const proof=JSON.parse(gunzipSync(bytes));
for(const row of Object.values(proof.files))assert.equal(hash(row.current),row.sha256);
const views=['componentAliasFix','officialAssetsFlow','defectReceipt','formationReceipt','officialFirstReceipt','officialFlowReceipt'];
export function jointCiMatches(path,source,target){
 assert(views.includes(target),'known joint CI view');
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return !!(row&&Object.hasOwn(row.targets,target)&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.sha256);
}
export function jointCiSourceAt(path,source,target){
 assert(views.includes(target),'known joint CI view');
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return row&&Object.hasOwn(row.targets,target)&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.sha256?row.targets[target]:source;
}
export function jointCiInventoryAt(paths,target){
 assert.equal(target,'officialAssetsFlow','known joint inventory view');
 assert.deepEqual([...paths].sort(),[...proof.currentInventory].sort(),'complete current inventory');
 for(const [path,sha]of Object.entries(proof.added))assert.equal(hash(preJoustCiSource(path,readFileSync(path,'utf8')).replaceAll('\r\n','\n')),sha,'added inventory source: '+path);
 return [...proof.flowInventory];
}
