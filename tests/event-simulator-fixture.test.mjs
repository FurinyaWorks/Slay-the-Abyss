import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('actual source-generated Simulator fixture preserves authored triangle fill direction',t=>{
 const parent=mkdtempSync(join(tmpdir(),'event-fixture-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));
 const output=join(parent,'preview');
 const child=spawnSync(process.execPath,['experiments/art-tech-lab/map-game.mjs',output],{encoding:'utf8'});
 assert.equal(child.status,0,child.stdout+child.stderr);
 const layout=JSON.parse(readFileSync(join(output,'generated/game-ui.json')));
 const save=JSON.parse(readFileSync(join(output,'game.save.json')));
 const images=new Map();
 function native(n,path=''){path+='/'+n.name;images.set(path,n);for(const c of n.children??[])native(c,path);}
 native(save.assets.server.root.children[0]);
 let checked=0;
 function authored(n,path=''){
  path+='/'+n.name;
  if(n.kind==='image'&&n.fill){
   const target=images.get(path);assert(target,path);
   assert.equal(target.fillHorizontalType,n.fill.from==='right'?'Right':'Left',path);
   assert.equal(target.fillAmount,n.fill.amount,path);checked++;
  }
  for(const c of n.children??n.controls??[])authored(c,path);
 }
 authored({name:'root',children:layout.controls});
 assert(checked>30,'must exercise real V25 room silhouettes');
});
