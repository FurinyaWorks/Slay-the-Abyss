import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';import{pathToFileURL}from'node:url';
const dir=path.resolve('docs/evidence/shop-deck-parity-20261112'),visual=path.resolve(process.argv[2]??path.join(dir,'visual-current'));
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const manifest=read(path.join(dir,'source-manifest.json')),receipt=read(path.join(visual,'render-receipt.json'));
const installed='F:/New folder/.artifacts/art-lab-runtime/node_modules/beyond-simulator-mcp/package.json';assert.equal(read(installed).version,'0.5.2');
const toolFiles={
 'F:/New folder/.artifacts/simulator-runtime/web/dist/server.js':'e38f4c7bce2ca7eb36249e69f8c26a95c77e1d68b6c1d6944df63ea0d8dab9b9',
 'F:/New folder/.artifacts/simulator-runtime/web/dist/worker.js':'b6db2c1cc00bfa0309aa85d63011f2f664d53580ae4748383e50b40201d111c6',
 'F:/New folder/.artifacts/simulator-runtime/web/dist/snapshot-bridge.mjs':'8f3948cf4bff005a0e47f6ef965b001cdb4bb22af50172a2cc6cc74ee7e24274',
 'F:/New folder/.artifacts/simulator-runtime/web/dist/snapshot-hook.mjs':'ace28eca23f4a7221125625f383106c92a1b78489e8e958418dec8ce772318fc',
 'F:/New folder/.artifacts/simulator-runtime/sdk/actual-session.mjs':'8d10975a41285c54935d003bf68933586bd6bcf133328435ce8e944b005d94b8',
 'F:/New folder/.artifacts/simulator-runtime/web/dist/public/play.js':'c23e51046854a3518408de0a470eedb45a042274db90f1f71c78e9a9712dd557'};
for(const [p,sha]of Object.entries(toolFiles))assert.equal(hash(fs.readFileSync(p)),sha,p);
const drift=Object.entries(manifest.inputs).filter(([p,sha])=>hash(fs.readFileSync(p))!==sha).map(([p])=>p);assert.deepEqual(drift,[],'source drift since current build');
const closureBytes=fs.readFileSync(manifest.localArtifacts.sourceClosure.path);assert.equal(hash(closureBytes),manifest.localArtifacts.sourceClosure.sha256);
const closure=JSON.parse(gunzipSync(closureBytes));
for(const [p,s]of Object.entries(closure))assert.equal(hash(s),manifest.inputs[p]);
assert.equal(hash(JSON.stringify(manifest.inputs)),manifest.sourceClosureSha256);assert.equal(receipt.sourceClosureSha256,manifest.sourceClosureSha256);
assert.equal(receipt.saveSha256,manifest.saveSha256);assert.equal(receipt.shots.length,10);assert.equal(receipt.stop.running,false);assert.equal(receipt.mapPreviewOpened,true);
function find(nodes,name){for(const n of nodes){if(n.name===name)return n;const v=find(n.children??[],name);if(v)return v;}}
const states=new Map();for(const shot of receipt.shots){const png=fs.readFileSync(path.join(visual,shot.name+'.png'));assert.equal(hash(png),shot.sha256,shot.name);assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),720);const state=JSON.parse(gunzipSync(fs.readFileSync(path.join(visual,shot.name+'.state.json.gz'))));assert(state.logs.some(l=>l.text==='ABYSS_UI ready'));assert(!state.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)));states.set(shot.name,state);}
const{composeRectMatrix,identityMatrix,applyMatrix}=await import(pathToFileURL('F:/New folder/.artifacts/art-lab-simulator/studio/ui/layout.js'));
function geometry(s){const map=new Map();function visit(n,parent){const matrix=composeRectMatrix(parent,n.box,n);map.set(n.id,matrix);for(const c of n.children??[])visit(c,matrix);}for(const n of s.tree)visit(n,identityMatrix());return map;}
function bounds(n,matrices){const b=n.box,m=matrices.get(n.id),pts=[[b.left,b.bottom],[b.left+b.width,b.bottom],[b.left,b.bottom+b.height],[b.left+b.width,b.bottom+b.height]].map(([x,y])=>applyMatrix(m,x,y));return{left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),bottom:Math.min(...pts.map(p=>p.y)),top:Math.max(...pts.map(p=>p.y))};}
const shop=states.get('01-shop-bubble'),matrices=geometry(shop),panel=find(shop.tree,'nodePanel'),merchant=find(panel.children,'merchant'),bubble=find(merchant.children,'bubble'),b=bounds(bubble,matrices),shelf=find(panel.children,'shopView');
const offers=shelf.children.filter(n=>/^(card|relic|potion)\d+$/.test(n.name)&&n.visible).map(n=>({name:n.name,bounds:bounds(n,matrices)}));
const overlaps=offers.filter(({bounds:o})=>Math.min(b.right,o.right)>Math.max(b.left,o.left)&&Math.min(b.top,o.top)>Math.max(b.bottom,o.bottom));assert.deepEqual(overlaps,[],'bubble overlaps live offer bounds');
const leave=find(panel.children,'confirm'),labels=[];function collect(n){if(n.text==='离开商店')labels.push({name:n.name,fontColor:'#'+(n.fontColor>>>0).toString(16).padStart(8,'0'),visible:n.visible});for(const c of n.children??[])collect(c);}collect(leave);assert(labels.length>0);assert(labels.every(l=>l.fontColor==='#fffff8e7'));
const deck=states.get('06-deck17-top'),grid=find(find(deck.tree,'deckPanel').children,'pileGrid'),bottomGrid=find(find(states.get('07-deck17-bottom').tree,'deckPanel').children,'pileGrid');assert.equal(grid.itemCount,17);assert(bottomGrid.scrollProgress>grid.scrollProgress);
assert.equal(receipt.shots.find(s=>s.name==='06-deck17-top').sha256,receipt.shots.find(s=>s.name==='09-deck-return-list').sha256,'detail return must restore exact screenshot');
assert(find(states.get('04-map-preview').tree,'mapPanel').visible);assert(!find(states.get('05-shop-map-return').tree,'mapPanel').visible);assert(!find(states.get('10-shop-deck-return').tree,'deckPanel').visible);
const generated=JSON.parse(fs.readFileSync(path.join(manifest.localArtifacts.generatedDirectory,'game-ui.json')));const gridSpec=find(generated.controls,'pileGrid');assert.equal(gridSpec.grid.columns,5);
const fixtureBytes=fs.readFileSync(manifest.localArtifacts.fixtureSave.path);assert.equal(hash(fixtureBytes),manifest.localArtifacts.fixtureSave.sha256);assert.equal(hash(gunzipSync(fixtureBytes)),manifest.saveSha256);
for(const [name,sha]of Object.entries(manifest.evidenceScripts))assert.equal(hash(fs.readFileSync(path.join(dir,name))),sha,'evidence script drift '+name);
const result={status:'verified-offline-evidence',verifiedAt:new Date().toISOString(),simulatorVersion:'0.5.2',toolFiles,sourceFiles:Object.keys(manifest.inputs).length,sourceClosureSha256:manifest.sourceClosureSha256,sourceDrift:drift,shots:receipt.shots.map(s=>({name:s.name,sha256:s.sha256})),bubbleBoundsCanvas1600x900:b,offerBounds:offers,bubbleOfferOverlaps:overlaps,leaveLabels:labels,permanentDeck:{count:grid.itemCount,columns:gridSpec.grid.columns,topScroll:grid.scrollProgress,bottomScroll:bottomGrid.scrollProgress,renderedControlsTop:grid.children.length,renderedControlsBottom:bottomGrid.children.length,detailReturnPngExact:true},mapPreviewOpenedAndReturned:true,logsLuaErrors:0,resourceErrors:receipt.errors,resourceResponses:receipt.resourceResponses,stop:receipt.stop.running,localArtifacts:manifest.localArtifacts,boundaries:manifest.boundaries};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,shots:result.shots.length,offerBounds:undefined}));
