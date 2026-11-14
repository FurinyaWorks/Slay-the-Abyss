// Compose the menu into a frozen current application, never into another worker's tree.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {toLua} from '../../scripts/build-lua-data.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const names=['menuRuinsScene','start','titleQuit','v25MainMenu','title'];
const walk=n=>[n,...(n.children??[]).flatMap(walk)];
function menuOf(save){const a=walk(save.assets.server.root).filter(n=>n.name==='menuPanel');assert.equal(a.length,1);return a[0];}
function withoutMenu(root){const copy=structuredClone(root);for(const n of walk(copy))if(n.name==='menuPanel')n.children=n.children.filter(c=>!names.includes(c.name));return copy;}
export function composeMenuPreview(base,red,{presentation,menuModules,buildId}){
 const save=structuredClone(base),before=menuOf(base),menu=menuOf(save),replacement=menuOf(red);
 const occupied=walk(save.assets.server.root).concat(walk(save.assets.client.root));
 let next=Math.max(...occupied.map(n=>Number.isSafeInteger(n.guid)?n.guid:0))+1;
 const copied=[];
 for(const name of names){
  const source=replacement.children.filter(n=>n.name===name);assert.equal(source.length,1,name);
  const at=menu.children.findIndex(n=>n.name===name);assert(at>=0,'Missing baseline menu handle '+name);
  const node=structuredClone(source[0]);
  for(const n of walk(node)){
   assert(!(n.scriptMappingIds??[]).length,'Menu subtree must not introduce root scripts');
   assert(!(n.giaRelatedGuids??[]).length,'Unexpected external menu control reference');
   n.id='n'+next;n.guid=next++;
  }
  menu.children[at]=node;copied.push(name);
 }
 assert.deepEqual(withoutMenu(save.assets.server.root),withoutMenu(base.assets.server.root),'Unrelated UI changed');
 assert.deepEqual(save.assets.client,base.assets.client,'Current templates changed');
 assert.deepEqual(save.serverLogic,base.serverLogic,'Gameplay/server source changed');
 const byName=new Map(save.assets.scripts.map(s=>[s.path,s]));assert.equal(byName.size,save.assets.scripts.length);
 for(const name of ['abyss_v25_menu_view.lua','abyss_game_ui_menu_view.lua']){
  assert(byName.has(name)&&typeof menuModules[name]==='string');byName.get(name).source=menuModules[name];
 }
 const foreground=byName.get('abyss_game_ui_view.lua');assert(foreground);
 const nl=foreground.source.includes('\r\n')?'\r\n':'\n',anchor=`function M.exitEntryVisible(self)${nl}    return function()${nl}`;
 assert.equal(foreground.source.split(anchor).length-1,1,'Current foreground adapter must retain a unique exit entry hook');
 foreground.source=foreground.source.replace(anchor,anchor+[
  "            local minimal=(Theme.presentationProfile=='official-assets-first' or Theme.presentationProfile=='v25-reference')",
  '                and Theme.menuPresentation and Theme.menuPresentation.minimal',
  "            if minimal and self.mode=='menu' and not self.characterOpen then return false end",'',
 ].join(nl));
 const tokens=structuredClone(presentation);
 for(const key of ['ink','muted','accent']){assert(/^#[\da-f]{6}$/i.test(tokens[key]));tokens[key]={r:parseInt(tokens[key].slice(1,3),16),g:parseInt(tokens[key].slice(3,5),16),b:parseInt(tokens[key].slice(5,7),16),a:255};}
 const theme=byName.get('abyss_theme.lua');assert(theme);
 theme.source='local __menuTheme=(function()\n'+theme.source+'\nend)()\n'+
  '__menuTheme.menuPresentation='+toLua(tokens)+'\n'+
  '__menuTheme.layout.v25Menu.start='+toLua(tokens.start)+'\n'+
  '__menuTheme.layout.v25Menu.quit='+toLua(tokens.quit)+'\nreturn __menuTheme\n';
 const startup=byName.get('abyss_ui.lua');assert(startup);startup.source='print('+JSON.stringify('ABYSS_BUILD '+buildId)+')\n'+startup.source;
 const changedModules=save.assets.scripts.filter((s,i)=>s.source!==base.assets.scripts[i].source).map(s=>s.path);
 assert.equal(changedModules.length,5);assert.equal(save.assets.scripts.length,base.assets.scripts.length);
 const ids=walk(save.assets.server.root).map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
 return {save,report:{changedModules,copiedMenuScopes:copied,unchangedModules:save.assets.scripts.length-changedModules.length,
  unrelatedUiSha256:hash(JSON.stringify(withoutMenu(save.assets.server.root))),templatesSha256:hash(JSON.stringify(save.assets.client)),
  previousMenuSha256:hash(JSON.stringify(before)),menuSha256:hash(JSON.stringify(menu))}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [styleFile,styleReceiptFile,redFile,outArg]=process.argv.slice(2);assert(styleFile&&styleReceiptFile&&redFile&&outArg);
 const out=path.resolve(outArg);assert(!fs.existsSync(out),'Use a new output directory');
 const styleBytes=fs.readFileSync(styleFile),style=JSON.parse(styleBytes),receipt=JSON.parse(fs.readFileSync(styleReceiptFile)),redBytes=fs.readFileSync(redFile),red=JSON.parse(redBytes);
 assert.equal(hash(styleBytes),receipt.saveSha256,'The full style archive must match its receipt');
 assert.equal(receipt.fixture.injectionSha256,hash(''),'Only natural production startup is accepted');
 assert.equal(receipt.fixture.originalSha256,receipt.fixture.fixtureModuleSha256);
 for(const s of style.assets.scripts){const expected=receipt.inputs['src/lua/'+s.path]??receipt.generated[s.path];assert(expected,'Unrecorded style module '+s.path);assert.equal(hash(s.source),expected,s.path+' source identity');}
 const menuModules=Object.fromEntries(['abyss_v25_menu_view','abyss_game_ui_menu_view'].map(n=>[n+'.lua',fs.readFileSync('src/lua/'+n+'.lua','utf8')]));
 const buildId=randomUUID(),presentation=JSON.parse(fs.readFileSync('data/presentation/ui_theme.json')).menuPresentation;
 const result=composeMenuPreview(style,red,{presentation,menuModules,buildId});
 fs.mkdirSync(out,{recursive:true});const destination=out+'/combined.save.json';fs.writeFileSync(destination,JSON.stringify(result.save));
 const report={kind:'current-style-with-menu-preview',buildId,sourceCommit:receipt.sourceCommit,sourceClosureSha256:receipt.sourceClosureSha256,
  styleInput:{path:path.resolve(styleFile),sha256:hash(styleBytes),receipt:path.resolve(styleReceiptFile),receiptSha256:hash(fs.readFileSync(styleReceiptFile))},
  menuInput:{path:path.resolve(redFile),sha256:hash(redBytes)},output:destination,saveSha256:hash(fs.readFileSync(destination)),
  ...result.report,moduleDigests:Object.fromEntries(result.save.assets.scripts.map(s=>[s.path,hash(s.source)])),
  officialClient:'UNVERIFIED',scope:'Composed Simulator source preview; not a newly compiled GIL'};
 fs.writeFileSync(out+'/composition.json',JSON.stringify(report,null,2));console.log(JSON.stringify({buildId,path:destination,sourceCommit:report.sourceCommit,changedModules:report.changedModules}));
}
