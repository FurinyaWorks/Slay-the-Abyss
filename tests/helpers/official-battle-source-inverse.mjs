import {prePileSource} from './official-battle-pile-source-inverse.mjs';
// Test-only complete-source projection for the official battle slice at 5b3e9f11.
// Historical component receipts remain immutable; only complete source identities project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=source=>createHash('sha256').update(source).digest('hex');
const archive=readFileSync(new URL('./official-battle-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'5e74438e077be47b5b176287b6ceeb71e69447fa32ceedf2b0e595c4499d3c80');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'97f8660e70ac4b88d23ae4af745c4acd2d4c42e4c5c5da0b7aac9c62a83bc5f2');
const proof=JSON.parse(bytes);
assert.equal(proof.schemaVersion,1);assert.equal(proof.normalization,'LF');
for(const binding of Object.values(proof.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 Object.freeze(binding);
}
Object.freeze(proof.files);
export const officialBattleSourceProof=Object.freeze(proof);
// Additive continuation: retain the immutable 5b3e source archive above.
const alignmentArchive=readFileSync(new URL('./official-battle-alignment-source-epoch.json.gz',import.meta.url));
assert.equal(hash(alignmentArchive),'f834dafca07c62a1b807cbc7df3ae8619f3043a1627b8fb5dee5f464c420d458');
const alignmentBytes=gunzipSync(alignmentArchive);
assert.equal(hash(alignmentBytes),'d50eba8195f5d1ac24ae0d0c150c072a83bd360d868b5299252eed7ac0ee2005');
const alignment=JSON.parse(alignmentBytes);
assert.equal(alignment.schemaVersion,1);assert.equal(alignment.normalization,'LF');
assert.equal(alignment.beforeCommit,proof.afterCommit);
assert.deepEqual(Object.keys(alignment.files).sort(),[...Object.keys(proof.files),'src/lua/abyss_game_ui_input.lua','src/lua/abyss_battle_render_hud.lua'].sort());
for(const [path,binding]of Object.entries(alignment.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 if(Object.hasOwn(proof.files,path))assert.equal(binding.beforeSource,proof.files[path].afterSource);
 Object.freeze(binding);
}
Object.freeze(alignment.files);
export const officialBattleAlignmentSourceProof=Object.freeze(alignment);
// Additive profile-compatibility repair. Earlier archives remain immutable.
const bannerArchive=readFileSync(new URL('./official-banner-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bannerArchive),'3f1f13b24b1fd05e01706937f14e905c7003d193b446b2133e8ec25548e91628');
const bannerBytes=gunzipSync(bannerArchive);assert.equal(hash(bannerBytes),'d7a9276ad6275b23a1f96d0520e143ff2592016e0452771328e126503456ba2d');
const banner=JSON.parse(bannerBytes);
assert.equal(banner.schemaVersion,1);assert.equal(banner.normalization,'LF');
assert.equal(banner.beforeCommit,'20a23f0095ed3f82020f0ccfb13bca3de617ac73');
assert.deepEqual(Object.keys(banner.files),['src/lua/abyss_battle_card_view.lua']);
for(const [path,binding]of Object.entries(banner.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 assert.equal(binding.beforeSource,alignment.files[path].afterSource);
 Object.freeze(binding);
}
Object.freeze(banner.files);
export const officialBannerSourceProof=Object.freeze(banner);
const shellArchive=readFileSync(new URL('./official-battle-shell-source-epoch.json.gz',import.meta.url));
assert.equal(hash(shellArchive),'6184f4e377056b5e9c8a25ab4282556c152f1228a1436fa2cfa67196697dde22');
const shellBytes=gunzipSync(shellArchive);
assert.equal(hash(shellBytes),'f8095e7288e4e8556922500089f64c1a5adade0b61b37e750e319cbe38d34342');
const shell=JSON.parse(shellBytes);
assert.equal(shell.schemaVersion,1);assert.equal(shell.normalization,'LF');
assert.equal(shell.beforeCommit,'4278561b4df3defaf879cf4be62ab415d6998e72');
assert.deepEqual(Object.keys(shell.files).sort(),['src/lua/abyss_battle_card_view.lua','src/lua/abyss_card_skin.lua']);
for(const [path,binding]of Object.entries(shell.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 assert.equal(binding.beforeSource,banner.files[path]?.afterSource??alignment.files[path].afterSource);
 Object.freeze(binding);
}
Object.freeze(shell.files);
export const officialBattleShellSourceProof=Object.freeze(shell);
// Additive exact interaction continuation. All earlier source archives remain immutable.
const interactionArchive=readFileSync(new URL('./official-battle-interaction-source-epoch.json.gz',import.meta.url));
assert.equal(hash(interactionArchive),'47ea3088416992ca43c97adab9ac5c724bcc4ccac1d415ec8a7d4a5328d34505');
const interactionBytes=gunzipSync(interactionArchive);
assert.equal(hash(interactionBytes),'2131dcb3aab956a73a6dbaacc2b8daabc937b706dfaf500fab7a9f73a7827ce8');
const interaction=JSON.parse(interactionBytes);
assert.equal(interaction.schemaVersion,1);assert.equal(interaction.normalization,'LF');
assert.equal(interaction.beforeCommit,'fa67d2fea098218cebe464851d9ee1f1905c7818');
assert.equal(interaction.afterCommit,'e4b2e702a89b0f09650e0c47e3a80434488470cd');
assert.deepEqual(Object.keys(interaction.files),['config/architecture.json','src/lua/abyss_battle_card_view.lua','src/lua/abyss_deck_ui.lua']);
for(const [path,binding]of Object.entries(interaction.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 if(Object.hasOwn(shell.files,path))assert.equal(binding.beforeSource,shell.files[path].afterSource);
 Object.freeze(binding);
}
Object.freeze(interaction.files);
export const officialBattleInteractionSourceProof=Object.freeze(interaction);
// Exact feedback/input continuation over the complete historical protected-owner
// closure, including unchanged linked witnesses omitted by the runtime owner filter.
const feedbackArchive=readFileSync(new URL('./official-battle-feedback-source-epoch.json.gz',import.meta.url));
assert.equal(hash(feedbackArchive),'f9afdd64e5af540072b468709bda9523b2cd58d4c308692a9b10ee339ac176eb');
const feedbackBytes=gunzipSync(feedbackArchive);
assert.equal(hash(feedbackBytes),'65c3cbfb1d391583ea6ea301c245c699903e3bd637357a2be4ed157c49d7f080');
const feedback=JSON.parse(feedbackBytes);
assert.equal(feedback.schemaVersion,1);assert.equal(feedback.normalization,'LF');
assert.equal(feedback.beforeCommit,'a1a3ba4b6b83ab1ddca76268e08bba9c014ad375');
assert.equal(feedback.afterCommit,'5489e9659b05c614ace0cfeb5f3f0ad5632ef624');
assert.deepEqual(Object.keys(feedback.files),[
 'src/lua/abyss_battle_actions.lua','src/lua/abyss_battle_card_gestures.lua',
 'src/lua/abyss_battle_card_layout.lua','src/lua/abyss_battle_card_view.lua',
 'src/lua/abyss_battle_details.lua','src/lua/abyss_battle_info_content.lua',
 'src/lua/abyss_battle_info_view.lua','src/lua/abyss_battle_render_actors.lua',
 'src/lua/abyss_battle_ui.lua','src/lua/abyss_card_skin.lua',
 'src/lua/abyss_relic_view_ui.lua','src/lua/abyss_ui.lua',
]);
for(const binding of Object.values(feedback.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 assert.notEqual(binding.beforeSha256,binding.afterSha256);
 Object.freeze(binding);
}
Object.freeze(feedback.files);
export const officialBattleFeedbackSourceProof=Object.freeze(feedback);
// Exact targeting-only continuation. The 5489 feedback archive stays frozen;
// its actor source is byte-identical in the following test-only 0fd7 commit.
const targetArchive=readFileSync(new URL('./official-battle-target-source-epoch.json.gz',import.meta.url));
assert.equal(hash(targetArchive),'52696fada35693712594a228b94ae5bf17f949049b47c01d95e5b16de5ba3c43');
const targetBytes=gunzipSync(targetArchive);
assert.equal(hash(targetBytes),'d4e058d4f0def17d663702c900f45d41bcc018308ff040b5102615982440d515');
const targeting=JSON.parse(targetBytes);
assert.equal(targeting.schemaVersion,1);assert.equal(targeting.normalization,'LF');
assert.equal(targeting.beforeCommit,'0fd7b052293857637483e55a0e8d009ef3583a49');
assert.equal(targeting.afterCommit,'fd868b338bc6b0aa053c78a0e8c099a230593dc2');
assert.deepEqual(Object.keys(targeting.files),['src/lua/abyss_battle_render_actors.lua']);
for(const [path,binding]of Object.entries(targeting.files)){
 for(const side of ['before','after']){
  const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256']);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
 }
 assert.equal(binding.beforeSource,feedback.files[path].afterSource,'exact targeting predecessor');
 assert.notEqual(binding.beforeSha256,binding.afterSha256);
 Object.freeze(binding);
}
Object.freeze(targeting.files);
export const officialBattleTargetSourceProof=Object.freeze(targeting);
// Append-only local-render/material continuation over the complete changed
// protected-owner intersection. No earlier archive is rewritten.
const localRenderArchive=readFileSync(new URL('./official-battle-local-render-source-epoch.json.gz',import.meta.url));
assert.equal(hash(localRenderArchive),'d7c993c86bcb8c2b40b68e5ec127ae774f64f43b3a87e883ad32fa3c6d766b35');
const localRenderBytes=gunzipSync(localRenderArchive);
assert.equal(hash(localRenderBytes),'b436e8800786ff27e55b6d0496a3c9964edb2f2df20779f8c4cd4c8b1f5bb12e');
const localRender=JSON.parse(localRenderBytes);
assert.equal(localRender.schemaVersion,1);assert.equal(localRender.normalization,'LF');
assert.equal(localRender.beforeCommit,'38ed037c1d8880560b9788e659d57722fa54a84c');
assert.equal(localRender.afterCommit,'181f1692a410ec039e92eee566768e2b04f347f2');
assert.deepEqual(Object.keys(localRender.files),[
 'src/lua/abyss_battle_card_gestures.lua','src/lua/abyss_battle_card_layout.lua',
 'src/lua/abyss_battle_card_view.lua','src/lua/abyss_battle_detail_bindings.lua',
 'src/lua/abyss_battle_render_actors.lua','src/lua/abyss_battle_ui.lua','src/lua/abyss_card_skin.lua',
]);
for(const [path,binding]of Object.entries(localRender.files)){
 for(const side of ['before','after']){
  const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256']);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
 }
 const predecessor=targeting.files[path]?.afterSource??feedback.files[path]?.afterSource;
 if(predecessor!==undefined)assert.equal(binding.beforeSource,predecessor,'local-render exact predecessor '+path);
 else {
  assert.equal(path,'src/lua/abyss_battle_detail_bindings.lua');
  // The unchanged component-UI source identity is checked against that complete
  // proof in the source suite, without reloading its large archive here.
  assert.equal(binding.beforeSha256,'06f4f139894de966d8d49a1ed1855f5e08e5d127f186380b736177ad139be748');
 }
 assert.notEqual(binding.beforeSha256,binding.afterSha256);Object.freeze(binding);
}
Object.freeze(localRender.files);
export const officialBattleLocalRenderSourceProof=Object.freeze(localRender);
// Response-repair continuation projects only the two changed historical owners.
// Glow is recorded as a complete Git witness, never added to historical admission.
const responseArchive=readFileSync(new URL('./official-battle-response-source-epoch.json.gz',import.meta.url));
assert.equal(hash(responseArchive),'9af7515d8fae9402c8751a8efdcaadc1a5d1142c095fa2e11f34ec6d92f30137');
const responseBytes=gunzipSync(responseArchive);
assert.equal(hash(responseBytes),'b2154ed8761efc78553198b0d272f0295d9d5ef9fcd0b1b301c3535f8542cd91');
const response=JSON.parse(responseBytes);
assert.equal(response.schemaVersion,1);assert.equal(response.normalization,'LF');
assert.equal(response.beforeCommit,'f47441142e1e40e3e05fc0222594b4e32e95858a');
assert.equal(response.afterCommit,'de029d631eb53196f24e3f515eb4e62423b6bd99');
assert.deepEqual(Object.keys(response.files),['src/lua/abyss_battle_actions.lua','src/lua/abyss_feedback.lua']);
assert.deepEqual(Object.keys(response.unprojectedChanges),['src/lua/abyss_battle_card_glow.lua']);
for(const binding of [...Object.values(response.files),...Object.values(response.unprojectedChanges)]){
 for(const side of ['before','after']){
  const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256']);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
 }
 assert.notEqual(binding.beforeSha256,binding.afterSha256);Object.freeze(binding);
}
assert.equal(response.files['src/lua/abyss_battle_actions.lua'].beforeSource,feedback.files['src/lua/abyss_battle_actions.lua'].afterSource);
assert.equal(response.files['src/lua/abyss_feedback.lua'].beforeSha256,'2a37d6955ab6e09c69c188579b71de30f7f95cfe52ee56c548b471f9ae04c06b');
Object.freeze(response.files);Object.freeze(response.unprojectedChanges);
export const officialBattleResponseSourceProof=Object.freeze(response);
// Append-only potion-HUD/input continuation. Projection remains restricted to
// the complete changed intersection with the original historical owners.
const potionHudArchive=readFileSync(new URL('./official-battle-potion-hud-source-epoch.json.gz',import.meta.url));
assert.equal(hash(potionHudArchive),'873e1d2eb7352ba984d180141f04ef8167ff89ecce097a2ae7986a2d5c274a75');
const potionHudBytes=gunzipSync(potionHudArchive);
assert.equal(hash(potionHudBytes),'f99d8e5388bdee0c68df6d3f42ee2f1adfe5e3afabdfa3cbf1bc0c43aa5c0873');
const potionHud=JSON.parse(potionHudBytes);
assert.equal(potionHud.schemaVersion,1);assert.equal(potionHud.normalization,'LF');
assert.equal(potionHud.beforeCommit,'4d3fe8ae7b47094e4aa93bfc60351c6d9231a098');
assert.equal(potionHud.afterCommit,'bf4dc9237d396b301140eaad3bfb8d8347e23a0a');
assert.deepEqual(Object.keys(potionHud.files),[
 'src/lua/abyss_battle_actions.lua','src/lua/abyss_battle_card_gestures.lua',
 'src/lua/abyss_battle_card_view.lua','src/lua/abyss_battle_info_content.lua',
 'src/lua/abyss_battle_info_view.lua','src/lua/abyss_battle_render_state.lua',
]);
assert.deepEqual(Object.keys(potionHud.unprojectedChanges),[]);
for(const [path,binding]of Object.entries({...potionHud.files,...potionHud.unprojectedChanges})){
 for(const side of ['before','after']){
  const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256']);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
 }
 const prior=response.files[path]??localRender.files[path]??feedback.files[path];
 if(prior)assert.equal(binding.beforeSource,prior.afterSource,'potion-HUD exact predecessor '+path);
 else {
  assert.equal(path,'src/lua/abyss_battle_render_state.lua');
  assert.equal(binding.beforeSha256,'190bc4eca4ebaa7cc0147e8ddb901975f3ee3ef28bf27f945b73f70f485d9398');
 }
 assert.notEqual(binding.beforeSha256,binding.afterSha256);Object.freeze(binding);
}
Object.freeze(potionHud.files);Object.freeze(potionHud.unprojectedChanges);
export const officialBattlePotionHudSourceProof=Object.freeze(potionHud);
// The source-position repair changes only this exact protected owner. Keep
// every predecessor archive immutable and enter its view from the outside.
const mouseAimArchive=readFileSync(new URL('./official-battle-mouse-aim-source-epoch.json.gz',import.meta.url));
assert.equal(hash(mouseAimArchive),'8816765be73763e6172bb022f40118dfdfe239b449dfa0617b4b6400750d4c71');
const mouseAimBytes=gunzipSync(mouseAimArchive);
assert.equal(hash(mouseAimBytes),'e04f50434338f75abe5c1cb713e52a2678f1013fdddc816385411020a6af839b');
const mouseAim=JSON.parse(mouseAimBytes);
assert.equal(mouseAim.schemaVersion,1);assert.equal(mouseAim.normalization,'LF');
assert.equal(mouseAim.beforeCommit,'c523f54c57621b3700dc05a3ec58af8c214fc8d8');
assert.equal(mouseAim.afterCommit,'d885f9a481809c6991c2c6622e7ddbe4f8b0b3e8');
assert.deepEqual(Object.keys(mouseAim.files),['src/lua/abyss_battle_card_view.lua']);
assert.deepEqual(Object.keys(mouseAim.unprojectedChanges),[]);
for(const [path,binding]of Object.entries(mouseAim.files)){
 for(const side of ['before','after']){
  const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256']);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
 }
 assert.equal(binding.beforeSource,potionHud.files[path].afterSource);
 assert.notEqual(binding.beforeSha256,binding.afterSha256);Object.freeze(binding);
}
Object.freeze(mouseAim.files);Object.freeze(mouseAim.unprojectedChanges);
export const officialBattleMouseAimSourceProof=Object.freeze(mouseAim);
export function preOfficialBattleMouseAimSource(path,source){
 const binding=Object.hasOwn(mouseAim.files,path)?mouseAim.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattlePotionHudSource(path,source){
 const binding=Object.hasOwn(potionHud.files,path)?potionHud.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleResponseSource(path,source){
 const binding=Object.hasOwn(response.files,path)?response.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleLocalRenderSource(path,source){
 const binding=Object.hasOwn(localRender.files,path)?localRender.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleTargetSource(path,source){
 const binding=Object.hasOwn(targeting.files,path)?targeting.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleFeedbackSource(path,source){
 const binding=Object.hasOwn(feedback.files,path)?feedback.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleInteractionSource(path,source){
 const binding=Object.hasOwn(interaction.files,path)?interaction.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleShellSource(path,source){
 const binding=Object.hasOwn(shell.files,path)?shell.files[path]:null;
 return binding&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===binding.afterSha256?binding.beforeSource:source;
}
export function preOfficialBattleSource(path,source){
 source=prePileSource(path,source);
 source=preOfficialBattleMouseAimSource(path,source);
 source=preOfficialBattlePotionHudSource(path,source);
 source=preOfficialBattleResponseSource(path,source);
 source=preOfficialBattleLocalRenderSource(path,source);
 source=preOfficialBattleTargetSource(path,source);
 source=preOfficialBattleFeedbackSource(path,source);
 source=preOfficialBattleInteractionSource(path,source);
 source=preOfficialBattleShellSource(path,source);
 const repair=Object.hasOwn(banner.files,path)?banner.files[path]:null;
 if(repair&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===repair.afterSha256)
  source=repair.beforeSource;
 const continuation=Object.hasOwn(alignment.files,path)?alignment.files[path]:null;
 if(continuation&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===continuation.afterSha256)
  source=continuation.beforeSource;
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
