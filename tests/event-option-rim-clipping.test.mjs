import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {styleEvent} from '../scripts/v25-node-layout.mjs';

const children=n=>n.children??n.controls??[];
const find=(n,name)=>n.name===name?n:children(n).map(c=>find(c,name)).find(Boolean);
const child=(n,name)=>children(n).find(c=>c.name===name);

test('shared event corner masks clip the complete option chrome before live copy and input',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=nodeLayout(theme),event=find(layout,'eventView');
 const hits=Array.from({length:4},(_,i)=>child(child(event,'option'+(i+1)),'hit'));
 styleEvent(event,theme);
 for(let i=1;i<=4;i++){
  const row=child(event,'option'+i),parts=children(row),chrome=child(row,'v25StateChrome');
  const masks=parts.filter(n=>/^v25Corner[01]_[01]$/.test(n.name));
  assert.equal(masks.length,4,'all ordinary event options retain the same four corner masks');
  assert.deepEqual(row.size,[700,44]);
  assert.equal(child(row,'hit'),hits[i-1],'corner repair cannot replace the input owner');
  assert.deepEqual(child(row,'hit').size,row.size,'corner repair cannot shrink native input');
  assert.deepEqual(child(chrome,'topStitch').size,[692,2],'the shared rim geometry is retained');
  assert.deepEqual(child(chrome,'topStitch').position,[0,20]);
  assert.equal(child(chrome,'lowerRim').opacity,0);
  const chromeIndex=parts.indexOf(chrome);
  for(const mask of masks){
   assert(parts.indexOf(mask)>chromeIndex,'top rim must be behind the corner mask, not redrawn over its cut');
   for(const name of ['title','description','hit'])assert(parts.indexOf(mask)<parts.indexOf(child(row,name)),'clip only decoration, preserving live text/input order');
   assert.equal(mask.image,100003);
   assert.deepEqual(mask.size,[42,22]);
   assert.deepEqual(mask.fill,{shape:'horizontal',from:'right',amount:.5});
  }
 }
});
