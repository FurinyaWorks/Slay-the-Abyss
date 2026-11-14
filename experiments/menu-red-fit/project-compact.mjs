import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash,randomUUID}from'node:crypto';
import{compactMenuScene}from'../../scripts/menu-compact-scene.mjs';
const [baseFile,packFile,outArg]=process.argv.slice(2);assert(baseFile&&packFile&&outArg);const out=path.resolve(outArg);assert(!fs.existsSync(out));
const hash=b=>createHash('sha256').update(b).digest('hex'),baseBytes=fs.readFileSync(baseFile),packBytes=fs.readFileSync(packFile),base=JSON.parse(baseBytes),save=structuredClone(base),pack=JSON.parse(packBytes);
assert.equal(pack.sourceSha256,hash(fs.readFileSync('experiments/menu-red-fit/input/source.png')),'Same user reference required');
const all=n=>[n,...(n.children??[]).flatMap(all)],nodes=all(save.assets.server.root),old=nodes.find(n=>n.name==='menuRedBackground');assert(old);
const imageSource=nodes.find(n=>n.kind==='image'&&n.imageId===100001),containerSource=nodes.find(n=>n.kind==='container');assert(imageSource&&containerSource);
const imagePrototype={...imageSource,children:[]},containerPrototype={...containerSource,children:[]};
let guid=Math.max(...[...nodes,...all(save.assets.client.root)].map(n=>Number(n.guid)||0));
function convert(s){
 const n=structuredClone(s.kind==='image'?imagePrototype:containerPrototype);n.id='menuFit'+(++guid);n.guid=guid;n.name=s.name;n.children=[];n.scriptMappingIds=[];n.giaRelatedGuids=[];n.active=true;n.visible=true;n.canControllerFocus=false;
 const xyz=Array.isArray(s.rotation)?s.rotation:[0,0,s.rotation??0];
 for(const t of Object.values(n.transformByPlatform))Object.assign(t,{offset:{x:s.position?.[0]??0,y:s.position?.[1]??0},size:{x:s.size[0],y:s.size[1]},rotation:{x:xyz[0],y:xyz[1],z:xyz[2]},scale:{x:s.scale?.[0]??1,y:s.scale?.[1]??1,z:1},pivot:{x:.5,y:.5},anchorMin:{x:.5,y:.5},anchorMax:{x:.5,y:.5}});
 if(s.kind==='image')Object.assign(n,{imageSource:'StaticReference',imageType:null,imageId:s.image,imageColor:(0xff000000|parseInt(s.colour.slice(1),16))>>>0,enableMask:false,enableFill:false,enableSoftEdge:false,reverseMaskArea:false});
 else Object.assign(n,{showCursor:false,isolateNavigation:false,disableKeyEventPassthrough:false,disableCursorEventPassthrough:false});
 n.children=(s.children??[]).map(convert).reverse();return n;
}
const replacement=convert(compactMenuScene(pack)),parent=nodes.find(n=>n.children?.includes(old));assert(parent);parent.children[parent.children.indexOf(old)]=replacement;
const withoutBackground=n=>n.name==='menuRedBackground'?{name:n.name}:Object.fromEntries(Object.entries(n).map(([k,v])=>[k,k==='children'?v.map(withoutBackground):v]));
assert.deepEqual(withoutBackground(base.assets.server.root),withoutBackground(save.assets.server.root),'Other UI must remain exact');
assert.deepEqual(base.assets.client,save.assets.client);assert.deepEqual(base.serverLogic,save.serverLogic);
const buildId=randomUUID(),entry=save.assets.scripts.find(s=>s.path==='abyss_ui.lua');assert(/^print\("ABYSS_BUILD [^"]+"\)/.test(entry.source));entry.source=entry.source.replace(/^print\("ABYSS_BUILD [^"]+"\)/,`print("ABYSS_BUILD ${buildId}")`);
const changed=save.assets.scripts.filter((s,i)=>s.source!==base.assets.scripts[i].source).map(s=>s.path);assert.deepEqual(changed,['abyss_ui.lua']);
const background=all(replacement),before=all(old),stats=ns=>({controls:ns.length,images:ns.filter(n=>n.kind==='image').length,containers:ns.filter(n=>n.kind==='container').length,bytes:Buffer.byteLength(JSON.stringify(ns[0]))});
assert(stats(background).controls<=1800,'User total background control budget');assert(background.every(n=>n.children.length<=60));
fs.mkdirSync(out,{recursive:true});const bytes=JSON.stringify(save);fs.writeFileSync(out+'/scene.save.json',bytes);
const report={buildId,base:{path:path.resolve(baseFile),sha256:hash(baseBytes)},fit:{path:path.resolve(packFile),sha256:hash(packBytes),sourceSha256:pack.sourceSha256,metrics:pack.metrics},saveSha256:hash(bytes),before:stats(before),after:stats(background),totalApplicationControls:all(save.assets.server.root).length,flatNativeImages:background.filter(n=>n.kind==='image'&&Object.values(n.transformByPlatform).some(t=>t.rotation.x||t.rotation.y)).length,unchangedLua:save.assets.scripts.length-1,changedLua:changed,scope:'Same-style Simulator source preview; native XYZ transforms; official rendering not yet verified'};
fs.writeFileSync(out+'/projection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
