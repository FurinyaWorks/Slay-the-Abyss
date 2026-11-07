import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {assertGraphBudget,assertCompiledBudget} from '../scripts/native-3d/graph-budget.mjs';
test('official limit uses weighted count as well as raw nodes without increasing the cap',()=>{
 assert.equal(assertGraphBudget([{id:1,nodeCount:1366,editorCount:3000}]).graphs[0].headroom,0);
 assert.throws(()=>assertGraphBudget([{id:1,name:'rejected-user-candidate',nodeCount:1366,editorCount:3019}]),/editor=3019 limit=3000/);
 assert.throws(()=>assertGraphBudget([{id:1,nodeCount:3001,editorCount:2000}]),/exceeded/);
 assert.throws(()=>assertCompiledBudget([{graphId:1,limits:{nodeCount:1366,editorCount:3019,maxNodes:3000}}]),/exceeded/);
 for(const value of [undefined,NaN,Infinity,-1,3.5,'2000'])assert.throws(()=>assertGraphBudget([{id:1,nodeCount:5,editorCount:value}]),/invalid/);
 assert.throws(()=>assertGraphBudget([]),/Missing/);
});
const rejected='.artifacts/native-targets-corrected/4da4f751-de51-4913-9fb4-72b686b025a9/slay-the-abyss-3d.gil';
const toolRoot=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
test('actual rejected GIL is caught by the existing weighted graph reader',{skip:!existsSync(rejected)||!existsSync(toolRoot)},async()=>{
 const {inspectBytes}=await import(pathToFileURL(join(toolRoot,'src/adapter.mjs')));
 const graph=inspectBytes(readFileSync(rejected)).graphs.find(g=>g.name==='_GSTS_LAB3D_server');
 assert.equal(graph.nodeCount,1366);assert.equal(graph.editorCount,3019);
 assert.throws(()=>assertGraphBudget(inspectBytes(readFileSync(rejected)).graphs),/3019/);
});
