// Offline identity and real PR650 placement verification; no client or GIL write.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const allKeys=['ganyu','keqing','zhongli-simplified','zhongli-detailed'];
const [builderArg,assetsArg,keysArg]=process.argv.slice(2);
const keys=keysArg?keysArg.split(','):allKeys;
assert(keys.length>0&&new Set(keys).size===keys.length&&keys.every(k=>allKeys.includes(k)),'explicit asset keys required');
assert(builderArg,'Usage: node verify.mjs <existing PR650 scripts/menu-red-scene.mjs>');
const builder=resolve(builderArg);
const assetRoot=assetsArg?resolve(assetsArg):join(root,'assets-1600');
const {menuRedBackground}=await import(pathToFileURL(builder).href);
const rotate=([x,y],a)=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return[x*c-y*s,x*s+y*c];};

function project(node){
  if(node.kind==='container'){
    const image=node.children[0],w=image.size[0],h=image.size[1];
    return [[-w/2,-h/2],[w/2,-h/2],[0,h/2]].map(p=>{
      p=rotate(p,image.rotation);
      p=rotate([p[0]*node.scale[0],p[1]*node.scale[1]],node.rotation);
      return[p[0]+node.position[0],p[1]+node.position[1]];
    });
  }
  const [rx,ry,rz]=node.rotation.map(v=>v*Math.PI/180);
  const [cx,sx,cy,sy,c,s]=[Math.cos(rx),Math.sin(rx),Math.cos(ry),Math.sin(ry),Math.cos(rz),Math.sin(rz)];
  const [w,h]=node.size;
  return [[-w/2,-h/2],[w/2,-h/2],[0,h/2]].map(([x,y])=>[
    (cy*c+sy*sx*s)*x+(-cy*s+sy*sx*c)*y+node.position[0],
    cx*s*x+cx*c*y+node.position[1],
  ]);
}

const summary=[];
for(const key of keys){
  const folder=join(assetRoot,key),pack=load(join(folder,'native-art.json')),receipt=load(join(folder,'receipt.json'));
  for(const [file,field] of [['source.png','sourceSha256'],['native-art.json','nativeSha256'],['preview.png','previewSha256']])
    assert.equal(hash(join(folder,file)),receipt[field],`${key} ${file} identity`);
  assert.equal(receipt.adapterSha256,hash(join(root,'fit.py')),'current adapter identity');
  if(receipt.localRefinement){
    const r=receipt.localRefinement,base=join(root,'assets-1600',key);
    assert.equal(r.generatorSha256,hash(join(root,'refine-local.py')),'local generator identity');
    assert.equal(r.baseGeometrySha256,hash(join(base,'native-art.json')),'local base geometry identity');
    assert.equal(r.baseReceiptSha256,hash(join(base,'receipt.json')),'local base receipt identity');
    assert.equal(r.outsideRegionChangedPixels,0);
    if(r.referenceBirdSha256)assert.equal(r.referenceBirdSha256,hash(join(root,'bird-details.json')));
  }
  assert.equal(pack.sourceSha256,receipt.sourceSha256);
  assert.equal(pack.runtimeEnabled,false);
  assert.equal(pack.shapes.length,pack.nativeImages);
  assert(pack.nativeImages>0&&pack.nativeImages<=1600);
  assert.equal(receipt.ownerAcceptance,'PENDING');
  assert.equal(receipt.officialImport,'NOT_RUN');
  assert.equal(receipt.devicePerformance,'UNVERIFIED');
  for(const shape of pack.shapes){
    assert(/^#[\da-f]{6}$/i.test(shape.colour));
    assert(['rect','polygon'].includes(shape.type));
    const pts=shape.type==='polygon'?shape.points:[[shape.box[0],shape.box[1]],[shape.box[0]+shape.box[2],shape.box[1]+shape.box[3]]];
    if(shape.type==='polygon')assert.equal(pts.length,3);
    for(const [x,y] of pts)assert(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=pack.width&&y>=0&&y<=pack.height);
  }
  const scene=menuRedBackground(pack,true),facets=scene.children.flatMap(batch=>{
    assert(batch.children.length<=60);return batch.children;
  });
  assert.equal(facets.length,pack.shapes.length);
  let maxVertexError=0,fallbacks=0;
  facets.forEach((node,i)=>{
    const shape=pack.shapes[i];
    if(shape.type==='rect'){assert.equal(node.image,100001);return;}
    if(node.kind==='container')fallbacks++;
    const actual=project(node),target=shape.points.map(([x,y])=>[x*1280/pack.width-640,360-y*720/pack.height]);
    for(const p of actual){
      const error=Math.min(...target.map(t=>Math.hypot(p[0]-t[0],p[1]-t[1])));
      maxVertexError=Math.max(maxVertexError,error);
      assert(error<1e-6,`${key} facet ${i} vertex mismatch ${error}`);
    }
  });
  const count=n=>1+(n.children??[]).reduce((s,c)=>s+count(c),0),controls=count(scene);
  assert.equal(controls,facets.length+fallbacks+scene.children.length+1);
  if(receipt.localRefinement){
    const baseline=load(join(root,'verification.json')).results.find(r=>r.character===key);
    assert(baseline&&controls<=baseline.totalBackgroundControls,`${key} refinement cannot increase total controls`);
  }
  writeFileSync(join(folder,'native-scene.json'),JSON.stringify(scene)+'\n');
  const previous=join(root,'selected',key,'native-art.json');
  if(existsSync(previous)&&!receipt.localRefinement)assert.deepEqual(pack.shapes,load(previous).shapes,'regeneration must preserve selected geometry');
  summary.push({character:key,drawingImages:facets.length,fallbackContainers:fallbacks,batchContainers:scene.children.length,
    totalBackgroundControls:controls,maxVertexError,geometryBytes:readFileSync(join(folder,'native-art.json')).length,
    sceneBytes:readFileSync(join(folder,'native-scene.json')).length,sceneSha256:hash(join(folder,'native-scene.json')),
    geometrySha256:hash(join(folder,'native-art.json')),comparisonSha256:hash(join(folder,'comparison.png'))});
}
const result={status:'OFFLINE_PASS',builderSha256:hash(builder),flatPlacementSha256:hash(join(dirname(builder),'menu-flat-triangle.mjs')),
  officialImport:'NOT_RUN',devicePerformance:'UNVERIFIED',ownerAcceptance:'PENDING',results:summary};
const owner=load(join(root,'owner-acceptance.json'));
assert.equal(owner.visualDecision,'accepted');
assert.equal(owner.productionEnabled,false);
assert.deepEqual(owner.acceptedAssets.map(a=>a.character),['ganyu','keqing','zhongli-simplified']);
for(const asset of owner.acceptedAssets){
  const geometry=join(root,asset.geometry),folder=dirname(geometry);
  assert.equal(hash(geometry),asset.geometrySha256,'Owner-approved geometry identity');
  assert.equal(hash(join(folder,'native-scene.json')),asset.sceneSha256,'Owner-approved scene identity');
  assert.equal(hash(join(folder,'comparison.png')),asset.comparisonSha256,'Owner-reviewed comparison identity');
}
writeFileSync(assetRoot===join(root,'assets-1600')?join(root,'verification.json'):join(assetRoot,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
console.log('Owner visual acceptance identities verified; official/device evidence remains separate.');
