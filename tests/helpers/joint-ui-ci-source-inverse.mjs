import {preIntegrationCalibrationSource} from './integration-1111-tooling.mjs';
import {cursesReceiptMatches,preCursesReceiptSource} from './curses-ci-planning.mjs';
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
// These reviewed additions postdate the frozen joint receipt. They remain in
// raw Full discovery, but may project out only with this exact source identity.
const inventoryAdditions=Object.freeze({
 'tests/curses-shape-responsibilities.test.mjs':'e482abadfebed52eb217774773ee5d966abc43b95b6defe0390ad49002d2c9dd',
 'tests/curses-source-epoch.test.mjs':'39d2e2d9e6af99a37c7d43ff20d767b708c8fc4407b3f1f7efc6143d9d6f502a',
 'tests/historical-monster-import-boundary.test.mjs':'89256455dd7f3a3d53d20c7c016e30abc46b422c7671208ee740e0908e9684fc',
});
// Only these complete reviewed source updates may enter their original named
// receipt views. The archived source/targets and unrelated files remain frozen.
const sourceAdditions=Object.freeze({
 "tests/ci-complete-calibration.test.mjs":Object.freeze({"beforeSha256":"8c5046164021603181e3816d8c1b3facd14d1ea926dc5d95a84b1f153c2bf4ec","afterSha256":"996bf9ba484ca5d3a10d66cd56d5e934a6fc107e75e2c914330ba528ff6c1c21"}),
 "scripts/ci-test-timings.json":Object.freeze({"beforeSha256":"18174c289e1f6f49b62e7c060bb98b6d41420dcfa77df8b668aa730a385ccc80","afterSha256":"a423700109c482cd5fdea24be4649463c4c7287fa2ed725a71dc323290da93a1"}),
 "tests/helpers/ci-complete-calibration-source-inverse.mjs":Object.freeze({"beforeSha256":"fcfd93b82e97cb81158ce01daa54b48cfa2f9c8dee7a06fceb572708c0f3db64","afterSha256":"a54e59fc162811dc2eabc3c562e3ba5f3afd7f99867c6d8c23d3f49e9d77efe0"}),
 "tests/helpers/combined-epoch/source-epoch.mjs":Object.freeze({"beforeSha256":"9c13e8134088d55a7a7b57e7f4fe905fd87cdc9a36e6c636049285e6fa99faf1","afterSha256":"ebb69c0778a5465273edae9b2fd2d523d3efa6cb248e2a02316b757a1bc3840a"}),
 "tests/helpers/copy-integration-source-closure.mjs":Object.freeze({"beforeSha256":"71037a75db878ed49e7fd6d9da825018938df7979eae903f92d1b09535685577","afterSha256":"ded0e09da316ed2d505351908a4a542bda95b2c11d8760965095ffb40914a3c0"}),
 "tests/defect-final-source-epoch.test.mjs":Object.freeze({"beforeSha256":"ca73fc5eb550e5938b1025a5a5d0eac70d60e576bb73590c2f0b03cd8721593e","afterSha256":"c5613e74fbacd3a7a3eec4392d88d6683a4791280ad7e92ec7e6f12b84ac6746"}),
 "tests/encounter-formation-source-epoch.test.mjs":Object.freeze({"beforeSha256":"7fcd36fc904e9b40a415cdc0eba863efe0ca7aa44fdc162247cccc029a139e16","afterSha256":"5a48e640d23b571851eeaa0b3464992c7521562e418f2c07072cdd68efb62dcb"}),
});
for(const [path,binding]of Object.entries(sourceAdditions))assert.equal(proof.files[path]?.sha256,binding.beforeSha256,'exact added CI source predecessor: '+path);
function sourceMatches(path,source,row){
 if(!row||typeof source!=='string')return false;
 source=preIntegrationCalibrationSource(path,source);
 const sha=hash(source.replaceAll('\r\n','\n'));
 return sha===row.sha256||(Object.hasOwn(sourceAdditions,path)&&sha===sourceAdditions[path].afterSha256);
}
// The Act1 comparison-only update is newer than the frozen Formation Lua
// inventory and is absent from proof.files. Only this complete current fixture
// may reconstruct its original receipt bytes; every other view stays untouched.
function act1FormationReceiptSource(path,source,target){
 if(path!=='tests/lua/act1_event_content.lua'||target!=='formationReceipt'||typeof source!=='string')return null;
 const current=source.replaceAll('\r\n','\n');
 if(hash(current)!=='557a6f941bf154e07443aa6b6b9481ea328a350062790a4fbcb96a9d43cb7410')return null;
 const after="local function eq(a,b,different)if different or not (a==b)then assert(false,tostring(a)..' ~= '..tostring(b))end end\nlocal function same(a,b)local ta,tb=type(a),type(b);if ta~=tb then eq(ta,tb,true)end;if ta~='table'then if not (a==b)then eq(a,b,true)end;return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do if a[k]==nil then assert(false)end end end\n";
 const before="local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end\nlocal function same(a,b)eq(type(a),type(b));if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end\n";
 const historical=current.replace(after,before);
 assert.equal(hash(historical),'8af87e0dd5a776d19436c613a8c9bd5dba4bfc381d03ca7260a574e3b6a16a00','complete Act1 Formation receipt source');
 return historical;
}
const views=['componentAliasFix','officialAssetsFlow','defectReceipt','formationReceipt','officialFirstReceipt','officialFlowReceipt'];
export function jointCiMatches(path,source,target){
 assert(views.includes(target),'known joint CI view');
 if(act1FormationReceiptSource(path,source,target)!==null)return true;
 if(target==='officialAssetsFlow'&&cursesReceiptMatches(path,source))return true;
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return !!(row&&Object.hasOwn(row.targets,target)&&sourceMatches(path,source,row));
}
export function jointCiSourceAt(path,source,target){
 assert(views.includes(target),'known joint CI view');
 const act1=act1FormationReceiptSource(path,source,target);if(act1!==null)return act1;
 if(target==='officialAssetsFlow'&&cursesReceiptMatches(path,source))return preCursesReceiptSource(path,source);
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return row&&Object.hasOwn(row.targets,target)&&sourceMatches(path,source,row)?row.targets[target]:source;
}
export function jointCiInventoryAt(paths,target,readSource=readFileSync){
 assert.equal(target,'officialAssetsFlow','known joint inventory view');
 assert.deepEqual([...paths].sort(),[...proof.currentInventory,...Object.keys(inventoryAdditions)].sort(),'complete current inventory');
 for(const [path,sha]of Object.entries({...proof.added,...inventoryAdditions}))assert.equal(hash(readSource(path,'utf8').replaceAll('\r\n','\n')),sha,'added inventory source: '+path);
 return [...proof.flowInventory];
}

// Return only the exact complete current timing extension to its frozen raw
// predecessor; old/foreign/partial source is never generically stripped.
export function preCurrentPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string')return source;
 return hash(source.replaceAll('\r\n','\n'))===sourceAdditions[path].afterSha256?proof.files[path].current:source;
}
