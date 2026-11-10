// Add explicit fixture navigation to a copied Simulator save, never to GIL.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const [input,out]=process.argv.slice(2);
assert(input&&out,'Usage: event-web-preview.mjs <source-generated-save> <new-save>');
assert(!fs.existsSync(out),'Use a new output file');
const save=JSON.parse(fs.readFileSync(input)),all=n=>[n,...(n.children??[]).flatMap(all)];
const root=save.assets.server.root.children[0],stage=all(root).find(n=>n.name==='stage');
const original=all(stage).find(n=>n.name==='previewBack');assert(original);
let guid=90000000;
function identity(n){n.guid=++guid;n.id='event-fixture-'+guid;n.scriptMappingIds=[];for(const c of n.children??[])identity(c);}
function rect(n,x,y,w,h){for(const t of Object.values(n.transformByPlatform)){t.offset={x,y};t.size={x:w,y:h};t.scale={x:1,y:1,z:1};}}
const nav=structuredClone(stage);identity(nav);nav.name='eventFixtureNav';nav.children=[];nav.visible=true;nav.active=true;
rect(nav,0,-341,1050,32);
const labels=['测试·圣职者','测试·四选项','测试·图书馆','测试·商店','测试·营地','测试·宝箱','测试·翻牌'];
for(const [i,label]of labels.entries()){
 const button=structuredClone(original);identity(button);button.name='case'+(i+1);button.visible=true;button.active=true;rect(button,(i-3)*143,0,137,30);
 for(const n of button.children){rect(n,0,0,n.name==='label'?132:137,30);if(n.name==='label'){n.text=label;n.fontSize=12;n.minimumFontSize=12;}}
 nav.children.push(button);
}
stage.children.unshift(nav);
const script=save.assets.scripts.find(s=>s.path==='abyss_ui.lua');assert(script);
stage.children=stage.children.filter(n=>['eventFixtureNav','nodePanel','mapPanel'].includes(n.name));
script.source=fs.readFileSync(new URL('./event-room-preview.lua',import.meta.url),'utf8');
save.meta.name='事件V25交互预览（底部测试导航会重置夹具；非正式存档）';
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(save));
console.log(out);
