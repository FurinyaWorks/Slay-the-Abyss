// Bounded presentation-only candidate: preserve an existing current-baseline
// level and its graphs, use the standard UI builder/encoder and read every Lua back.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {buildUI} from '../../scripts/build-ui.mjs';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {writeScriptBatch} from '../../scripts/native-script-batch.mjs';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';
import {runNativeClientCheck} from '../../scripts/native-client-check.mjs';
import {bindPortraitTemplates} from '../../scripts/official-portraits.mjs';
const [baseArg,outArg,reuseArg]=process.argv.slice(2);assert(baseArg&&outArg,'build.mjs <baseline candidate.json> <new output> [--reuse-layout]');
const reuseLayout=reuseArg==='--reuse-layout';assert(!reuseArg||reuseLayout);
const hash=b=>createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p));
const base=JSON.parse(fs.readFileSync(baseArg)),out=path.resolve(outArg),startedAt=new Date().toISOString();
assert(!fs.existsSync(out));assert.equal(sha(base.candidate.path),base.candidate.sha256);
assert.equal(base.sourceCommit,'903bf2a31e91f10fb24763ab4cea23d586d0bb83','Revalidate a changed baseline');
assert(base.uiProfile?.nativePageLifecycle||base.kind==='menu-native-fit-experiment');
if(reuseLayout){
 assert.equal(base.kind,'menu-native-fit-experiment');
 for(const file of ['data/presentation/ui_theme.json','data/presentation/native-menu-red.json','scripts/menu-red-scene.mjs','scripts/v25-menu-layout.mjs','scripts/v25-layout.mjs'])assert.equal(sha(file),base.inputs.find(r=>r.path===file)?.sha256,'Layout changed: '+file);
}
fs.mkdirSync(out,{recursive:true});
const generated=path.join(out,'generated');
buildUI(generated,process.env.ABYSS_PYTHON,{officialAssets:true,nativePageLifecycle:true,workKey:'menu-red-background'});
const tool=process.env.MILIASTRA_MCP_ROOT??'D:/MiliastraTools/genshin-miliastra-mcp';
const {native}=await loadNativeUiEncoder(tool),wire=await import(pathToFileURL(tool+'/src/scene/wire.mjs'));
const {luaSyntaxError}=await import(pathToFileURL(tool+'/src/client-check.mjs'));
bindPortraitTemplates(generated,{
 image:{templateIndex:native.getClientUi({mapPath:base.candidate.path,template:'AbyssReadyCardImage'}).templateIndex},
 container:{templateIndex:native.getClientUi({mapPath:base.candidate.path,template:'AbyssReadyCardGroup'}).templateIndex},
},{officialAssets:true,selectionAvatar:true,battlePortrait:true,cards:false,menuBackground:false});
const oldScripts=embeddedScripts({mapPath:base.candidate.path,includeSource:true},wire).scripts;
for(const s of oldScripts)assert.equal(hash(s.source),base.moduleDigests[s.name],s.name+' baseline identity');
const sources=new Map(oldScripts.map(s=>[s.name,s.source])),buildId=randomUUID();
for(const name of ['abyss_v25_menu_view','abyss_game_ui_menu_view','abyss_game_ui_view'])sources.set(name,fs.readFileSync('src/lua/'+name+'.lua','utf8'));
sources.set('abyss_theme',fs.readFileSync(generated+'/abyss_theme.lua','utf8'));
sources.set('abyss_traveler_portrait_assets',fs.readFileSync(generated+'/abyss_traveler_portrait_assets.lua','utf8'));
assert(/^print\("ABYSS_BUILD [^"]+"\)\n/.test(sources.get('abyss_ui')));
sources.set('abyss_ui',sources.get('abyss_ui').replace(/^print\("ABYSS_BUILD [^"]+"\)\n/,`print("ABYSS_BUILD ${buildId}")\n`));
const changed=[...sources].filter(([name,source])=>source!==oldScripts.find(s=>s.name===name).source).map(([name,source])=>({name,source}));
let mapPath=out+'/base.gil';fs.copyFileSync(base.candidate.path,mapPath);
mapPath=writeScriptBatch(mapPath,changed,out,{...wire,clientScriptRecord:native.clientScriptRecord,luaSyntaxError});
const templates=JSON.parse(fs.readFileSync(generated+'/game-ui-templates.json'));
if(!reuseLayout)for(const template of templates){
 let existing;try{existing=native.getClientUi({mapPath,template:template.name});}catch(error){if(error.code!=='TEMPLATE_NOT_FOUND')throw error;}
 if(existing)continue; // Existing shared templates retain their exact bytes and bindings.
 const encoded=native.addClientTemplate({mapPath,...template,replace:true,outputName:'menu-template-'+template.name},out);
 mapPath=encoded.mapPath;
}
// The baseline's cached UI is older than its Lua (missing relic hit targets).
// Rebuild the current standard UI/templates together; never keep an incompatible
// cached tree or graft the unrelated in-progress selection/Neow branch.
const layout=JSON.parse(fs.readFileSync(generated+'/game-ui.json'));
if(!reuseLayout)mapPath=native.addClientUi({...layout,mapPath,replace:true,outputName:'menu-red'},out).mapPath;
const check=runNativeClientCheck({mapPath},tool);fs.writeFileSync(out+'/native-check.json',JSON.stringify(check,null,2));assert(check.ok);
const actual=embeddedScripts({mapPath,includeSource:true},wire).scripts;assert.equal(actual.length,sources.size);
for(const s of actual)assert.equal(s.source,sources.get(s.name),s.name+' final readback');
const destination=out+'/candidate.gil';fs.copyFileSync(mapPath,destination);
const inputs=['src/lua/abyss_v25_menu_view.lua','src/lua/abyss_game_ui_menu_view.lua','src/lua/abyss_game_ui_view.lua','data/presentation/ui_theme.json','data/presentation/native-menu-red.json','scripts/menu-red-scene.mjs','scripts/menu-flat-triangle.mjs','scripts/native-ui-encoder.mjs','scripts/native-ui-rotations.mjs','scripts/native-candidate-preview.mjs','scripts/native-simulator-importer.mjs','scripts/v25-menu-layout.mjs','scripts/v25-layout.mjs','experiments/menu-red-fit/build.mjs','experiments/menu-red-fit/stack-fit.py','experiments/menu-red-fit/source-details.json'].map(p=>({path:p,sha256:sha(p)}));
const moduleDigests=Object.fromEntries(actual.map(s=>[s.name,hash(s.source)]));
const outputs=['candidate.gil','generated/game-ui.json','generated/game-ui-templates.json','generated/abyss_theme.lua','generated/abyss_traveler_portrait_assets.lua'].map(p=>({path:path.join(out,p),sha256:sha(path.join(out,p)),bytes:fs.statSync(path.join(out,p)).size}));
const receipt={schemaVersion:1,kind:'menu-native-fit-experiment',buildId,sourceCommit:base.sourceCommit,sourceDirty:true,startedAt,completedAt:new Date().toISOString(),
 candidate:{path:destination,sha256:sha(destination),bytes:fs.statSync(destination).size},moduleDigests,inputs,outputs,
 payloadDigest:hash(JSON.stringify({baseline:base.candidate.sha256,inputs,outputs,moduleDigests})),
 baseline:{receipt:path.resolve(baseArg),receiptSha256:sha(baseArg),candidate:base.candidate},
 statuses:{staticCheck:check.ok?'pass':'fail',officialImport:'not_run',playtest:'not_run'},checkedModules:actual.map(s=>s.name),
 menuExperiment:{layoutReused:reuseLayout,changedModules:changed.map(s=>s.name),unchangedModules:actual.length-changed.length,sourceSha256:sha('experiments/menu-red-fit/input/source.png'),nativeCheck:check.ok,officialImport:'not_run',devicePerformance:'UNVERIFIED'},receiptPath:out+'/candidate.json'};
fs.writeFileSync(receipt.receiptPath,JSON.stringify(receipt,null,2));console.log(receipt.receiptPath);
