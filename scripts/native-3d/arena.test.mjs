import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {installOfficialArena,officialArena} from './arena.mjs';
const root=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
const base=resolve('.artifacts/native-3d-base/base.gil'),source=join(root,officialArena.source);
test('arena rejects aliasing and unsupported transform before writing',async()=>{
 await assert.rejects(installOfficialArena({mapPath:'same.gil',outputPath:'same.gil'}),/distinct output/);
 await assert.rejects(installOfficialArena({mapPath:'a.gil',outputPath:'b.gil',yaw:90}),/yaw/);
});
test('official authored scenery is copied without changing rules, cameras or UI',{skip:!existsSync(base)||!existsSync(source)},async()=>{
 const {container,fields,one}=await import(pathToFileURL(join(root,'src/scene/wire.mjs')));
 const {listSceneEntities}=await import(pathToFileURL(join(root,'src/scene-save.mjs')));
 const input=readFileSync(base),original=container(input),directory=mkdtempSync(join(tmpdir(),'abyss-official-arena-'));
 const target=join(directory,'ruins.gil');
 const receipt=await installOfficialArena({mapPath:base,outputPath:target});
 assert.deepEqual(readFileSync(base),input);
 assert.equal(receipt.sourceStaticCount,93);assert.equal(receipt.entities.length,91);assert.equal(receipt.excluded.length,2);
 assert.equal(receipt.evidence.officialImport,'not_run');
 const output=container(readFileSync(target));
 assert.deepEqual(fields(original).filter(f=>![5,6].includes(f.id)).map(f=>f.raw),fields(output).filter(f=>![5,6].includes(f.id)).map(f=>f.raw));
 const before=fields(one(original,5)).map(f=>f.raw),after=fields(one(output,5)).slice(0,before.length).map(f=>f.raw);
 assert.deepEqual(after,before,'every preexisting entity remains byte-identical');
 const ids=listSceneEntities({mapPath:target,limit:1000}).entities.map(e=>e.guid);
 assert.equal(new Set(ids).size,ids.length);
 for(const entity of receipt.entities){
  assert.ok(entity.assetId<30000000,'only scenery, no teaching enemies');
  assert.ok(entity.name.startsWith('ABYSS_ARENA_'));
 }
 await assert.rejects(installOfficialArena({mapPath:base,outputPath:target}),/overwrite/);
 await assert.rejects(installOfficialArena({mapPath:target,outputPath:join(directory,'duplicate.gil')}),/already installed/);
 assert.equal(existsSync(join(directory,'duplicate.gil')),false);
});
test('uncut profile preserves all 93 authored scenery pieces',{skip:!existsSync(base)||!existsSync(source)},async()=>{
 const target=join(mkdtempSync(join(tmpdir(),'abyss-official-arena-full-')),'ruins.gil');
 const receipt=await installOfficialArena({mapPath:base,outputPath:target,cutaway:false,yaw:0,offset:[0,0,0]});
 assert.equal(receipt.entities.length,93);assert.equal(receipt.excluded.length,0);
 const {listSceneEntities}=await import(pathToFileURL(join(root,'src/scene-save.mjs')));
 const original=new Map(listSceneEntities({mapPath:source,limit:1000}).entities.map(e=>[e.guid,e]));
 for(const e of receipt.entities)assert.deepEqual(e.position,original.get(e.sourceGuid).position.map(n=>n+0));
});
