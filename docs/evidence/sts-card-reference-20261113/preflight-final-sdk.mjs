import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const parse=createRequire(import.meta.url)('luaparse').parse,input=process.argv[2],output=process.argv[3];assert(!fs.existsSync(output),'new preflight receipt required');
const prep=JSON.parse(fs.readFileSync(path.join(input,'preparation.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
const walk=n=>[n,...(n.children??[]).flatMap(walk)],rows=[];
for(const fixture of prep.fixtures){
 const bytes=fs.readFileSync(fixture.save);assert.equal(hash(bytes),fixture.sha256);const save=JSON.parse(bytes),registry=new Map(save.assets.scripts.map(s=>[s.path.replace(/\.lua$/,''),s]));
 assert.equal(registry.size,save.assets.scripts.length);assert.equal(new Set(save.assets.scripts.map(s=>s.guid)).size,save.assets.scripts.length);
 const eager=[],optional=[];
 for(const script of save.assets.scripts){
  const ast=parse(script.source,{luaVersion:'5.3'});
  const visit=(node,depth=0)=>{
   if(!node||typeof node!=='object')return;
   if(node.type==='CallExpression'&&node.base?.type==='Identifier'&&node.base.name==='require'){
    const literal=node.arguments?.[0];assert.equal(literal?.type,'StringLiteral','literal module names required in frozen fixture');
    const name=literal.value??literal.raw.slice(1,-1);assert(/^[a-zA-Z0-9_]+$/.test(name));
    const row={from:script.path,module:name,mounted:registry.has(name)};(depth?optional:eager).push(row);if(!depth)assert(registry.has(name),'missing eager registry module '+name);
   }
   const next=depth+Number(node.type==='FunctionDeclaration');
   for(const value of Object.values(node)){if(Array.isArray(value))for(const child of value)visit(child,next);else if(value&&typeof value==='object')visit(value,next);}
  };visit(ast);
 }
 const serverNodes=walk(save.assets.server.root),templates=save.assets.client.root.children,templateGuids=new Set(templates.map(t=>t.guid));
 assert.equal(new Set(serverNodes.map(n=>n.guid)).size,serverNodes.length,'duplicate server control GUID');
 const mounted=save.assets.scripts.filter(s=>s.controlId);assert.equal(mounted.length,1);assert(serverNodes.some(n=>n.id===mounted[0].controlId&&n.scriptMappingIds.includes(mounted[0].guid)));
 const source=mounted[0].source,templateBindings=[...source.matchAll(/(?:imageTemplateIndex|containerTemplateIndex)=(\d+)/g)].map(m=>Number(m[1]));
 for(const guid of templateBindings)assert(templateGuids.has(guid),'missing native template binding '+guid);
 const cards=serverNodes.filter(n=>/^card\d*$/.test(n.name));assert.equal(cards.length,fixture.name==='compatibility'?1:Number(fixture.name.split('-')[1]));
 for(const card of cards){const names=new Set(card.children.map(n=>n.name));for(const name of ['stsReferenceBack','stsReferenceChrome','art','name','type','cost','label'])assert(names.has(name));
  assert.equal(walk(card).filter(n=>/^part\d+$/.test(n.name)).length,142);
  assert.equal(names.has('artSamples'),fixture.name==='compatibility','official flag boundary must remain cards=false');}
 rows.push({fixture:fixture.name,inputSha256:fixture.sha256,parsedScripts:save.assets.scripts.length,eagerRequires:eager,conditionalRequires:optional,templateBindings,serverControls:serverNodes.length,cards:cards.length,status:'passed'});
}
for(const [file,sha]of Object.entries(prep.inputs))assert.equal(hash(fs.readFileSync(file)),sha,'frozen production input drift '+file);
const report={status:'passed',productionSha:prep.productionSha,scope:'all generated Lua parses; eager SDK registry closure, mounts, literal require paths, template bindings, frozen production identity, 142 pools and official art flag checked. Optional originalV4/prebuilt-surface function branches are recorded and are outside this controlled probe.',rows};
fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(rows.map(r=>({fixture:r.fixture,parsed:r.parsedScripts,eager:r.eagerRequires.length,optional:r.conditionalRequires.length,cards:r.cards,status:r.status}))));
