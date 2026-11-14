import test from 'node:test';import assert from 'node:assert/strict';
import {composeMenuPreview} from '../experiments/menu-red-fit/compose.mjs';
test('menu composition preserves current pages, templates, gameplay and reveal code',()=>{
 let id=1;const node=(name,children=[])=>({name,id:'n'+id,guid:id++,children,scriptMappingIds:[]});
 const names=['menuRuinsScene','start','titleQuit','v25MainMenu','title'];
 const old={assets:{server:{root:node('root',[node('stage',[node('menuPanel',names.map(n=>node(n))),node('characterPanel',[node('new-character')]),node('pageReveal')])])},client:{root:node('templates')},scripts:[
  {path:'abyss_theme.lua',source:'return {layout={v25Menu={}},newStyle=true}'},
  {path:'abyss_v25_menu_view.lua',source:'old menu'},
  {path:'abyss_game_ui_menu_view.lua',source:'old menu animation'},
  {path:'abyss_game_ui_view.lua',source:'local PageReveal={}\nfunction M.exitEntryVisible(self)\n    return function()\n        return true\n    end\nend\n'},
  {path:'abyss_ui.lua',source:'production startup'},
  {path:'abyss_deck_ui.lua',source:'latest deck reuse'},
 ]},serverLogic:{rules:['current-rules']}};
 const red={assets:{server:{root:node('root',[node('menuPanel',names.map(n=>node(n,[node('red-'+n)])))])}}};
 const before=JSON.stringify(old),modules={'abyss_v25_menu_view.lua':'new menu','abyss_game_ui_menu_view.lua':'new animation'};
 const {save,report}=composeMenuPreview(old,red,{presentation:{ink:'#F5E7DF',muted:'#B9A7A5',accent:'#FF7867',start:[1,2,3,4],quit:[5,6,7,8]},menuModules:modules,buildId:'test'});
 assert.equal(JSON.stringify(old),before,'caller inputs are immutable');
 assert.deepEqual(save.assets.client,old.assets.client);assert.deepEqual(save.serverLogic,old.serverLogic);
 assert.equal(save.assets.scripts.find(s=>s.path==='abyss_deck_ui.lua').source,'latest deck reuse');
 assert(save.assets.scripts.find(s=>s.path==='abyss_game_ui_view.lua').source.includes('local PageReveal={}'));
 assert.deepEqual(report.changedModules.sort(),['abyss_game_ui_menu_view.lua','abyss_game_ui_view.lua','abyss_theme.lua','abyss_ui.lua','abyss_v25_menu_view.lua'].sort());
 const nodes=n=>[n,...n.children.flatMap(nodes)],all=nodes(save.assets.server.root);
 assert.equal(new Set(all.map(n=>n.id)).size,all.length);
 assert(all.some(n=>n.name==='new-character'));assert(all.some(n=>n.name==='pageReveal'));
 assert(all.some(n=>n.name==='red-menuRuinsScene'));
});
