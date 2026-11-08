// Copies only immutable test helper dependencies; production owners remain explicit fixtures.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(new URL('./integration-source-closure.json',import.meta.url));
assert.equal(hash(bytes),'800fcc9efd889f482259d0e1e9f1501f0e9597ac05552622ede00dd3dcdb4a94','complete integration helper closure identity');
const files={...JSON.parse(bytes),...{
  "tests/helpers/silent-final-source-epoch.json.gz": "8d70652c025b8075e2a03936f12c2509dbca427abd555e472f197b1ac4850b49",
  "tests/helpers/silent-final-source-epoch.mjs": "62621989d65db4db12a6b7251fc8216bbd5851b196c87d28f0cffd222d8a28b4",
  "tests/helpers/relic-equip-source-epoch.json.gz": "c7f30e9773f4f08d3cf33e1ece1a1be425fa04389d0144bb285ff70643d06863",
  "tests/helpers/relic-equip-source-epoch.mjs": "ff648711e65a818f22a52d2d8b4d9dc1fab42bada42cc8372fbde06a76738a35",
  "tests/helpers/silent-tactics-source-epoch.json.gz": "046c798aed3ded45bf29ad696c777551102f74066a262174af3d9990bdabb1c7",
  "tests/helpers/silent-tactics-source-epoch.mjs": "1961b7399f1ec8ece9bfc598f9660f5fdc20c669cac3e967a2d4979296b597cf",
  "tests/helpers/watcher-flow-source-epoch.json.gz": "9e81602d086a81680830cf179a5d9f9f041bd56e0938b2d82eb196e50f73c015",
  "tests/helpers/watcher-flow-source-epoch.mjs": "dad47d3abfb21ce4922a2482142ac2f702644aaa4775558c4c5b06458196cccd",
  "tests/helpers/effects-target-group-source-epoch.mjs": "8affe1c65d7a096fc5546375bcb19bb404923be2c94528e3e443b4095ef7c488",
  "tests/helpers/effects-target-group-source-epoch.json.gz": "f22d0328aedd7b7e9c785482271483f9f083c5c6abd7cd55d19933b24a48c0c2",
  "tests/helpers/act1-choice-source-inverse.mjs": "b939c672c5aa354a510152ea08aaaf2f8dca168e2f31f7ededc2f8430993228e",
  "tests/helpers/actor-presence-source-inverse.mjs": "9f90f6908fe07fffa80dc254723f64e5e64162e4197ef0651c51d21483babb28",
  "tests/helpers/colorless-catalog-source-inverse.mjs": "173ba6f9a97a5f87ccd4e338975013637902f97c5f8c5e1cb60524455aa41316",
  "tests/helpers/combined-epoch/source-epoch-runtime.mjs": "911ada4af92457deed01e7b2132ce227d27f4ea87956516630178d364bcccbeb",
  "tests/helpers/combined-epoch/source-epoch.mjs": "ee1631bc3e9e29ac7ef4f96b9c42769d75cb3bfe11881b2e07b868344c3e51fa",
  "tests/helpers/core-lifecycle-source-inverse.mjs": "e7a0f431a72eb1d30332802ffc1a0f7d9d2bd82ae6255e58bad0b3fbc3d8e16f",
  "tests/helpers/defect-plan-source-inverse.mjs": "daf313bc97c097b02ab790f0384a383cfd42690cddf0ef982fa231ddc4404c24",
  "tests/helpers/end-turn-responsibilities-source-inverse.mjs": "b38d08a2214f2878e7390dcb574e50404f405dbf42e1dd76b51f3372404ac146",
  "tests/helpers/game-ui-extraction-source-inverse.mjs": "6a6f1ce53357b6c4be69cb15cbc9b81c0dafa37c3628ee069c8f1235f37be822",
  "tests/helpers/inventory-responsibilities-source-inverse.mjs": "ccf84aec265efa467ae80a16fbf313a26b2258d4d7df110b4055262c276de0f7",
  "tests/helpers/m7-core-final-source-inverse.mjs": "74c7758206b74dea8275d6a7cb473a8481f18203e9b39497fba6a5a264a7a132",
  "tests/helpers/potion-callback-source-inverse.mjs": "7164f8e40e7a9d014c1eac7759095442b4c4c187bbce62bdd0823100d9a67b4f",
  "tests/helpers/power-shop-source-inverse.mjs": "c6035aeea5b3f563160a582753b7357a9c4e0c2326c5302221788e6c0180678d",
  "tests/helpers/relic-query-source-inverse.mjs": "258f9e8fd6c0c4b06e79287317579db318857b044c1aa73b3d65de26658d75a5",
  "tests/helpers/reward-query-boundary-source-inverse.mjs": "3895df6c5d661a04f71d7086414bc738ec66d3f777299ac92da4329183eab373",
  "tests/helpers/round3-catalog-source-inverse.mjs": "0d59a0d79e1a2e2ac3f09c916d95dd13d0abf76bf228702d7c69427524cc703a",
  "tests/helpers/session-reward-source-inverse.mjs": "59ac2de03c00b629f86401f879e5a7ae96e26f49476c270c3104f2eb149d2dc1",
  "tests/helpers/watcher-final-execution-source-inverse.mjs": "97ea8a10cb729dc3c96127156321205c26cb29116c62933f51612e639438ec52",
  "tests/helpers/seven-refactor-source-epoch.mjs": "adee26f0be88462722cd374430150bf7e519c359df87f852f93708629b60b942",
  "tests/helpers/seven-refactor-source-epoch.json.gz": "98ce5a13a217c5b20bbbddf93811d5fc2dda4117bb465c33c5ad4c979608c4bd",
  "tests/helpers/defect-utility-source-inverse.mjs": "e7b65594c3e0623dc5b81dded943f4ddf069aeb176577f2b1a6c34bb43a56242",
  "tests/helpers/class-potion-watcher-source-inverse.mjs": "c89fd927532eaa80e89ea65032bbad2575d13ef2542c437856e772db243f64ff",
  "tests/helpers/class-potion-orb-source-inverse.mjs": "55bba5c3ddbef8e72566b3ad0025634b31168eca628a9ac67a49696cbe8f5bc0",
  "tests/helpers/watcher-actor-source-inverse.mjs": "fa386ca691f8943af41becf2cb5896fee2d69bcdf84a8dfc297db050fde8f4f0",
  "tests/fixtures/class-potion-watcher-before.json.gz": "3d119313edd5f75f5c2cba056a96cba8a66504f8eca6c0473b6170b62395de5a",
  "tests/fixtures/class-potion-orb-before.json.gz": "5bd98d551db3dae6b436b20bc9c78d4dc50b0b70442dded20405d792e0bcacc3",
  "tests/fixtures/watcher-actor-before.json.gz": "47f5750ba3ed1f804a18eb992b0944cb5adbd4ab5c43f1c4cf60827247c1af5e",
  "tests/fixtures/defect-utility-planning-before.lua": "e9372f029db58b62e4fff8f4889826607e8d114dcab2cfa00ca4f124fe29f670"
}},inside=(root,path)=>{const r=relative(root,path);return r!==''&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../')&&!r.startsWith('..\\');};
export function copyIntegrationSourceClosure(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory);
 assert.notEqual(destination,realpathSync.native(sourceRoot),'isolated helper copy destination');
 for(const [path,sha]of Object.entries(files)){
  assert((path.startsWith('tests/helpers/')||path.startsWith('tests/fixtures/'))&&!path.split('/').includes('..'),'fixed helper path');
  const source=join(sourceRoot,path),content=readFileSync(source);assert.equal(hash(content),sha,'fresh helper copy identity: '+path);
  const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});
  assert(inside(destination,realpathSync.native(dirname(target))),'helper destination parent escaped');
  if(existsSync(target))assert(inside(destination,realpathSync.native(target))&&realpathSync.native(target)!==realpathSync.native(source),'helper destination aliases source');
  writeFileSync(target,content);
 }
}
