import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {toLua} from './build-lua-data.mjs';
import {createRequire} from 'node:module';
import {isLightweightProfile,lightweightInventory,boundedPortraitSource} from './lightweight-2d-profile.mjs';
import {v25Theme} from './v25-layout.mjs';
import {v25PortraitRuntimeProfile} from './v25-portrait-profile.mjs';
import {stsCharacterPortraitProfile} from './sts-character-select-layout.mjs';

export const portraitModule='abyss_traveler_portrait_assets';
export const approvedBattleIdlePath='art/characters/traveler-geo/idle-approved-v1/native-idle-210.json';
const approvedIdleSource='art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png';
const approvedIdleGif='art/characters/traveler-geo/idle-approved-v1/lumine_idle_approved.gif';
export function approvedBattleIdle(root=process.cwd()){
 const bytes=readFileSync(join(root,approvedBattleIdlePath),'utf8').replaceAll('\r\n','\n');
 if(createHash('sha256').update(bytes).digest('hex')!=='caa7505c9485ae46555c130088c7d486542865c4ae694090935843d5e0b41af5')throw Error('Approved Lumine idle data changed');
 const data=JSON.parse(bytes);
 if(data.sourceSha256!=='32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de'
  ||data.renderProfile!=='approved-idle-v1'||data.width!==210||data.height!==192||data.count!==7303||data.rows.length!==7303
  ||data.bandByRow.length!==7303||data.bands.length!==18||data.period!==2.2)throw Error('Invalid approved Lumine idle identity');
 // Match the approved GIF's twenty 110ms source poses on the same 2.2s loop.
 // The existing renderer already supports this cadence; static rows stay exact.
 return {...data,samplesPerCycle:20};
}
function approvedIdleInventory(){
 const data=approvedBattleIdle();let page=0,group=0,groups=0;
 for(let i=0;i<data.rows.length;i++){
  const band=data.bandByRow[i],next=Math.floor(i/60)+1;
  if(page!==band){page=band;group=0;}
  if(group!==next){group=next;groups++;}
 }
 return {asset:'traveler-geo/idle-approved-v1',images:data.count,groups,pages:data.bands.length,
  sourceSha256:data.sourceSha256,jsonSha256:data.jsonSha256,periodSeconds:data.period,
  motion:'approved-source-field-native-band-approximation',officialCapacity:'not_measured',devicePerformance:'not_run'};
}
const base='art/characters/traveler-geo/portraits';
const assets=[
 {kind:'avatar96',count:4822,width:96,display:32,runtime:'c30551e1fed1cd7f18c61b67fe0ad0cd6e52c61bfa6ae937ccd9e4c90e7f72bb',json:'93bcf4303d370f7faac2b8289146acfe655bae6dced0abf5257e407d69f748ef'},
 {kind:'battle133',count:4315,width:133,display:400/3,runtime:'ae2161957033d688b1bed1c7ab2ad2891d5f7bf5e34b291f9ecaef7cfa11f880',json:'f8a7af7b079aa5bbb7e16b502b222f1fd7dbfaa2c30f6eef1bf0d76af0a0a248'},
];
const licensePath=`${base}/avatar96/LICENSE-runtime-MIT.txt`;
const selectionBudgetPath='art/performance/selection-budget-v1.json';
export const portraitInputs=[...assets.flatMap(a=>['runtime-no-snapshot.lua','native-art.json'].map(f=>`${base}/${a.kind}/${f}`)),licensePath,selectionBudgetPath,
 `${base}/avatar96/preview-native-1x.png`,`${base}/battle133/preview-native-1x.png`,'art/lowpoly-select/select-lowpoly.json',
 approvedBattleIdlePath,approvedIdleSource,approvedIdleGif];
const hash=b=>createHash('sha256').update(b).digest('hex');
export function selectionBudget(root=process.cwd()) {
 const bytes=readFileSync(join(root,selectionBudgetPath));
 if(hash(bytes)!=='df3b34983dafd051842c820e6c7bf0931926fccba00fce0cc8873cab0f803b82')throw Error('Selection budget data changed');
 const pack=JSON.parse(bytes);
 for(const [id,width,count]of [['avatar96',96,457],['selection133',133,1940]]) {
  const a=pack.assets[id];
  if(a.width!==width||a.count!==count||a.rows.length!==count||hash(readFileSync(join(root,a.source)))!==a.sourceSha256
   ||a.rows.some(r=>r.length!==18||r.some(n=>!Number.isFinite(n))||r[0]!==100001||r[3]<=0||r[4]<=0||r[13]!==0
    ||r.slice(14).some(n=>n<0||n>255)||Math.abs(r[1])+r[3]/2>width/2||Math.abs(r[2])+r[4]/2>width/2))throw Error('Invalid selection budget '+id);
 }
 return pack;
}
function license(root) {
 const bytes=readFileSync(join(root,licensePath));
 if(hash(bytes)!=='b5f34362abd2e8c31b7a7bc62c2977f158faa4cd78b17ef7c197fb464e56a6ef')throw Error('Frozen portrait runtime license changed');
 return bytes.toString('utf8');
}
const selectedAssets=({selectionAvatar=true,battlePortrait=true}={})=>assets.filter(a=>a.kind==='avatar96'?selectionAvatar:battlePortrait);
export function portraitSourceInputs(options={}) {
 const selected=selectedAssets(options);if(!selected.length)return [];
 return [...selected.flatMap(a=>['runtime-no-snapshot.lua','native-art.json'].map(f=>`${base}/${a.kind}/${f}`)),licensePath,
  ...(selected.some(a=>a.kind==='battle133')?[approvedBattleIdlePath,approvedIdleSource,approvedIdleGif]:[]),
  ...(selected.some(a=>a.kind==='avatar96')?[selectionBudgetPath,`${base}/avatar96/preview-native-1x.png`,`${base}/battle133/preview-native-1x.png`]:[])];
}
export function portraitSources(root=process.cwd(),options) {
 const selected=selectedAssets(options);if(selected.length)license(root);
 return selected.map(a=>{
  const path=`${base}/${a.kind}/runtime-no-snapshot.lua`,bytes=readFileSync(join(root,path));
  if(hash(bytes)!==a.runtime||hash(readFileSync(join(root,`${base}/${a.kind}/native-art.json`)))!==a.json)
   throw Error(`Frozen portrait input changed: ${a.kind}`);
  const source=bytes.toString('utf8'),start=source.indexOf('local ROOT = '),end=source.indexOf('\nlocal created = {}');
  if(start<0||end<=start)throw Error(`Missing frozen portrait literal block: ${a.kind}`);
  const literals=source.slice(start,end);
  return {...a,literals};
 });
}
// menuBackground: bottom-most low-poly scene slot (select + combat). First drawn = behind every
// hand/monster/HUD control; no existing stacking order changes. Absent when the flag is off.
export const lowpolySceneHost='lowpolyScene';
export function attachLowpolyScenes(layout,{menuBackground=false}={}) {
 if(!menuBackground)return;
 const stage=layout.controls.find(c=>c.name==='stage');
 const panel=n=>{const c=stage?.children?.find(c=>c.name===n);if(!c)throw Error(`Missing scene parent ${n}`);return c;};
 const host=()=>({name:lowpolySceneHost,kind:'container',position:[0,0],size:[1280,720],visible:false,children:[]});
 const select=panel('characterPanel'),battle=panel('battlePanel'),menu=stage?.children?.find(c=>c.name==='menuPanel');
 // Pan 2026-10-31：首页铺我们自己的低多边形几何地景（同一份 lowpolyLand），盖在纯色底之上、标题之下。
 if(menu&&!menu.children.some(c=>c.name===lowpolySceneHost)){
  const at=menu.children.findIndex(c=>c.name==='lowpolyVeil');
  // Low-poly triangles can project a few units past the menu veil. Trim only
  // the exterior: opaque background-colour strips hide those unshaded slivers
  // without changing the landscape, content scale, or shared full-screen bleed.
  const backdrop=menu.children.find(c=>c.name==='backdrop');
  const [w,h]=menu.size,bleed=400;
  const edges=[-1,1].map((side,i)=>({name:i?'sceneEdgeRight':'sceneEdgeLeft',kind:'image',
   position:[side*(w/2+bleed/2),0],size:[bleed,h],image:backdrop.image,colour:backdrop.colour}));
  menu.children.splice(at<0?1:at,0,host(),...edges);
 }
 if([select,battle].some(p=>p.children.some(c=>c.name===lowpolySceneHost)))throw Error('Scene hosts already attached');
 select.children.splice(select.children.findIndex(c=>c.name==='border'),0,host());
 battle.children.unshift(host());
}
export function attachOfficialPortraits(layout,{selectionAvatar=true,battlePortrait=true}={}) {
 if(!selectionAvatar&&!battlePortrait)return;
 const stage=layout.controls.find(c=>c.name==='stage');
 const child=(p,n)=>{const c=p?.children?.find(c=>c.name===n);if(!c)throw Error(`Missing portrait parent ${n}`);return c;};
 if(selectionAvatar){
  const selection=child(stage,'characterPanel'),traveler=child(selection,'traveler');
  if(traveler.children.some(c=>c.name==='officialAvatar'))throw Error('Portrait hosts already attached');
  const bust=child(child(child(traveler,'hit'),'normal'),'bust');
  traveler.children.push({name:'officialAvatar',kind:'container',position:[...bust.position],size:[96,96],scale:[bust.size[0]/96,bust.size[0]/96],visible:false,children:[]});
  const details=child(selection,'details'),frame=child(details,'portraitFrame');
  const position=[frame.position[0],frame.position[1]-(frame.size[1]-frame.size[0])/2];
  details.children.splice(details.children.findIndex(c=>c.name==='portraits')+1,0,
   {name:'officialSelectionFigure',kind:'container',position,size:[133,133],scale:[frame.size[0]/133,frame.size[0]/133],visible:false,children:[]});
 }
 if(battlePortrait){
  const hero=child(child(stage,'battlePanel'),'hero');
  if(hero.children.some(c=>c.name==='officialFigure'))throw Error('Portrait hosts already attached');
  const index=hero.children.findIndex(c=>c.name==='portrait');
  hero.children.splice(index+1,0,{name:'officialFigure',kind:'container',position:[0,0],size:[133,133],scale:[(400/3)/133,(400/3)/133],visible:false,children:[]});
 }
}
function validIndex(index,allowUnbound=false) {
 return Number.isSafeInteger(index)&&index>=(allowUnbound?0:1)&&index!==100001;
}
// Breakthrough low-poly select look (art/lowpoly-select). Emitted only for the flag that owns it:
// selectionAvatar -> lowpolyHero, cards -> lowpolyCardFan (premium frames + illustrations).
export const lowpolySelectPath='art/lowpoly-select/select-lowpoly.json';
export function portraitRuntimeInputs(flags={}) {
 return [...portraitSourceInputs(flags),...(flags.selectionAvatar||flags.cards||flags.menuBackground?[lowpolySelectPath]:[])];
}
function lowpolyInventory(source) {
 if(!/\blowpoly(?:Hero|CardFan|Land)=/.test(source))return [];
 const luaparse=createRequire(import.meta.url)('luaparse');
 const table=luaparse.parse(source).body.find(n=>n.type==='ReturnStatement')?.arguments[0];
 const rows=[];
 for(const field of table?.fields??[]) {
  const name=field.key?.name;
  if(!['lowpolyHero','lowpolyCardFan','lowpolyLand'].includes(name))continue;
  const fields=field.value.fields;
  const value=key=>fields.find(f=>f.key?.name===key||f.key?.raw===`"${key}"`)?.value;
  const count=value('count')?.value,images=value('rows')?.fields;
  if(!Number.isSafeInteger(count)||count<1||images?.length!==count||images.some(f=>f.type!=='TableValue'))throw Error('Invalid low-poly inventory count: '+name);
  rows.push({asset:name,images:count,groups:Math.ceil(count/60),pages:Math.ceil(count/3600),instances:name==='lowpolyLand'?(source.includes('v25SceneOwnerCount=1')?1:3):1,hosts:name==='lowpolyCardFan'?1:0});
 }
 return rows;
}
function combineInventory(inventory,lowpoly) {
 if(!lowpoly.length)return inventory;
 const assets=[...(inventory?.assets??[]).filter(a=>a.asset!=='traveler-geo/portraits/selection133'),...lowpoly];
 return {...inventory,renderProfile:'lowpoly-mixed-v1',assets,instances:assets.reduce((n,a)=>n+(a.instances??1),0),batchSize:64,
  ...(lowpoly.some(a=>a.asset==='lowpolyHero')?{selectionUses:'lowpolyHero'}:{}),
  peakDynamicControls:assets.reduce((n,a)=>n+(a.images+a.groups+a.pages)*(a.instances??1)+(a.hosts??0),0),
  maxDirectDynamicChildren:60,officialCapacity:'not_measured',measurement:'offline-runtime-control-contract-not-official-capacity',devicePerformance:'not_run'};
}
export function lowpolySelectLiterals(root=process.cwd(),{selectionAvatar=false,cards=false,menuBackground=false}={}) {
 if(!selectionAvatar&&!cards&&!menuBackground)return [];
 const bytes=readFileSync(join(root,lowpolySelectPath)),data=JSON.parse(bytes),sha=createHash('sha256').update(bytes).digest('hex');
 const asset=(name,a)=>`${name}=${toLua({rows:a.rows.map(r=>[r[0],r[1],r[2],r[3],r[4],.5,.5,.5,.5,.5,.5,1,1,r[7],r[8],r[9],r[10],r[11],r[5],r[6]]),
  width:a.width,height:a.height,count:a.rows.length,renderProfile:'lowpoly-v1',cache:true,jsonSha256:sha,sourceSha256:data.sourceSha256,
  root:[0,0,a.width,a.width,.5,.5,.5,.5,.5,.5,1,1,0]})}`;
 return [...(selectionAvatar?[asset('lowpolyHero',data.hero)]:[]),...(cards?[asset('lowpolyCardFan',data.cardFan)]:[]),
  ...(menuBackground?[asset('lowpolyLand',data.land)]:[])];
}
export function writePortraitModule(directory,{root=process.cwd(),imageTemplateIndex=0,containerTemplateIndex=0,selectionAvatar=true,battlePortrait=true,cards=false,menuBackground=false,v25BattleChrome=false,officialAssets=false}={}) {
 if(typeof v25BattleChrome!=='boolean'||v25BattleChrome&&selectionAvatar!==battlePortrait)throw Error('V25 portraits require paired selection and battle source assets');
 if(!validIndex(imageTemplateIndex,true)||!validIndex(containerTemplateIndex,true))throw Error('Invalid portrait templateIndex');
 if(isLightweightProfile(directory)){
  if(!selectionAvatar||!battlePortrait||!menuBackground||cards)throw Error('Bounded 2D requires fixed experiment art flags');
  const source=boundedPortraitSource(imageTemplateIndex,containerTemplateIndex);
  writeFileSync(join(directory,`${portraitModule}.lua`),source);return source;
 }
 const lowpoly=lowpolySelectLiterals(root,{selectionAvatar:selectionAvatar&&!v25BattleChrome&&!officialAssets,cards,menuBackground});
 if(v25BattleChrome&&menuBackground)lowpoly.push('v25SceneOwnerCount=1');
 if(!selectionAvatar&&!battlePortrait){const source=lowpoly.length?`-- Disabled portraits; low-poly select fan / scene backgrounds only.\nreturn {imagePrefabId=${imageTemplateIndex},containerPrefabId=${containerTemplateIndex},\n${lowpoly.join(',\n')}\n}\n`:'-- Disabled optional drawings.\nreturn {imagePrefabId=0,containerPrefabId=0}\n';writeFileSync(join(directory,`${portraitModule}.lua`),source);return source;}
 const compactPath=join(directory,'art-performance.json');
 const compact=existsSync(compactPath)?JSON.parse(readFileSync(compactPath,'utf8')):null;
 const runtimeV2=existsSync(join(directory,'art-render-v2.json'));
 const budget=selectionAvatar&&(runtimeV2||!battlePortrait)&&!compact?selectionBudget(root):null;
 const budgetLiteral=(a,asset)=>toLua({root:[0,0,a.width,a.width,.5,.5,.5,.5,.5,.5,1,1,0],rows:asset.rows,width:a.width,count:asset.count,
  display:a.display,sourceSha256:a.runtime,jsonSha256:a.json,renderProfile:'selection-budget-v1',runtimeV2:true,cache:true,rectanglesOnly:true});
 const data=portraitSources(root,{selectionAvatar,battlePortrait}).map(a=>{
  if(budget&&a.kind==='avatar96')return `${a.kind}=${budgetLiteral(a,budget.assets.avatar96)}`;
  if(compact){const asset=compact.assets[a.kind];return `${a.kind}=${toLua({root:[0,0,a.width,a.width,.5,.5,.5,.5,.5,.5,1,1,0],rows:asset.rows,width:a.width,count:asset.count,display:a.display,sourceSha256:a.runtime,jsonSha256:a.json,renderProfile:'compact-v1',sourcePreviewSha256:asset.sha256})}`;}
  return `${a.kind}=(function()\n${a.literals}\nreturn {root=ROOT,rows=ELEMENTS,width=${a.width},count=${a.count},display=${a.display},sourceSha256='${a.runtime}',jsonSha256='${a.json}'${runtimeV2?',runtimeV2=true,cache=true,rectanglesOnly=true':''}}\nend)()`;
 });
 if(budget&&!v25BattleChrome)data.push(`selection133=${budgetLiteral(assets[1],budget.assets.selection133)}`);
 data.push(...lowpoly);
 // Selection and combat reference this one source object. The slot crops at
 // presentation time; never export another portrait or duplicate its rows.
 if(officialAssets&&(selectionAvatar||battlePortrait)){
  data.push("portraitProfile='official-shared-idle-v2'");
  data.push(`battleApprovedIdle=${toLua(approvedBattleIdle(root))}`);
 }
 if(officialAssets&&selectionAvatar){
  data.push("selectionUses='battleApprovedIdle'");
  const theme=JSON.parse(readFileSync(join(root,'data/presentation/ui_theme.json'),'utf8'));
  data.push(`selectionProfile=${toLua(stsCharacterPortraitProfile(theme))}`);
 }
 if(v25BattleChrome){
  const theme=v25Theme(JSON.parse(readFileSync(join(root,'data/presentation/ui_theme.json'),'utf8')));
  data.push(`v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(theme))}`);
 }
 const source=`--[=[
${license(root)}]=]
-- Frozen portrait literal bytes; no original synchronous OnStart/exporter included.\n-- Native property sequence is derived from Primitive's MIT runtime (2026 LiuL).\nreturn {imagePrefabId=${imageTemplateIndex},containerPrefabId=${containerTemplateIndex},\n${data.join(',\n')}\n}\n`;
 writeFileSync(join(directory,`${portraitModule}.lua`),source,'utf8');return source;
}
export function bindPortraitTemplates(directory,result,options={}) {
 const imageTemplateIndex=result?.image?.templateIndex,containerTemplateIndex=result?.container?.templateIndex;
 if(!validIndex(imageTemplateIndex)||!validIndex(containerTemplateIndex))throw Error('MCP did not return valid portrait image/container templateIndex');
 return writePortraitModule(directory,{...options,imageTemplateIndex,containerTemplateIndex});
}
function inventoryRows(selectionAvatar,battlePortrait,budget,v25) {
 const rows=[];
 if(selectionAvatar)rows.push({asset:'traveler-geo/portraits/avatar96',images:budget?457:4822,sourceSha256:assets[0].runtime});
 if(selectionAvatar&&v25)rows.push({asset:'traveler-geo/portraits/battle133-selection',images:4315,sourceSha256:assets[1].runtime});
 else if(selectionAvatar&&budget)rows.push({asset:'traveler-geo/portraits/selection133',images:1940,sourceSha256:assets[1].runtime});
 if(battlePortrait)rows.push({asset:'traveler-geo/portraits/battle133',images:4315,sourceSha256:assets[1].runtime});
 if(battlePortrait&&v25)rows.push({asset:'traveler-geo/portraits/battle133-result',images:4315,sourceSha256:assets[1].runtime});
 return rows.map(row=>({...row,groups:Math.ceil(row.images/60),pages:Math.ceil(row.images/3600)}));
}
export function portraitInventory({selectionAvatar=true,battlePortrait=true,cards=false,menuBackground=false}={}, {budget=true,lowpoly=true,v25=false,officialAssets=false}={}) {
 const rows=inventoryRows(selectionAvatar,battlePortrait,budget,v25).filter(row=>!officialAssets||row.asset!=='traveler-geo/portraits/avatar96');
 if(officialAssets&&battlePortrait){
  const row=rows.find(a=>a.asset==='traveler-geo/portraits/battle133');
  Object.assign(row,approvedIdleInventory());
 }
 if(officialAssets&&selectionAvatar){
  const selected=rows.find(a=>a.asset==='traveler-geo/portraits/selection133'||a.asset==='traveler-geo/portraits/battle133-selection');
  const row={...approvedIdleInventory(),asset:'traveler-geo/idle-approved-v1-selection-crop',imagesAreSourceUpperBound:true};
  if(selected)Object.assign(selected,row);else rows.push(row);
 }
 const legacy=rows.length?{...(budget?{renderProfile:'selection-budget-v1',hiddenBuild:true,cache:true,revealGroupsPerFrame:4}:{}),
  ...(selectionAvatar&&(budget||officialAssets)?{selectionUses:officialAssets?'battleApprovedIdle':v25?'battle133':'selection133'}:{}),assets:rows,instances:rows.length,batchSize:64,
  peakDynamicControls:rows.reduce((sum,a)=>sum+a.images+a.groups+a.pages,0),maxDirectDynamicChildren:60,officialCapacity:'not_measured',
  measurement:'offline-runtime-control-contract-not-official-capacity',devicePerformance:'not_run'}:undefined;
 const landscape=lowpolySelectLiterals(process.cwd(),{selectionAvatar:selectionAvatar&&!v25&&!officialAssets,cards,menuBackground});
 if(v25&&menuBackground)landscape.push('v25SceneOwnerCount=1');
 return combineInventory(legacy,lowpoly?lowpolyInventory('return {'+landscape.join(',')+'}'):[]);
}
export function portraitRuntimeInventory(directory) {
 if(isLightweightProfile(directory))return lightweightInventory();
 if(!existsSync(join(directory,`${portraitModule}.lua`)))return undefined;
 const source=readFileSync(join(directory,`${portraitModule}.lua`),'utf8');
 const flags={selectionAvatar:/\bavatar96=/.test(source),battlePortrait:/\bbattle133=/.test(source)};
 const officialAssets=source.includes("portraitProfile='official-shared-idle-v2'")||source.includes('battleApprovedIdle=');
 if(officialAssets&&(flags.battlePortrait||flags.selectionAvatar)){
  const expected=`battleApprovedIdle=${toLua(approvedBattleIdle())}`;
  if(source.split(expected).length!==2)throw Error('Official battle idle differs from the pinned producer');
 }
 const selectionMarkers=source.split(/\r?\n/).filter(line=>line.startsWith('selectionUses='));
 if(flags.selectionAvatar&&(officialAssets||selectionMarkers.length)){
  if(!officialAssets||selectionMarkers.length!==1||!/^selectionUses='battleApprovedIdle',?$/.test(selectionMarkers[0]))
   throw Error('Unsupported official selection schema; read historical candidates with their pinned producer');
  const profile=stsCharacterPortraitProfile(JSON.parse(readFileSync('data/presentation/ui_theme.json','utf8')));
  const expected=`selectionProfile=${toLua(profile)}`;
  if(source.split(expected).length!==2||source.split(/\r?\n/).filter(line=>line.startsWith('selectionProfile=')).length!==1)
   throw Error('Unsupported official selection crop schema; read historical candidates with their pinned producer');
 }
 if(existsSync(join(directory,'art-performance.json'))){
  const pack=JSON.parse(readFileSync(join(directory,'art-performance.json'),'utf8'));
  const rows=selectedAssets(flags).map(a=>{const row=pack.assets[a.kind];return {asset:`traveler-geo/portraits/${a.kind}`,images:row.count,
   groups:Math.ceil(row.count/60),pages:Math.ceil(row.count/3600),sourcePreviewSha256:row.sha256,grid:row.grid};});
  return combineInventory(rows.length?{renderProfile:'compact-v1',assets:rows,instances:rows.length,batchSize:64,peakDynamicControls:rows.reduce((n,a)=>n+a.images+a.groups+a.pages,0),maxDirectDynamicChildren:60,officialCapacity:'not_measured',devicePerformance:'not_run'}:undefined,lowpolyInventory(source));
 }
 return combineInventory(portraitInventory(flags,{budget:existsSync(join(directory,'art-render-v2.json'))||source.includes('selection133='),lowpoly:false,v25:source.includes('v25PortraitProfile=')||source.includes('v25SceneOwnerCount='),officialAssets}),lowpolyInventory(source));
}
