import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {approvedNeowGuide,neowGuidePaths} from '../scripts/sts-neow-guide-layout.mjs';
import {readFileSync} from 'node:fs';
const parts=n=>n?.controls??n?.children??[],child=(n,name)=>parts(n).find(c=>c.name===name);
const all=n=>[n,...parts(n).flatMap(all)];
test('blessing uses the approved SVG guide and seamless shared HUD while keeping all choices',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout(),event=child(child(layout,'nodePanel'),'eventView');
 const inputs=all(event).filter(n=>n.kind==='cursorArea'),body=child(event,'body');
 applyOfficialAssets([layout],theme);
 assertNativeUiCapacity(layout);
 assert.equal(child(event,'body'),body);
 assert.deepEqual(all(event).filter(n=>n.kind==='cursorArea'),inputs);
 const figure=child(event,'neowFigure'),guide=child(figure,'approvedGuide');
 assert(guide);assert.deepEqual(guide,approvedNeowGuide(theme));
 const approved=readFileSync('docs/design/reference-ui-lab/blessing.js','utf8');
 for(const path of Object.values(neowGuidePaths))assert(approved.includes('d="'+path+'"'),'unapproved guide contour');
 for(const node of all(figure))assert(parts(node).length<=60,node.name+' native child ceiling');
 assert.equal(child(figure,'scene').image,theme.image.rect);
 for(const stone of parts(child(figure,'masonry'))){
  assert(stone.position[0]-stone.size[0]/2>=-640&&stone.position[0]+stone.size[0]/2<=640,
   'wide canvases must not reveal masonry outside the design stage');
 }
 assert.equal(child(event,'bubble').image,theme.image.discSoft);
 const hud=theme.officialAssets.battleHud,[width,height]=theme.canvas.base;
 const hudBottom=hud.y-hud.height/2,scene=child(figure,'scene');
 assert.deepEqual(scene.size,[width,height/2+hudBottom]);
 assert.equal(scene.position[1]+scene.size[1]/2,hudBottom,'scene must meet HUD without the old gold gap');
 assert.equal(scene.position[1]-scene.size[1]/2,-height/2,'scene must cover the canvas bottom');
 // Nested SVG coordinates are local; use each actual parent transform rather
 // than incorrectly comparing source SVG y against canvas-space HUD y.
 function assertBelowHud(node,parentY=0,parentScale=1){
  const y=parentY+(node.position?.[1]??0)*parentScale,scale=parentScale*(node.scale?.[1]??1);
  if(node.kind==='image')assert(y+node.size[1]*scale/2<=hudBottom+.001,node.name+' must stay below HUD');
  for(const part of parts(node))assertBelowHud(part,y,scale);
 }
 assertBelowHud(figure);
 assert.equal(child(figure,'hoodRim'),undefined,'old ellipse cannot replace the approved hood');
 const [x,y,w,h]=theme.layout.nativeNode.event.neow.bubbleText,bubble=child(event,'bubble');
 assert.equal(x,bubble.position[0]);assert.equal(y,bubble.position[1]);
 assert(w<bubble.size[0]&&h<bubble.size[1]);
 const choices=theme.layout.nativeNode.event.neow.options;
 const maxChoices=theme.layout.nativeNode.event.options.rows.length;
 const highestChoice=choices.bottom+(maxChoices-1)*choices.spacing+choices.size[1]/2;
 assert(bubble.position[1]-bubble.size[1]/2>=highestChoice+12,
  'speech must leave a readable gap above the full four-choice stack');
 assert.equal(theme.layout.nativeNode.event.neow.options.rows,undefined);
});
