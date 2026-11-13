import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';

const child=(node,name)=>(node?.children??node?.controls??[]).find(n=>n.name===name);
function layout(){
 const tree=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 applyOfficialAssets([tree],theme);return tree;
}
const material=node=>{
 const copy=structuredClone(node);delete copy.name;
 if(copy.text)delete copy.text.content;
 return copy;
};

test('every run page mounts the complete battle resource component, preserving writer handles',()=>{
 const tree=layout(),battle=child(tree,'battlePanel');
 for(const pageName of ['mapPanel','nodePanel']){
  const page=child(tree,pageName),resources=child(page,'resources')??page;
  for(const [name,source]of [['hpIcon','hpIcon'],['hp','player'],['goldIcon','goldIcon'],['gold','piles']]){
   assert.deepEqual(material(child(resources,name)),material(child(battle,source)),pageName+'/'+name);
  }
 }
});

test('blessing, map and reward potion slots mount the same final battle faces in all states',()=>{
 const tree=layout(),battle=child(tree,'battlePanel');
 const management=child(child(child(tree,'potionEntry'),'open'),'hit');
 for(const state of ['normal','hover','pressed','disabled']){
  const host=child(management,state);
  assert.deepEqual(host.scale,[1,1],'management state cannot scale slots a second time');
  for(let i=1;i<=5;i++){
   const button=child(battle,'potion'+i)??child(child(battle,'potionHelp'),'potion'+i);
   const reference=child(button,state),slot=child(host,'slot'+i);
   assert.deepEqual(slot.scale,reference.scale,state+'/'+i+' final scale');
   for(const name of ['emptyShell','filledShell','fireShell','selectedShell','bottle']){
    assert.deepEqual(child(slot,name),child(reference,name),state+'/'+i+'/'+name);
   }
  }
 }
});
