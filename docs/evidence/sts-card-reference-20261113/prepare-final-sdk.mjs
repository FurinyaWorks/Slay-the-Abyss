// Frozen production component probe. No production source or flags are changed.
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildUI} from '../../../scripts/build-ui.mjs';
import {gameLayout} from '../../../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../../../scripts/native-ui-theme.mjs';
import {officialAssetsTheme,applyOfficialAssets} from '../../../scripts/official-assets-layout.mjs';
import {attachReadyCardHosts,readyArtTemplates,prepareReadyCardAssets} from '../../../scripts/art/ready-card-runtime.mjs';
import {toLua} from '../../../scripts/build-lua-data.mjs';
const out=path.resolve(process.argv[2]);assert(!fs.existsSync(out),'new output directory required');fs.mkdirSync(out,{recursive:true});
const luaParse=createRequire(import.meta.url)('luaparse').parse;
const hash=b=>createHash('sha256').update(b).digest('hex'),all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];
const generated=path.join(out,'generated');buildUI(generated,undefined,{officialAssets:true});
const layout=JSON.parse(fs.readFileSync(path.join(generated,'game-ui.json'))),theme=officialAssetsTheme(nativeTheme);
const officialFace=structuredClone(all(layout).find(n=>n.name==='card1'));assert(officialFace);
officialFace.children=officialFace.children.filter(n=>n.name!=='hit');
Object.assign(officialFace,{name:'card',position:[0,0],scale:[1,1],rotation:0,visible:true});
const compatible=gameLayout();attachReadyCardHosts(compatible);applyOfficialAssets([compatible],theme);
const compatibleFace=structuredClone(all(compatible).find(n=>n.name==='card1'));
compatibleFace.children=compatibleFace.children.filter(n=>n.name!=='hit');
Object.assign(compatibleFace,{name:'card',position:[0,0],scale:[2.5,2.5],rotation:0,visible:true});
const data=JSON.parse(fs.readFileSync('data/cards.json')).cards,presentation=JSON.parse(fs.readFileSync('data/presentation/traveler.zh-CN.json')).cards;
const definitions=Object.fromEntries(data.map(d=>[d.id,d]));
const longest=data.filter(d=>typeof d.text==='string').toSorted((a,b)=>b.text.length-a.text.length)[0];
const states=['bash','armaments','inflame','bash','offering','burn','regret','bash',longest.id].map((id,i)=>{
 const d=structuredClone(definitions[id]);assert(d,id);return {definition:d,title:presentation[id]?.name??d.name,text:i===8?(d.upgradeText??d.text):d.text,upgraded:i===8};
});
const assets=prepareReadyCardAssets({compact:false}),selectedAssets=Object.fromEntries([...new Set(states.map(s=>s.definition.id))].filter(id=>assets[id]).map(id=>[id,assets[id]]));
const snapshotPath='F:/New folder/.worktrees/shared-run-hud/.artifacts/shared-run-hud-20261113/visual-history/visual-current-3/map-permanent-deck.state.json.gz';
const prior=JSON.parse(gunzipSync(fs.readFileSync(snapshotPath)));let oldAttack;
function findPrior(n,p=''){if(p.includes('/deckPanel/pileGrid/')&&n.name==='face'&&n.children.some(c=>c.name==='type'&&c.text==='攻击'))oldAttack??=n;for(const c of n.children??[])findPrior(c,p+'/'+n.name);}prior.tree.forEach(n=>findPrior(n));assert(oldAttack);
const baselineText=Object.fromEntries(oldAttack.children.filter(n=>n.kind==='textbox').map(n=>[n.name,n.text]));
const modules={abyss_theme:fs.readFileSync(path.join(generated,'abyss_theme.lua'),'utf8')};
for(const name of ['abyss_numbers','abyss_card_art_runtime','abyss_card_skin','abyss_card_display'])modules[name]=fs.readFileSync('src/lua/'+name+'.lua','utf8');
// The actual SDK supplies require through its script registry; package.preload
// is deliberately unavailable in this native script environment.
const bootstrap='';
const templateIds={AbyssReadyCardImage:1800000100,AbyssReadyCardGroup:1800000101};
const paint=`
local Skin,Display,Runtime=require('abyss_card_skin'),require('abyss_card_display'),require('abyss_card_art_runtime')
local api={color=Color,imageSource=Enum.ImageSource.StaticReference,imageTypes=Enum.ImageType and{basic=Enum.ImageType.Basic,stretch=Enum.ImageType.Stretch}}
local function write(box,entry)
 local d=entry.definition
 Display.writeTitle(box:GetChild('name'),entry.title,entry.upgraded,nil,box:GetChild('type'),({attack='攻击',skill='技能',power='能力',status='状态',curse='诅咒'})[d.type])
 local fits=Display.writeBody(box:GetChild('label'),entry.text,box)
 box:GetChild('cost').text=d.cost==-2 and''or tostring(d.cost)
 Display.writeArt(box:GetChild('art'),d,function(c,id)c:SetImage(Enum.ImageSource.StaticReference,id)end,box)
 Skin.apply(box,d,api,{cost=d.cost,baseCost=d.cost})
 return fits
end
`;
const seed=JSON.parse(fs.readFileSync('experiments/art-tech-lab/seed.save.json'));
let adapter=gunzipSync(fs.readFileSync('docs/evidence/battle-piles-final-20261111/readback-adapter.mjs.gz')).toString();
adapter=adapter.slice(adapter.indexOf('const seed='),adapter.indexOf('const save=structuredClone(seed)'));adapter=adapter.slice(adapter.indexOf('function collect'));
adapter=adapter.replace(/const templateIds=.*?warnings=\[\]/,'const warnings=[]');
const adapterPath=path.join(out,'adapter.mjs');fs.writeFileSync(adapterPath,`export function project(seed,scriptMetadata,templateIds={}){const prototypes=new Map();${adapter}\nreturn{node,warnings,unknown,get count(){return converted}}}`);
const {project}=await import(pathToFileURL(adapterPath));
const backdrop={name:'backdrop',kind:'image',position:[0,0],size:[1280,720],image:100001,colour:'#1C2225'};
const receipts=[];
function saveFixture(name,cards,lua,templates=[]){
 luaParse(lua,{luaVersion:'5.3'});
 const directory=path.join(out,name);fs.mkdirSync(directory);
 const p=project(seed,new Map([['sts_final_probe',{guid:1800000001}]]),templateIds);
 const spec={name:'StsFinalProbe',kind:'container',size:[1280,720],script:'sts_final_probe',children:[backdrop,...cards]};
 const save=structuredClone(seed),holder=structuredClone(seed.assets.server.root);holder.children=[p.node(spec,{},'')];holder.scriptMappingIds=[];
 save.assets.server={...seed.assets.server,root:holder,canvasId:'pc-16-9'};
 save.assets.client.root.children=templates.map(t=>p.node(t,{},'',true));save.assets.client.root.scriptMappingIds=[];
 save.assets.scripts=[{id:'sts_final_probe',guid:1800000001,path:'sts_final_probe.lua',source:lua,controlAsset:'server-control-template',controlId:holder.children[0].id},
  ...Object.entries(modules).map(([name,source],i)=>({id:name,guid:1800000200+i,path:name+'.lua',source,controlAsset:null,controlId:null}))];
 save.meta={name:'Frozen StS shared card '+name};save.serverLogic={version:1,rules:[]};save.controlGuidChanges=[];save.scriptSync=null;
 const bytes=JSON.stringify(save);fs.writeFileSync(path.join(directory,'probe.save.json'),bytes);
 assert.deepEqual(Object.fromEntries(p.unknown),{});
 receipts.push({name,save:path.relative(process.cwd(),path.join(directory,'probe.save.json')).replaceAll('\\','/'),sha256:hash(bytes),projectedControls:p.count,unknownProperties:{},scope:name==='compatibility'?'controlled readyArt compatibility injection, official flags remain cards=false':'production official-assets shared face; cards flag false; read-only fixture; full game/device unverified'});
}
for(const count of [1,5,10]){
 const cards=Array.from({length:count},(_,i)=>({...structuredClone(officialFace),name:'card'+i,position:[count===1?0:(i%5-2)*200,count===10?(i<5?125:-125):0]}));
 const entry={definition:definitions.bash,title:baselineText.name,text:baselineText.label,upgraded:false};
 saveFixture('official-'+count,cards,bootstrap+paint+`\nfunction OnStart()\nfor i=0,${count-1} do write(script.object:GetChild('card'..i),${toLua(entry)})end\nprint('STS_FINAL_OFFICIAL_READY count=${count} cards=false')\nend\n`);
}
const compatibleLua=bootstrap+paint+`
local states,assets=${toLua(states)},${toLua(selectedAssets)}
local tick,phase,box=0,1,nil
local function paintPhase()
 local e=states[phase];if not e then return end
 local fits=write(box,e)
 local ready=Display.writeNativeArt(box,e.definition,assets[e.definition.id],api,box:GetChild('art'),'controlled-final')
 print('STS_FINAL_PHASE '..phase..' '..e.definition.id..' type='..e.definition.type..' rarity='..e.definition.rarity..' fits='..tostring(fits)..' pending='..tostring(not ready))
end
function OnStart()
 script:EnableUpdate(true)
 box=script.object:GetChild('card');Runtime.configure({instantiate=game.InstantiateClientUIControl,destroy=game.DestroyClientUIControl,imageTemplateIndex=${templateIds.AbyssReadyCardImage},containerTemplateIndex=${templateIds.AbyssReadyCardGroup}})
 Runtime.setPresentationPage('controlled-final');paintPhase();print('STS_FINAL_COMPATIBILITY_READY')
end
function OnUpdate(dt)
 Runtime.update();tick=tick+1
 if tick%30==0 then local s=Runtime.status();print('STS_FINAL_TICK '..tick..' live='..s.liveControls..' created='..s.createdLastUpdate..' failed='..s.failedPools..' waiting='..s.waitingPools)end
 if tick%120==0 and phase<#states then phase=phase+1;paintPhase()end
end
`;
saveFixture('compatibility',[compatibleFace],compatibleLua,readyArtTemplates());
const inputs=['scripts/sts-card-reference-profile.mjs','scripts/official-assets-layout.mjs','scripts/v25-battle-scene.mjs','scripts/art/ready-card-runtime.mjs','src/lua/abyss_card_skin.lua','src/lua/abyss_card_display.lua','src/lua/abyss_card_art_runtime.lua','data/presentation/ui_theme.json'];
const report={productionSha:'a73043a738cd5c6d11b3f6a66ef7383cbd463c01',inputs:Object.fromEntries(inputs.map(f=>[f,hash(fs.readFileSync(f))])),officialFlags:{cards:false},compatibilityArtProfile:'original precise+converted, compact:false; controlled injection only',compatibilityStates:states.map(s=>({id:s.definition.id,type:s.definition.type,rarity:s.definition.rarity,upgraded:s.upgraded,fullText:s.text,assetShapes:selectedAssets[s.definition.id]?.rectangleCount??selectedAssets[s.definition.id]?.slots?.length??0})),fixtures:receipts};
fs.writeFileSync(path.join(out,'preparation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,fixtures:receipts.map(x=>({name:x.name,controls:x.projectedControls,sha256:x.sha256})),states:report.compatibilityStates.map(x=>({id:x.id,shapes:x.assetShapes}))}));
