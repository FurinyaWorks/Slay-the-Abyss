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
// The ratchet test postdates the frozen 834-file current and 829-file flow views.
// Its exact current source must be present before projecting the added file out.
export const ratchetInventoryFile='tests/quality-ratchet-policy.test.mjs';
const ratchetInventorySha='0283fc6349c408e38c99fa34df1f857be572f70b50fdd8f390c339fb61a01335';
const ratchetSourceBindings=Object.freeze({
 'scripts/lua-quality-metrics.mjs':Object.freeze({beforeSha256:'a7c2143575955ef265b1de0405cd020255fbe72d4b8b61320ea09d3bad6fba02',afterSha256:'7230ccd48a4818e7c42ce2d180ba9b0a5bf36862cff4135dbc17285ac7eda842'}),
 'tests/ci-complete-calibration.test.mjs':Object.freeze({beforeSha256:'8c5046164021603181e3816d8c1b3facd14d1ea926dc5d95a84b1f153c2bf4ec',afterSha256:'aaa4e166215b8af571f74ce1475b24e36550473b0ed7bb74225577d48afe7286'}),
});
for(const [file,row]of Object.entries(ratchetSourceBindings))assert.equal(proof.files[file]?.sha256,row.beforeSha256,'ratchet exact predecessor');
function sourceMatches(path,source,row){
 if(!row||typeof source!=='string')return false;
 const sha=hash(source.replaceAll('\r\n','\n'));
 return sha===row.sha256||(Object.hasOwn(ratchetSourceBindings,path)&&sha===ratchetSourceBindings[path].afterSha256);
}
export function preRatchetInventory(paths,readSource=readFileSync){
 assert.equal(typeof readSource,'function','inventory source reader');
 assert.deepEqual([...paths].sort(),[...proof.currentInventory,ratchetInventoryFile].sort(),'complete ratchet inventory');
 assert.equal(hash(readSource(ratchetInventoryFile,'utf8').replaceAll('\r\n','\n')),ratchetInventorySha,'ratchet inventory source');
 return [...proof.currentInventory];
}
const views=['componentAliasFix','officialAssetsFlow','defectReceipt','formationReceipt','officialFirstReceipt','officialFlowReceipt'];
export function jointCiMatches(path,source,target){
 assert(views.includes(target),'known joint CI view');
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return !!(row&&Object.hasOwn(row.targets,target)&&sourceMatches(path,source,row));
}
export function jointCiSourceAt(path,source,target){
 assert(views.includes(target),'known joint CI view');
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return row&&Object.hasOwn(row.targets,target)&&sourceMatches(path,source,row)?row.targets[target]:source;
}
export function jointCiInventoryAt(paths,target,readSource=readFileSync){
 assert.equal(target,'officialAssetsFlow','known joint inventory view');
 paths=preRatchetInventory(paths,readSource);
 assert.deepEqual([...paths].sort(),[...proof.currentInventory].sort(),'complete current inventory');
 for(const [path,sha]of Object.entries(proof.added))assert.equal(hash(readSource(path,'utf8').replaceAll('\r\n','\n')),sha,'added inventory source: '+path);
 return [...proof.flowInventory];
}
