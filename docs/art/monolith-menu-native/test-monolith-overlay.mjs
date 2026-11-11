import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMonolithMenuOverlay} from '../../../scripts/art/monolith-menu-overlay.mjs';
const build=()=>({controls:[{name:'canvasBackdrop',kind:'image',visible:true},{name:'stage',children:[{name:'menuPanel',children:[
 {name:'backdrop',kind:'image',image:107089,opacity:1,colour:'#fff'},
 {name:'vista',visible:true},{name:'title',text:{content:'杀戮原塔2'}},
 {name:'start',children:[{name:'hit',kind:'cursorArea'}]},
 {name:'result',visible:false},
]}]}]});
test('reveals world without mutating menu/input/result',()=>{
 const tree=build(),baseline=structuredClone(tree);
 applyMonolithMenuOverlay(tree,{image:{rect:100001}});
 const children=tree.controls[1].children[0].children;
 assert.equal(tree.controls[0].visible,false);
 assert.equal(children[0].opacity,.08);assert.equal(children[0].image,100001);
 assert.equal(children[1].visible,false);
 for(const index of [2,3,4])assert.deepEqual(children[index],baseline.controls[1].children[0].children[index]);
 assert.equal(JSON.stringify(tree).includes('monolith-applied'),false);
});
test('invalid veil or repeated adapter is rejected',()=>{
 const tree=build();
 assert.throws(()=>applyMonolithMenuOverlay(tree,{image:{rect:100001}},{opacity:2}),/veil/);
 applyMonolithMenuOverlay(tree,{image:{rect:100001}});
 assert.throws(()=>applyMonolithMenuOverlay(tree,{image:{rect:100001}}),/already/);
});
