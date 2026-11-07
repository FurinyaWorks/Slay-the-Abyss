import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {nativeBattleConfig} from '../scripts/native-3d/config.mjs';
import {verifyNativeConfig} from '../scripts/native-3d/config-check.mjs';
import {productionModels} from '../scripts/native-3d/models.mjs';
import {battleCamera} from '../scripts/native-3d/camera.mjs';
import {toLua} from '../scripts/build-lua-data.mjs';

const runtime=()=>['abyss_native_battle','abyss_native_battle_geometry','abyss_native_projection'].map(name=>({name,source:readFileSync(`src/lua/${name}.lua`,'utf8')}));
test('serialized production model configuration boots real Lua adapters for all models and slots',()=>{
 const config=nativeBattleConfig('serialized-contract',{capabilities:{models:productionModels.map(({model,name})=>({model,name}))},camera:{projection:battleCamera}});
 const scripts=[...runtime(),{name:'abyss_native_battle_config',source:'return '+toLua(config)}];
 assert.equal(verifyNativeConfig(scripts,mkdtempSync(join(tmpdir(),'abyss-wire-config-'))).ok,true);
});
test('string model keys are rejected for both bodies and projections',()=>{
 for(const field of ['bodies','projections']){
  const config=nativeBattleConfig('string-key-regression',{capabilities:{models:productionModels.map(({model,name})=>({model,name}))},camera:{projection:battleCamera}});
  const stringKeys=array=>Object.fromEntries(array.map((value,index)=>[index+1,value]));
  if(field==='bodies')config.bodies=stringKeys(config.bodies);
  else config.projections.models=stringKeys(config.projections.models);
  const scripts=[...runtime(),{name:'abyss_native_battle_config',source:'return '+toLua(config)}];
  assert.throws(()=>verifyNativeConfig(scripts,mkdtempSync(join(tmpdir(),'abyss-string-config-'))),/numeric body entry missing|numeric projection model entry missing/);
 }
});
const rejected='.artifacts/native-budget-final/920a6acb-8fe0-488c-a644-576c11a33d10/scripts.json';
test('actual delivered string-key configuration is rejected before another GIL is delivered',{skip:!existsSync(rejected)},()=>{
 const {scripts}=JSON.parse(readFileSync(rejected,'utf8'));
 assert.throws(()=>verifyNativeConfig(scripts,mkdtempSync(join(tmpdir(),'abyss-rejected-config-'))),/numeric body entry missing/);
});
