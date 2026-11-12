import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{battlePileChrome,battlePileReturn}from'../scripts/official-battle-pile-chrome.mjs';
import{gameLayout}from'../scripts/game-ui-layout.mjs';
import{nativeTheme}from'../scripts/native-ui-theme.mjs';
import{officialAssetsTheme,applyOfficialAssets}from'../scripts/official-assets-layout.mjs';
const child=(node,name)=>(node.controls??node.children??[]).find(item=>item.name===name);
const returnButton=tree=>child(child(tree,'deckPanel'),'pileReturn');
const label=face=>child(face,'label');
function luminance(hex){const values=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
function contrast(first,second){const a=luminance(first),b=luminance(second);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
test('V25 pile chrome fits the internal design canvas rather than Simulator device pixels',()=>{
 const theme=JSON.parse(readFileSync('data/presentation/ui_theme.json')),chrome=battlePileChrome(theme);
 assert.deepEqual(theme.canvas.base,[1280,720]);
 const shade=chrome.children.find(n=>n.name==='shade');
 assert.equal(shade.position[1]+shade.size[1]/2,316);
 assert.equal(shade.position[1]-shade.size[1]/2,-360);
 for(const n of chrome.children.filter(n=>!n.name.startsWith('vignette'))){const [x,y]=n.position,[w,h]=n.size;assert(x-w/2>=-640.1&&x+w/2<=640.1&&y-h/2>=-360.1&&y+h/2<=360.1,n.name);}
 const button=battlePileReturn({position:[0,0],children:[{children:[]}]},true);
 assert.deepEqual(button.position,[-550,-237]);assert(button.position[0]-180/2>=-640);assert(button.position[1]-54/2>=-360);
});
test('pile return keeps the existing button ink readable in all four native states',()=>{
 const button=returnButton(gameLayout()),faces=child(button,'hit').children;
 assert.deepEqual(faces.map(face=>face.name),['normal','hover','pressed','disabled']);
 assert.equal(button.visible,false);assert.deepEqual(button.position,[-550,-237]);assert.deepEqual(button.size,[180,54]);
 for(const face of faces){assert.equal(label(face).text.colour,nativeTheme.officialAssets.buttonInk,face.name);assert.ok(contrast(label(face).text.colour,child(face,'plate').colour)>=4.5,face.name);}
});
test('both pile return routes resolve the supplied theme ink without changing their receiver',()=>{
 const source=structuredClone(nativeTheme);source.officialAssets.buttonInk='#FDFDFD';
 const ordinary=returnButton(gameLayout(source));
 for(const face of child(ordinary,'hit').children)assert.equal(label(face).text.colour,source.officialAssets.buttonInk);
 const theme=officialAssetsTheme(source),tree=gameLayout(theme),before=structuredClone(returnButton(tree));
 applyOfficialAssets([tree],theme);
 const button=returnButton(tree),art=child(button,'art'),hit=child(button,'hit');
 assert.equal(label(art).text.colour,source.officialAssets.buttonInk);assert.equal(label(art).text.content,'返回');
 assert.ok(contrast(label(art).text.colour,child(art,'plate').colour)>=4.5);
 assert.deepEqual(button.position,before.position);assert.deepEqual(button.size,before.size);assert.equal(button.visible,before.visible);
 assert.equal(hit.kind,'cursorArea');assert.equal(hit.focusable,true);assert.deepEqual(hit.size,before.size);
});
