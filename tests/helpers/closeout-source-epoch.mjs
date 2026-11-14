// One exact current production closure; original slices and archives stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
import {extendStsStyleEpoch} from './sts-style-source-epoch-runtime.mjs';
import {stsStylePatch} from './sts-style-source-proof.mjs';
import {extendFeedbackSourceEpoch} from './sts-feedback-source-runtime.mjs';
import {feedbackProductionPatch} from './sts-feedback-production.mjs';
import {extendMenuRedSourceEpoch} from './menu-red-source-epoch.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./closeout-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'36aba7fc07f732a191a750d437eefd27e9b9567221811747abf13c97a9ac237a');
const packed=JSON.parse(gunzipSync(bytes));
const expand=files=>Object.fromEntries(Object.entries(files).map(([path,id])=>[path,id===null?null:packed.records[id]]));
const priorProof={...packed,current:expand(packed.current),targets:Object.fromEntries(Object.entries(packed.targets).map(([name,target])=>[name,{...target,files:expand(target.files)}]))};
delete priorProof.records;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const closeoutPriorEpoch=createSourceEpochProjector(freeze(priorProof),{allowConfigLayout:true,reuseFrozenInput:true});
// Only this five-source continuation advances. The complete old closeout archive,
// target views and receipt identities above remain independent and immutable.
const shopBytes=readFileSync(new URL('./shop-deck-source-epoch.json.gz',import.meta.url));
assert.equal(hash(shopBytes),'f5546b3bd0264af9e4fff867637fe217e4e7c32482e72104d7d3c1f3cc43a03b','shop/deck complete archive identity');
const outer=createSourceEpochProjector(JSON.parse(gunzipSync(shopBytes))).proof;
assert.equal(outer.targets.prior.commit,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
assert.deepEqual(Object.keys(outer.current),['src/lua/abyss_deck_ui.lua','src/lua/abyss_merchant.lua','src/lua/abyss_game_ui_input.lua','src/lua/abyss_node_ui_feedback.lua','src/lua/abyss_potion_discard_ui.lua']);
for(const [path,binding]of Object.entries(outer.targets.prior.files))assert.deepEqual(binding,priorProof.current[path],'shop/deck exact closeout predecessor: '+path);
const current={...priorProof.current,...outer.current};
const fourBytes=readFileSync(new URL('./shop-deck-four-source-epoch.json.gz',import.meta.url));
assert.equal(hash(fourBytes),'51034e9da34cbe0ab153f00ab66a16918db1097ef7173932ab326cc6c2076f2b','immutable PR639 four-source predecessor');
const four=createSourceEpochProjector(JSON.parse(gunzipSync(fourBytes))).proof;
for(const [path,binding]of Object.entries(four.targets.prior.files))assert.deepEqual(binding,priorProof.current[path],'four-source predecessor: '+path);
export const shopDeckFourSourcePrior=freeze(four);
const beforeRepairBytes=readFileSync(new URL('./shop-deck-before-ci-repair-source-epoch.json.gz',import.meta.url));
assert.equal(hash(beforeRepairBytes),'94d6f85a83a1593bbbaf34ae13986ddfbca97312e183b4e7f6b08ca58b8d911b','immutable PR639 five-source predecessor before Full repair');
export const shopDeckBeforeCiRepairPrior=freeze(createSourceEpochProjector(JSON.parse(gunzipSync(beforeRepairBytes))).proof);
for(const [path,binding]of Object.entries(shopDeckBeforeCiRepairPrior.targets.prior.files))assert.deepEqual(binding,priorProof.current[path],'five-source predecessor: '+path);
const targets={...priorProof.targets,shopDeckPrior:{commit:outer.targets.prior.commit,files:priorProof.current},
 shopDeckFourPrior:{commit:four.currentCommit,files:{...priorProof.current,...four.current}},
 shopDeckBeforeCiRepairPrior:{commit:shopDeckBeforeCiRepairPrior.currentCommit,files:{...priorProof.current,...shopDeckBeforeCiRepairPrior.current}}};
const owners=Object.keys(current).filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
export const ciRepairSourceEpoch=createSourceEpochProjector(freeze({...priorProof,currentTreeCommitted:false,
 currentCommit:outer.currentCommit,currentCommitRole:outer.currentCommitRole,current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
export const stsStyleEpoch=extendStsStyleEpoch(ciRepairSourceEpoch,stsStylePatch);
export const menuRedPriorEpoch=extendFeedbackSourceEpoch(stsStyleEpoch,feedbackProductionPatch);
export const sourceEpoch=extendMenuRedSourceEpoch(menuRedPriorEpoch);
const proof=sourceEpoch.proof;
// Snapshot consumers must first authenticate every live current owner. This is
// per invocation; neither live reads nor authorization are cached.
export function sourceSlice(path,source,target,readSource=p=>readFileSync(p,'utf8')){
 assert(Object.hasOwn(proof.targets,target),'known closeout source slice');
 const row=Object.hasOwn(proof.current,path)?proof.current[path]:null;
 if(!row||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==row.sha256)return source;
 const before=proof.targets[target].files[path];
 if(!before||before.sha256===row.sha256)return source;
 return sourceEpoch.preCombinedSource(path,source,{target,readSource});
}
