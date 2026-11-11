import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{battlePileChrome,battlePileReturn}from'../scripts/official-battle-pile-chrome.mjs';
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
