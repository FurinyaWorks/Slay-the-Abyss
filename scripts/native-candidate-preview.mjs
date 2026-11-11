import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadNativeUiEncoder} from './native-ui-encoder.mjs';
import {embeddedScripts} from './native-script-inventory.mjs';
export function previewImageMaskFields(spec){
 return {enableMask:!!(spec.mask||spec.fill||spec.feather||spec.invertMask),enableFill:!!spec.fill,
  enableSoftEdge:!!spec.feather,reverseMaskArea:spec.invertMask===true,
  // The browser renderer accepts singular Pixel; Pixels silently means percent.
  softEdgeMode:spec.feather?.pixels?'Pixel':'Percentage',
  softEdgeWidthX:spec.feather?.pixels?.[0]??8,softEdgeWidthY:spec.feather?.pixels?.[1]??8,
  horizontalSoftRange:spec.feather?.percent?.[0]??85,verticalSoftRange:spec.feather?.percent?.[1]??85};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const root=process.cwd(),candidatePath=path.resolve(process.argv[2]??''),out=path.resolve(process.argv[3]??'');
if(process.argv.length!==4||!out.startsWith(path.resolve('.artifacts')+path.sep)||fs.existsSync(out))throw Error('Usage: node scripts/native-candidate-preview.mjs <candidate.json> <new .artifacts/output>');
fs.mkdirSync(out,{recursive:true});
const pinned=path.join(out,'readback');fs.mkdirSync(pinned);
const toolRoot=process.env.MILIASTRA_MCP_ROOT??'D:/MiliastraTools/genshin-miliastra-mcp';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const candidate=read(candidatePath);
const gil=candidate.candidate.path??candidate.mapPath;
if(hash(gil)!==candidate.candidate.sha256)throw Error('GIL changed');
const wire=await import(pathToFileURL(path.join(toolRoot,'src/scene/wire.mjs')));
const {native}=await loadNativeUiEncoder(toolRoot);
const ui=native.getClientUi({mapPath:gil,ui:'SlayTheAbyss'}),scripts=embeddedScripts({mapPath:gil,includeSource:true},wire).scripts;
if(scripts.length!==Object.keys(candidate.moduleDigests).length||scripts.some(s=>createHash('sha256').update(s.source).digest('hex')!==candidate.moduleDigests[s.name]))throw Error('Embedded Lua differs from build receipt');
fs.writeFileSync(path.join(pinned,'ui.json'),JSON.stringify(ui));
fs.writeFileSync(path.join(pinned,'scripts.json'),JSON.stringify({scripts}));
const requiredTemplates=new Set(['AbyssDeckCard','AbyssMonsterActor','AbyssMonsterPower','AbyssReadyCardGroup','AbyssReadyCardImage']);
function collectTemplateReferences(node){
 for(const key of ['itemTemplate','template'])if(node[key])requiredTemplates.add(node[key]);
 for(const child of node.children??node.controls??[])collectTemplateReferences(child);
}
collectTemplateReferences(ui.interface);
for(const name of requiredTemplates){
 const actual=native.getClientUi({mapPath:gil,template:name});
 if(actual.template?.name!==name)throw Error('Actual template identity differs: '+name);
 collectTemplateReferences(actual.template);
 fs.writeFileSync(path.join(pinned,name+'.json'),JSON.stringify(actual));
}
const raw=wire.container(fs.readFileSync(gil)),section=wire.one(raw,50),scriptMetadata=new Map();
for(const f of wire.fields(section).filter(f=>f.id===1&&f.wire===2)){
 const fields=wire.fields(f.data),str=id=>fields.find(v=>v.id===id&&v.wire===2)?.data.toString('utf8');
 const guid=Number(wire.one(f.data,1,0));scriptMetadata.set(str(2),{guid,file:str(3),source:str(5)});
}
for(const s of scripts){const m=scriptMetadata.get(s.name);if(!m||m.source!==s.source||m.file!==s.file||!Number.isSafeInteger(m.guid)||m.guid<=0)throw Error('Script readback identity mismatch: '+s.name);}
const templateRecords=[];
for(const file of fs.readdirSync(pinned).filter(f=>f.endsWith('.json'))){const data=read(path.join(pinned,file));if(data.template&&data.templateIndex)templateRecords.push({file,...data});}
if(templateRecords.length!==requiredTemplates.size||new Set(templateRecords.map(t=>t.templateIndex)).size!==requiredTemplates.size)throw Error('Expected every referenced PR588 actual template');
const seed=read(path.join(root,'experiments/art-tech-lab/seed.save.json')),prototypes=new Map();
function collect(n){if(!prototypes.has(n.kind))prototypes.set(n.kind,n);for(const c of n.children??[])collect(c);}collect(seed.assets.server.root);collect(seed.assets.client.root);
const kinds={container:'container',image:'image',text:'textbox',cursorArea:'cursor',presetButton:'button',grid:'grid',reference:'reference',keyHint:'keyhint',textWindow:'textwindow',animation:'animation',fullscreenAnimation:'fullscreen'};
const platforms=['KEYBOARD','TOUCHSCREEN','CONTROLLER_CONSOLE','CONTROLLER_MOBILE'],deviceKeys={TOUCHSCREEN:'mobile',CONTROLLER_CONSOLE:'console',CONTROLLER_MOBILE:'mobileGamepad'};
const templateIds=Object.fromEntries(templateRecords.map(t=>[t.template.name,t.templateIndex])),warnings=[],unknown=new Map(),allIds=new Set();let fallbackId=1900000000,converted=0;
const warn=s=>{if(!warnings.includes(s))warnings.push(s);};
const vector=(a,defaults)=>({x:a?.[0]??defaults[0],y:a?.[1]??defaults[1]});
function transform(spec){return {scale:{...vector(spec.scale,[1,1]),z:1},rotation:{x:0,y:0,z:spec.rotation??0},anchorMin:vector(spec.anchor?.min,[.5,.5]),anchorMax:vector(spec.anchor?.max,[.5,.5]),offset:vector(spec.position,[0,0]),size:vector(spec.size,[0,0]),pivot:vector(spec.pivot,[.5,.5])};}
function argb(colour='#FFFFFF',alpha=1){return ((Math.round(alpha*255)<<24)|(parseInt(colour.replace('#',''),16)&0xffffff))>>>0;}
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const align={left:'Left',centre:'Middle',right:'Right',top:'Top',middle:'Middle',bottom:'Bottom'};
const known=new Set(['name','kind','position','size','scale','rotation','anchor','pivot','devices','active','visible','focusable','children','scripts','script','showCursor','blockKeys','blockCursor','isolateNavigation','image','imageType','colour','opacity','mask','fill','feather','invertMask','text','states','enabled','sound','itemTemplate','grid','template','key','padKey','effect','effectSound','below','navigation']);
function node(spec,ids,trail,templateRoot=false){
 const kind=kinds[spec.kind];if(!kind)throw Error('Unsupported actual kind '+spec.kind);
 let guid=ids?.[trail]??ids?.[spec.name];if(templateRoot)guid=templateIds[spec.name];
 if(!Number.isSafeInteger(guid)||guid<=0){guid=++fallbackId;warn('Some control GUID absent in readback.ids: allocated local simulator GUIDs only for those nodes.');}
 if(allIds.has(guid))throw Error('Duplicate actual control GUID '+guid+' '+trail);allIds.add(guid);
 const base=structuredClone(prototypes.get(kind)??prototypes.get('container'));
 for(const k of Object.keys(base))if(!['giaRaw'].includes(k))delete base[k];
 const n={...base,id:'n'+guid,kind,name:spec.name,guid,giaRelatedGuids:[],active:spec.active!==false,visible:spec.visible!==false,canControllerFocus:spec.focusable===true,syncAllDevices:!spec.devices,transformByPlatform:{},children:[],scriptMappingIds:[]};
 for(const p of platforms)n.transformByPlatform[p]=transform({...spec,...spec.devices?.[deviceKeys[p]]});
 for(const k of Object.keys(spec))if(!known.has(k))unknown.set(k,(unknown.get(k)??0)+1);
 if(kind==='container'){n.isolateNavigation=spec.isolateNavigation===true;n.disableKeyEventPassthrough=spec.blockKeys===true;n.disableCursorEventPassthrough=spec.blockCursor===true;n.showCursor=spec.showCursor===true;}
 if(kind==='textbox'||kind==='textwindow'){
  const t=spec.text??{};Object.assign(n,{text:t.content??'',fontSize:t.fontSize??20,adaptiveFontSize:t.autoSize===true,minimumFontSize:t.minFontSize??20,fontColor:argb(t.colour,t.opacity??1),bgColor:argb(t.background??'#000000',t.backgroundOpacity??0),enableOutline:t.outline!==false,outlineColor:argb(t.outlineColour??'#333333',t.outlineOpacity??.2),horizontalAlignment:align[t.align]??'Left',verticalAlignment:align[t.valign]??'Top'});
  if(kind==='textwindow'){n.interactable=t.scrollable!==false;n.showScrollBar=t.scrollbar!==false;}
 }
 if(kind==='image'){
  Object.assign(n,{imageSource:'StaticReference',imageType:spec.image>100006?cap(spec.imageType??'basic'):null,imageId:spec.image??null,imageColor:argb(spec.colour,spec.opacity??1),...previewImageMaskFields(spec),fillAmount:spec.fill?.amount??1,fillType:cap(spec.fill?.shape??'horizontal'),fillClockwise:spec.fill?.clockwise!==false});
  if(spec.fill?.from){const field={horizontal:'fillHorizontalType',vertical:'fillVerticalType',radial90:'fillRadial90Type'}[spec.fill.shape]??'fillRadialType';n[field]=cap(spec.fill.from);}
 }
 if(kind==='cursor')n.raycastTarget=true;
 if(kind==='button')Object.assign(n,{raycastTarget:true,interactable:spec.enabled!==false,clickAudioId:spec.sound??50888,unavailableChildId:null,hoverChildId:null,pressedChildId:null,selectedChildId:null});
 if(kind==='grid'){
  if(spec.itemTemplate&&!templateIds[spec.itemTemplate])throw Error('Missing actual grid template: '+spec.itemTemplate);
  const g=spec.grid??{};Object.assign(n,{itemPrefabId:templateIds[spec.itemTemplate]??null,raycastTarget:true,interactable:true,showScrollBar:g.scrollbar!==false,scrollDirection:g.horizontal||g.rows?'Horizontal':'Vertical',layoutConstraint:g.columns||g.rows?'Fixed':'AutoWrap',layoutConstraintFixedCount:g.columns??g.rows??null,cellSizeX:g.itemSize?.[0]??50,cellSizeY:g.itemSize?.[1]??50,spacingX:g.spacing?.[0]??8,spacingY:g.spacing?.[1]??8,padding1X:g.padding?.[0]??20,padding1Y:g.padding?.[1]??20,padding2X:g.padding?.[2]??20,padding2Y:g.padding?.[3]??20,previewCount:g.preview??5});
 }
 if(kind==='reference'){
  if(spec.template&&!templateIds[spec.template])throw Error('Missing actual reference template: '+spec.template);
  n.referencedPrefabId=templateIds[spec.template]??null;
 }
 if(kind==='keyhint'){n.keyboardKeyCode=spec.key??null;n.controllerKeyCode=spec.padKey??null;}
 if(kind==='animation'||kind==='fullscreen'){n.animationId=spec.effect??null;n.playSoundEffect=spec.effectSound===true;n.layer=spec.below?'BelowAllControls':'AboveAllControls';}
 const original=(spec.children??[]).map(c=>node(c,ids,trail?trail+'/'+c.name:c.name));
 n.children=original.reverse();
 if(spec.states){for(const [key,field]of [['hover','hoverChildId'],['pressed','pressedChildId'],['disabled','unavailableChildId']])n[field]=n.children.find(c=>c.name===spec.states[key])?.id??null;
  if(spec.states.normal)warn('84 native preset buttons have normal states; simulator0.5.2 has no normalChildId slot. Normal remains original visible unbound child below mapped hover/pressed/disabled; simultaneous alpha overlap can differ. No selected-state proxy fabricated.');}
 const mounted=[...(spec.scripts??[]),...(spec.script?[spec.script]:[])];for(const m of mounted){const name=typeof m==='string'?m:m.name;const s=scriptMetadata.get(name);if(!s)throw Error('Missing mounted script '+name);n.scriptMappingIds.push(s.guid);}
 if(spec.navigation)warn('Native explicit navigation is not represented by simulator0.5.2 node model.');converted++;return n;
}
const save=structuredClone(seed);save.meta={name:`PR588 battle ${candidate.buildId} · ${candidate.sourceCommit.slice(0,8)}${candidate.sourceDirty?' + local changes':''}`};save.activeAssetType='server-control-template';save.serverLogic={version:1,rules:[]};save.controlGuidChanges=[];save.scriptSync=null;
const holder=structuredClone(seed.assets.server.root);holder.id='n'+ui.containerId;holder.guid=ui.containerId;holder.name=ui.interface.name;holder.children=[];holder.scriptMappingIds=[];allIds.add(ui.containerId);
const rootSpec={name:'root',kind:'container',position:[0,0],size:[0,0],anchor:{min:[0,0],max:[1,1]},showCursor:ui.interface.showCursor,blockKeys:ui.interface.blockKeys,blockCursor:ui.interface.blockCursor,scripts:ui.interface.scripts,children:ui.interface.controls};
const interfaceRoot=node(rootSpec,{...ui.ids,root:ui.rootId},'');holder.children=[interfaceRoot];save.assets.server={version:1,layoutSchemaVersion:2,meta:{name:ui.interface.name,assetType:'server-control-template',sourceFormat:'actual-native-candidate-readback',sourceFile:gil},canvasId:'pc-16-9',selectedId:interfaceRoot.id,root:holder};
const clientRoot=structuredClone(seed.assets.client.root);clientRoot.children=[];clientRoot.id='sim-client-root';clientRoot.guid=0;clientRoot.name='V25 actual candidate templates';clientRoot.scriptMappingIds=[];
for(const t of templateRecords)clientRoot.children.push(node(t.template,t.ids,t.template.name,true));
save.assets.client={version:1,layoutSchemaVersion:2,meta:{name:`V25 actual ${templateRecords.length} templates`,assetType:'client-control-template',sourceFormat:'actual-native-candidate-readback',sourceFile:gil},canvasId:'pc-16-9',selectedId:clientRoot.children[0].id,root:clientRoot};
save.assets.scripts=scripts.map(s=>({id:'s'+scriptMetadata.get(s.name).guid,guid:scriptMetadata.get(s.name).guid,path:s.file,source:s.source,controlAsset:s.name==='abyss_ui'?'server-control-template':null,controlId:s.name==='abyss_ui'?interfaceRoot.id:null}));
warn('Native compiled server graphs are not automatically converted to simulator serverLogic rules; settlement/BGM/history platform signals remain simulator limitations. Actual candidate Lua sources preserved exactly.');
warn('Actual image IDs are preserved. Native image field5 zero/absent means Basic (same mapping as native-component-regular.mjs); translate explicitly instead of Simulator atlas border default. Asset availability still requires playback; missing images are not substituted.');
warn('Native script public parameter nativeBgmEnabled is present in candidate parameters.json; simulator script parameter model may derive defaults differently. Not patched into Lua.');
const output=path.join(out,'pr588.actual.save.json');fs.writeFileSync(output,JSON.stringify(save));
// Existing importer is an independent schema reader. It preserves save order,
// so reverse its controls back before comparing native painter-order identity.
const {readSimulatorSave}=await import(pathToFileURL(path.join(toolRoot,'src/simulator-import.mjs')));
const inverse=readSimulatorSave(output),inverseFaults=[];
if(inverse.scripts.length!==scripts.length||inverse.templates.length!==templateRecords.length)inverseFaults.push('inverse inventory differs');
for(const s of scripts)if(inverse.scripts.find(t=>t.name===s.name)?.source!==s.source)inverseFaults.push('inverse Lua differs '+s.name);
const pairs=[];
function compareTree(original,restored,trail){
 if(!restored||original.name!==restored.name||original.kind!==restored.kind){inverseFaults.push('identity '+trail);return;}
 for(const field of ['position','size','scale','rotation','pivot','anchor'])if(original[field]!==undefined&&JSON.stringify(original[field])!==JSON.stringify(restored[field]))inverseFaults.push(field+' '+trail);
 if(original.image!==undefined&&original.image!==restored.image)inverseFaults.push('image '+trail);
 if(original.kind==='image'&&(original.imageType??'basic').toLowerCase()!==(restored.imageType??'basic').toLowerCase())inverseFaults.push('imageType '+trail);
 if(original.active===false&&restored.active!==false||original.visible===false&&restored.visible!==false)inverseFaults.push('visibility '+trail);
 if(original.text){
 if((original.text.autoSize===true)!==(restored.text?.autoSize===true))inverseFaults.push('text.autoSize '+trail);
 for(const field of ['content','fontSize','minFontSize','align','valign']){
  // The native importer omits minimum font size when adaptive sizing is off.
  // It has no rendering effect in that state; still compare it when enabled.
  if(field==='minFontSize'&&original.text.autoSize!==true&&restored.text?.autoSize!==true)continue;
  if(original.text[field]!==undefined&&(original.text[field]||field!=='content')&&original.text[field]!==restored.text?.[field])inverseFaults.push('text.'+field+' '+trail);
 }}
 if(original.text&&(original.text.outline!==false)!==(restored.text?.outline!==false))inverseFaults.push('text.outline '+trail);
 if(original.colour&&original.colour.toLowerCase()!==(restored.colour??'#ffffff').toLowerCase())inverseFaults.push('colour '+trail);
 if(original.opacity!==undefined&&Math.round(original.opacity*255)!==Math.round((restored.opacity??1)*255))inverseFaults.push('alpha '+trail);
 if(original.fill&&JSON.stringify(original.fill)!==JSON.stringify(restored.fill))inverseFaults.push('fill '+trail);
 if(original.feather&&JSON.stringify(original.feather)!==JSON.stringify(restored.feather))inverseFaults.push('feather '+trail);
  if(original.itemTemplate&&original.itemTemplate!==restored.itemTemplate)inverseFaults.push('itemTemplate '+trail);
  if(original.grid&&JSON.stringify(original.grid)!==JSON.stringify(restored.grid))inverseFaults.push('grid layout '+trail);
 const children=[...(restored.children??[])].reverse(),expected=original.children??[];
 if(children.length!==expected.length)inverseFaults.push('child count '+trail);
 expected.forEach((c,i)=>compareTree(c,children[i],trail+'/'+c.name));pairs.push(trail);
}
const inverseControls=[...(inverse.ui?.controls??[])].reverse();ui.interface.controls.forEach((n,i)=>compareTree(n,inverseControls[i],n.name));
if(JSON.stringify(inverse.ui?.scripts)!==JSON.stringify(ui.interface.scripts))inverseFaults.push('interface script mount differs');
for(const t of templateRecords){const restored=inverse.templates.find(x=>x.guid===t.templateIndex);if(!restored)inverseFaults.push('template guid '+t.templateIndex);else compareTree(t.template,restored.spec,t.template.name);}
const summary={format:save.format,version:save.version,candidateSha256:candidate.candidate.sha256,sourceCommit:candidate.sourceCommit,sourceDirty:candidate.sourceDirty,buildId:candidate.buildId,save:output,saveSha256:hash(output),bytes:fs.statSync(output).size,controlsConverted:converted,templates:templateRecords.map(t=>({name:t.template.name,actualId:t.templateIndex})),scripts:save.assets.scripts.length,luaSourceExact:true,allActualLuaGuidsReadFromGil:true,childOrder:'Every native readback children list reversed into simulator: installed renderer traverses children.reverse() and simulator native importer reverses parsed native lists.',inverseReadback:{nodesCompared:pairs.length,faults:inverseFaults,notes:inverse.notes},unknownProperties:Object.fromEntries(unknown),warnings,modifiedGil:false,played:false};
if(hash(gil)!==candidate.candidate.sha256)throw Error('GIL changed during preview conversion');
fs.writeFileSync(path.join(out,'adapter-receipt.json'),JSON.stringify(summary,null,2));
if(inverseFaults.length||unknown.size)throw Error('Preview conversion differs: '+inverseFaults.slice(0,8).join(';')+' unknown='+[...unknown.keys()].join(','));
console.log(JSON.stringify({save:output,sha256:hash(output),nodes:converted,modules:scripts.length,inverseFaults:inverseFaults.length,officialImport:false}));
}
