// Keep the current style application, replace only the background actually read
// from the newly written GIL. The full application is still a source preview.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash,randomUUID}from'node:crypto';
const [styleFile,readbackDir,candidateFile,outArg]=process.argv.slice(2);assert(styleFile&&readbackDir&&candidateFile&&outArg);const out=path.resolve(outArg);assert(!fs.existsSync(out));
const hash=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f)),all=n=>[n,...(n.children??[]).flatMap(all)];
const candidate=read(candidateFile),receipt=read(path.join(readbackDir,'adapter-receipt.json'));
assert.equal(hash(fs.readFileSync(candidate.candidate.path)),candidate.candidate.sha256);assert.equal(receipt.candidateSha256,candidate.candidate.sha256);
assert.deepEqual(receipt.inverseReadback.faults,[]);assert.deepEqual(receipt.unknownProperties,{});assert(receipt.luaSourceExact&&receipt.inverseReadback.reader?.adapter==='simulator-native-xyz-v1');
for(const input of candidate.inputs)assert.equal(hash(fs.readFileSync(input.path)),input.sha256,'Stale candidate input '+input.path);
const nativeBytes=fs.readFileSync(receipt.save);assert.equal(hash(nativeBytes),receipt.saveSha256);const native=JSON.parse(nativeBytes);
for(const s of native.assets.scripts)assert.equal(hash(s.source),candidate.moduleDigests[path.basename(s.path,'.lua')],'Actual native Lua identity '+s.path);
const styleBytes=fs.readFileSync(styleFile),style=JSON.parse(styleBytes),save=structuredClone(style),nodes=all(save.assets.server.root);
const old=nodes.find(n=>n.name==='menuRedBackground'),source=all(native.assets.server.root).find(n=>n.name==='menuRedBackground');assert(old&&source);
const replacement=structuredClone(source);let guid=Math.max(...[...nodes,...all(save.assets.client.root)].map(n=>Number(n.guid)||0));
for(const n of all(replacement)){assert.equal(n.scriptMappingIds.length,0);assert.equal(n.giaRelatedGuids.length,0);n.guid=++guid;n.id='menuNative'+guid;}
const parent=nodes.find(n=>n.children?.includes(old));parent.children[parent.children.indexOf(old)]=replacement;
const without=n=>n.name==='menuRedBackground'?{name:n.name}:Object.fromEntries(Object.entries(n).map(([k,v])=>[k,k==='children'?v.map(without):v]));
assert.deepEqual(without(style.assets.server.root),without(save.assets.server.root));assert.deepEqual(style.assets.client,save.assets.client);assert.deepEqual(style.serverLogic,save.serverLogic);
const buildId=randomUUID(),entry=save.assets.scripts.find(s=>s.path==='abyss_ui.lua');assert(/^print\("ABYSS_BUILD [^"]+"\)/.test(entry.source));entry.source=entry.source.replace(/^print\("ABYSS_BUILD [^"]+"\)/,`print("ABYSS_BUILD ${buildId}")`);
assert.deepEqual(save.assets.scripts.filter((s,i)=>s.source!==style.assets.scripts[i].source).map(s=>s.path),['abyss_ui.lua']);
const stats=n=>({controls:all(n).length,images:all(n).filter(c=>c.kind==='image').length,bytes:Buffer.byteLength(JSON.stringify(n))});assert(stats(replacement).controls<=1800);
const ids=all(save.assets.server.root).map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
fs.mkdirSync(out,{recursive:true});const bytes=JSON.stringify(save);fs.writeFileSync(out+'/scene.save.json',bytes);
const report={buildId,saveSha256:hash(bytes),styleInput:{path:path.resolve(styleFile),sha256:hash(styleBytes)},nativeCandidate:candidate.candidate,nativeReadback:{path:receipt.save,sha256:receipt.saveSha256,backgroundSha256:hash(JSON.stringify(source)),inverseFaults:0},before:stats(old),after:stats(replacement),totalApplicationControls:all(save.assets.server.root).length,unchangedLua:save.assets.scripts.length-1,scope:'Current-style source preview; only the background is from this actual GIL readback; official client/device acceptance not run'};
fs.writeFileSync(out+'/composition.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
