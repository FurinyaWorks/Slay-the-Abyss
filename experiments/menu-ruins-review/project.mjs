import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {menuRuinsScene,sceneInventory} from '../../scripts/menu-ruins-scene.mjs';
import {v25MenuRuntimeLayout} from '../../scripts/v25-menu-layout.mjs';
const [base,out]=process.argv.slice(2);if(!base||!out)throw Error('project.mjs <existing actual Simulator save> <output directory>');
fs.mkdirSync(out,{recursive:true});
const bytes=fs.readFileSync(base),save=JSON.parse(bytes),seed=JSON.parse(fs.readFileSync('experiments/art-tech-lab/seed.save.json'));
const prototypes=new Map();function visit(n,fn){fn(n);for(const c of n.children??[])visit(c,fn)}
visit(seed.assets.server.root,n=>prototypes.set(n.kind,n));
let seq=1850000000;const names=new Map();visit(save.assets.server.root,n=>names.set(n.name,n));
function convert(spec){
 const kind=spec.kind==='text'?'textbox':spec.kind,n=structuredClone(prototypes.get(kind));
 if(!n)throw Error('prototype '+kind);n.id='ruin'+(++seq);n.guid=seq;n.name=spec.name;n.scriptMappingIds=[];n.children=[];
 n.active=spec.active!==false;n.visible=spec.visible!==false;n.canControllerFocus=false;
 for(const t of Object.values(n.transformByPlatform))Object.assign(t,{offset:{x:spec.position?.[0]??0,y:spec.position?.[1]??0},size:{x:spec.size?.[0]??1280,y:spec.size?.[1]??720},rotation:{x:0,y:0,z:spec.rotation??0},scale:{x:spec.scale?.[0]??1,y:spec.scale?.[1]??1,z:1},pivot:{x:spec.pivot?.[0]??.5,y:spec.pivot?.[1]??.5},anchorMin:{x:.5,y:.5},anchorMax:{x:.5,y:.5}});
 if(kind==='container')Object.assign(n,{showCursor:false,disableKeyEventPassthrough:false,disableCursorEventPassthrough:false,isolateNavigation:false});
 if(kind==='image')Object.assign(n,{imageSource:'StaticReference',imageId:spec.image,imageType:spec.image>100006?'Basic':null,imageColor:((Math.round((spec.opacity??1)*255)<<24)|parseInt(spec.colour.slice(1),16))>>>0,enableMask:!!spec.fill,enableFill:!!spec.fill,enableSoftEdge:false,reverseMaskArea:false,fillType:spec.fill?.shape==='vertical'?'Vertical':'Horizontal',fillAmount:spec.fill?.amount??1,fillHorizontalType:spec.fill?.from==='right'?'Right':'Left',fillVerticalType:spec.fill?.from==='top'?'Top':'Bottom'});
 if(spec.feather)Object.assign(n,{enableMask:true,enableSoftEdge:true,softEdgeMode:'Pixel',softEdgeWidthX:spec.feather.pixels[0],softEdgeWidthY:spec.feather.pixels[1]});
 n.children=(spec.children??[]).map(convert).reverse();return n;
}
const menu=names.get('menuPanel');if(!menu)throw Error('missing real menu');
menu.children=menu.children.filter(n=>n.name!=='menuRuinsScene');
for(const name of ['vista','heroArt','lowpolyVeil','titleBand','taglineRuleL','taglineRuleR','emblem']){const n=menu.children.find(n=>n.name===name);if(n)n.visible=false}
const backdrop=menu.children.find(n=>n.name==='backdrop'),index=menu.children.indexOf(backdrop);menu.children.splice(index,0,convert(menuRuinsScene()));
const theme=save.assets.scripts.find(s=>s.path.endsWith('abyss_theme.lua'));
theme.source=theme.source.replace(/(v25Menu"\]=\{.*?\["title"\]=)\{[^}]+\}/,'$1{'+v25MenuRuntimeLayout.title.join(',')+'}');
const actual=JSON.stringify(save);fs.writeFileSync(path.join(out,'scene.save.json'),actual);
const hash=b=>createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(out,'projection.json'),JSON.stringify({basePath:path.resolve(base),baseSha256:hash(bytes),saveSha256:hash(actual),scene:sceneInventory(),scope:'existing actual full-game Simulator archive + only native menu background projection; no gameplay changes; not a new GIL readback'},null,2));
console.log(sceneInventory());
