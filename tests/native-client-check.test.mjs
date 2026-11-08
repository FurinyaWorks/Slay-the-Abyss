import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkScripts,checkNativeClient} from '../scripts/native-client-check.mjs';
const encode=x=>Buffer.from(JSON.stringify(x));
const row=(id,value)=>({id,wire:2,data:value});
const wire={container:b=>b,fields:b=>JSON.parse(b).map(f=>({...f,data:typeof f.data==='string'?Buffer.from(f.data):encode(f.data)})),
 one:(b,id)=>encode(JSON.parse(b).find(f=>f.id===id).data)};
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'abyss-client-check-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const mapPath=join(dir,'map.gil');
 const scripts=[row(1,[row(2,'main'),row(3,'main.lua'),row(5,'return 1'),row(7,[row(2,'health')])])];
 writeFileSync(mapPath,encode([row(50,scripts)]));return {mapPath};}
test('checker script projection preserves source and declared parameter names with fresh reads',t=>{
 const args=fixture(t);assert.deepEqual(checkScripts(args,wire),{scripts:[{name:'main',file:'main.lua',source:'return 1',variables:[{name:'health'}]}]});
 writeFileSync(args.mapPath,encode([row(50,[])]));assert.deepEqual(checkScripts(args,wire),{scripts:[]});
});
test('original checker receives complete template names, mounts, dependencies and script filter; diagnostics propagate',t=>{
 const args={...fixture(t),scripts:['main']},diagnostic={ok:false,errors:1,problems:[{kind:'SCRIPT_VARIABLE_NOT_FOUND'}]};
 const listComponents=()=>({found:[]}),listSignals=()=>({parameters:{}}),signalWords=()=>null;
 const result=checkNativeClient(args,{wire,listComponents,listSignals,signalWords,
  listInterface:()=>({clientInterfaces:[{root:{name:'root'}}],clientTemplates:[{name:'card',templateIndex:42}]}),
  getClientUi:a=>{assert.equal(a.template,'card');return {template:{name:'card',scripts:[{name:'main',values:{health:1}}],children:[{name:'amount'}]}};},
  checkClient:(actual,read)=>{assert.equal(actual,args);assert.equal(read.listComponents,listComponents);assert.equal(read.listSignals,listSignals);assert.equal(read.signalWords,signalWords);
   assert.deepEqual(read.listClientScripts(actual).scripts[0].variables,[{name:'health'}]);
   assert.deepEqual(read.listInterface(actual).clientTemplateTrees,[{name:'card',scripts:['main'],children:[{name:'amount'}]}]);return diagnostic;},
 });assert.equal(result,diagnostic);
});
test('map mutation and original checker exceptions are rejected',t=>{
 const args=fixture(t),dependencies={wire,listInterface:()=>({}),getClientUi:()=>({}),checkClient:()=>{throw Error('native failed');}};
 assert.throws(()=>checkNativeClient(args,dependencies),/native failed/);
 dependencies.checkClient=()=>{writeFileSync(args.mapPath,'changed');return {ok:true};};
 assert.throws(()=>checkNativeClient(args,dependencies),/client check input changed/);
});

// Adapter fixtures are real ESM files. The checker and mount traversal stay in
// that original module; only its script-list dependency is projected directly.
async function encoderFixture(t,{anchors=1,tail=''}={}){
 const {mkdirSync,readFileSync}=await import('node:fs');
 const {loadNativeUiEncoder}=await import('../scripts/native-ui-encoder.mjs');
 const dir=mkdtempSync(join(tmpdir(),'abyss-native-encoder-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const src=join(dir,'src');mkdirSync(src);mkdirSync(join(src,'scene'));
 writeFileSync(join(src,'resource.txt'),'original relative resource');
 writeFileSync(join(src,'scene','wire.mjs'),`export const container=b=>b;
export const fields=b=>JSON.parse(b).map(f=>({...f,data:typeof f.data==='string'?Buffer.from(f.data):Buffer.from(JSON.stringify(f.data))}));
export const one=(b,id)=>Buffer.from(JSON.stringify(JSON.parse(b).find(f=>f.id===id).data));`);
 writeFileSync(join(src,'client-check.mjs'),`export const state={slow:0,checks:0,interfaces:0,records:0,trees:0};
export const diagnostic={ok:false,errors:1,problems:[{kind:'SCRIPT_VARIABLE_NOT_FOUND'}]};
export function checkClient(args,read){state.checks++;state.args=args;
 if(args.scripts?.includes('explode'))throw new TypeError('original checker exception');
 state.scripts=read.listClientScripts({...args,includeSource:true});state.face=read.listInterface(args);
 state.components=read.listComponents(args);state.signals=read.listSignals(args);state.words=read.signalWords(args);
 return diagnostic;}`);
 const anchor='return checkClient({mapPath:file,scripts},{listClientScripts,listComponents,listSignals,signalWords,';
 let source=`import fs from 'node:fs';
import path from 'node:path';
import {container,fields,one} from './scene/wire.mjs';
import {checkClient,state,diagnostic} from './client-check.mjs';
export {state,diagnostic};
export const resource=fs.readFileSync(new URL('./resource.txt',import.meta.url),'utf8');
const resolve=f=>path.resolve(f);
export function untouched(){return 'encoder bytes stay original';}
export const listComponents=()=>({components:['unit']});
export const listSignals=()=>({parameters:{health:'number'}});
export const signalWords=()=>({names:['ready']});
export const listInterface=()=>{state.interfaces++;return {clientInterfaces:[{root:{name:'root',scripts:['main']}}],clientTemplates:[{name:'card'}]};};
const uiRecords=root=>{state.records++;return {raw:root.toString()};};
const clientTrees=(root,records,templates)=>{state.trees++;if(!templates||!records.raw)throw Error('lost original tree read');return [{name:'card',scripts:['main'],children:[{name:'amount'}]}];};
export function listClientScripts(){state.slow++;throw Error('old slow carried traversal');}
export function checkClientScripts({mapPath,scripts}){
 const file=resolve(mapPath);
 ${anchor}
 listInterface:a=>{const face=listInterface(a),root=container(fs.readFileSync(file));return {...face,clientTemplateTrees:clientTrees(root,uiRecords(root),true)};}});
}
`;
 if(anchors===0)source=source.replace(anchor,anchor.replace('return checkClient','return  checkClient'));
 if(anchors===2)source+='\n// '+anchor+'\n';
 source+=tail;const file=join(src,'scene-save.mjs');writeFileSync(file,source);
 return {dir,file,source,readFileSync,loadNativeUiEncoder};
}

test('isolated native encoder runs the original checker with exact source, variables, filter and mount trees',async t=>{
 const {createHash}=await import('node:crypto');const f=await encoderFixture(t),args={...fixture(t),scripts:['main']};
 const result=await f.loadNativeUiEncoder(f.dir);assert.equal(typeof result.native.checkClientScripts,'function');
 const {native,identity}=result;assert.equal(native.resource,'original relative resource');assert.equal(native.untouched(),'encoder bytes stay original');
 assert.equal(native.checkClientScripts(args),native.diagnostic);
 assert.deepEqual(native.state.args,args);assert.equal(native.state.slow,0);assert.equal(native.state.checks,1);
 assert.deepEqual(native.state.scripts,{scripts:[{name:'main',file:'main.lua',source:'return 1',variables:[{name:'health'}]}]});
 assert.deepEqual(native.state.face.clientInterfaces,[{root:{name:'root',scripts:['main']}}]);
 assert.deepEqual(native.state.face.clientTemplateTrees,[{name:'card',scripts:['main'],children:[{name:'amount'}]}]);
 assert.equal(native.state.interfaces,1);assert.equal(native.state.records,1);assert.equal(native.state.trees,1);
 assert.deepEqual(native.state.components,{components:['unit']});assert.deepEqual(native.state.signals,{parameters:{health:'number'}});assert.deepEqual(native.state.words,{names:['ready']});
 const hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(identity.sourceSha256,hash(f.source));assert.equal(identity.helperSha256,hash(f.readFileSync(new URL('../scripts/native-client-check.mjs',import.meta.url))));
 assert.equal(f.readFileSync(f.file,'utf8'),f.source,'upstream encoder was modified');
});

test('loader leaves original imports untouched, fresh isolated loads use the fast dependency, checker errors propagate',async t=>{
 const {pathToFileURL}=await import('node:url');const f=await encoderFixture(t),args=fixture(t);
 const {native}=await f.loadNativeUiEncoder(f.dir);
 assert.throws(()=>native.checkClientScripts({...args,scripts:['explode']}),{name:'TypeError',message:'original checker exception'});
 const original=await import(pathToFileURL(f.file).href);assert.equal(original.untouched(),'encoder bytes stay original');
 assert.throws(()=>original.checkClientScripts(args),/old slow carried traversal/);
 const after=await import(pathToFileURL(f.file).href+'?unrelated-import=1');assert.throws(()=>after.checkClientScripts(args),/old slow carried traversal/);
 const second=await f.loadNativeUiEncoder(f.dir);assert.notEqual(second.native,native);assert.equal(second.native.checkClientScripts(args),native.diagnostic);
});

test('upstream anchor count changes fail closed and failed module evaluation does not leave a hook active',async t=>{
 for(const anchors of [0,2]){const f=await encoderFixture(t,{anchors});await assert.rejects(f.loadNativeUiEncoder(f.dir),/exactly one|anchor/i);assert.equal(f.readFileSync(f.file,'utf8'),f.source);}
 const f=await encoderFixture(t,{tail:"\nthrow Error('original module evaluation failed');\n"});
 await assert.rejects(f.loadNativeUiEncoder(f.dir),/original module evaluation failed/);
 const {pathToFileURL}=await import('node:url');writeFileSync(f.file,f.source.replace("throw Error('original module evaluation failed');",''));
 const original=await import(pathToFileURL(f.file).href+'?after-failure=1');assert.throws(()=>original.checkClientScripts(fixture(t)),/old slow carried traversal/);
});

test('the ESM load hook emits only the helper import and one original dependency replacement',async t=>{
 const {default:module}=await import('node:module'),{pathToFileURL}=await import('node:url'),{createHash}=await import('node:crypto');
 const f=await encoderFixture(t);let loadedSource;
 // Observe the actual registered hook's return, independent of whether dynamic
 // import begins synchronously (Node 24) or after yielding (Node 22).
 const original=module.registerHooks;
 module.registerHooks=options=>original({...options,load(url,context,nextLoad){const loaded=options.load(url,context,nextLoad);
  if(url.startsWith(pathToFileURL(f.file).href+'?abyss-native-ui-encoder='))loadedSource=typeof loaded.source==='string'?loaded.source:Buffer.from(loaded.source).toString('utf8');
  return loaded;}});module.syncBuiltinESMExports();
 let result;try{result=await f.loadNativeUiEncoder(f.dir);}finally{module.registerHooks=original;module.syncBuiltinESMExports();}
 const firstLine=loadedSource.slice(0,loadedSource.indexOf('\n'));
 const helperSpecifier=JSON.parse(firstLine.slice(firstLine.indexOf(' from ')+6,-1));
 const helperUrl=new URL(helperSpecifier),plainHelper=new URL('../scripts/native-client-check.mjs',import.meta.url);
 assert.equal(helperUrl.origin+helperUrl.pathname,plainHelper.origin+plainHelper.pathname);
 assert.match(helperUrl.searchParams.get('abyss-native-checker'),/^[a-f0-9-]{36}$/);
 assert.equal(helperUrl.searchParams.size,1);
 const expected=`import {checkScripts as $abyssNativeCheckScripts} from ${JSON.stringify(helperSpecifier)};\n`+f.source.replace(
  'return checkClient({mapPath:file,scripts},{listClientScripts,listComponents,listSignals,signalWords,',
  'return checkClient({mapPath:file,scripts},{listClientScripts:a=>$abyssNativeCheckScripts(a,{container,fields,one}),listComponents,listSignals,signalWords,');
 assert.equal(loadedSource,expected,'unrelated encoder bytes changed in the actual ESM load');
 assert.equal(result.identity.transformedSha256,createHash('sha256').update(expected).digest('hex'));
});

test('encoder helper identity executes fresh disk bytes even when the plain helper URL was already cached',async t=>{
 const {mkdirSync,readFileSync}=await import('node:fs'),{pathToFileURL}=await import('node:url'),{createHash}=await import('node:crypto');
 const f=await encoderFixture(t),adapter=join(f.dir,'adapter');mkdirSync(adapter);
 const loader=join(adapter,'native-ui-encoder.mjs'),helper=join(adapter,'native-client-check.mjs');
 writeFileSync(loader,readFileSync(new URL('../scripts/native-ui-encoder.mjs',import.meta.url)));
 const oldSource="export function checkScripts(){return {scripts:[{name:'cached-A'}]};}\n";
 const diskSource="export function checkScripts(){return {scripts:[{name:'disk-B'}]};}\n";
 writeFileSync(helper,oldSource);
 const cached=await import(pathToFileURL(helper).href);assert.equal(cached.checkScripts().scripts[0].name,'cached-A');
 writeFileSync(helper,diskSource);
 const {loadNativeUiEncoder}=await import(pathToFileURL(loader).href),result=await loadNativeUiEncoder(f.dir);
 assert.equal(result.identity.helperSha256,createHash('sha256').update(diskSource).digest('hex'),'fixture did not record the new disk helper');
 result.native.checkClientScripts(fixture(t));
 assert.equal(result.native.state.scripts.scripts[0].name,'disk-B','loader hashed fresh helper bytes but executed the stale ESM cache');
 assert.equal(cached.checkScripts().scripts[0].name,'cached-A','plain helper cache was mutated rather than isolated');
});
