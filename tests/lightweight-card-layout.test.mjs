import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {compactBoundedCardFaces} from '../scripts/lightweight-card-layout.mjs';
import {cardFaceChildren} from '../scripts/card-face.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {toLua} from '../scripts/build-lua-data.mjs';

const children=node=>node.controls??node.children??[];
const count=node=>1+children(node).reduce((sum,child)=>sum+count(child),0);
const child=(node,name)=>children(node).find(entry=>entry.name===name);
const paths=node=>Object.fromEntries(children(node).flatMap(entry=>[
 [entry.name,{...entry,children:undefined,controls:undefined}],
 ...Object.entries(paths(entry)).map(([path,value])=>[entry.name+'/'+path,value]),
]));
const groups=face=>[
 ...['roundShadow','roundFrame','roundBody','tagEdge','tagBody'].map(name=>child(face,name)),
 ...['edge','body'].map(name=>child(child(face,'blockedPill'),name)),
 ...['attack','skill','power'].flatMap(kind=>['edge','well'].map(name=>child(child(child(face,'skin'),kind),name))),
];

test('only the opt-in transform removes decoration, preserving every text/input/icon and semantic parent',()=>{
 const layout=gameLayout(),templates=[deckCardTemplate()],source=structuredClone(layout),before=count(layout);
 const prior=paths(layout),templateBefore=count(templates[0]);
 const result=compactBoundedCardFaces(layout,templates);
 assert.equal(result.cardHosts,61);assert.equal(before-count(layout),2940);
 assert.equal(templateBefore-count(templates[0]),49);assert.equal(result.removedControls,2989);
 const after=paths(layout);
 for(const[path,node]of Object.entries(prior))if(node.kind==='text'||['cursorArea','presetButton','grid'].includes(node.kind)
   ||/\/(?:roleMark|costDisc|costHalo|blockedLock|art(?:_|$))/.test('/'+path))assert.deepEqual(after[path],node,path);
 assert.deepEqual(gameLayout(),source,'the default layout changed without the transform');
 const stable=structuredClone(layout);assert.equal(compactBoundedCardFaces(layout,templates).removedControls,0);
 assert.deepEqual(layout,stable,'second transform was not idempotent');
});

test('flat decoration uses exact bounds and colors while keeping thirteen semantic containers',()=>{
 for(const context of ['battle','deck','node']){
  const face={name:'face',kind:'container',children:cardFaceChildren(nativeTheme,context)},before=structuredClone(face);
  compactBoundedCardFaces(face);
  assert.equal(count(before)-count(face),49);
  for(const[group,index]of groups(face).map((group,index)=>[group,index])){
   assert.equal(group.kind,'container');assert.deepEqual(group.children.map(c=>c.name),['flat']);
   const original=groups(before)[index],flat=group.children[0];
   assert.equal(flat.kind,'image');assert.equal(flat.image,100001);assert.equal(flat.colour,original.children[0].colour);
   const left=Math.min(...original.children.map(c=>(c.position?.[0]??0)-c.size[0]/2));
   const right=Math.max(...original.children.map(c=>(c.position?.[0]??0)+c.size[0]/2));
   assert(Math.abs(flat.size[0]-(right-left))<1e-9);
   assert.deepEqual({...group,children:undefined},{...original,children:undefined});
  }
 }
});

test('preserving artwork windows retains exact attack, skill and power silhouettes while compacting other decoration',()=>{
 for(const context of ['battle','deck','node']){
  const face={name:'face',kind:'container',children:cardFaceChildren(nativeTheme,context)};
  const template=deckCardTemplate();
  const skin=child(face,'skin'),before=structuredClone(skin),templateSkin=structuredClone(child(child(template,'face'),'skin'));
  const beforeCount=count(face),cost=child(face,'cost'),art=child(face,context==='node'?'art_attack':'art');
  const result=compactBoundedCardFaces(face,[template],{preserveWindows:true});
  assert(result.removedControls>0);assert(count(face)<beforeCount);
  assert.equal(child(face,'skin'),skin,'window owner identity changed');
  assert.deepEqual(skin,before,'window geometry or colors changed');
  assert.deepEqual(child(child(template,'face'),'skin'),templateSkin,'deck template windows changed');
  assert.deepEqual(child(face,'roundBody').children.map(n=>n.name),['flat']);
  assert.equal(child(face,'cost'),cost);assert.equal(child(face,context==='node'?'art_attack':'art'),art);
  const stable=structuredClone(face);
  assert.equal(compactBoundedCardFaces(face,[template],{preserveWindows:true}).removedControls,0);
  assert.deepEqual(face,stable,'window-preserving transform was not idempotent');
 }
});

test('non-card lookalikes and malformed decoration are rejected without partial rewrites',()=>{
 const fake={name:'other',children:[{name:'roundFrame'},{name:'skin'}]},before=structuredClone(fake);
 assert.equal(compactBoundedCardFaces(fake).cardHosts,0);assert.deepEqual(fake,before);
 const face={name:'face',children:cardFaceChildren(nativeTheme,'battle')};child(face,'roundBody').children[0].kind='text';
 const invalid=structuredClone(face);assert.throws(()=>compactBoundedCardFaces(face),/decoration|image/i);assert.deepEqual(face,invalid);
});

const convert=value=>typeof value==='string'&&/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)
 ?{r:parseInt(value.slice(1,3),16),g:parseInt(value.slice(3,5),16),b:parseInt(value.slice(5,7),16),a:value.length===9?parseInt(value.slice(7,9),16):255}
 :Array.isArray(value)?value.map(convert):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,x])=>[key,convert(x)])):value;
const require=createRequire(import.meta.url);
function skinLua(body){
 const face={name:'face',kind:'container',children:cardFaceChildren(nativeTheme,'battle')};compactBoundedCardFaces(face);
 const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari'),state=lauxlib.luaL_newstate();lualib.luaL_openlibs(state);
 const script=`
 local Theme=${toLua(convert(nativeTheme))}
 require=function(name)assert(name=='abyss_theme');return Theme end
 local function control(spec)
  local c={name=spec.name,kind=spec.kind,children={},alive=true,visible=spec.visible~=false,text='',size=spec.size}
  function c:GetChild(name)assert(self.alive,'invalid native object');return assert(self.children[name],'missing '..name)end
  function c:GetChildren()assert(self.alive,'invalid native object');local list={};for _,value in pairs(self.children)do list[#list+1]=value end;return list end
  function c:SetVisible(value)self.visible=value end
  function c:SetSizeDelta(w,h)self.size={w,h}end
  function c:SetAnchoredPosition(x,y)self.x,self.y=x,y end
  function c:SetLocalScale(x,y,z)self.scale={x,y,z}end
  for _,entry in ipairs(spec.children or {})do c.children[entry.name]=control(entry)end
  return c
 end
 local box=control(${toLua(face)})
 local Skin=(function()${readFileSync('src/lua/abyss_card_skin.lua','utf8')}\nend)()
 local platform={color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end}
 ${body}`;
 try{const status=lauxlib.luaL_dostring(state,to_luastring(script));
  assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?undefined:to_jsstring(lua.lua_tostring(state,-1)))}
 finally{lua.lua_close(state)}
}

test('real CardSkin paints flat rarity/window and resizes blocked reason without changing costs or roles',()=>skinLua(`
 Skin.configure('premium')
 local definition={type='skill',rarity='uncommon',cost=1}
 Skin.apply(box,definition,platform,{dim=true,blockReason='insufficient_energy',cost=1,baseCost=2})
 local flat=box:GetChild('roundFrame'):GetChild('flat')
 assert(flat.imageColor.r==Theme.cardSkin.rarities.uncommon[1].r)
 assert(box:GetChild('skin'):GetChild('skill').visible and not box:GetChild('skin'):GetChild('attack').visible)
 assert(box:GetChild('roleMark'):GetChild('traveler').visible and box:GetChild('costHalo').visible)
 assert(box:GetChild('blockedReason').text=='能量不足' and box:GetChild('blockedReason').visible)
 local pill=box:GetChild('blockedPill');local width=pill.size[1]
 assert(pill:GetChild('edge'):GetChild('flat').size[1]==width)
 assert(pill:GetChild('body'):GetChild('flat').size[1]==width-Theme.cardSkin.blocked.stroke*2)
 Skin.apply(box,{type='attack',rarity='rare',cost=-2},platform,{cost=-2,baseCost=-2})
 assert(not box:GetChild('blockedReason').visible and not box:GetChild('costDisc').visible)
 assert(box:GetChild('roundFrame'):GetChild('flat').imageColor.r==Theme.cardSkin.rarities.rare[1].r)
`));

test('rarity-colored inner trim and type plate leave role accents and cost semantics unchanged',()=>skinLua(`
 Theme.cardSkin.rarityWindow=true
 Theme.cardSkin.typePlate={r=196,g=202,b=211,a=255}
 local definition={type='attack',rarity='rare',cost=1}
 Skin.apply(box,definition,platform,{cost=1,baseCost=1})
 local expected=Theme.cardSkin.rarities.rare[4]
 local edge=box:GetChild('skin'):GetChild('attack'):GetChild('edge'):GetChild('flat').imageColor
 assert(edge.r==expected.r and edge.g==expected.g and edge.b==expected.b)
 local tagEdge=box:GetChild('tagEdge'):GetChild('flat')
 local typeEdge=box:GetChild('typeEdge')
 for _,control in ipairs({tagEdge,typeEdge})do
  local colour=assert(control.imageColor,'missing paint on '..control.name)
  assert(colour.r==expected.r and colour.g==expected.g and colour.b==expected.b)
 end
 local plate=box:GetChild('tagBody'):GetChild('flat').imageColor
 assert(plate.r==196 and plate.g==202 and plate.b==211)
 local accent=Theme.cardSkin.roles.traveler.accent
 local disc=box:GetChild('costDisc').imageColor
 assert(disc.r==accent.r and disc.g==accent.g and disc.b==accent.b)
 assert(box:GetChild('roleMark'):GetChild('traveler').visible)
 local mark=box:GetChild('roleMark'):GetChild('traveler'):GetChild('symbol').imageColor
 assert(mark.r==accent.r and mark.g==accent.g and mark.b==accent.b)
 Skin.apply(box,definition,platform,{dim=true,blockReason='insufficient_energy',cost=1,baseCost=1})
 local blocked=box:GetChild('cost').fontColor
 assert(blocked.r==Theme.cardSkin.costTone.up.r and blocked.g==Theme.cardSkin.costTone.up.g and blocked.b==Theme.cardSkin.costTone.up.b)
 `));

test('flat discovery and size failures retain native error propagation',()=>skinLua(`
 local frame=box:GetChild('roundFrame');frame.GetChildren=function()error('native enumeration failed')end
 local ok,reason=pcall(Skin.apply,box,{type='attack',rarity='common',cost=1},platform,{cost=1,baseCost=1})
 assert(not ok and tostring(reason):find('native enumeration failed',1,true),'native enumeration failure was hidden')
 frame.GetChildren=nil
 local flat=box:GetChild('blockedPill'):GetChild('edge'):GetChild('flat')
 flat.SetSizeDelta=function()error('native flat resize failed')end
 -- A second fresh skin owner prevents a failed decorative cache from masking the resize probe.
 frame.GetChildren=function(self)return {self:GetChild('flat')}end
 ok,reason=pcall(Skin.apply,box,{type='attack',rarity='rare',cost=1},platform,{dim=true,cost=1,baseCost=1})
 assert(not ok and tostring(reason):find('native flat resize failed',1,true),'native flat resize failure was hidden')
`));
