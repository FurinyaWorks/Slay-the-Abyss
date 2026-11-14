import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {approvedNeowGuide,neowGuidePaths,neowGuideContours} from '../scripts/sts-neow-guide-layout.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme,applyOfficialAssets} from '../scripts/official-assets-layout.mjs';
const child=(n,name)=>(n?.children??n?.controls??[]).find(c=>c.name===name);
const inside=(point,polygon)=>{let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
}return yes;};
test('guide paths remain tied to approved SVG, with one meet scale and bounded native groups',()=>{
 const source=readFileSync('docs/design/reference-ui-lab/blessing.js','utf8');
 for(const path of Object.values(neowGuidePaths))assert(source.includes('d="'+path+'"'),'approved SVG path changed');
 const theme=officialAssetsTheme(nativeTheme);
 const guide=approvedNeowGuide(theme);
 assert.deepEqual(guide.scale,[567/600,567/600]);assert.deepEqual(guide.position,[382.5,15]);
 function bounded(n){assert((n.children?.length??0)<=60,'native child ceiling');for(const c of n.children??[])bounded(c);}bounded(guide);
 const names=guide.children.map(n=>n.name);
 assert(names.indexOf('cloak')<names.indexOf('hoodVoid'));
 assert(names.indexOf('hoodVoid')<names.indexOf('bodyFold'));
 assert(names.indexOf('bodyFold')<names.indexOf('clasp'));
 assert.equal(guide.children.some(n=>n.name==='hoodRim'),false,'ellipse cannot replace the approved pointed hood');
});
test('hood opening has its approved upper/side dark area after body occlusion, and catches the old body overlay',()=>{
 const p=neowGuideContours;
 for(const point of [[307,100],[260,160],[350,180],[310,230]]){
  assert(inside(point,p.void),'sample outside approved dark opening');
  assert(!inside(point,p.fold),'body occludes hood opening');
 }
 assert(!inside([307,35],p.void),'hood opening cannot become a full ellipse');
 // Old guessed torso began at screenshot y210, masking the original hood at
 // SVG (307,230) => screenshot (1029.115,278.85). This must fail the mask.
 const oldBody=[[965,210],[1100,210],[1165,330],[1235,590],[1055,620],[900,582],[955,350]];
 assert(inside([739+307*.945,61.5+230*.945],oldBody),'negative fixture no longer reproduces escaped occlusion');
});
test('Neow scene fills precisely the shared HUD body area, detecting the old exposed gold strip',()=>{
 for(const change of [{},{y:332.5,height:55}]){
  const theme=officialAssetsTheme(nativeTheme);Object.assign(theme.officialAssets.battleHud,change);
  const layout=gameLayout(theme);applyOfficialAssets([layout],theme);
  const stage=child(layout,'stage')??layout,figure=child(child(child(stage,'nodePanel'),'eventView'),'neowFigure');
  const scene=child(figure,'scene'),[x,y]=scene.position,[w,h]=scene.size,hud=theme.officialAssets.battleHud;
  const hudBottom=360-(hud.y-hud.height/2);
  assert.deepEqual([x,w],[0,1280]);assert.equal(360-y-h/2,hudBottom);assert.equal(360-y+h/2,720);
  assert.notEqual(80,hudBottom,'old scene640 must fail the HUD seam contract');
  assert.notEqual(44,hudBottom,'independent topBar44 also leaves a one-pixel gold gap');
  assert.equal(child(figure,'hoodRim'),undefined);assert(child(figure,'approvedGuide'));
 }
});
