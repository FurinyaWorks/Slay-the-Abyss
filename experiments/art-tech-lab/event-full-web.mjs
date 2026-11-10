// Full GameUI fixture navigation, appended inside the original Lua chunk.
// All production panels and shared HUD owners remain in the copied save.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [input,compact,out]=process.argv.slice(2);
assert(input&&compact&&out,'Usage: event-full-web.mjs <full.save.json> <compact.save.json> <new-full-web.save.json>');
assert(!fs.existsSync(out),'Use a new output file');
const source=fs.readFileSync(input),save=JSON.parse(source),fixture=JSON.parse(fs.readFileSync(compact));
const all=n=>[n,...(n.children??[]).flatMap(all)];
const root=save.assets.server.root.children[0],stage=all(root).find(n=>n.name==='stage');
const nav=all(fixture.assets.server.root).find(n=>n.name==='eventFixtureNav');assert(stage&&nav);
assert(!all(root).some(n=>n.name==='eventFixtureNav'));
const script=save.assets.scripts.find(s=>s.path==='abyss_ui.lua');assert(script);
const originalChildren=stage.children.map(n=>n.id),originalLua=script.source;
stage.children.unshift(structuredClone(nav));
script.source+='\n'+fs.readFileSync(new URL('./event-full-web.lua',import.meta.url),'utf8');
assert(originalChildren.every(id=>stage.children.some(n=>n.id===id)),'Do not remove original GameUI owners');
for(const name of ['potionEntry','potionPanel','deckEntry','exitEntry','battlePanel','nodePanel','mapPanel'])assert(stage.children.some(n=>n.name===name),name);
save.meta.name='完整GameUI事件自检（底部测试导航重置夹具，非正式存档）';
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(save));
const hash=b=>createHash('sha256').update(b).digest('hex');
fs.writeFileSync(out+'.fixture.json',JSON.stringify({scope:'Copied full GameUI source save; appended Lua fixture only, no GIL or production edits',source:input,sourceSha256:hash(source),output:out,outputSha256:hash(fs.readFileSync(out)),originalUiLuaSha256:hash(originalLua),panelsRetained:originalChildren.length,addedPanel:'eventFixtureNav'},null,2));
console.log(out);
