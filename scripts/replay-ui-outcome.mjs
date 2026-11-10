// Opt-in actual-GIL SDK replay. Never imported by ordinary Quality execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,unlinkSync,existsSync} from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import luaparse from 'luaparse';
import {outcomeConditions} from './ui-outcome-identity.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const sha=file=>hash(readFileSync(file));
const scope='Actual GIL-derived SDK model, exact Lua and native mount params; script/model wall time and Node memory only. No renderer, GPU, official capacity, official client or device acceptance.';
const paths={menu:'stage/menuPanel',character:'stage/characterPanel',open:'stage/menuPanel/start/hit',close:'stage/characterPanel/cancel/hit'};
export const supportedSdkSha256='a62bb31a594874fbf1dc40e728ca2e0600e8d4cea0f1a16cda80481fb88452f3';
const supportedLegacyControllerSha256='97a0704c4226ce5f0cce9a92c91509fbe457d35818f4d60ff48e4157cbb3c265';

// Interpret data, never execute candidate Lua. The one supported generated asset
// also wraps ROOT/ELEMENTS literals in a zero-argument IIFE. Its only permitted
// statements are single local literal declarations and a final data return.
function literal(node,locals=new Map()){
 if(['NumericLiteral','StringLiteral','BooleanLiteral'].includes(node.type))return node.value;
 if(node.type==='UnaryExpression'&&node.operator==='-'&&node.argument.type==='NumericLiteral')return -node.argument.value;
 if(node.type==='Identifier'){assert(locals.has(node.name),'Unknown asset data local');return locals.get(node.name);}
 if(node.type==='TableConstructorExpression'){
  const array=node.fields.every(field=>field.type==='TableValue'),result=array?[]:Object.create(null);
  for(const field of node.fields){
   if(array){result.push(literal(field.value,locals));continue;}
   assert(field.type==='TableKey'||field.type==='TableKeyString','Mixed asset array/key table');
   const key=field.type==='TableKeyString'?field.key.name:literal(field.key,locals);
   assert(typeof key==='string'&&!Object.hasOwn(result,key),'Invalid/duplicate asset data key');result[key]=literal(field.value,locals);
  }
  return result;
 }
 if(node.type==='CallExpression'&&node.arguments.length===0&&node.base.type==='FunctionDeclaration'&&node.base.parameters.length===0){
  const scope=new Map();let result,returned=false;
  for(const statement of node.base.body){
   assert(!returned,'Statement after asset data return');
   if(statement.type==='LocalStatement'){
    assert(statement.variables.length===1&&statement.init.length===1&&!scope.has(statement.variables[0].name),'Invalid asset local declaration');
    scope.set(statement.variables[0].name,literal(statement.init[0],scope));
   }else{assert(statement.type==='ReturnStatement'&&statement.arguments.length===1,'Executable asset statement rejected');result=literal(statement.arguments[0],scope);returned=true;}
  }
  assert(returned,'Missing asset data return');return result;
 }
 throw Error('Executable/non-literal asset expression rejected: '+node.type);
}
export function deriveLegacyOracle(scripts){
 try{
  const assetRows=scripts.filter(row=>row.name==='abyss_traveler_portrait_assets'),controllers=scripts.filter(row=>row.name==='abyss_traveler_portraits');
  assert.equal(assetRows.length,1,'Missing exact asset Lua');assert.equal(controllers.length,1,'Missing exact portrait controller Lua');
  assert.equal(hash(controllers[0].source),supportedLegacyControllerSha256,'Unknown legacy assembly algorithm');
  const chunk=luaparse.parse(assetRows[0].source,{encodingMode:'pseudo-latin1',luaVersion:'5.3'});
  assert(chunk.body.length===1&&chunk.body[0].type==='ReturnStatement'&&chunk.body[0].arguments.length===1,'Asset is not a data return');
  const assets=literal(chunk.body[0].arguments[0]);
  assert(Number.isSafeInteger(assets.imagePrefabId)&&Number.isSafeInteger(assets.containerPrefabId),'Missing asset template identities');
  const roles={menuScene:{path:'stage/menuPanel/lowpolyScene',data:assets.lowpolyLand,inheritedVisible:true},
   selection:{path:'stage/characterPanel/details/officialSelectionFigure',data:assets.battle133,inheritedVisible:true},
   avatar:{path:'stage/characterPanel/traveler/officialAvatar',data:assets.avatar96,inheritedVisible:false}};
  assert(assets.v25PortraitProfile?.schemaVersion===1,'Unsupported legacy portrait selection profile');
  for(const role of Object.values(roles)){
   const data=role.data;assert(data&&Array.isArray(data.rows)&&data.rows.length===data.count&&data.count>0&&data.count<=10000,'Invalid asset rows/count');
   assert(data.rows.every(row=>Array.isArray(row)&&[18,20].includes(row.length)&&row.every(Number.isFinite)),'Invalid portrait image data');
   role.pages=Math.ceil(data.count/3600);role.groups=Math.ceil(data.count/60);role.images=data.count;
  }
  return {supported:true,assetSha256:hash(assetRows[0].source),controllerSha256:hash(controllers[0].source),imagePrefabId:assets.imagePrefabId,containerPrefabId:assets.containerPrefabId,roles};
 }catch(error){return {supported:false,reason:'Legacy model completeness UNVERIFIED: '+error.message};}
}
function legacyTreeComplete(row,role,oracle){
 const fail=reason=>({complete:false,reason});
 if(!row||(role.inheritedVisible&&!row.visible))return fail('host-missing-or-hidden');
 const active=node=>node.active!==false&&node.visible!==false;
 if(!active(row.node)||(row.node.children??[]).length!==role.pages)return fail('host-pages:'+String(row.node.children?.length));
 let index=0,groups=0;
 // The pinned SDK stores dynamically instantiated siblings newest first;
 // reconstruct controller creation order before pairing each literal row.
 const pages=[...row.node.children].reverse();
 for(let pageIndex=0;pageIndex<role.pages;pageIndex++){
  const page=pages[pageIndex],imagesInPage=Math.min(3600,role.images-pageIndex*3600),groupCount=Math.ceil(imagesInPage/60);
  if(page.kind!=='container'||page.prefabIndex!==oracle.containerPrefabId||!active(page)||(page.children??[]).length!==groupCount)return fail('page:'+pageIndex+':'+JSON.stringify({kind:page.kind,prefabIndex:page.prefabIndex,active:page.active,visible:page.visible,groups:page.children?.length}));
  const pageGroups=[...page.children].reverse();
  for(let groupIndex=0;groupIndex<groupCount;groupIndex++){
   const group=pageGroups[groupIndex],imageCount=Math.min(60,imagesInPage-groupIndex*60);groups++;
   if(group.kind!=='container'||group.prefabIndex!==oracle.containerPrefabId||!active(group)||(group.children??[]).length!==imageCount)return fail('group:'+pageIndex+':'+groupIndex+':'+JSON.stringify({kind:group.kind,prefabIndex:group.prefabIndex,active:group.active,visible:group.visible,images:group.children?.length}));
   for(const image of [...group.children].reverse()){
    const expected=role.data.rows[index++];
    if(image.kind!=='image'||image.prefabIndex!==oracle.imagePrefabId||!active(image)||(image.children??[]).length||image.imageId!==expected[0])return fail('image:'+index+':'+JSON.stringify({kind:image.kind,prefabIndex:image.prefabIndex,active:image.active,visible:image.visible,imageId:image.imageId,expectedImage:expected[0]}));
    for(const [property,value] of [['anchoredPositionX',expected[1]],['anchoredPositionY',expected[2]],['sizeDeltaX',expected[3]],['sizeDeltaY',expected[4]]]){
     if(!Number.isFinite(image[property])||Math.abs(image[property]-value)>0.0001)return fail('image:'+index+':'+property+':'+String(image[property])+':expected:'+value);
    }
   }
  }
 }
 return {complete:index===role.images&&groups===role.groups,reason:'images='+index+' groups='+groups};
}

function rows(session){
 const result=[];
 function walk(node,trail,visible){
  const path=[...trail,node.name];visible=visible&&node.visible!==false&&node.active!==false;
  result.push({node,path:path.join('/'),visible});
  for(const child of node.children??[])walk(child,path,visible);
 }
 for(const root of session.runtime.roots)walk(root,[],true);
 return result;
}
function target(all,path){
 const matches=all.filter(row=>row.path===path||row.path.endsWith('/'+path));
 assert.equal(matches.length,1,'Missing/ambiguous model path '+path);return matches[0];
}
// Source components are private visual trees: semantic code only changes their
// parent host visibility. Within a source tree active/visible must stay exact.
// Text is deliberately excluded because native binding clearTextPaths clears
// source labels; business text is checked separately below.
function shape(node){return {name:node.name,kind:node.kind,active:node.active!==false,visible:node.visible!==false,children:(node.children??[]).map(shape)};}
function portraitPhases(logs){
 const phases={};for(const row of logs){const m=row.text?.match(/^ABYSS_PORTRAIT (\w+) phase=([\w_]+)/);if(m)phases[m[1]]=m[2];}return phases;
}

export function inspectPage(session,name,{componentMode,templates,staticRoots,legacyOracle}){
 const all=rows(session),checks=[],phases=portraitPhases(session.runtime.logs);
 function check(category,id,value,detail){assert(['controls','templates','text'].includes(category),'Unknown page check category');checks.push({category,id,passed:!!value,...(detail?{detail}:{})});}
 const page=target(all,paths[name]);check('controls','panel-visible',page.visible);
 if(name==='menu')check('controls','selection-closed',!target(all,paths.character).visible);
 const text=name==='menu'?['start/label']:['details/name','details/stats','details/gold','details/deckTitle','details/deckSummary','details/relic'];
 for(const path of text){const row=target(all,paths[name]+'/'+path);check('text','text:'+path,row.visible&&typeof row.node.text==='string'&&row.node.text.trim());}
 for(const path of name==='menu'?[paths.open]:[paths.close,'stage/characterPanel/confirm/hit']){
  const row=target(all,path);check('controls','input:'+path,row.visible&&row.node.interactable!==false);
 }
 if(componentMode){
  // Expected hosts come from the candidate's static tree, never from the
  // surviving runtime hosts; deleting an entire host must be observable.
  const staticRows=rows({runtime:{roots:staticRoots}}),staticPage=target(staticRows,paths[name]);
  const expected=staticRows.filter(row=>row.path.startsWith(staticPage.path+'/')&&row.node.name==='__kitOriginal')
   .map(row=>({...row,path:page.path+row.path.slice(staticPage.path.length)}));
  check('templates','component-hosts-present',expected.length>0);
  const visibleHosts=name==='menu'?[paths.menu+'/__kitOriginal',paths.menu+'/start/__kitOriginal']
   :[paths.character+'/__kitOriginal',paths.character+'/confirm/__kitOriginal',paths.character+'/cancel/__kitOriginal',paths.character+'/details/portraits/traveler_ironclad/__kitOriginal'];
  for(const path of visibleHosts){const found=all.filter(row=>row.path.endsWith('/'+path)||row.path===path);check('templates','required-host-visible:'+path,found.length===1&&found[0].visible);}
  for(const source of expected){
   const matches=all.filter(row=>row.path===source.path);const row=matches.length===1?matches[0]:undefined;
   check('templates','host-exists:'+source.path,!!row);
   if(!row||!row.visible)continue;
   const originals=row.node.children??[];let valid=originals.length===1;
   if(valid){const original=originals[0],template=templates.get(original.prefabIndex);valid=!!template&&JSON.stringify(shape(original))===JSON.stringify(shape(template));}
   check('templates','template:'+row.path,valid);
  }
  if(name==='character'){
   const portrait=target(all,paths.character+'/details/portraits/traveler_ironclad');
   check('controls','portrait-visible',portrait.visible);
   const host=(portrait.node.children??[]).find(child=>child.name==='__kitOriginal');
   check('templates','portrait-component-present',host?.children?.length===1);
  }
 }else{
  check('templates','legacy-oracle-supported',legacyOracle?.supported===true);
  for(const role of name==='menu'?['menuScene']:['selection','avatar']){
   check('templates','portrait-ready:'+role,phases[role]==='ready');
   if(legacyOracle?.supported){
    const expected=legacyOracle.roles[role],matches=all.filter(row=>row.path===expected.path||row.path.endsWith('/'+expected.path));
    const observed=matches.length===1?legacyTreeComplete(matches[0],expected,legacyOracle):{complete:false,reason:'host-path-missing-or-ambiguous'};
    check('templates','portrait-asset-tree:'+role,observed.complete,observed.reason);
   }
  }
 }
 const scriptReady=session.runtime.logs.some(row=>row.text==='ABYSS_UI ready');
 const requiredChecks=Object.fromEntries(['controls','templates','text'].map(category=>[category,checks.some(check=>check.category===category)&&checks.filter(check=>check.category===category).every(check=>check.passed)]));
 const structureReady=Object.values(requiredChecks).every(Boolean);
 return {scriptReady,structureReady,complete:scriptReady&&structureReady,requiredChecks,checkDetails:checks,portraitPhases:phases,oracleVerified:componentMode||legacyOracle?.supported===true,preparationSupported:componentMode||legacyOracle?.supported===true,
  reason:!componentMode&&!legacyOracle?.supported?(legacyOracle?.reason??'Legacy model completeness UNVERIFIED: asset oracle unavailable')
   :checks.filter(check=>!check.passed).map(check=>check.id).join('; ')||(!scriptReady?'script-ready missing':'SDK model complete; visual presentation remains UNVERIFIED')};
}

export async function replayUiOutcome({receiptFile,sdkFile,outFile,roundTrips=20,frameLimit=180}){
 assert(Number.isInteger(roundTrips)&&roundTrips>=1&&roundTrips<=20,'roundTrips must be 1..20');
 assert(Number.isInteger(frameLimit)&&frameLimit>=1&&frameLimit<=600,'frameLimit must be 1..600');
 receiptFile=resolve(receiptFile);sdkFile=resolve(sdkFile);outFile=resolve(outFile);
 assert(!existsSync(outFile),'Use a new output path; existing observations must not be overwritten');mkdirSync(dirname(outFile),{recursive:true});
 const report={schemaVersion:1,kind:'sdk-ui-outcome',createdAt:new Date().toISOString(),scope,
  identity:{},scenario:{id:'menu-character-roundtrip-v1',roundTrips,dt:1/60,frameLimit},events:[],pages:[],inputs:[],roundTrips:[],faults:[],mountErrors:[],
  environment:{platform:process.platform,arch:process.arch,node:process.version,cpu:os.cpus()[0]?.model},
  external:{officialImport:'UNVERIFIED',officialReady:'UNVERIFIED',officialCapacity:'UNVERIFIED',pcPerformance:'UNVERIFIED',androidPerformance:'UNVERIFIED',v25Visual:'UNVERIFIED'}};
 let session,sdk,temporary,rawMount,rawAdd;const counters={created:0,destroyed:0};
 try{
  const receipt=read(receiptFile),save=read(receipt.output),scriptsFile=join(dirname(receiptFile),'scripts-exact.json'),scripts=read(scriptsFile).scripts;
  assert.equal(sha(sdkFile),supportedSdkSha256,'Unsupported SDK bytes: this replay only trusts the recorded identity-fixed SDK0.5.2 export');
  assert.equal(sha(receipt.gil),receipt.gilSha256,'Actual GIL identity changed');
  assert.equal(sha(receipt.output),receipt.saveSha256,'Projected save identity changed');
  assert.equal(hash(JSON.stringify(scripts)),receipt.luaInventorySha256,'Exact Lua inventory changed');
  assert.equal(receipt.luaExact,true,'Adapter did not certify exact Lua');
  assert.equal(receipt.modifiedNativeOrLua,false,'Adapter mutated native/Lua inputs');
  assert.equal(scripts.length,save.assets.scripts.length,'Projected Lua inventory incomplete');
  for(const source of scripts){const found=save.assets.scripts.filter(row=>row.guid===source.guid);assert.equal(found.length,1);assert.equal(found[0].source,source.source);assert.equal(found[0].path,source.file);}
  report.identity={gilSha256:receipt.gilSha256,saveSha256:receipt.saveSha256,sdkSha256:sha(sdkFile),runnerSha256:sha(fileURLToPath(import.meta.url)),receiptSha256:sha(receiptFile),
   conditionsProducerSha256:sha(fileURLToPath(new URL('./ui-outcome-identity.mjs',import.meta.url))),luaInventorySha256:receipt.luaInventorySha256,mountedValuesSha256:hash(JSON.stringify(receipt.mountedValues)),luaExact:true};
  // Deliberately conservative: every rules/data/UI/rendering Lua source and all
  // model inputs participate, except the one reviewed bridge intervention.
  // Its identity stays explicit; adding another exception needs a code review.
  report.conditions=outcomeConditions(save,receipt.mountedValues);
  const initialIdentity=JSON.stringify([sha(receipt.gil),sha(receipt.output),sha(receiptFile),sha(scriptsFile),sha(sdkFile)]);
  const componentMode=receipt.mountedValues.some(row=>row.values?.nativeComponentControls===true);report.mode=componentMode?'original-components':'legacy-portrait';
  const legacyOracle=componentMode?undefined:deriveLegacyOracle(scripts);
  if(legacyOracle)report.legacyOracle={...legacyOracle,roles:legacyOracle.roles&&Object.fromEntries(Object.entries(legacyOracle.roles).map(([name,role])=>[name,{path:role.path,images:role.images,pages:role.pages,groups:role.groups,inheritedVisible:role.inheritedVisible}]))};
  const templates=new Map(save.assets.client.root.children.map(node=>[node.guid,node]));
  temporary=join(dirname(outFile),'.sdk-ui-outcome-'+randomUUID()+'.mjs');
  writeFileSync(temporary,readFileSync(sdkFile,'utf8')+'\nexport {Gr,vi,dn,wi,pa,Me};\n',{flag:'wx'});
  sdk=await import(pathToFileURL(temporary));
  for(const name of ['Qi','Gr','vi','dn','wi','pa','Me'])assert.equal(typeof sdk[name],'function','Missing actual SDK export '+name);
  const mounts=[];rawMount=sdk.Qi.prototype.mountScript;rawAdd=sdk.Qi.prototype.addRoot;
  sdk.Qi.prototype.mountScript=function(options){
   const controlId=Number(String(options.control?.authoringId??'').replace(/^n/,'')),script=basename(options.path,'.lua');
   const matches=receipt.mountedValues.filter(row=>row.controlId===controlId&&row.script===script);assert(matches.length<=1,'Ambiguous native mounted values');
   const params=matches[0]?.values??options.params??{};mounts.push({controlId,script,params});return rawMount.call(this,{...options,params});
  };
  const observedMaps=new WeakSet();
  sdk.Qi.prototype.addRoot=function(options){
   const map=this.controlsById;
   if(!observedMaps.has(map)){
    observedMaps.add(map);const set=map.set,remove=map.delete;
    map.set=function(key,value){if(!this.has(key)||this.get(key)!==value)counters.created++;return set.call(this,key,value);};
    map.delete=function(key){const removed=remove.call(this,key);if(removed)counters.destroyed++;return removed;};
   }
   return rawAdd.call(this,options);
  };
  function measure(phase,cycle,operation){
   const previous={...counters},countBefore=session?.runtime.controlsById.size??0,memoryBefore=process.memoryUsage(),start=performance.now();let value,error;
   try{value=operation();}catch(fault){error=String(fault.stack??fault);}
   const wallMs=performance.now()-start;
   report.events.push({phase,cycle,wallMs,created:counters.created-previous.created,destroyed:counters.destroyed-previous.destroyed,countBefore,countAfter:session?.runtime.controlsById.size??0,
    frame:session?.runtime.clock.frame??0,time:session?.runtime.clock.time??0,memoryBefore,memoryAfter:process.memoryUsage(),longBlock:wallMs>=100,...(error?{error}:{})});
   if(error)throw Error(error);return value;
  }
  measure('initialize',0,()=>{session=sdk.Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});});
  for(const row of receipt.mountedValues)assert(mounts.some(m=>m.controlId===row.controlId&&m.script===row.script&&JSON.stringify(m.params)===JSON.stringify(row.values)),'Missing native mount parameters');
  report.mounts=mounts;
  function observePage(name,cycle,firstEventIndex){
   let state,initialReadiness,frames=0;const start=performance.now();
   for(;;){
    state=inspectPage(session,name,{componentMode,templates,staticRoots:[save.assets.server.root],legacyOracle});
    initialReadiness??={scriptReady:state.scriptReady,structureReady:state.structureReady,complete:state.complete,requiredChecks:state.requiredChecks};
    if(state.complete||!state.preparationSupported||frames>=frameLimit)break;
    measure(name+'-prepare',cycle,()=>sdk.dn(session,1/60));frames++;
   }
   report.pages.push({name,cycle,...state,initialReadiness,frames,elapsedMs:performance.now()-start,firstEventIndex,lastEventIndex:report.events.length-1});return state.complete;
  }
  function tap(action,cycle,path,expectedPanel){
   const row=target(rows(session),path);assert(row.visible,'Input target hidden '+path);
   const boxes=sdk.wi(session),box=boxes.get(row.node.Id),matrix=sdk.pa(session,boxes).get(row.node.Id);assert(box&&matrix,'Input geometry missing');
   const point=sdk.Me(matrix,box.centerX,box.centerY),eventIndex=report.events.length;let pressed;
   measure(action,cycle,()=>{sdk.vi(session,'move',point.x,point.y);pressed=sdk.vi(session,'down',point.x,point.y);sdk.dn(session,1/60);sdk.vi(session,'up',point.x,point.y);sdk.dn(session,1/60);});
   const all=rows(session),shown=target(all,paths.character).visible?'characterPanel':target(all,paths.menu).visible?'menuPanel':'other';
   report.inputs.push({cycle,action,hit:pressed?.Id??null,expectedHit:row.node.Id,observedPanel:shown,expectedPanel,passed:pressed?.Id===row.node.Id&&shown===expectedPanel,point,eventIndex});
   return eventIndex;
  }
  observePage('menu',0,0);report.initialCount=session.runtime.controlsById.size;
  for(let cycle=1;cycle<=roundTrips;cycle++){
   const countBefore=session.runtime.controlsById.size,firstEventIndex=report.events.length;
   observePage('character',cycle,tap('open-character',cycle,paths.open,'characterPanel'));
   observePage('menu',cycle,tap('close-character',cycle,paths.close,'menuPanel'));
   report.roundTrips.push({cycle,countBefore,countAfter:session.runtime.controlsById.size,firstEventIndex,lastEventIndex:report.events.length-1});
  }
  report.finalCount=session.runtime.controlsById.size;report.netGrowth=report.finalCount-report.initialCount;
  report.logs=session.runtime.logs;report.mountErrors=session.runtime.mountErrors??[];
  report.faults=session.runtime.logs.filter(row=>row.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed|ABYSS_RUN seed=/.test(row.text));
  assert.equal(JSON.stringify([sha(receipt.gil),sha(receipt.output),sha(receiptFile),sha(scriptsFile),sha(sdkFile)]),initialIdentity,'Replay inputs changed during observation');
  report.inputsUnchanged=true;
 }catch(error){report.error=String(error.stack??error);if(session){report.logs=session.runtime.logs;report.mountErrors=session.runtime.mountErrors??[];report.faults=session.runtime.logs.filter(row=>row.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed|ABYSS_RUN seed=/.test(row.text));}}
 finally{
  if(sdk&&rawMount)sdk.Qi.prototype.mountScript=rawMount;if(sdk&&rawAdd)sdk.Qi.prototype.addRoot=rawAdd;
  if(session)for(const runtime of session.runtimes??[])for(const state of runtime.luaStates??[])try{sdk.d.lua_close(state);}catch{}
  if(temporary&&existsSync(temporary))unlinkSync(temporary);
 }
 report.longBlocks=report.events.flatMap((row,eventIndex)=>row.longBlock?[{eventIndex,phase:row.phase,cycle:row.cycle,wallMs:row.wallMs,frame:row.frame}]:[]);
 writeFileSync(outFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const options={};for(let index=2;index<process.argv.length;index+=2){const key=process.argv[index],value=process.argv[index+1];assert(value&&!value.startsWith('--'),'Missing value for '+key);assert(['--receipt','--sdk','--out','--cycles','--frame-limit'].includes(key),'Unknown argument '+key);assert(!Object.hasOwn(options,key),'Duplicate argument '+key);options[key]=value;}
 assert(options['--receipt']&&options['--sdk']&&options['--out'],'Usage: replay-ui-outcome.mjs --receipt adapter-receipt.json --sdk actual-runtime.mjs --out new-report.json [--cycles 20] [--frame-limit 180]');
 const report=await replayUiOutcome({receiptFile:options['--receipt'],sdkFile:options['--sdk'],outFile:options['--out'],roundTrips:Number(options['--cycles']??20),frameLimit:Number(options['--frame-limit']??180)});
 console.log(JSON.stringify({file:resolve(options['--out']),mode:report.mode,pages:report.pages.length,incomplete:report.pages.filter(row=>!row.complete).length,inputs:report.inputs.length,failedInputs:report.inputs.filter(row=>!row.passed).length,netGrowth:report.netGrowth,longBlocks:report.longBlocks,error:report.error,scope}));
 if(report.error)process.exitCode=1;
}
