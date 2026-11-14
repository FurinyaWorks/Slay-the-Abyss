import test from 'node:test';
import assert from 'node:assert/strict';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {applyV25NodeLayout} from '../scripts/v25-node-layout.mjs';

const walk=n=>[n,...(n.controls??n.children??[]).flatMap(walk)];
test('V25 event geometry follows the approved compact story composition',()=>{
 const t=v25Theme(nativeTheme),o=t.layout.nativeNode.event.options,b=t.layout.nativeNode.event.body;
 assert.deepEqual(o.size,[700,44],'approved event uses compact inline choices, not 88px cards');
 assert.deepEqual(o.rows,[-88,-143,-198,-253]);
 assert(b[1]-b[3]/2>=o.rows[0]+o.size[1]/2+8,'narrative must clear the first option');
 for(let i=1;i<4;i++)assert(o.rows[i-1]-o.rows[i]>=o.size[1]+4,'separate pointer targets');
 assert(o.rows[3]-o.size[1]/2>=-318,'keep footer clear');
 const layout=nodeLayout(t);applyV25NodeLayout(layout,t);
 const event=walk(layout).find(n=>n.name==='eventView');
 const art=walk(event).find(n=>n.name==='art');
 assert.deepEqual(art.size,[330,330]);assert.equal(art.opacity,1);
 assert.equal(art.image,t.icon.eventArt.default);
 assert.equal(art.colour,t.layout.nativeNode.event.reference.figureInk);
 assert(!walk(event).some(n=>n.name==='emblemDisc'||n.name==='emblemInset'),'no invented event medallions');
 assert.deepEqual(t.layout.nativeNode.event.plate,[0,-55,1230,490]);
 assert.deepEqual(t.layout.nativeNode.event.name,[-280,203,620,60]);
 assert(walk(event).find(n=>n.name==='ribbon').children.length>3,'retain the irregular long paper silhouette');
});

test('V25 uses declared native event illustrations and semantic inline ink without changing the ordinary theme',()=>{
 const before=structuredClone(nativeTheme),t=v25Theme(nativeTheme),reference=t.layout.nativeNode.event.reference;
 assert.equal(reference.icon,111049);
 assert.equal(t.icon.eventArt.big_fish,111027);assert.equal(t.icon.eventArt.lab,111046);
 assert.equal(reference.costInk,'#D77C7E');assert.equal(reference.rewardInk,'#9DD740');
 assert.equal(reference.figureInk,'#FFFFFF','native illustrations must keep their original colour');
 assert.equal(reference.figureOpacity,1,'event artwork must not be a faded question watermark');
 assert.deepEqual(nativeTheme,before);
 assert.equal(nativeTheme.layout.nativeNode.event.reference,undefined);
});

test('room tokens stay outside the battle-only profile copied by parallel candidates',()=>{
 assert.equal(Object.hasOwn(nativeTheme.v25Battle.layout,'nativeNode'),false);
 const approved=v25Theme(nativeTheme),battle=structuredClone(nativeTheme);
 // Mirror the existing official-assets profile's layout selection contract.
 for(const key of Object.keys(nativeTheme.v25Battle.layout))battle.layout[key]=structuredClone(approved.layout[key]);
 assert.deepEqual(battle.layout.nativeNode,nativeTheme.layout.nativeNode);
 assert.equal(battle.layout.nativeNode.cardReference,undefined);
 assert.equal(approved.layout.nativeNode.cardReference.paperImage,107253);
 assert.equal(approved.layout.nativeNode.referenceButtons.ink,'#F4DE8E');
});
