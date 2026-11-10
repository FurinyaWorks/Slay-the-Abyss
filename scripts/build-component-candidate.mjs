import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createComponentImporter} from './native-component-import.mjs';
import {createRegularComponentAdapter} from './native-component-regular.mjs';
import {createContentComponentAdapter} from './native-component-content.mjs';
import {prepareComponentControlLayout,componentBindingSource} from './native-component-profile.mjs';
import {buildNativeCandidateFromToolchain, generatedRuntimeModules} from './build-native-candidate.mjs';
import {buildUI} from './build-ui.mjs';
import {toLua} from './build-lua-data.mjs';
import {fileRecord,prepareOutputDirectory} from './evidence-files.mjs';
import {loadNativeUiEncoder} from './native-ui-encoder.mjs';

// Template roots frequently have authoring sizes unrelated to their drawing
// (the supplied red card root is 80x80 around a 400x600 drawing). Measure the
// preserved rectangles instead of stretching that arbitrary root rectangle.
export function componentDrawingBounds(component, readRect) {
  const records=new Map(component.records.map(r=>[r.id,r])); let bounds=null;
  const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  function visit(record,parent,parentSize,parentPivot,ancestors) {
    if (ancestors.has(record.id)) throw Error('Cyclic original component hierarchy');
    const next=new Set(ancestors);next.add(record.id);
    const t=readRect(record).transformByPlatform.KEYBOARD;
    const size=[t.size.x+(t.anchorMax.x-t.anchorMin.x)*parentSize[0],t.size.y+(t.anchorMax.y-t.anchorMin.y)*parentSize[1]];
    const angle=t.rotation.z*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const local=[c*t.scale.x,s*t.scale.x,-s*t.scale.y,c*t.scale.y,
      t.offset.x+(t.anchorMin.x+(t.anchorMax.x-t.anchorMin.x)*t.pivot.x-parentPivot[0])*parentSize[0],
      t.offset.y+(t.anchorMin.y+(t.anchorMax.y-t.anchorMin.y)*t.pivot.y-parentPivot[1])*parentSize[1]];
    const matrix=multiply(parent,local);
    if(record.content.some(k=>[38,25,96,84,94].includes(k)))for(const x of [-t.pivot.x*size[0],(1-t.pivot.x)*size[0]])for(const y of [-t.pivot.y*size[1],(1-t.pivot.y)*size[1]]) {
      const px=matrix[0]*x+matrix[2]*y+matrix[4],py=matrix[1]*x+matrix[3]*y+matrix[5];
      bounds=bounds?[Math.min(bounds[0],px),Math.min(bounds[1],py),Math.max(bounds[2],px),Math.max(bounds[3],py)]:[px,py,px,py];
    }
    for(const id of record.children) {const child=records.get(id);if(!child)throw Error('Missing original child while measuring');visit(child,matrix,size,[t.pivot.x,t.pivot.y],next);}
  }
  visit(records.get(component.rootId),[1,0,0,1,0,0],[0,0],[.5,.5],new Set());
  if(!bounds || !bounds.every(Number.isFinite) || bounds[2]<=bounds[0] || bounds[3]<=bounds[1])throw Error('Original component has no finite drawing bounds');
  return {bounds,designSize:[bounds[2]-bounds[0],bounds[3]-bounds[1]],center:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]};
}

// Internal whole-game comparison. No private assets or author license grants
// are distributed by this builder. All source bytes remain in the local kit.
export async function buildComponentCandidate({baseMap, kitRoot, manifest, output='build/component-control', root=process.cwd(), eagerPages=false}) {
  root=resolve(root); kitRoot=resolve(kitRoot); manifest=resolve(manifest);
  if(typeof eagerPages!=='boolean')throw Error('eagerPages must be boolean');
  if (!baseMap || !kitRoot || !manifest) throw Error('Base save, verified kit and component manifest are required');
  if (process.env.MILIASTRA_ALLOW_LIVE_WRITE === '1') throw Error('Component comparison only writes save copies');
  const manifestRecord=fileRecord(manifest), selection=JSON.parse(readFileSync(manifest,'utf8'));
  if (selection.schemaVersion!==1 || !selection.widgets) throw Error('Invalid original component selection');
  const toolRoot=process.env.MILIASTRA_MCP_ROOT;
  if (!toolRoot) throw Error('MILIASTRA_MCP_ROOT must name the installed toolchain');
  const wire=await import(pathToFileURL(join(toolRoot,'src/scene/wire.mjs')));
  const {native}=await loadNativeUiEncoder(toolRoot);
  const basicImporter=createComponentImporter({kitRoot,wire});
  const regular=createRegularComponentAdapter({importer:basicImporter,wire,clientControlRecord:native.clientControlRecord});
  const importer=createComponentImporter({kitRoot,wire,legacy56Classifier:regular.classifyOriginal56});
  const contentAdapter=createContentComponentAdapter({importer:basicImporter,wire});
  const outputRoot=prepareOutputDirectory(root,output);
  const directory=join(outputRoot,'source-'+randomUUID()); mkdirSync(directory);
  const inputs=[manifestRecord,fileRecord(join(kitRoot,'CATALOG.json'))], widgets={}, adoption=[], used=new Map();
  let bytes=readFileSync(resolve(root,baseMap)), nextId=1700000000;
  for (const [role, chosen] of Object.entries(selection.widgets)) {
    if (!['button','card','panel','actor','emblem','contentImage','menu','costBadge'].includes(role)) throw Error('Unknown original component role: '+role);
    if (typeof chosen.sample!=='string' || typeof chosen.selector!=='string') throw Error('Invalid original selector');
    const key=chosen.sample+':'+chosen.selector+':'+(role==='contentImage'?'image:'+chosen.leafId:'whole');
    let product=used.get(key);
    if (!product) {
      const promoted=role==='contentImage'?contentAdapter.prepareOriginalContentImage(chosen.sample,chosen.selector,{leafId:chosen.leafId}):null;
      const original=promoted?promoted.component:basicImporter.loadOriginalComponent(chosen.sample,chosen.selector);
      const prepared=original.recordType===61 ? regular.prepareOriginalRegularComponent(chosen.sample,chosen.selector) : null;
      const source=prepared ? regular.preparedToNativeComponent(prepared) : original;
      const component=importer.relocateComponent(source,{idStart:nextId}); nextId+=10000;
      const appended=importer.appendOriginalClientTemplate(bytes,component); bytes=appended.bytes;
      const measured=componentDrawingBounds(original,regular.originalRect);
      const designSize=measured.designSize;
      const paths=[], byId=new Map(original.records.map(r=>[r.id,r]));
      function textPaths(record,path) {
        if (record.content.includes(25) || record.content.includes(84)) paths.push(path);
        const children=record.children.map(id=>byId.get(id));
        for (const child of children) {
          if (!child) throw Error('Missing original child');
          if (children.filter(c=>c.name===child.name).length>1 && (child.content.includes(25)||child.content.includes(84))) throw Error('Ambiguous original text alias');
          textPaths(child,path ? path+'/'+child.name : child.name);
        }
      }
      textPaths(original.records[0],'');
      product={templateId:component.rootId, designSize, center:measured.center, clearTextPaths:paths,
        sourceSha256:original.sourceSha256,
        ...(prepared?.nodes.find(n=>n.kind==='textbox') ? {fontColor:prepared.nodes.find(n=>n.kind==='textbox').fontColor} : {})};
      used.set(key,product); inputs.push(fileRecord(original.sourcePath));
      adoption.push({sample:chosen.sample,selector:chosen.selector,sourceSha256:original.sourceSha256,
        sourceRecordType:original.sourceRecordType??original.recordType,nativeTemplateIndex:component.rootId,controls:component.records.length,
        relocation:component.relocation,conversion:source.conversion??null,promotion:promoted?.ledger??null, ledger:prepared?.ledger??[],
        dynamicContentChanges:{clearOriginalExampleText:paths},officialImport:'unverified'});
    }
    widgets[role]={...product};
  }
  const rawBase=join(directory,'original-components-base.gil');writeFileSync(rawBase,bytes,{flag:'wx'});
  let profile;
  const result=await buildNativeCandidateFromToolchain({baseMap:rawBase,root,output:join(directory,'whole-game'),workKey:'alpha-test',
    readyCardArt:false,artFeatures:{cards:false,menuBackground:false,selectionAvatar:false,battlePortrait:false,monsters:false},componentWidgets:widgets,
    generatedModules:{...generatedRuntimeModules,abyss_component_binding:'scripts/build-component-candidate.mjs'},
    prepare:async generated=>{
      const data=spawnSync(process.execPath,['scripts/build-lua-data.mjs','data',join(generated,'abyss_data.lua')],{cwd:root,encoding:'utf8'});
      if(data.status!==0)throw Error(data.stderr||'Core data build failed');
      buildUI(generated,process.env.ABYSS_PYTHON||'python',{workKey:'alpha-test',readyCardArt:false,artFeatures:{}});
      const businessTemplates=JSON.parse(readFileSync(join(generated,'game-ui-templates.json'),'utf8'));
      profile=prepareComponentControlLayout(JSON.parse(readFileSync(join(generated,'game-ui.json'),'utf8')),
        businessTemplates,widgets);
      profile.binding.eagerPages=eagerPages;
      profile.layout.script={name:'abyss_ui',values:{nativeComponentControls:true}};
      writeFileSync(join(generated,'game-ui.json'),JSON.stringify(profile.layout));
      writeFileSync(join(generated,'game-ui-templates.json'),JSON.stringify(profile.templates));
      writeFileSync(join(generated,'native-component-binding.json'),JSON.stringify(profile.binding));
      writeFileSync(join(generated,'abyss_component_binding.lua'),componentBindingSource(profile.binding));
      writeFileSync(join(generated,'abyss_ui_layout.lua'),'return '+toLua(profile.layout.controls)+'\n');
      writeFileSync(join(generated,'abyss_ui_templates.lua'),'return '+toLua(Object.fromEntries(profile.templates.map(t=>[t.name,t])))+'\n');
    }});
  for(const input of inputs)if(fileRecord(input.path).sha256!==input.sha256)throw Error('Original component input changed during packaging');
  const componentReceipt={schemaVersion:1,eagerPages,candidate:fileRecord(result.mapPath),buildId:result.buildId,
    sourceCommit:result.sourceCommit,sourceDirty:result.sourceDirty,inputs,adoption,profile:profile.receipt,
    preservation:'Client70 raw fields retained with inverse byte-exact typed relocation. Regular61 explicitly translated and original unknown group component retained.',
    statuses:{sourceCheck:'pass',writeReadback:'pass',officialImport:'unverified',ready:'unverified',devicePerformance:'unverified'}};
  writeFileSync(join(directory,'component-control.json'),JSON.stringify(componentReceipt,null,2));
  return {...result,componentReceiptPath:join(directory,'component-control.json')};
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2),eagerPages=args.includes('--eager-pages'),paths=args.filter(arg=>arg!=='--eager-pages');
  const [baseMap,kitRoot,manifest,output]=paths;
  try {if(paths.length>4||paths.some(arg=>arg.startsWith('--')))throw Error('Usage: build-component-candidate.mjs <base.gil> <kit> <manifest> [output] [--eager-pages]');const result=await buildComponentCandidate({baseMap,kitRoot,manifest,output,eagerPages}); console.log(JSON.stringify({candidate:result.mapPath,receipt:result.componentReceiptPath}));}
  catch(error){console.error(error.stack);process.exitCode=1;}
}
