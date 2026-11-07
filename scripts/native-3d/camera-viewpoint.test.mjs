import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setCameraViewpoint,readCameraViewpoint} from './camera-viewpoint.mjs';
const root=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
const fixed=join(root,'tests/fixtures/editor-2026-10-13-camera-fixed.gil');
test('viewpoint rejects unsafe values and input overwrite',async()=>{
 await assert.rejects(setCameraViewpoint({mapPath:'x.gil',outputPath:'x.gil',offset:[3,.9,0]}),/distinct/);
 for(const offset of [[NaN,0,0],[0,Infinity,0],[1,2],['3',0,0]])
  await assert.rejects(setCameraViewpoint({mapPath:'x.gil',outputPath:'y.gil',offset}),/finite vec3/);
});
test('official fixed-camera copy changes only viewpoint and follow-rotation fields',{skip:!existsSync(fixed)},async()=>{
 const {container,fields,one}=await import(pathToFileURL(join(root,'src/scene/wire.mjs')));
 const before=readFileSync(fixed),outputPath=join(mkdtempSync(join(tmpdir(),'abyss-viewpoint-')),'camera.gil');
 const result=await setCameraViewpoint({mapPath:fixed,outputPath,offset:[3,.9,0]});
 assert.deepEqual(readFileSync(fixed),before);
 const actual=await readCameraViewpoint(outputPath);
 assert.equal(actual.mode,2);assert.equal(actual.followRotation,false);
 assert.ok(actual.offset.every((n,i)=>Math.abs(n-[3,.9,0][i])<1e-6));
 const a=container(before),b=container(readFileSync(outputPath));
 assert.deepEqual(fields(a).filter(f=>f.id!==18).map(f=>f.raw),fields(b).filter(f=>f.id!==18).map(f=>f.raw));
 const settings=root=>one(one(one(root,18),1),2);
 assert.deepEqual(fields(settings(a)).filter(f=>![4,13].includes(f.id)).map(f=>f.raw),fields(settings(b)).filter(f=>![4,13].includes(f.id)).map(f=>f.raw));
 assert.equal(result.officialImport,'not_run');
 await assert.rejects(setCameraViewpoint({mapPath:fixed,outputPath,offset:[3,.9,0]}),/overwrite/);
});
