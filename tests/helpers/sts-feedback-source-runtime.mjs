// One exact feedback continuation. Prior bytes/targets remain independently readable.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
export const feedbackBase='d359015e567aa2d8ee39cce069f2a151206d1f1d';
export const feedbackPriorCiSha='4dc022273fd7ca381b1de6bca1fdd1c9eb49ceb94df292d9e490b4ab2abc80f5';
export const feedbackPriorClosureSha='031c42758ec5b37d1782c5fdb70542358d4b2631a5ee9b486b6bb5faccc988b5';
export const feedbackProductionPaths=Object.freeze([
 'battle_detail_bindings','battle_details','battle_enemy_view','battle_reward_layout','card_skin','deck_ui',
 'game_ui','game_ui_view','monster_power_view','node_ui','node_ui_events','node_ui_feedback','page_reveal','ui',
].map(n=>'src/lua/abyss_'+n+'.lua').sort());
export const feedbackAddedTests=Object.freeze(['tests/deck-browser-reveal-reuse.test.mjs','tests/enemy-status-hand-clearance.test.mjs',
 'tests/event-option-rim-clipping.test.mjs','tests/sts-reward-row.test.mjs','tests/sts-reward-row-runtime.test.mjs'].sort());
export const feedbackHelperPaths=Object.freeze([
 'tests/helpers/closeout-source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs',
 'tests/helpers/sts-style-ci-source.mjs','tests/helpers/sts-feedback-source-runtime.mjs',
 'tests/helpers/sts-feedback-production.mjs','tests/helpers/sts-feedback-ci.mjs',
 'tests/helpers/generate-sts-feedback-source.mjs',
]);
export const feedbackProductCiPaths=Object.freeze(['data/presentation/ui_theme.json','scripts/official-assets-layout.mjs',
 'scripts/official-run-layout.mjs','scripts/v25-node-layout.mjs','scripts/sts-card-reference-profile.mjs','scripts/sts-reward-row-layout.mjs']);
export const feedbackCiPaths=Object.freeze([
 ...feedbackHelperPaths,...feedbackProductCiPaths,
 'tests/sts-card-reference.test.mjs','tests/sts-card-reference-runtime.test.mjs',
 'tests/sts-style-source-epoch.test.mjs','tests/v25-map-theme.test.mjs','tests/sts-neow-runtime.test.mjs',
 'tests/v25-event-readability.test.mjs','tests/v25-node-layout.test.mjs',...feedbackAddedTests,
].sort());
export const feedbackClosurePaths=Object.freeze([
 'tests/helpers/closeout-source-epoch.mjs','tests/helpers/sts-feedback-source-runtime.mjs',
 'tests/helpers/sts-feedback-production.mjs','tests/helpers/sts-feedback-production.json.gz',
].sort());
export const feedbackHash=s=>createHash('sha256').update(s).digest('hex');
export const feedbackBinding=source=>({source,sha256:feedbackHash(source),
 gitBlob:createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')});
export function renderFeedbackCiBinding(sha){
 assert.match(sha,/^[a-f0-9]{64}$/);
 return `// Fixed trust leaf; exact template checked independently of its archive.\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\nexport const feedbackCiBytes=readFileSync(new URL('./sts-feedback-ci.json.gz',import.meta.url));\nassert.equal(createHash('sha256').update(feedbackCiBytes).digest('hex'),${JSON.stringify(sha)},'complete feedback CI continuation');\n`;
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const freezeFeedbackData=freeze;
function binding(row){
 assert.equal(typeof row?.source,'string');assert.equal(row.source,row.source.replaceAll('\r\n','\n'));
 assert.deepEqual(row,feedbackBinding(row.source),'complete LF source binding');
}
function header(patch){
 assert.equal(patch.schemaVersion,1);assert.equal(patch.normalization,'LF');
 assert.equal(patch.baseCommit,feedbackBase);assert.match(patch.sourceCommit,/^[a-f0-9]{40}$/);
}
export function extendFeedbackSourceEpoch(original,input){
 const patch=JSON.parse(JSON.stringify(input)),prior=original.proof;header(patch);
 const inventory=Object.keys(prior.current).sort();
 assert.deepEqual(patch.inventory,inventory,'complete feedback production inventory');
 assert.deepEqual(Object.keys(patch.before).sort(),feedbackProductionPaths,'exact feedback source predecessors');
 assert.deepEqual(Object.keys(patch.current).sort(),feedbackProductionPaths,'exact feedback source owners');
 for(const path of feedbackProductionPaths){
  assert.deepEqual(patch.before[path],prior.current[path],'complete feedback predecessor: '+path);
  binding(patch.current[path]);assert.notEqual(patch.current[path].sha256,patch.before[path].sha256,'registered feedback edit must change: '+path);
 }
 assert(!Object.hasOwn(prior.targets,'stsFeedbackPrior'),'cannot replace an existing historical target');
 const current={...prior.current,...patch.current};
 const targets={...prior.targets,stsFeedbackPrior:{commit:feedbackBase,files:prior.current}};
 const owners=inventory.filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,currentCommit:patch.sourceCommit,sourceSliceCommit:patch.sourceCommit,
  currentTreeCommitted:false,currentCommitRole:'exact committed feedback product slice; proof tools are a subsequent continuation',current,targets,owners}),
 {allowConfigLayout:true,reuseFrozenInput:true});
}
export function extendFeedbackCiProof(original,input){
 const patch=JSON.parse(JSON.stringify(input));header(patch);
 assert.equal(patch.priorArchiveSha256,feedbackPriorCiSha);
 assert.deepEqual(patch.inventoryBefore,original.afterInventory,'complete feedback CI predecessor inventory');
 assert.deepEqual(patch.addedTests,feedbackAddedTests,'exact real feedback Full addition');
 assert.deepEqual(patch.inventoryAfter,[...original.afterInventory,...feedbackAddedTests].sort(),'complete actual feedback Full inventory');
 assert.deepEqual(Object.keys(patch.files).sort(),feedbackCiPaths,'exact feedback CI registration');
 const files={...original.files};
 for(const [path,row]of Object.entries(patch.files)){
  if(row.before!==null)binding(row.before);binding(row.after);
  const old=original.files[path];
  if(old)assert.deepEqual(row.before,old.after,'exact previous CI after retained: '+path);
  files[path]={before:old?old.before:row.before,after:row.after};
 }
 assert.deepEqual(Object.keys(patch.helperSources).sort(),[...feedbackHelperPaths].sort(),'complete feedback executable helpers');
 for(const [path,row]of Object.entries(patch.helperSources)){
  binding(row);assert.deepEqual(row,patch.files[path].after,'feedback helper source matches current CI: '+path);
  if(original.helperSources[path])assert.deepEqual(patch.files[path].before,original.helperSources[path],'complete prior helper: '+path);
 }
 for(const path of feedbackAddedTests)assert.equal(patch.files[path].before,null,'new feedback test cannot invent a prior source');
 extendFeedbackHelperClosure(JSON.parse(original.files['tests/helpers/closeout-source-closure.json'].after.source),patch.helperClosure);
 return freeze({...original,files,afterInventory:patch.inventoryAfter,addedTests:[...original.addedTests,...feedbackAddedTests].sort(),
  helperSources:{...original.helperSources,...patch.helperSources},
  feedback:{baseCommit:patch.baseCommit,sourceCommit:patch.sourceCommit,priorArchiveSha256:patch.priorArchiveSha256}});
}
export function extendFeedbackHelperClosure(original,patch){
 assert.deepEqual(Object.keys(patch).sort(),feedbackClosurePaths,'exact feedback helper-copy dependencies');
 const current={...original};
 for(const [path,row]of Object.entries(patch)){
  assert.equal(row.before,original[path]??null,'immutable helper-copy predecessor: '+path);
  assert.match(row.after,/^[a-f0-9]{64}$/);current[path]=row.after;
 }
 return freeze(current);
}
