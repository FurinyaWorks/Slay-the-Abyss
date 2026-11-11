import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
const parts=n=>n?.controls??n?.children??[],child=(n,name)=>parts(n).find(c=>c.name===name);
const all=n=>[n,...parts(n).flatMap(all)];
test('blessing replaces decoration with bounded battle-native shapes and keeps all choices',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout(),event=child(child(layout,'nodePanel'),'eventView');
 const inputs=all(event).filter(n=>n.kind==='cursorArea'),body=child(event,'body');
 applyOfficialAssets([layout],theme);
 assertNativeUiCapacity(layout);
 assert.equal(child(event,'body'),body);
 assert.deepEqual(all(event).filter(n=>n.kind==='cursorArea'),inputs);
 const figure=child(event,'neowFigure');assert(all(figure).length<150);
 assert.equal(child(figure,'scene').image,theme.image.rect);
 assert.equal(child(event,'bubble').image,theme.image.discSoft);
 assert.deepEqual(child(figure,'scene').size,[1280,640]);
 for(const n of all(figure).filter(n=>n.kind==='image'&&!n.name.includes('Tri'))){
  assert(n.position[1]+n.size[1]/2<=280,n.name+' must stay below HUD');
 }
 assert(all(figure).filter(n=>n.name.includes('Tri')).length>10);
 const [x,y,w,h]=theme.layout.nativeNode.event.neow.bubbleText,bubble=child(event,'bubble');
 assert.equal(x,bubble.position[0]);assert.equal(y,bubble.position[1]);
 assert(w<bubble.size[0]&&h<bubble.size[1]);
 assert.equal(theme.layout.nativeNode.event.neow.options.rows,undefined);
});
