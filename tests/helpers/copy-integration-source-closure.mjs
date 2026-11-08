// Copies only immutable test helper dependencies; production owners remain explicit fixtures.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(new URL('./integration-source-closure.json',import.meta.url));
assert.equal(hash(bytes),'800fcc9efd889f482259d0e1e9f1501f0e9597ac05552622ede00dd3dcdb4a94','complete integration helper closure identity');
const files={...JSON.parse(bytes),...{
  "tests/helpers/act1-choice-source-inverse.mjs": "2dc7aabc696dfdd3b68eff19c116a9cecc500fe6d9bf9262deed79408f050fe4",
  "tests/helpers/actor-presence-source-inverse.mjs": "89cf1c39ba61fc8c4ef7c9e16d53c6e2c912239168dcc58413630e473cf50b05",
  "tests/helpers/colorless-catalog-source-inverse.mjs": "5e0118aa4c50135104f902a462911669e679d6dd42bc445efba18f0875374027",
  "tests/helpers/combined-epoch/source-epoch.mjs": "8d6129e036bfe6299574ff3abfd31b6d46ae4e06ff1b8e4c7aa55224d313e9cf",
  "tests/helpers/core-lifecycle-source-inverse.mjs": "49aca7a83025c0bbbe889bf6c7a53eb9d8abb4077414c699621599520bf0da17",
  "tests/helpers/defect-plan-source-inverse.mjs": "eaa96b668c7fd8fa188f08c84fb7a002623624be9d68f992e6c8e11044279f0b",
  "tests/helpers/end-turn-responsibilities-source-inverse.mjs": "236f3fd2c31bb4675b4b98a428f0545f4a6a522c4d207dd67cb22b2d0ebb52ed",
  "tests/helpers/inventory-responsibilities-source-inverse.mjs": "00b57a94364334188c9e126dd1b88cac3b673a529821754a7e5cbe7529409171",
  "tests/helpers/m7-core-final-source-inverse.mjs": "3c0b237f48ca8ea9230ae36fc9acea14be360b5fdc5b5036ab83862596b8e3b0",
  "tests/helpers/potion-callback-source-inverse.mjs": "4793c47877a4c68da5116aa4a8fab2f1c4ef58f3a4cb76e6564b25b9c4c2cd8b",
  "tests/helpers/power-shop-source-inverse.mjs": "3db0f441d8a77fe0afbd20f9c2c663345b29918cd41e595f8c955bb13b624112",
  "tests/helpers/relic-query-source-inverse.mjs": "36f59e8cc654e7c204c43236b3d93eff1c72c2155e221cd1f7c72615119679b9",
  "tests/helpers/reward-query-boundary-source-inverse.mjs": "5cc0124e662ca3c9f7ed7ae57de4f64625d98e737eb707099f52001363e21833",
  "tests/helpers/round3-catalog-source-inverse.mjs": "0d59a0d79e1a2e2ac3f09c916d95dd13d0abf76bf228702d7c69427524cc703a",
  "tests/helpers/session-reward-source-inverse.mjs": "6bea2d10a5b0842aeccf86d3d6d606863efe17a2f267a1ba333b595e94663d80",
  "tests/helpers/watcher-final-execution-source-inverse.mjs": "be0f0439dab208399bcd845c1db1ff7426ae68cd62dd4e3430ad5d8fedf2dfb7",
  "tests/helpers/seven-refactor-source-epoch.mjs": "cd5c8f2326aa4dd895fd00cf20477ed816326fbbcb9a5c62c9337b9949a89d75",
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
