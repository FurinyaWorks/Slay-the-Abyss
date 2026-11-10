import test from 'node:test';
import assert from 'node:assert/strict';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {applyV25NodeLayout} from '../scripts/v25-node-layout.mjs';

const walk=n=>[n,...(n.controls??n.children??[]).flatMap(walk)];
test('four V25 event options have two description lines and stay clear of narrative and footer',()=>{
 const t=v25Theme(nativeTheme),o=t.layout.nativeNode.event.options,b=t.layout.nativeNode.event.body;
 assert(o.description[3]>=14*3,'two wrapped lines need room for native font leading');
 assert(o.title[1]-o.title[3]/2>=o.description[1]+o.description[3]/2,'title and effect must not overlap');
 assert(b[1]-b[3]/2>=o.rows[0]+o.size[1]/2+8,'narrative must clear the first option');
 for(let i=1;i<4;i++)assert(o.rows[i-1]-o.rows[i]>=o.size[1]+4,'separate pointer targets');
 assert(o.rows[3]-o.size[1]/2>=-318,'keep footer clear');
 const layout=nodeLayout(t);applyV25NodeLayout(layout,t);
 const event=walk(layout).find(n=>n.name==='eventView');
 const paper=walk(event).find(n=>n.name==='paper');
 assert(paper.position[0]+paper.size[0]/2+20<=b[0]-b[2]/2,'title ribbon must clear the narrative column');
 assert(walk(event).find(n=>n.name==='art').opacity>=.7,'event emblem must be legible');
});

test('V25 event identities use existing theme assets and leave the ordinary theme unchanged',()=>{
 const before=structuredClone(nativeTheme),t=v25Theme(nativeTheme),visuals=t.layout.nativeNode.event.visuals;
 assert(visuals,'V25 needs event-specific presentation');
 for(const id of ['cleric','scrap_ooze','we_meet_again','the_library','designer','match_game']){
  assert(visuals[id]?.icon,id);assert(/^#[\dA-F]{6}$/i.test(visuals[id].colour));
 }
 assert.notEqual(visuals.cleric.icon,visuals.the_library.icon);
 assert.deepEqual(nativeTheme,before);
 assert.equal(nativeTheme.layout.nativeNode.event.visuals,undefined);
});
