import {readFileSync,mkdirSync,copyFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {connect,data} from './native-3d/rpc.mjs';
import {prepareNativeScene} from './native-3d/native-scene.mjs';
import {embeddedScripts} from './native-script-inventory.mjs';
import {writeScriptBatch} from './native-script-batch.mjs';
import {runNativeClientCheck} from './native-client-check.mjs';
import {fileRecord,writeExclusive,prepareOutputDirectory,sha256} from './evidence-files.mjs';
import {toLua} from './build-lua-data.mjs';
import {installOfficialArena} from './native-3d/arena.mjs';
import {productionModels} from './native-3d/models.mjs';
import {nativeBattleConfig} from './native-3d/config.mjs';
import {verifyNativeConfig} from './native-3d/config-check.mjs';
import {sourceInputs,payloadDigest} from './build-native-candidate.mjs';
import {artBuildOptionsFromReceipt} from './art-features.mjs';
import {excludedProductionModules} from './native-candidate-scripts.mjs';
import {gitSourceIdentity} from './release-notes.mjs';
import {assertGraphBudget} from './native-3d/graph-budget.mjs';

export function assertBaseSnapshot(receipt,currentInputs){
 // These files only run after the complete base GIL exists. Their own hashes
 // belong to the assembly receipt; rules, data and base/UI build inputs may not drift.
 const baseOnly=rows=>rows.filter(row=>row.path!=='scripts/build-native-3d.mjs'&&!row.path.startsWith('scripts/native-3d/'));
 if(!Array.isArray(receipt.inputs)||payloadDigest(receipt.inputs)!==receipt.payloadDigest
  ||payloadDigest(baseOnly(receipt.inputs))!==payloadDigest(baseOnly(currentInputs)))
  throw Error('Base source snapshot is stale; rebuild the complete production candidate before 3D assembly');
}

function once(source,anchor,replacement){
 if(source.split(anchor).length!==2)throw Error('Production integration anchor changed: '+anchor);
 return source.replace(anchor,replacement);
}
export function instrumentNativeEntry(source,buildId){
 if(!/^[a-f0-9-]{36}$/.test(buildId))throw Error('Invalid build identity');
 let text=source.replace(/\r\n/g,'\n').replace(/^print\("ABYSS_BUILD [a-f0-9-]+"\)\n/,'');
 text=once(text,'        local GameUI = require("abyss_game_ui")',`        require('abyss_native_battle_geometry').configure(true)
        local GameUI = require("abyss_game_ui")`);
 text=once(text,'require("abyss_traveler_portraits").new(stage, print, flags, templates)',
  'require("abyss_traveler_portraits").new(stage, print, flags, templates, {nativeBattle=true})');
 text=once(text,'local view, Viewport, background, cardArt, portraits','local nativeBattle\nlocal view, Viewport, background, cardArt, portraits');
 text=once(text,'        view:resize(width, height)\n        canvasWidth, canvasHeight = width, height',`        view:resize(width, height)
        nativeBattle = require('abyss_native_battle').attach(view, script.object, {
            config = require('abyss_native_battle_config'),
            keyEvents = Enum.KeyEventType,
            send = function(command, model, actor, sequence)
                local signal = game.ServerSignal('LAB3D_COMMAND')
                signal:AddString(command)
                signal:AddInt(model)
                signal:AddInt(actor)
                signal:AddInt(sequence)
                signal:SendSignal()
            end,
            register = function(callback)
                script:RegisterServerSignalHandler('LAB3D_ACK', function(_, params)
                    callback(params[1], params[2])
                end)
            end,
            registerPosition = function(callback)
                script:RegisterServerSignalHandler('LAB3D_POSITION', function(_, params)
                    callback(params[1], params[2], params[3], params[4], params[5])
                end)
            end,
        })
        nativeBattle:resize(width, height)
        canvasWidth, canvasHeight = width, height`);
 text=once(text,'            view:resize(width, height)','            view:resize(width, height)\n            if nativeBattle then nativeBattle:resize(width, height) end');
 text=once(text,'        view:update(dt)','        view:update(dt)\n        if nativeBattle then nativeBattle:update(dt) end');
 text=once(text,'function OnDestroy()', 'function OnDestroy()\n    if nativeBattle then pcall(function()nativeBattle:destroy(true)end);nativeBattle=nil end');
 text=once(text,'    script:EnableUpdate(false)\n    pcall(function()', '    if nativeBattle then pcall(function()nativeBattle:destroy()end);nativeBattle=nil end\n    script:EnableUpdate(false)\n    pcall(function()');
 return `print("ABYSS_BUILD ${buildId}")\nprint("ABYSS_NATIVE_3D ${buildId}")\n${text}`;
}

export async function buildNative3d({productionReceipt,output='.artifacts/native-3d'}={}){
 const root=process.cwd(),original=JSON.parse(readFileSync(productionReceipt,'utf8'));
 if(original.statuses?.staticCheck!=='pass'||fileRecord(original.mapPath).sha256!==original.candidate.sha256)
  throw Error('Base candidate is unchecked or changed');
 const baseOptions=artBuildOptionsFromReceipt(original);
 assertBaseSnapshot(original,sourceInputs(root,baseOptions));
 const buildId=randomUUID(),workspace=join(prepareOutputDirectory(root,output),buildId);mkdirSync(workspace);
 let mapPath=join(workspace,'base.gil');copyFileSync(original.mapPath,mapPath);
 const receipt={schemaVersion:1,kind:'native-3d-production-candidate',buildId,base:fileRecord(productionReceipt),
  ...gitSourceIdentity(root),baseSourceCommit:original.sourceCommit,basePayloadDigest:original.payloadDigest,liveWriteEnabled:false,operations:[],
  inputs:['scripts/build-native-3d.mjs',...readdirSync('scripts/native-3d').filter(n=>/\.(mjs|json)$/.test(n)).map(n=>'scripts/native-3d/'+n),
   ...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].map(p=>fileRecord(resolve(p))),
  statuses:{staticCheck:'not_run',officialImport:'not_run',runtimeReady:'not_run',pc:'not_run',mobile:'not_run'}};
 const toolRoot=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
 const load=name=>import(pathToFileURL(join(toolRoot,'src',name)));
 const wire=await load('scene/wire.mjs'),{clientScriptRecord}=await load('scene-save.mjs'),{luaSyntaxError}=await load('client-check.mjs');
 const client=await connect(workspace);
 try{
  for(const uri of ['miliastra://workflow','miliastra://platform-rules'])writeExclusive(join(workspace,uri.split('//')[1]+'.json'),await client.readResource({uri}));
  const arena=await installOfficialArena({mapPath,outputPath:join(workspace,'official-arena.gil')});
  mapPath=arena.mapPath;receipt.arena=arena;
  const native=await prepareNativeScene({mapPath,maxActors:5,models:productionModels,addFloor:false,productionCamera:true,call:async(name,args)=>{
   const result=await client.callTool({name,arguments:args},undefined,{timeout:120000});
   const path=join(workspace,`${receipt.operations.length+1}-${name}.json`);writeExclusive(path,result);
   receipt.operations.push({name,response:fileRecord(path)});return data(result);
  }});mapPath=native.mapPath;receipt.nativeScene=native;
  const before=embeddedScripts({mapPath,includeSource:true},wire).scripts;
  const inventory=new Map(before.map(s=>[s.name,s.source]));
  for(const name of readdirSync('src/lua').filter(n=>n.endsWith('.lua'))){
   const module=name.slice(0,-4);if(excludedProductionModules.includes(module))continue;
   let embedded=inventory.get(module);
   const marker=`print("ABYSS_BUILD ${original.buildId}")\n`;
   if(module==='abyss_ui'&&embedded?.startsWith(marker))embedded=embedded.slice(marker.length);
   if(embedded!==readFileSync(resolve('src/lua',name),'utf8'))throw Error('Base embedded source differs from checkout: '+module);
  }
  const entry=before.find(s=>s.name==='abyss_ui');if(!entry)throw Error('Missing production entry');
  const config=nativeBattleConfig(buildId,native);
  const updates=[{name:'abyss_ui',source:instrumentNativeEntry(entry.source,buildId)},
   {name:'abyss_native_battle',source:readFileSync(resolve('src/lua/abyss_native_battle.lua'),'utf8')},
   {name:'abyss_native_battle_config',source:'return '+toLua(config)+'\n'}];
  mapPath=writeScriptBatch(mapPath,updates,workspace,{...wire,clientScriptRecord,luaSyntaxError});
  const {inspectBytes}=await load('adapter.mjs');
  receipt.graphBudget=assertGraphBudget(inspectBytes(readFileSync(mapPath)).graphs);
  const actual=embeddedScripts({mapPath,includeSource:true},wire).scripts;
  const expected=new Map(before.map(s=>[s.name,s.source]));for(const s of updates)expected.set(s.name,s.source);
  if(actual.length!==expected.size||actual.some(s=>expected.get(s.name)!==s.source))throw Error('Embedded source readback mismatch');
  receipt.modules=actual.map(s=>({name:s.name,sha256:sha256(s.source),bytes:Buffer.byteLength(s.source)}));
  writeExclusive(join(workspace,'scripts.json'),{mapPath,scripts:actual});
  receipt.serializedConfigRuntime=verifyNativeConfig(actual,workspace);
  const check=runNativeClientCheck({mapPath},toolRoot);writeExclusive(join(workspace,'client-check.json'),check);
  receipt.clientCheck=check;if(check.ok!==true||check.errors!==0)throw Error('Static client check failed');
  for(const input of receipt.inputs)if(fileRecord(input.path).sha256!==input.sha256)throw Error('Build input changed');
  const final=join(workspace,'slay-the-abyss-3d.gil');copyFileSync(mapPath,final);
  receipt.mapPath=final;receipt.candidate=fileRecord(final);receipt.statuses.staticCheck='pass';
  writeExclusive(join(workspace,'candidate.json'),receipt);return receipt;
 }catch(e){receipt.error=e.message;writeExclusive(join(workspace,'failure.json'),receipt);throw e}
 finally{await client.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const receipt=await buildNative3d({productionReceipt:process.argv[2],...(process.argv[3]?{output:process.argv[3]}:{})});console.log(JSON.stringify({mapPath:receipt.mapPath,sha256:receipt.candidate.sha256,statuses:receipt.statuses}));}
 catch(e){console.error(e.stack);process.exitCode=1}
}
