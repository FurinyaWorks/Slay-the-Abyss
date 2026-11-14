import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';

const require=createRequire(import.meta.url);
const sharedFaceHelpers=`
local function sharedFace(box)
 local geometry=assert(require('abyss_card_skin').referenceGeometry(box),'missing production shared card geometry')
 local front=assert(box:GetChild('stsReferenceChrome'))
 local back=assert(box:GetChild('stsReferenceBack'))
 return {geometry=geometry,front=front,back=back,body=back:GetChild('body'),portraits=back:GetChild('portraits')}
end
local function imageLeaves(root,out)
 out=out or{}
 if root.kind=='image'then out[#out+1]=root
 else for _,part in ipairs(root:GetChildren())do imageLeaves(part,out)end end
 return out
end
local function sameColour(actual,expected,label)
 for i,key in ipairs({'r','g','b','a'})do
  assert(actual and (actual[key]or actual[i])==(expected[key]or expected[i]or 255),label..' '..key)
 end
end
`;
function runOfficial(t,body,marker,overrides={},official=true){
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'official-runtime-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{officialAssets:official,nativePageLifecycle:official});
 const modules=readdirSync(directory).filter(name=>name.endsWith('.lua')).map(name=>name.slice(0,-4));
 for(const name of ['abyss_data','abyss_ui_layout','abyss_ui_templates','abyss_theme','abyss_ui_profile'])assert(modules.includes(name));
 const layout=JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8'));
 const theme=JSON.parse(readFileSync(official?join(directory,'official-assets-theme.json'):'data/presentation/ui_theme.json','utf8'));
 const stage=layout.controls.find(c=>c.name==='stage');
 const battle=stage.children.find(c=>c.name==='battlePanel');
 const face=battle.children.find(c=>c.name==='card1');
 if(official){
 const pileGrid=stage.children.find(c=>c.name==='deckPanel').children.find(c=>c.name==='pileGrid');
 const templates=JSON.parse(readFileSync(join(directory,'game-ui-templates.json'),'utf8'));
 const pile=templates.find(c=>c.name===pileGrid.itemTemplate);
 assert.equal(pile.name,'AbyssBattlePileCard');
 const expected=structuredClone(face);
 Object.assign(expected,{name:'face',position:[0,0],scale:[1,1],rotation:0,visible:true});
 expected.children=expected.children.filter(c=>c.name!=='hit');
 for(const name of ['glow','nativePlayableRim','costHalo'])expected.children.find(c=>c.name===name).visible=false;
 assert.deepEqual(pile.children.find(c=>c.name==='face'),expected,'pile must reuse the final official hand face exactly');
 assert.deepEqual(pile.children.find(c=>c.name==='hit').size,[150,210]);
 const ordinary=structuredClone(templates.find(c=>c.name==='AbyssDeckCard').children.find(c=>c.name==='face'));
 ordinary.position=[0,0];
 assert.deepEqual(ordinary,expected,'permanent and combat piles share the final hand face');
 assert.equal(face.children.find(c=>c.name==='stsReferenceBack').children.find(c=>c.name==='body').children.find(c=>c.name==='paperWell').image,theme.image.rect,
  'the generated production shared face retains its rectangular paper well');
 }else{
  assert.notEqual(theme.presentationProfile,'official-assets-first');
  assert(face.children.some(c=>c.name==='skin'),'default layout must retain its actual legacy face');
  assert(!face.children.some(c=>c.name==='stsReferenceBack'),'default fixture must not borrow the official face');
 }
 const overrideLoads=Object.entries(overrides).map(([name,source])=>{
  assert.match(name,/^abyss_[a-z_]+$/);
  const file=join(directory,'override-'+name+'.lua');writeFileSync(file,source);
  return `package.preload[${luaString(name)}]=assert(loadfile(${luaString(file.replaceAll('\\','/'))}))`;
 }).join('\n');
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
-- Fixture paths include build/lua. Explicit preloads prevent any generated
-- module from silently falling back to another candidate's shared build.
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local profile=require('abyss_ui_profile');assert(profile.nativePageLifecycle==${official})
${overrideLoads}
local GameUI=require('abyss_game_ui');local create=GameUI.new;local Fixture
-- Pass the generated bootstrap setting into the real Host. The shared fixture
-- otherwise omits this platform option; do not replace lifecycle implementation.
GameUI.new=function(root,data,presentation,event,platform)
 local active={}
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local prior=getmetatable(page);active[page]=true
  setmetatable(page,{__index=function(c,key)if key=='active'then return active[c]end;return prior.__index(c,key)end,
   __newindex=function(c,key,value)assert(key~='active','active is readonly');return prior.__newindex(c,key,value)end})
  page.SetActive=function(c,value)active[c]=value;Fixture.setEngineActive(c,value)end
 end
 platform.nativePageLifecycle=profile.nativePageLifecycle
 return create(root,data,presentation,event,platform)
end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
Fixture=H.F
local C=H.F.Combat
${sharedFaceHelpers}
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local function unchanged(state,before,message)assert(same(state,before),message)end
${body}
print('${marker}')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
  cwd:process.cwd(),encoding:'utf8',maxBuffer:2*1024*1024,timeout:30000,
  env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,new RegExp(marker));
}

test('official long reward descriptions keep the same full illustration and type slots on recycled shared faces',t=>{
 runOfficial(t,`
local h,u,p,_,_,_,_,root=H.setup({'blood_for_blood','body_slam','armaments'},{'cultist'})
local D=require('abyss_card_display');local template=require('abyss_ui_templates')
local faces={p:GetChild('card1'),H.F.control(template.AbyssDeckCard):GetChild('face'),
 root:GetChild('nodePanel'):GetChild('shopView'):GetChild('card1')}
local long='本场战斗每失去 一 次生命，本牌费用 减少一。造成 18 点伤害。'
for _,face in ipairs(faces)do
 local body=face:GetChild('label')or face:GetChild('description')
 local geometry=sharedFace(face).geometry
 local illustrations={}
 for _,picture in ipairs(face:GetChildren())do if picture.name=='art'or picture.name:match('^art_')then
  local measured={picture.sizeDeltaX,picture.sizeDeltaY,picture.localScaleX or 1,picture.localScaleY or 1,picture.x,picture.y}
  assert(measured[1]>0 and measured[2]>0,'production illustration needs a real measured size')
  illustrations[#illustrations+1]={control=picture,measured=measured}
 end end
 assert(#illustrations>0,'production face lost its semantic illustration slots')
 for _,text in ipairs({long,'获得 5 点格挡。',long})do
  assert(D.writeBody(body,text,face),'full unchanged reward text must fit')
  assert(body.text==text and body.fontSize>=14,'full text and native minimum')
  assert(body.sizeDeltaX==geometry.body.size[1]and body.sizeDeltaY==geometry.body.size[2],'fixed measured reading slot')
  assert(body.x==geometry.body.position[1]and body.y==geometry.body.position[2],'measured body anchor changed')
  for _,entry in ipairs(illustrations)do local picture,measured=entry.control,entry.measured
   assert((picture.localScaleX or 1)==measured[3]and(picture.localScaleY or 1)==measured[4],'long text compressed illustration')
   assert(picture.sizeDeltaX==measured[1]and picture.sizeDeltaY==measured[2],'full shared illustration changed size')
   assert(picture.x==measured[5]and picture.y==measured[6],'long text moved the illustration slot')
  end
  assert(body.y+body.sizeDeltaY/2<=-4 and body.y-body.sizeDeltaY/2>=-96,'reading slot leaves the card')
 end
end
dofile('tests/lua/warrior75_card_text.lua')
`, 'official fixed long card slots ok')
});

test('official successful card command reuses its presented feedback frame while preflight and recovery remain live',t=>{
 runOfficial(t,`
local Run=require('abyss_run');local Theme=H.F.Theme
local function setup()
 local h,u,p=H.setup({'strike','defend','strike'},{'cultist'})
 local b=h.run.combat;u.selected=b.hand[1].uid;u:render()
 return h,u,p,b
end
local h,u,p,b=setup();local renders={};local render=u.render
u.render=function(self,...)
 renders[#renders+1]={selected=self.selected,busy=self.busy,display=self.displayBattle}
 return render(self,...)
end
local uid,energy,hp=u.selected,b.energy,b.enemies[1].hp
u:playSelected(1)
assert(#renders==2,'successful command needs preflight and feedback frame, not a duplicate refresh: '..#renders)
assert(renders[1].selected==uid and renders[1].busy,'preflight must still run before commit')
assert(renders[2].selected==nil and renders[2].busy,'first feedback frame must include the cleared selection')
assert(u.selected==nil and u.busy and u.displayBattle==u.feedback.shadow)
assert(b.energy==energy-1 and #b.hand==2 and not p:GetChild('endTurn').interactable)
-- No optimization is allowed to submit through a broken presentation preflight.
local h2,u2,p2,b2=setup();local runPlay=Run.play;local commands=0
Run.play=function(...)commands=commands+1;return runPlay(...)end
local original=u2.render;local fail=true
u2.render=function(self,...)if fail then fail=false;error('INJECTED_PREFLIGHT_REUSE_FAILURE')end;return original(self,...)end
local before=C.copy(b2);u2:playSelected(1)
assert(commands==0 and not u2.busy and not u2.displayBattle)
unchanged(b2,before,'failed preflight submitted a command')
Run.play=runPlay
-- A committed command whose feedback start fails still reconciles final state.
local h3,u3,p3,b3=setup();local beforeEnergy=b3.energy
u3.feedback.start=function()error('INJECTED_REUSE_FEEDBACK_START_FAILURE')end
u3:playSelected(1)
assert(not u3.busy and not u3.feedback.busy and not u3.displayBattle)
assert(b3.energy==beforeEnergy-1 and #b3.hand==2 and u3.selected==nil)
assert(p3:GetChild('endTurn').interactable,'startup recovery left input disabled')
`, 'OFFICIAL_FEEDBACK_FRAME_REUSE_PASS');
 // The default production layout still owns the legacy skin. Its refresh
 // contract needs that real layout/theme pair, rather than changing the theme
 // underneath an official face whose retired legacy children no longer exist.
 runOfficial(t,`
local h,u,p=H.setup({'strike','defend','strike'},{'cultist'})
assert(H.F.Theme.presentationProfile~='official-assets-first' and p:GetChild('card1'):GetChild('skin'))
local b=h.run.combat;u.selected=b.hand[1].uid;u:render()
local full=u.render;local count=0;u.render=function(self,...)count=count+1;return full(self,...)end
u:playSelected(1)
assert(count==3,'legacy theme must keep the existing refresh path')
`, 'DEFAULT_FEEDBACK_FRAME_REFRESH_PASS',{},false);
});

test('official mouse targeting returns to the source centre with frame time while touch keeps its own pose',t=>{
 runOfficial(t,`
local Theme=H.F.Theme
local function setup(touch)
 local deck={};for i=1,10 do deck[i]='strike'end
 local h,u,p,event=H.setup(deck,{'cultist','jaw_worm'});C.draw(h.run.combat,10);u:render();h:update(2)
 local box=p:GetChild('card10');local enemy=H.F.actorControl(p,'enemy1')
 event('card10','down',64,box.x,box.y);u.gesture.touchScreen=touch
 event('card10','drag',64,enemy.x,enemy.y)
 assert(u.gesture and u.gesture.moving and u.gesture.drawnAiming)
 return h,u,p,event,box,enemy
end
local h,u,p,event,box,enemy=setup(false);local before=C.copy(h.run.combat)
local x=box.x;assert(x>100,'requires the right edge of a ten-card hand')
for i=1,6 do event('card10','drag',64,enemy.x,enemy.y)end
assert(box.x==x,'pointer event rate advanced the source position clock')
h:update(.1);assert(math.abs(box.x-x*.4)<.00001,'source single-target position must lerp once with dt*6')
u.fastMode=true
for i=1,15 do h:update(.1)end
assert(math.abs(box.x)<.00001,'FAST mode left the aimed card in its old hand column')
assert(u.cardPositions[u.gesture.uid][1]==box.x,'moving aim lost the actual release origin')
unchanged(h.run.combat,before,'mouse aim interpolation changed core state')
-- Touch retains its existing free pointer pose; it never acquires mouse centring.
local ht,ut,pt,et,bt,enemyT=setup(true);local tx=bt.x
ht:update(.1);assert(bt.x==tx and math.abs(tx)>100,'touch aiming was forced to the mouse centre')
`, 'OFFICIAL_SOURCE_MOUSE_AIM_PASS');
});

test('official real drag release preserves the drawn origin and commits through only the mandatory preflight',t=>{
 runOfficial(t,`
local Run=require('abyss_run');local Theme=H.F.Theme
local function setup()
 local h,u,p,event,tap,drain=H.setup({'strike','defend','strike'},{'cultist'})
 local b=h.run.combat;local uid=b.hand[1].uid;local enemy=H.F.actorControl(p,'enemy1')
 event('card1','down',71);local pickup=u.gesture.origin;local px,py=pickup[1],pickup[2]
 event('card1','drag',71,enemy.x,enemy.y)
 h:update(.1) -- Source targeting moves with the animation clock, not pointer frequency.
 assert(u.gesture and u.gesture.moving and u.gesture.drawnValid and u.gesture.drawnTarget==1)
 local card=p:GetChild('card1');local drawn={card.x,card.y}
 assert(math.abs(drawn[2]-py)>1,'probe requires a moved reading card')
 return h,u,p,event,drain,b,uid,enemy,drawn,pickup,px,py
end
local h,u,p,event,drain,b,uid,enemy,drawn,pickup,px,py=setup()
assert(u.cardPositions[uid][1]==drawn[1] and u.cardPositions[uid][2]==drawn[2],'display origin cache stayed at the old hand pose')
assert(pickup[1]==px and pickup[2]==py,'live pose synchronization mutated pickup origin alias')
local renders={};local render=u.render;u.render=function(self,...)renders[#renders+1]=self.busy;return render(self,...)end
local playSelected=u.playSelected;local releasedDrawn
u.playSelected=function(self,...)local card=p:GetChild('card1');releasedDrawn={card.x,card.y};return playSelected(self,...)end
local start=u.feedback.start;local origin
u.feedback.start=function(self,before,battle,first,presentation,point)origin=point;return start(self,before,battle,first,presentation,point)end
local energy=b.energy;event('dragLayer','up',71,enemy.x,enemy.y)
assert(#renders==2 and renders[1]==true and renders[2]==true,'real drag must skip only the nonbusy intermediate render: '..#renders)
assert(origin and origin[1]==releasedDrawn[1] and origin[2]==releasedDrawn[2],'flight did not start at the actually drawn release pose')
assert(u.gesture==nil and u.carry==nil and b.energy==energy-1 and #b.hand==2)
local plays=0;for _,e in ipairs(b.events)do if e.kind=='play'then plays=plays+1 end end;assert(plays==1)
drain();event('card1','endDrag',71,enemy.x,enemy.y);event('card1','click',71,enemy.x,enemy.y)
assert(b.energy==energy-1 and #b.hand==2 and u.selected==nil,'released drag Click submitted or selected another card')
-- A real drag still cannot commit when the mandatory presentation preflight fails.
local h2,u2,p2,event2,drain2,b2,uid2,enemy2=setup();local before=C.copy(b2);local runPlay=Run.play;local calls=0
Run.play=function(...)calls=calls+1;return runPlay(...)end
local full=u2.render;local fail=true;u2.render=function(self,...)if fail then fail=false;assert(self.busy);error('DRAG_PREFLIGHT_FAIL')end;return full(self,...)end
event2('dragLayer','up',71,enemy2.x,enemy2.y);Run.play=runPlay
assert(calls==0 and not u2.busy and not u2.displayBattle);unchanged(b2,before,'drag preflight failure committed core state')
-- An invalid enemy drop remains a carry/target interaction, never a command.
local h3,u3,p3,event3,drain3,b3=setup();local before3=C.copy(b3);local count=0;local full3=u3.render
u3.render=function(self,...)count=count+1;return full3(self,...)end
event3('dragLayer','up',71,-500,0)
assert(count>0 and not u3.busy);unchanged(b3,before3,'invalid target drop committed a card')
`, 'OFFICIAL_REAL_DRAG_RELEASE_PASS');
 runOfficial(t,`
local h,u,p,event=H.setup({'strike','defend','strike'},{'cultist'})
assert(H.F.Theme.presentationProfile~='official-assets-first')
local enemy=H.F.actorControl(p,'enemy1')
event('card1','down',71);event('card1','drag',71,enemy.x,enemy.y);h:update(.1)
assert(u.gesture and u.gesture.moving and u.gesture.drawnValid and u.gesture.drawnTarget==1)
local count4=0;local full4=u.render
u.render=function(self,...)count4=count4+1;return full4(self,...)end
event('dragLayer','up',71,enemy.x,enemy.y)
assert(count4==4,'default real drag path changed: '..count4)
`, 'DEFAULT_REAL_DRAG_RELEASE_PASS',{},false);
});

const officialSingleDamageSetup=`
local Theme=H.F.Theme
local function start(id,fast)
 local h,u,p=H.setup({id},{'cultist'})
 local battle=h.run.combat;u.fastMode=fast==true
 u.selected=battle.hand[1].uid;u:render();u:playSelected(1)
 assert(u.feedback.current.kind=='play' and u.busy)
 return h,u,battle,p
end
`;
test('official proven single-hit contact and FAST action waits',t=>{
 runOfficial(t,officialSingleDamageSetup+`for _,id in ipairs({'strike','bash','anger','pommel_strike','headbutt'})do
 local h,u,b=start(id);local committed=b.enemies[1].hp
 assert(u.displayBattle.enemies[1].hp>committed,'core must commit before presentation '..id)
 h:update(.099)
 assert(u.feedback.current.kind=='play','source pre-contact .1 wait was skipped '..id)
 h:update(.002)
 assert(u.feedback.current.kind=='damage' and u.displayBattle.enemies[1].hp==committed,'extra play hold delayed contact '..id)
 h:update(.099);assert(u.feedback.current.kind=='damage','non-FAST post-contact .1 wait was skipped '..id)
 h:update(.002);assert(u.feedback.current==nil or u.feedback.current.kind~='damage','duplicate DamageAction wait remained '..id)
end
local h,u,b=start('strike',true);h:update(.101);assert(u.feedback.current.kind=='damage')
h:update(0);assert(not u.busy,'FAST must not invent the non-FAST post-contact wait')
`, 'OFFICIAL_SINGLE_DAMAGE_TIMING_PASS');
});

test('official proven single-hit flight interpolation and contact continuity',t=>{
 runOfficial(t,officialSingleDamageSetup+`local h,u,b,p=start('strike');local flight=u.feedback.flight;local card=p:GetChild('feedback'):GetChild('playedCard')
local dx=flight.tx-flight.x;assert(math.abs(dx)>1,'flight probe needs distinct X endpoints')
local previous=0
for i=1,9 do
 h:update(.01);local progress=(card.x-flight.x)/dx
 assert(progress>=previous and progress<=1,'played card moved backwards or overshot');previous=progress
end
h:update(.009);local near=(card.x-flight.x)/dx
assert(near>.96,'source-contact flight remained near its old .2s starting pose')
h:update(.002)
assert(math.abs(card.x-flight.tx)<.001 and math.abs(card.y-(flight.ty-(flight.stop or 0)))<.001,'contact must complete the flight')
assert(1-near<.04,'contact introduced a mid-flight snap')
`, 'OFFICIAL_SINGLE_DAMAGE_TIMING_PASS');
});

test('official proven single-hit source exceptions and default theme isolation',t=>{
 runOfficial(t,officialSingleDamageSetup+`-- Source exceptions retain their explicit VFX, action waits and existing gates.
for _,id in ipairs({'bludgeon','cleave','twin_strike','iron_wave','defend'})do
 local h,u,b=start(id);h:update(.101)
 assert(u.feedback.current.kind=='play','unverified source group was generalized '..id)
end
local h,u,b=start('strike');local previous=Theme.presentationProfile;Theme.presentationProfile=nil
h:update(.101);assert(u.feedback.current.kind=='play','default theme timing changed');Theme.presentationProfile=previous
`, 'OFFICIAL_SINGLE_DAMAGE_TIMING_PASS');
});

test('official targeting keeps arrows and live HP without detached combat simulation',t=>{
 runOfficial(t,`
local Damage=require('abyss_battle_damage_view')
Damage.preview=function()error('official card aim simulated the whole battle')end
Damage.potionPreview=function()error('official potion aim simulated the whole battle')end
local h,u,p,event,_,drain=H.setup({'strike','defend'},{'cultist'})
h.run.potions={'fire_potion'};h:refresh()
local enemy=assert(require('abyss_monster_surfaces').get(p):find(h.run.combat.enemies[1].id))
local hp=h.run.combat.enemies[1].hp
event('potion1','down',7);event('potion1','drag',7,enemy.x,enemy.y)
assert(u.potionAim and u.potionAim.moving)
assert(p:GetChild('dragLayer'):GetChild('aim1').visible)
assert(not enemy:GetChild('damagePreview').visible)
assert(h.run.combat.enemies[1].hp==hp)
event('dragLayer','up',7,enemy.x,enemy.y);drain()
assert(h.run.combat.enemies[1].hp==hp-20 and h.run.potions[1]==nil)
event('card1','down',8);event('card1','drag',8,enemy.x,enemy.y)
assert(u.gesture and u.gesture.moving)
assert(not enemy:GetChild('damagePreview').visible)
assert(h.run.combat.enemies[1].hp==hp-20)
-- Group targeting is a reticle rule, independent of simulated future HP.
local h2,u2,p2,event2,_,drain2=H.setup({'cleave','defend'},{'cultist','cultist'})
local battle=h2.run.combat
local surfaces=require('abyss_monster_surfaces').get(p2)
local boxes={(surfaces:find(battle.enemies[1].id)),(surfaces:find(battle.enemies[2].id))}
local before={battle.enemies[1].hp,battle.enemies[2].hp}
local function slotFor(id)
 for index,card in ipairs(battle.hand)do if card.cardId==id then return 'card'..index,card.uid end end
 error('missing legal hand card '..id)
end
local function targetCorners(expected)
 for _,box in ipairs(boxes)do
  for _,x in ipairs({-1,1})do for _,y in ipairs({-1,1})do for _,axis in ipairs({'H','V'})do
   assert(box:GetChild('target'..axis..x..'_'..y).visible==expected,'AoE/self target corner')
  end end end
  assert(not box:GetChild('damagePreview').visible,'future HP label must stay absent')
 end
end
local cleave,cleaveUid=slotFor('cleave')
assert(C.canPlay(battle,cleaveUid))
event2(cleave,'down',20);event2(cleave,'drag',20,boxes[1].x,boxes[1].y)
assert(u2.gesture and u2.gesture.moving)
targetCorners(true)
assert(battle.enemies[1].hp==before[1] and battle.enemies[2].hp==before[2],'aim must not alter live HP')
event2('dragLayer','up',20,boxes[1].x,boxes[1].y);drain2()
assert(battle.enemies[1].hp==before[1]-8 and battle.enemies[2].hp==before[2]-8,'legal AoE must still damage both enemies')
local defend,defendUid=slotFor('defend')
assert(C.canPlay(battle,defendUid))
event2(defend,'down',21);event2(defend,'drag',21,boxes[1].x,boxes[1].y)
assert(u2.gesture and u2.gesture.moving)
targetCorners(false)
local block=battle.player.block
event2('dragLayer','up',21,boxes[1].x,boxes[1].y);drain2()
assert(battle.player.block==block+5,'legal self card must retain real block')
`, 'OFFICIAL_TARGET_NO_SIMULATION_PASS');
});

test('official candidate preserves real ten-card dual-enemy combat through cancellation, dragging and turns',t=>{
 runOfficial(t,`
local deck={};for i=1,12 do deck[i]='strike'end
local h,u,p,event,tap,drain,toggle,root=H.setup(deck,{'cultist','jaw_worm'})
local b=h.run.combat
assert(#b.hand==5 and #b.enemies==2)
C.draw(b,20);h:refresh();h:update(1)
assert(#b.hand==10 and #b.draw==2,'real draw must enforce ten-card cap')
local seen={}
for i,c in ipairs(b.hand)do
 assert(not seen[c.uid] and C.cardDefinition(b,c).id=='strike');seen[c.uid]=true
 assert(p:GetChild('card'..i).visible,'legal hand slot missing')
end
assert(H.F.actorControl(p,'enemy1').visible and H.F.actorControl(p,'enemy2').visible)
local dataBefore=C.copy(H.F.Data);local before=C.copy(b)
-- The shared native mock does not initialize static images from the layout.
-- Bind precisely the generated image IDs, then fail if render substitutes them.
local function specChild(node,name)
 for _,v in ipairs(node.children or {})do if v.name==name then return v end end
 error('missing generated child '..name)
end
local layout=require('abyss_ui_layout');local stage
for _,v in ipairs(layout)do if v.name=='stage'then stage=v end end
local battle=specChild(stage,'battlePanel')
local textures={}
local function bindImages(control,generated)
  if generated.kind=='image'then
   control:SetImage('static',generated.image);textures[#textures+1]={control,generated.image}
  else for _,part in ipairs(generated.children or{})do bindImages(control:GetChild(part.name),part)end end
end
for i=1,10 do
 local card=p:GetChild('card'..i);local spec=specChild(battle,'card'..i)
 for _,name in ipairs({'stsReferenceBack','stsReferenceChrome'})do bindImages(card:GetChild(name),specChild(spec,name))end
end
h:refresh();u:render()
for _,entry in ipairs(textures)do assert(entry[1].imageId==entry[2],'render replaced official card texture')end
-- Exercise the shared native cost material and authoritative number palette,
-- real cost painter as well as red/green changes and insufficient-energy ink.
local Skin=require('abyss_card_skin');local theme=H.F.Theme
local card=p:GetChild('card1');local number=card:GetChild('cost')
local ink=theme.cardSkin.costText
local battleInk=theme.cardSkin.battleCostText
assert(ink.r==255 and ink.g==248 and ink.b==216,'shared official coin neutral ink')
assert(battleInk.r==255 and battleInk.g==248 and battleInk.b==216,'battle coin neutral ink')
local function colour(actual,expected,label)
 assert(actual and actual.r==expected.r and actual.g==expected.g and actual.b==expected.b,label)
end
colour(number.fontColor,battleInk,'live battle neutral cost')
local paint={color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end}
local definition=C.cardDefinition(b,b.hand[1])
for _,case in ipairs({
 {cost=0,baseCost=1,tone=theme.cardSkin.costTone.down,direction='↓'},
 {cost=2,baseCost=1,tone=theme.cardSkin.costTone.up,direction='↑'},
 {cost=1,baseCost=1,dim=true,blockReason='insufficient_energy',tone=theme.cardSkin.costTone.up,direction=''},
 {cost=1,baseCost=1,dim=true,blockReason='invalid_target',tone=ink,direction=''},
 {cost=1,baseCost=1,tone=ink,direction=''},
})do
 Skin.apply(card,definition,paint,case)
 colour(number.fontColor,case.tone,'live cost semantic ink')
 assert(card:GetChild('costDirection').text==case.direction,'live cost direction')
 case.surfaceScope='battle'
 Skin.apply(card,definition,paint,case)
 colour(number.fontColor,case.tone==ink and battleInk or case.tone,'battle scoped semantic ink')
 assert(card:GetChild('costDirection').text==case.direction,'battle scoped cost direction')
end
local costless=C.copy(definition);costless.cost=-2
Skin.apply(card,costless,paint,{surfaceScope='battle'})
local costMaterial=sharedFace(card).front:GetChild('costMaterial')
assert(not costMaterial.visible and not number.visible,'costless card keeps a coin')
u:render();assert(costMaterial.visible and number.visible,'live shared cost material not restored')
colour(number.fontColor,battleInk,'battle neutral ink restored after semantic cost changes')
unchanged(b,before,'official image binding mutated Combat')
unchanged(H.F.Data,dataBefore,'official image binding mutated Core data')
-- Selection alone is presentation-only. A resize invalidates the held pointer,
-- including a late release/click after another pointer makes a fresh selection.
event('card1','down',7);h:resize(1600,900)
tap('card1',8);assert(u.selected==b.hand[1].uid)
event('card1','up',7);event('card1','click',7)
unchanged(b,before,'cancelled touch committed a replacement selection')
tap('card1',8);assert(u.selected==nil)
unchanged(b,before,'selection/cancel changed combat')
-- Successful drag aims at the second real enemy and spends one energy once.
local target=H.F.actorControl(p,'enemy2');local hp,otherHP=b.enemies[2].hp,b.enemies[1].hp
b.enemies[1].sourcePosition={x=-600,y=0};b.enemies[2].sourcePosition={x=-100,y=0};u:render()
target=H.F.actorControl(p,'enemy2')
event('card1','down',9);event('card1','drag',9,target.x,target.y)
event('dragLayer','up',9,target.x,target.y);drain()
assert(b.energy==2 and #b.hand==9 and b.enemies[2].hp==hp-6,'targeted drag did not commit real Strike')
assert(b.enemies[1].hp==otherHP,'targeted drag damaged the unselected enemy')
local committed=C.copy(b)
event('card1','endDrag',9,target.x,target.y);event('card1','up',9);event('card1','click',9)
unchanged(b,committed,'late drag events replayed a committed card')
-- Moving drag interrupted by a modal must not revive on return.
event('card1','down',10);event('card1','drag',10,-285,0);toggle()
event('card1','up',10);event('card1','endDrag',10);event('card1','click',10)
assert(u.selected==nil and u.gesture==nil and not p:GetChild('dragLayer').visible)
unchanged(b,committed,'modal-cancelled drag spent energy or dealt damage')
local playerHP=b.player.hp
tap('endTurn',11);drain()
assert(b.turn==2 and b.energy==3 and b.player.hp<playerHP,'enemy damage and next-turn refill missing')
assert(p:GetChild('energy').text=='3/3')
for _,entry in ipairs(textures)do assert(entry[1].imageId==entry[2],'hand refresh lost official texture')end
unchanged(H.F.Data,dataBefore,'gameplay mutated generated Core data')
-- A dead preview target must not make Clash glow when the other real target
-- is rejected by its original only-attacks rule.
local ch,cu,cp,_,_,_,_,cr=H.setup({'clash','defend'},{'cultist','jaw_worm'})
local cb=ch.run.combat;cb.enemies[1].hp=0;cu.target=1;ch:refresh()
for i,card in ipairs(cb.hand)do if card.cardId=='clash'then
 assert(not C.canPlay(cb,card.uid,1)and not C.canPlay(cb,card.uid,2))
 assert(not cp:GetChild('card'..i):GetChild('nativePlayableRim').visible,'Clash has no legal target but glows')
end end
-- Shortcut retains the existing modal transaction identity, including a
-- mandatory choice that opens/closes between physical Down and Up.
local rh=cp:GetChild('topBar'):GetChild('battleRoute'):GetChild('hit')
local function routeEvent(kind,id)return rh.listeners[kind]({touchId=id})end
routeEvent('down',700);ch.choiceUI.generation=ch.choiceUI.generation+1
routeEvent('up',700);assert(not routeEvent('click',700)and not ch.routeOpen)
ch.choiceUI.visible=true
routeEvent('down',701);routeEvent('up',701);assert(not routeEvent('click',701)and not ch.routeOpen)
ch.choiceUI.visible=false
routeEvent('down',702);routeEvent('up',702);assert(routeEvent('click',702)and ch.routeOpen)
assert(cr:GetChild('mapPanel'):GetChild('previewBack'):GetChild('label').text=='返回战斗')
assert(ch:closeExit()and not ch.routeOpen and ch.mode=='battle')
assert(cr:GetChild('mapPanel'):GetChild('previewBack'):GetChild('label').text~='返回战斗')
`, 'OFFICIAL_RUNTIME_COMBAT_PASS');
});

test('official candidate keeps C-mode, repeated pile modals, real victory and return-map controls live',t=>{
 runOfficial(t,`
local F=H.F
local h,root=F.fixture();assert(F.start(h));assert(H.Run.startCombat(h.run,'cultist_solo'))
h.run.combat=C.new(F.Data,{deck={'strike','strike','strike','strike','strike','strike'},enemies={'cultist','jaw_worm'}})
h:refresh();local u,p,b=h.battleUI,root:GetChild('battlePanel'),h.run.combat
assert(not u.dragEnabled,'C-mode must not expose drag capabilities')
local hp=b.enemies[1].hp
F.click(root,'battlePanel','card1');assert(u.selected==b.hand[1].uid and b.energy==3)
F.click(root,'battlePanel','enemy1');assert(b.energy==2 and b.enemies[1].hp==hp-6)
assert(#b.discard==1 and #b.draw==1)
-- Twenty round trips with real nonempty draw/discard sources; reject commands
-- while covered and verify every return restores the same active combat owner.
for i=1,20 do
 local kind=i%2==0 and 'discard' or 'draw';local before=C.copy(b)
 local hit=p:GetChild(kind..'Icon'):GetChild('hit')
 assert(hit.visible and hit.raycastTarget and hit.click({touchId=100+i}))
 h:update(0)
 assert(h.deckUI.visible and h.deckUI.pileKind==kind and not u.active)
 local modal=root:GetChild('deckPanel');local grid=modal:GetChild('pileGrid')
 assert(grid.visible and grid.itemCount==#b[kind] and not modal:GetChild('grid').visible)
 local bindings=0
 for control,binding in pairs(h.deckUI.bindings)do
  assert(control.alive,'repeated pile views retained a destroyed native control')
  if binding.generation==h.deckUI.generation then
   bindings=bindings+1
   local found=false
   for _,card in ipairs(b[kind])do if card.uid==binding.uid then found=true end end
   assert(found,'pile view bound a UID outside the real combat pile')
  end
 end
 assert(bindings==#b[kind],'repeated pile view lost its current native binding')
 u:endTurn();u:playSlot(1)
 unchanged(b,before,'covered battle accepted a command')
 assert(root:GetChild('deckPanel'):GetChild('close'):GetChild('hit').click({touchId=100+i}))
 assert(not h.deckUI.visible and u.active and h.run.combat==b)
 assert(not grid.visible and grid.itemCount==0,'closed pile retained active native items')
 unchanged(b,before,'pile round trip mutated combat')
end
F.click(root,'battlePanel','card1');F.click(root,'battlePanel','enemy2')
assert(b.energy==1,'C-mode failed after repeated page lifecycle')
-- A separate legal one-card encounter reaches victory via actual card input,
-- not by editing HP or injecting reward phase/state.
local win,view,panel,event,tap,drain,toggle,winRoot=H.setup({'bludgeon'},{'acid_slime_s'})
tap('card1',201);tap('enemy1',201);drain()
assert(win.run.phase=='reward' and panel:GetChild('rewardList').visible)
for _,kind in ipairs({'draw','discard'})do
 local hit=panel:GetChild(kind..'Icon'):GetChild('hit')
 assert(not hit.visible and not hit.click({touchId=202}) and not win.deckUI.visible,'reward retained battle pile input')
end
panel:GetChild('cardReward').click();assert(panel:GetChild('rewardStage').visible)
toggle();assert(view.active and panel:GetChild('rewardStage').visible)
local count=#win.run.deck
tap('card1',203);drain()
assert(#win.run.deck==count+1 and win.run.rewards.cardResolved,'real card reward not claimed')
panel:GetChild('continue').click();win:refresh()
assert(win.run.phase=='map' and win.mode=='map' and not view.active)
assert(winRoot:GetChild('mapPanel').visible and not panel.visible,'reward did not restore map page')
local before=C.copy(win.run)
event('card1','up',201);event('card1','click',201)
unchanged(win.run,before,'late battle pointer acted after return to map')
`, 'OFFICIAL_RUNTIME_FLOW_PASS');
});

test('official three-bottle HUD renders metadata while popup, drag and use validate fresh core state',t=>{
 runOfficial(t,`
local Run=require('abyss_run');local Candidate=require('abyss_run_potion_candidate')
local deck={};for i=1,10 do deck[i]='strike'end
deck[10]='bash' -- Automatic hover needs an actual keyword-bearing card.
local h,u,p,event,tap,drain=H.setup(deck,{'cultist','jaw_worm'})
for _,id in ipairs({'fire_potion','dexterity_potion','block_potion'})do assert(Run.obtainPotion(h.run,id))end
local battle=h.run.combat;C.draw(battle,10)
local keyword;for i,card in ipairs(battle.hand)do if card.cardId=='bash'then keyword=i;break end end
assert(#battle.hand==10 and keyword)
battle.hand[2],battle.hand[keyword]=battle.hand[keyword],battle.hand[2]
u:render();h:update(.1)
local calls={};local prepare=Candidate.prepare
Candidate.prepare=function(run,slot,...)calls[#calls+1]=slot;return prepare(run,slot,...)end
local whole=Run.potionView
Run.potionView=function(...)error('official idle HUD must not stage the inventory')end
local before,data=C.copy(battle),C.copy(h.run.data)
u:render();event('card2','enter',1);h:update(.36)
assert(u.info and u.info.transient,'three-bottle hover did not open tooltip')
event('card2','exit',1)
event('card2','down',2)
local enemy=H.F.actorControl(p,'enemy1')
event('card2','drag',2,enemy.x,enemy.y);event('dragLayer','up',2,-900,-900)
assert(#calls==0,'hover/tooltip/card cancel staged potion effects')
assert(not u.selected and not u.gesture)
unchanged(battle,before,'metadata render changed combat/RNG')
unchanged(h.run.data,data,'metadata render changed definitions')
assert(h.run.potions[1]=='fire_potion' and h.run.potions[2]=='dexterity_potion' and h.run.potions[3]=='block_potion')
assert(u.potionViewCache[1].canUse==nil,'metadata fabricated a gameplay eligibility decision')
local value=u.potionViewCache[1].effects[1].value
u.potionViewCache[1].effects[1].value=-999;u:render()
assert(u.potionViewCache[1].effects[1].value==value,'metadata effects aliased a definition')
-- Popup eligibility remains an immediate selected-slot query, not metadata.
tap('potion3',3);assert(u.potionMenu and #calls>0)
for _,slot in ipairs(calls)do assert(slot==3,'popup staged an unselected bottle')end
local popup=p:GetChild('potionHelp'):GetChild('potionPopup')
assert(popup:GetChild('use').interactable)
local count=#calls;battle.player.block=2147483647
assert(popup:GetChild('use').click()==false,'stale popup used newly invalid block potion')
assert(#calls>count and h.run.potions[3]=='block_potion' and not u.busy)
battle.player.block=0
count=#calls
assert(popup:GetChild('use').click());drain()
for i=count+1,#calls do assert(calls[i]==3,'selected potion Use staged another inventory slot')end
assert(not h.run.potions[3] and battle.player.block==12)
-- In-place pending choice after Down is rejected by the actual drag validator.
event('potion1','down',8);battle.pendingChoice={}
count=#calls;event('potion1','drag',8,enemy.x,enemy.y)
assert(#calls>count and not u.potionAim,'potion drag trusted stale metadata')
assert(h.run.potions[1]=='fire_potion')
battle.pendingChoice=nil;event('potion1','up',8)
Candidate.prepare=prepare
-- Unknown stored IDs remain occupied physical slots, never fabricated vacancies.
h.run.potions[3]='not_a_potion';u:render()
assert(u.potionViewCache[3].id=='not_a_potion' and u.potionViewCache[3].canUse==nil)
h.run.potions[3]=nil;u:render()
`, 'OFFICIAL_POTION_METADATA_PASS');
 runOfficial(t,`
local Run=require('abyss_run');local h,u=H.setup({'strike','defend'},{'cultist'})
assert(H.F.Theme.presentationProfile~='official-assets-first')
assert(Run.obtainPotion(h.run,'fire_potion'))
local whole=Run.potionView;local views=0
Run.potionView=function(...)views=views+1;return whole(...)end
u:render();assert(views==1 and u.potionViewCache[1].canUse~=nil)
Run.potionView=whole
`, 'DEFAULT_POTION_INVENTORY_VIEW_PASS',{},false);
});

test('official hover refresh touches poses only and falls back on turn, UID and viewport changes',t=>{
 runOfficial(t,`
local deck={};for i=1,10 do deck[i]='strike'end
deck[10]='bash' -- Slot3's delayed hover must exercise a real keyword tooltip.
local h,u,p,event=H.setup(deck,{'cultist','jaw_worm'});local c=h.run.combat
C.draw(c,10)
local keyword;for i,card in ipairs(c.hand)do if card.cardId=='bash'then keyword=i;break end end
assert(#c.hand==10 and keyword)
c.hand[3],c.hand[keyword]=c.hand[keyword],c.hand[3]
u:render();h:update(.1)
local renders,previews=0,0;local full=u.render;local preview=C.cardPreview
u.render=function(self,...)renders=renders+1;return full(self,...)end
C.cardPreview=function(...)previews=previews+1;return preview(...)end
local before=C.copy(c)
event('card2','enter',1);assert(u.hover==2 and renders==0 and previews==0)
event('card2','exit',1);event('card3','enter',2)
assert(u.hover==3 and renders==0 and previews==0,'hover must not rebuild ten card rules')
unchanged(c,before,'hover changed combat state')
h:update(.36);assert(u.info and u.info.transient)
renders,previews=0,0;event('card3','exit',2)
assert(not u.info and not u.hover and renders==0 and previews==0,'automatic tooltip exit rebuilt the battle')
C.addStatus(c.player,'strength',4);u:render()
local body=p:GetChild('card4'):GetChild('label').text:gsub('<[^>]+>','')
assert(body:find(tostring(preview(c,c.hand[4])[1].low),1,true),'full state update lost current core numbers')
renders,previews=0,0;event('card4','enter',3)
assert(renders==0 and previews==0,'hover re-evaluated an unchanged readout')
event('card4','exit',3);c.turn=c.turn+1
event('card5','enter',4);assert(renders>0 and previews>=10,'new turn must invalidate the geometry-only path')
event('card5','exit',4);renders,previews=0,0
c.hand[1],c.hand[2]=c.hand[2],c.hand[1]
event('card6','enter',5);assert(renders>0 and previews>=10,'UID-to-slot change must use a fresh full render')
event('card6','exit',5);renders,previews=0,0
u:resize(1600,900);event('card7','enter',6)
assert(renders>0 and previews>=10,'viewport change must not reuse the old pose identity')
event('card7','exit',6)
assert(u:openHelp(u:cardHelpSpec(1),p:GetChild('card1'):GetChild('hit'),false))
event('card1','down',20);assert(not u.gesture and u.swallow,'explicit reader close passed through')
event('card1','up',20);event('card1','click',20);assert(not u.selected and not u.swallow)
C.cardPreview=preview
`, 'OFFICIAL_LOCAL_HOVER_PASS');
});

test('official local aim refresh keeps live Weak/Vulnerable numbers and both actor targets without rebuilding the other cards',t=>{
 runOfficial(t,`
local deck={};for i=1,10 do deck[i]='strike'end
local h,u,p,event=H.setup(deck,{'cultist','jaw_worm'});local c=h.run.combat
C.draw(c,10);C.addStatus(c.player,'strength',4);C.addStatus(c.player,'weak',1);C.addStatus(c.enemies[2],'vulnerable',1)
c.enemies[1].sourcePosition={x=-300,y=0};c.enemies[2].sourcePosition={x=80,y=0}
u:render();h:update(.1)
local uid=c.hand[1].uid;local before=C.copy(c);local calls,renders={},0
local full,preview=u.render,C.cardPreview
u.render=function(self,...)renders=renders+1;return full(self,...)end
C.cardPreview=function(state,instance,target)calls[#calls+1]={uid=instance.uid,target=target};return preview(state,instance,target)end
local names={};for i=2,10 do names[i]=p:GetChild('card'..i):GetChild('label').text end
local geometry=require('abyss_battle_enemy_view').geometry
local a,b=geometry(c.enemies[1]),geometry(c.enemies[2]);local card=p:GetChild('card1')
event('card1','down',51,card.x,card.y)
event('card1','drag',51,a.hitX,a.hitY)
local function check(value,target)
 assert(renders==0 and #calls==1 and calls[1].uid==uid and calls[1].target==target,'aim must read only its current live UID/target')
 local label=card:GetChild('label').text:gsub('<[^>]+>',''):gsub('↑',''):gsub('↓','')
 assert(label:find(tostring(value),1,true),'current core target number missing')
 for i=2,10 do assert(p:GetChild('card'..i):GetChild('label').text==names[i],'retarget rewrote an unrelated card')end
 calls={}
end
check(7,1)
local first,second=H.F.actorControl(p,'enemy1'),H.F.actorControl(p,'enemy2')
assert(first:GetChild('portrait').imageColor.a==255 and second:GetChild('portrait').imageColor.a==102,'neutral target highlight mismatch')
event('dragLayer','drag',51,b.hitX,b.hitY);check(11,2)
assert(first:GetChild('portrait').imageColor.a==102 and second:GetChild('portrait').imageColor.a==255,'retarget did not refresh both actor tones')
event('dragLayer','up',51,card.x,H.F.Theme.layout.hand.y-35)
assert(not u.gesture and not u.selected and renders>0,'cancel must keep the full state reconciliation path')
assert(card:GetChild('label').text:gsub('<[^>]+>',''):find('7',1,true),'cancel retained a target-specific number')
unchanged(c,before,'local aim/cancel changed combat resources or RNG')
C.cardPreview=preview
`, 'OFFICIAL_LOCAL_AIM_PASS');
});

test('official hand centres resolve the initial hover and owned drag without neighbour interception',t=>{
 runOfficial(t,`ABYSS_HAND_HIT_COUNTS={10};dofile('tests/lua/hand_hover_hit_bounds.lua')`, 'OFFICIAL_HAND_HIT_PASS');
});

test('official shop keeps readable button ink after repaint and directly previews the map without changing stock',t=>{
 runOfficial(t,`
local F=H.F;local Map=require('abyss_map')
local host,root=F.fixture(nil,nil,nil,{CursorEnter='enter',CursorExit='exit',CursorDown='down',CursorUp='up',CursorEndDrag='endDrag'})
host.seed=42;assert(F.start(host));local shop
while not shop do
 local choices=Map.available(host.map);assert(#choices>0)
 for _,node in ipairs(choices)do if node.type=='shop'then shop=node;break end end
 if not shop then assert(Map.choose(host.map,choices[1].id))end
end
host.run.floor=host.map.floor;host:refresh();assert(F.Nodes.restoreMap(host.run,host.map))
assert(host.mapUI:choose(shop.id)and host.mode=='node')
local page,Theme=root:GetChild('nodePanel'),require('abyss_theme')
local button,label=page:GetChild('confirm'),page:GetChild('confirm'):GetChild('label')
local function ink(expected)
 assert(label.fontColor.r==expected.r and label.fontColor.g==expected.g and label.fontColor.b==expected.b,'official dark button ink was overwritten by light-button ink')
end
assert(label.text=='离开商店');ink(Theme.officialAssets.buttonInk)
local hit=button:GetChild('hit')
hit.listeners.enter({touchId=800});ink(Theme.officialAssets.buttonInk)
hit.listeners.down({touchId=800});ink(Theme.officialAssets.buttonInk)
hit.listeners.endDrag({touchId=800});host:refresh();ink(Theme.officialAssets.buttonInk)
local route=assert(page:GetChild('runRoute'),'shop direct map shortcut missing'):GetChild('hit')
local function event(kind,id)return route.listeners[kind]({touchId=id})end
local function tap(id)event('down',id);event('up',id);return event('click',id)end
local before,mapBefore=C.copy(host.run),C.copy(host.map)
event('down',801);host.choiceUI.generation=host.choiceUI.generation+1
event('up',801);assert(not event('click',801)and not host.routeOpen,'late route click crossed choice generation')
assert(host:openDeck());assert(not tap(802)and not host.routeOpen)
assert(host:closeDeck());assert(tap(803)and host.routeOpen and not host.mapUI.navigationEnabled)
assert(not event('click',803),'duplicate click reopened map')
assert(not host.mapUI:choose(Map.available(host.map)[1].id))
assert(host:closeExit()and not host.routeOpen and host.mode=='node'and host.nodeUI.visible)
unchanged(host.run,before,'map preview changed shop stock, selected offer or RNG')
unchanged(host.map,mapBefore,'map preview changed navigation')
host:refresh();ink(Theme.officialAssets.buttonInk)
`, 'OFFICIAL_SHOP_ROUTE_INK_PASS');
});

test('official browser return rejects stale clicks across new choices and browser generations',t=>{
 runOfficial(t,`
local host,_,_,_,_,_,_,root=H.setup({'strike','defend'},{'cultist'})
local deck,panel=host.deckUI,root:GetChild('deckPanel')
assert(host:openDeck());host:update(0)
local hit=panel:GetChild('pileReturn'):GetChild('hit')
assert(host:closeDeck())
for _,multiple in ipairs({false,true})do
 local picked=0
 local choice={token='new-choice',op='codex',optional=not multiple,multiple=multiple,
  selected=multiple and {999}or nil,required=multiple and 1 or nil,cards={{uid=999,cardId='defend'}}}
 host.run.combat.pendingChoice=choice
 assert(deck:open(host.run,choice,function()picked=picked+1;return true end));deck:update(0)
 assert(not hit.listeners.click({touchId=901})and deck.visible and picked==0,'hidden browser return submitted a new choice token')
 deck:close();host.run.combat.pendingChoice=nil
end
assert(host:openDeck());host:update(0)
hit.listeners.down({touchId=902});assert(host:closeDeck());assert(host:openDeck());host:update(0)
hit.listeners.up({touchId=902})
assert(not hit.listeners.click({touchId=902})and deck.visible,'old pointer release closed a new browser generation')
hit.listeners.down({touchId=903});hit.listeners.up({touchId=903})
assert(hit.listeners.click({touchId=903})and not deck.visible,'fresh browser return must still work')
`, 'OFFICIAL_BROWSER_RETURN_GENERATIONS_PASS');
});

test('official 17-card shop permanent deck uses the approved dark five-column browser and returns to the same shop',t=>{
 runOfficial(t,`
local F=H.F;local Map=require('abyss_map');local Nodes=require('abyss_nodes')
local host,root=F.fixture();host.seed=42;assert(F.start(host))
-- Controlled navigation to a real reachable shop, using its canonical node/stock.
local shop
while not shop do
 local choices=Map.available(host.map);assert(#choices>0,'canonical shop route missing')
 for _,node in ipairs(choices)do if node.type=='shop'then shop=node;break end end
 if not shop then assert(Map.choose(host.map,choices[1].id))end
end
host.run.floor=host.map.floor;assert(Nodes.restoreMap(host.run,host.map));host:refresh()
assert(host.mapUI:choose(shop.id) and host.mode=='node' and host.run.nodeFlow.type=='shop')
host.run.deck={}
for i=1,17 do host.run.deck[i]={uid=200+i,cardId=i%2==0 and 'defend' or 'bash',upgraded=i==1}end
host:refresh()
local before,mapBefore=C.copy(host.run),C.copy(host.map)
local panel=root:GetChild('deckPanel');local grid=panel:GetChild('pileGrid')
assert(root:GetChild('deckEntry'):GetChild('open'):GetChild('hit').click());host:update(0)
assert(grid.visible and grid.itemCount==17 and not panel:GetChild('grid').visible,
 '17-card shop permanent deck still uses the old six-column transparent browser')
local spec
local function find(entries)for _,entry in ipairs(entries)do
 if entry.name=='pileGrid'then spec=entry end;find(entry.children or {})
end end
find(F.Layout)
assert(spec.grid.columns==5 and same(spec.grid.itemSize,{150,210}) and same(spec.grid.spacing,{27,27}))
assert(grid.size[1]==918 and grid.size[2]==557 and grid.x==0 and grid.y==-75.5)
assert(panel:GetChild('pileVeil').visible and panel:GetChild('pileChrome').visible and not panel:GetChild('veil').visible)
assert(not panel:GetChild('header').visible and not panel:GetChild('title').visible and not panel:GetChild('browseTitle').visible)
assert(panel:GetChild('pileChrome'):GetChild('heading').text=='卡组 · 17 张')
assert(panel:GetChild('pileTools').visible and panel:GetChild('pileReturn').visible and not panel:GetChild('close').visible)
for _,name in ipairs({'All','Attack','Skill','Power','Status','Curse'})do assert(not panel:GetChild('filter'..name).visible)end
assert(host.deckUI.pileKind==nil and host.deckUI.battle==nil and not host.deckUI.pileView,'visual reuse changed permanent data semantics')
assert(root:GetChild('nodePanel').visible and not host.nodeUI.visible,'covered shop must retain its scene but reject transactions')
assert(not host.nodeUI:press('shopView/card1') and not host.nodeUI:press('confirm'))
grid.scrollProgress=.4
local first=grid.items[0];local uid=host.deckUI.bindings[first].uid
assert(first:GetChild('hit').click() and host.deckUI.cardDetail.instance.uid==uid)
assert(panel:GetChild('pileReturn'):GetChild('hit').click());host:update(0)
assert(grid.visible and grid.scrollProgress==.4 and not host.deckUI.detailPages and panel:GetChild('pileTools').visible)
assert(panel:GetChild('pileReturn'):GetChild('hit').click())
assert(not host.deckUI.visible and host.mode=='node' and host.nodeUI.visible and host.run.nodeFlow.id==shop.id)
assert(not grid.visible and grid.itemCount==0)
unchanged(host.run,before,'shop deck inspection changed Run/stock/RNG')
unchanged(host.map,mapBefore,'shop deck inspection changed the route')
`, 'OFFICIAL_SHOP_PERMANENT_DECK_PASS');
});

const officialDeckBrowserSetup=`
local F=H.F;local host=H.setup();local panelSpec
local function find(entries)for _,entry in ipairs(entries)do
 if entry.name=='deckPanel'then panelSpec=entry end;find(entry.children or {})
end end
find(F.Layout)
local panel,grid,deck;local controller=false
local function resetBrowser()
 panel=F.control(assert(panelSpec));grid=panel:GetChild('pileGrid')
 local ownedDeck
 ownedDeck=require('abyss_deck_ui').new(panel,F.Presentation,'click',{
  imageSource='static',color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,
  controllerApi={isController=function()return controller end}},function()return ownedDeck:close()end)
 deck=ownedDeck
end
resetBrowser()
local function instance(uid,id,upgraded)return {uid=uid,cardId=id,upgraded=upgraded==true}end
local function tool(mode)return panel:GetChild('pileTools'):GetChild(mode):GetChild('hit').click()end
`;

test('official permanent browser handles 0/1/5/6/17 cards, deferred index origins, detail return and recycled late callbacks',t=>{
 runOfficial(t,officialDeckBrowserSetup+`
for _,origin in ipairs({0,1})do
 -- The native index origin belongs to a grid instance. Keep the same grid
 -- warm across list sizes, but never change a calibrated native grid's ABI.
 resetBrowser();local warmed=false
 for _,amount in ipairs({0,1,5,6,17})do
 host.run.deck={}
 for i=1,amount do host.run.deck[i]=instance(200+i,i%2==0 and 'defend' or 'bash',i==1)end
 local before=C.copy(host.run)
 grid.indexBase,grid.deferRefresh,grid.destroyOnRefresh=origin,true,true
 assert(deck:open(host.run))
 assert(grid.visible and not panel:GetChild('grid').visible,'permanent view did not select shared browser')
 local calibration=grid.refreshCallback
 deck:update();assert(grid.itemCount==(amount>0 and (warmed and amount or 1) or 0),'deferred calibration lost ownership')
 if amount==0 then assert(not deck.pending and not deck.calibrating and not deck.pendingGrid,'empty browser retained readiness work')end
 grid:flush();deck:update();grid:flush()
 if amount>0 then warmed=true end
 assert(grid.itemCount==amount and grid.scrollProgress==0)
 assert(panel:GetChild('pileChrome'):GetChild('empty').visible==(amount==0))
 assert(not deck:setFilter('skill'),'hidden legacy filters must not alter the official snapshot')
 assert(panel:GetChild('pileChrome'):GetChild('heading').text=='卡组 · '..amount..' 张')
 if amount>0 then
  local first=grid.items[0];local uid=deck.bindings[first].uid
  assert(uid==201 and first:GetChild('face').y==0 and not first:GetChild('uid').visible)
  calibration(first,origin);assert(not deck.pending and deck.bindings[first].uid==uid)
  local late=grid.refreshCallback;local hit=first:GetChild('hit')
  grid.scrollProgress=.45
  assert(hit.listeners.drag==nil and hit.listeners.endDrag==nil)
  assert(not hit.click({dragging=true}) and not deck.detailPages and grid.scrollProgress==.45)
  assert(hit.click() and deck.cardDetail.instance.uid==uid and not grid.visible)
  assert(not panel:GetChild('pileTools').visible and not tool('cost'),'detail cannot sort the hidden list')
  assert(panel:GetChild('details').text:find('左下角返回',1,true))
  assert(panel:GetChild('pileReturn'):GetChild('hit').click());deck:update();grid:flush()
  assert(not deck.detailPages and grid.visible and grid.scrollProgress==.45)
  local fresh=grid.items[0];local freshUid=deck.bindings[fresh].uid
  late(fresh,origin+amount-1)
  assert(deck.bindings[fresh].uid==freshUid,'late list callback rebound the returned detail list')
  assert(first.alive==false and not deck.bindings[first] and not hit.click(),'retired detail receiver remained live')
  if amount==17 then
   grid.deferRefresh,grid.destroyOnRefresh=false,false
   local reused=grid:recycle(0,origin+16)
   assert(reused==fresh and deck.bindings[reused].uid==217,'native reuse lost the current permanent UID')
   grid.destroyOnRecycle=true
   local oldHit=reused:GetChild('hit');local retired=reused
   local replacement=grid:recycle(0,origin+5);deck:update()
   assert(retired.alive==false and not deck.bindings[retired] and not oldHit.click())
   assert(deck.bindings[replacement].uid==206)
   grid.destroyOnRecycle=false
   controller=true;deck:update()
   assert(grid.itemCount==10 and panel:GetChild('next').visible,'C-mode must page two five-column rows')
   assert(deck:controllerStep(1) and grid.itemCount==7 and deck.bindings[grid.items[0]].uid==211)
   assert(deck:controllerStep(-1) and deck.bindings[grid.items[0]].uid==201)
   controller=false;deck:update();assert(grid.itemCount==17,'pointer mode did not restore the entire list')
  end
 end
 local late=grid.refreshCallback;local old=grid.items[0]
 assert(panel:GetChild('pileReturn'):GetChild('hit').click())
 if old then late(old,origin)end
 assert(not deck.visible and not grid.visible and grid.itemCount==0 and not panel:GetChild('pileVeil').visible)
 unchanged(host.run,before,'permanent browsing changed Run or RNG')
end end
`, 'OFFICIAL_PERMANENT_BROWSER_LIFECYCLE_PASS');
});

test('official shared browser keeps permanent cost, growth, details and sort preferences separate from combat piles and forced choices',t=>{
 runOfficial(t,officialDeckBrowserSetup+`
host.run.deck={instance(201,'barricade',true),instance(202,'whirlwind',true),instance(203,'rampage',true),instance(204,'rampage')}
host.run.combat.discard=C.copy(host.run.deck)
for _,card in ipairs(host.run.combat.discard)do card.costForTurn=0;card.damageBonus=123 end
local before=C.copy(host.run)
local Skin=require('abyss_card_skin');local apply=Skin.apply;local scopes={}
Skin.apply=function(face,definition,platform,look)scopes[face]=look.surfaceScope;return apply(face,definition,platform,look)end
local function plain(text)return text:gsub('<[^>]+>','')end
local function order()
 local result={};for i=0,3 do result[#result+1]=deck.bindings[grid.items[i]].uid end
 return table.concat(result,',')
end
local function permanent()
 assert(deck.pileKind==nil and deck.battle==nil and not deck.pileView)
 assert(grid.visible and grid.itemCount==4,'permanent data must render through the shared browser')
 assert(grid.items[0]:GetChild('face'):GetChild('cost').text=='2')
 assert(grid.items[1]:GetChild('face'):GetChild('cost').text=='X')
 for i=2,3 do
  local face=grid.items[i]:GetChild('face')
  assert(plain(face:GetChild('label').text)==plain(i==2 and F.Presentation.rampage.upgradeText or F.Presentation.rampage.text))
  assert(scopes[face]=='deck','permanent presentation must keep its deck surface owner')
  for _,name in ipairs({'nativePlayableRim','glow','costHalo'})do assert(not face:GetChild(name).visible)end
 end
end
assert(deck:open(host.run));deck:update();permanent()
assert(grid.items[3]:GetChild('hit').click())
assert(not deck.cardDetail.combat and not panel:GetChild('details').text:find('131',1,true))
assert(deck:toggleUpgradePreview() and deck.cardDetail.preview and not deck.cardDetail.combat)
assert(panel:GetChild('pileReturn'):GetChild('hit').click());deck:update();permanent()
assert(tool('name'));deck:update()
assert(deck.sortMode=='name' and deck.sortAscending and deck.masterSort.mode=='name')
assert(order()=='202,201,204,203','name ascending must sort the actual displayed permanent UIDs, including upgrade suffix')
assert(tool('name'));deck:update();assert(not deck.sortAscending)
assert(order()=='203,204,201,202','name descending must reverse the complete displayed name key')
local preference=C.copy({mode=deck.masterSort.mode,ascending=deck.masterSort.ascending,directions=deck.masterSort.directions})
local stale=grid.refreshCallback
assert(deck:close())
assert(deck:openPile(host.run,'discard'));deck:update()
assert(deck.pileKind=='discard' and deck.battle==host.run.combat and deck.pileView)
local face=grid.items[0]:GetChild('face');local uid=deck.bindings[grid.items[0]].uid
assert(face:GetChild('cost').text=='0' and scopes[face]=='battle','pile lost transient cost or surface owner')
assert(plain(grid.items[2]:GetChild('face'):GetChild('label').text):find('131',1,true),'pile lost temporary Rampage growth')
stale(grid.items[0],3);assert(deck.bindings[grid.items[0]].uid==uid,'permanent callback rebound a combat pile')
assert(grid.items[2]:GetChild('hit').click() and deck.cardDetail.combat)
assert(panel:GetChild('details').text:find('131',1,true),'pile detail lost its current combat instance')
assert(panel:GetChild('pileReturn'):GetChild('hit').click());deck:update()
assert(tool('cost'));deck:update();assert(tool('type'));deck:update()
local pileLate=grid.refreshCallback
assert(deck:close());assert(deck:open(host.run));deck:update()
assert(deck.sortMode==preference.mode and deck.sortAscending==preference.ascending and same(deck.sortDirections,preference.directions),
 'combat sorting overwrote permanent preferences')
assert(tool('original'));deck:update();permanent()
pileLate(grid.items[0],3);permanent()
assert(deck:close())
-- Forced choices still use their feedback-line grid, exact token/UID and close gate.
local choice=instance(301,'rampage');choice.costForTurn=0;choice.damageBonus=123
host.run.combat.hand={choice};host.run.combat.pendingChoice={token='official-choice',op='upgradeHand',uids={301}}
local picked
assert(deck:open(host.run,host.run.combat.pendingChoice,function(token,uid)picked={token,uid}end));deck:update()
local legacy=panel:GetChild('grid')
assert(legacy.visible and not grid.visible and not panel:GetChild('pileTools').visible and not panel:GetChild('pileReturn').visible)
assert(not panel:GetChild('close').visible and not deck:back() and not tool('cost'))
assert(not deck:setSort('name') and not deck:setPileSort('name'))
local hit=legacy.items[0]:GetChild('hit')
assert(legacy.items[0]:GetChild('face'):GetChild('cost').text=='0')
assert(not hit.click({dragging=true}) and not picked)
hit.click();assert(picked[1]=='official-choice' and picked[2]==301 and not deck.visible)
host.run.combat.hand=before.combat.hand;host.run.combat.pendingChoice=before.combat.pendingChoice
unchanged(host.run,before,'shared browser changed permanent/combat state or RNG')
Skin.apply=apply
`, 'OFFICIAL_BROWSER_DATA_ISOLATION_PASS');
});

test('official pile faces reuse hand chrome across small rows, native recycling and C-mode pages',t=>{
 runOfficial(t,`
local Theme=H.F.Theme
local function instance(uid,id)return {uid=uid,cardId=id,upgraded=false}end
local function checkDetailAndScroll(host,root,grid)
 local face=grid.items[0];local uid=host.deckUI.bindings[face].uid
 local hit=face:GetChild('hit')
 assert(hit.listeners.drag==nil and hit.listeners.endDrag==nil,'pile must retain native scroll ownership')
 grid.scrollProgress=.35
 assert(not hit.click({dragging=true}) and not host.deckUI.detailPages)
 assert(hit.click() and host.deckUI.cardDetail.instance.uid==uid)
 assert(root:GetChild('deckPanel'):GetChild('pileReturn'):GetChild('hit').click())
 host.deckUI:update()
 assert(not host.deckUI.detailPages and grid.visible and grid.scrollProgress==.35)
 assert(host.deckUI.bindings[grid.items[0]].uid==uid)
end
        local host=H.setup()
        local spec,panelSpec
        local function find(entries)
            for _,entry in ipairs(entries)do
                if entry.name=='pileGrid'then spec=entry end
                if entry.name=='deckPanel'then panelSpec=entry end
                find(entry.children or {})
            end
        end
        find(H.F.Layout)
        local panel=H.F.control(assert(panelSpec))
        local root={GetChild=function(_,name)assert(name=='deckPanel');return panel end}
        local grid=panel:GetChild('pileGrid')
        local controller=false
        local deck
        deck=require('abyss_deck_ui').new(panel,H.F.Presentation,'click',{
            imageSource='static',color=function(...)return {...}end,
            controllerApi={isController=function()return controller end}},function()return deck:close()end)
        host.deckUI=deck
        for _,amount in ipairs({1,3,5,6,13})do
            host.run.combat.discard={}
            for i=1,amount do host.run.combat.discard[i]=instance(100+i,'defend')end
            local before=C.copy(host.run)
            assert(host.deckUI:openPile(host.run,'discard'));host.deckUI:update()
            assert(grid.visible and grid.itemCount==amount and not panel:GetChild('grid').visible)
            assert(panel:GetChild('pileVeil').visible and not panel:GetChild('header').visible)
            assert(not panel:GetChild('title').visible and not panel:GetChild('browseTitle').visible)
            assert(panel:GetChild('pileChrome').visible and panel:GetChild('pileChrome'):GetChild('heading').text:find('弃牌堆'))
            assert(panel:GetChild('pileReturn').visible and not panel:GetChild('close').visible)
            for _,name in ipairs({'All','Attack','Skill','Power','Status','Curse'})do
                assert(not panel:GetChild('filter'..name).visible)
            end
            assert(not host.deckUI:setFilter('skill'),'hidden pile filters cannot alter the snapshot')
            local columns=math.min(5,amount)
            local width=columns*spec.grid.itemSize[1]+(columns-1)*spec.grid.spacing[1]
                +spec.grid.padding[3]+spec.grid.padding[4]
            assert(grid.size[1]==918 and grid.x==0 and grid.y==-75.5,'V25 keeps a fixed five-column list origin')
            assert(grid.size[2]==557,'V25 scroll viewport remains fixed for every pile size')
            local original={};for i,c in ipairs(host.deckUI.cards)do original[i]=c.uid end
            assert(not host.deckUI:setSort('name'),'pile-only sort cannot enter permanent preference')
            assert(host.deckUI:setPileSort('name'));assert(host.deckUI:setPileSort('cost'))
            assert(host.deckUI:setPileSort('type'));assert(not host.deckUI:setPileSort('rarity'))
            assert(host.deckUI:setPileSort('original'));if not host.deckUI.sortAscending then assert(host.deckUI:setPileSort('original'))end
            for i,c in ipairs(host.deckUI.cards)do assert(c.uid==original[i],'default sort did not restore the displayed snapshot')end
            host.deckUI:update()
            local face=grid.items[0]:GetChild('face')
            assert(face.y==0 and not grid.items[0]:GetChild('uid').visible)
            local shared=sharedFace(face)
            assert(shared.front.visible~=false and shared.back.visible~=false and shared.front:GetChild('costMaterial').visible)
            for _,name in ipairs({'nativePlayableRim','glow','costHalo'})do
                assert(not face:GetChild(name).visible,'read-only piles cannot flash ready/cost halos')
            end
            sameColour(face:GetChild('name').fontColor,Theme.officialAssets.stsCardReference.rarity.common.ink,'shared title ink')
            sameColour(face:GetChild('cost').fontColor,Theme.cardSkin.costText,'shared cost ink')
            if amount==13 then
                grid.destroyOnRecycle=true
                local previous=grid.items[0]
                grid:recycle(0,12);host.deckUI:update()
                assert(previous.alive==false and not host.deckUI.bindings[previous])
                assert(host.deckUI.bindings[grid.items[0]].uid==113,'recycled slot retains actual pile UID')
                grid:recycle(0,0)
                controller=true;deck:update()
                assert(grid.itemCount==10,'official C-mode uses two five-column rows')
                assert(deck:controllerStep(1) and grid.itemCount==3)
                assert(deck.bindings[grid.items[0]].uid==111,'C-mode second page retains actual UID')
                assert(deck:controllerStep(-1))
                controller=false;deck:update()
                assert(grid.itemCount==13,'pointer mode restores native scrolling for the full pile')
            end
            checkDetailAndScroll(host,root,grid)
            assert(panel:GetChild('close'):GetChild('hit').click(),'pile close must consume the event')
            assert(not grid.visible and grid.itemCount==0 and not panel:GetChild('pileVeil').visible)
            assert(same(before,host.run),'official pile inspection changed state or RNG')
        end
        assert(host.deckUI:open(host.run));host.deckUI:update()
        assert(not panel:GetChild('grid').visible and grid.visible and not panel:GetChild('filterAll').visible)
        assert(not panel:GetChild('header').visible and not host.deckUI.pileView and not host.deckUI.pileKind)
        assert(host.deckUI.sortMode=='original' and host.deckUI.sortAscending,
            'pile sorting must not leak into permanent deck preferences')
        assert(host.deckUI:setSort('name') and not host.deckUI:setPileSort('name'),
            'shared name sorting must retain the permanent preference owner')
        host.deckUI:close()

`, 'OFFICIAL_PILE_FACE_PASS');
});

test('transient hand help sits beside the live card and restores full details and input ownership',t=>{
 runOfficial(t,`
local h,u,p,event=H.setup({'bash','bash','bash','bash','bash','bash','bash','bash','bash','bash'},{'cultist'})
local theme=H.F.Theme;local battle=h.run.combat
C.draw(battle,5);u:render();assert(#battle.hand==10)
local before=C.copy(battle)
local info=p:GetChild('statusInfo');local plate=info:GetChild('plate')
for _,slot in ipairs({1,5,10})do
 local name='card'..slot;local box=p:GetChild(name)
 event(name,'enter',31);h:update(.36)
 assert(u.info and u.info.transient and info.visible,'real card hover must open transient help '..slot)
 assert(plate.sizeDeltaX==320,'hand hover must use the narrow side layout')
 local pose=u.cardPositions[battle.hand[slot].uid];local r=box.localRotationZ*math.pi/180
 local half=(math.abs(math.cos(r))*theme.layout.card.size[1]*box.localScaleX+math.abs(math.sin(r))*theme.layout.card.size[2]*box.localScaleY)/2
 assert(plate.x+plate.sizeDeltaX/2<=pose[1]-half-8 or plate.x-plate.sizeDeltaX/2>=pose[1]+half+8,'transient tooltip covers raised card '..slot..' panel='..plate.x..' card='..pose[1]..' half='..half)
 assert(plate.x-plate.sizeDeltaX/2>=-640+theme.canvas.safe.x and plate.x+plate.sizeDeltaX/2<=640-theme.canvas.safe.x,'side tooltip escaped horizontal canvas bounds')
 assert(plate.y-plate.sizeDeltaY/2>=-360+theme.canvas.safe.y and plate.y+plate.sizeDeltaY/2<=360-theme.layout.topBar.height-theme.space.s,'side tooltip escaped vertical canvas bounds')
 assert(info:GetChild('text1').fontSize==20 and not info:GetChild('hit').visible and not info:GetChild('page').visible and not info.disableCursorEventPassthrough)
 local uid=battle.hand[slot].uid;local touch=70+slot
 event(name,'down',touch,pose[1],pose[2])
 local g=u.gesture
 assert(g and g.uid==uid and g.touch==touch and g.input.held==g,'first Down after automatic hover must capture the same UID/touch')
 assert(not u.info and not u.swallow,'automatic hover close must not swallow the card press')
 event(name,'drag',touch,pose[1],pose[2]+60)
 assert(u.gesture==g and g.moving and g.uid==uid,'first press must move its captured card')
 event(name,'endDrag',touch,pose[1],theme.layout.hand.y-35)
 assert(not u.gesture and not u.carry and not u.selected,'cancelled hover-first drag retained capture')
 unchanged(battle,before,'hover-first cancelled drag spent combat resources')
 assert(u:openHelp(u:cardHelpSpec(slot),box:GetChild('hit'),false))
 assert(not u.info.transient and plate.sizeDeltaX==theme.layout.statusInfo.width,'explicit reader did not restore its full width')
 assert(info:GetChild('text1').fontSize==theme.font.reading and info:GetChild('hit').visible and info:GetChild('page').visible and info.disableCursorEventPassthrough,'explicit reader did not restore text or modal ownership')
 event(name,'down',touch+100,pose[1],pose[2])
 assert(not u.info and not u.gesture and u.swallow and u.swallow.touch==touch+100,'explicit card reader must swallow its closing Down')
 event(name,'up',touch+100);event(name,'click',touch+100)
 assert(not u.swallow and not u.selected,'explicit close release/click selected a card')
 event(name,'exit',31);event(name,'enter',32);h:update(.36)
 assert(u.info and u.info.transient);event(name,'exit',32)
 assert(not u.info and not info.visible,'leaving a card retained transient help')
end
u:showStatus(0)
assert(plate.sizeDeltaX==theme.layout.statusInfo.width and info:GetChild('hit').visible,'actor details inherited the narrow card mode')
event('card1','down',230)
assert(not u.info and not u.gesture and u.swallow,'actor detail close must still swallow the press')
event('card1','up',230);event('card1','click',230)
assert(not u.selected and not u.swallow)
unchanged(battle,before,'hover/detail layout changed battle state')
-- A fresh click-only surface has never observed a Down. Automatic card help
-- must preserve its very first Click, while normal target selection remains core-owned.
local h2,u2,p2,event2=H.setup({'bash','bash'},{'cultist'})
local b2=h2.run.combat;local uid2=b2.hand[1].uid;local before2=C.copy(b2)
event2('card1','enter',241);h2:update(.36)
assert(u2.info and u2.info.transient)
event2('card1','click',241)
assert(not u2.info and u2.selected==uid2,'automatic hover swallowed the first click-only card selection')
assert(u2:controllerBack());assert(not u2.selected)
unchanged(b2,before2,'click-only hover selection/cancel changed combat resources')
`, 'TRANSIENT_CARD_SIDE_HELP_PASS');
});

test('official approved static glow paints only on state changes without native animation or tick writes',t=>{
 runOfficial(t,`
local Glow=require('abyss_battle_card_glow')
local h,u,p=H.setup({'strike','defend','bludgeon'},{'cultist'})
assert(H.F.Theme.officialAssets.battleCardChrome.glow.motion=='static','official default must not emit waves')
local box=p:GetChild('card1');local rim=box:GetChild('nativePlayableRim')
Glow.clear(box)
local colours=0
local platform={color=function(r,g,b,a)colours=colours+1;return {r=r,g=g,b=b,a=a}end,
 tween=function()error('static glow must not allocate Tween')end,
 tweenSequence=function()error('static glow must not allocate Sequence')end,easeTypes={OutQuad={},Linear={}}}
local uid=h.run.combat.hand[1].uid
Glow.bind(box,rim,true,platform,false,uid)
local soft,outer=rim:GetChild('softEdge'),rim:GetChild('pulseEdge')
local function width(group)local edge=group:GetChild('vertical');return edge.sizeDeltaX*edge.localScaleX end
local function tint(group,r,g,b)local c=group:GetChild('vertical').imageColor;assert(c.r==r and c.g==g and c.b==b and c.a==255)end
assert(soft.visible and outer.visible and width(soft)==4 and width(outer)==6)
tint(soft,115,229,215);tint(outer,67,198,189)
for i=2,4 do assert(not rim:GetChild('pulseEdge'..i).visible,'static glow retained a flowing layer')end
local painted=colours
for i=1,120 do Glow.tick(box,1/60);Glow.bind(box,rim,true,platform,false,uid)end
assert(colours==painted,'idle bind/tick repainted static rim')
Glow.bind(box,rim,true,platform,true,uid)
assert(width(soft)==6 and width(outer)==10,'selected static rim must use approved 3+5 softness')
tint(soft,136,247,231);tint(outer,60,226,208)
painted=colours;for i=1,120 do Glow.tick(box,1/60)end;assert(colours==painted)
Glow.bind(box,rim,true,platform,false,uid);tint(soft,115,229,215)
box:SetVisible(false);Glow.tick(box,1/60);assert(not soft.visible and not outer.visible)
box:SetVisible(true);Glow.bind(box,rim,true,platform,false,uid+1000)
Glow.bind(box,rim,false,platform,false,uid+1000);assert(not soft.visible and not outer.visible)
u:setHover(1);assert(u.hover==1,'static glow must preserve hover interaction')
`, 'OFFICIAL_STATIC_GLOW_PASS');
});

test('official native glow owns fixed Tween handles and kills them before hidden, rebind and dead-control cleanup',t=>{
 runOfficial(t,`
local Glow=require('abyss_battle_card_glow')
H.F.Theme.officialAssets.battleCardChrome.glow.motion='raw-source-wave'
local h,u,p=H.setup({'strike','defend'},{'cultist'})
local box=p:GetChild('card1');local rim=box:GetChild('nativePlayableRim')
Glow.clear(box)
local tweens,sequences={},{}
local outQuad,linear={},{}
local colors=0
local platform={color=function(r,g,b,a)colors=colors+1;return {r=r,g=g,b=b,a=a}end,easeTypes={OutQuad=outQuad,Linear=linear}}
function platform.tween(target,fields,duration)
 assert(duration==1.2 and target.alive)
 local t={target=target,fields=fields,kills=0}
 function t:SetEase(ease)assert(ease==outQuad or ease==linear);self.ease=ease;return self end
 function t:SetLoops(count)assert(count==-1);return self end
 function t:Play()self.active=true;return self end
 function t:Kill(complete)assert(complete==false);self.active=false;self.kills=self.kills+1 end
 tweens[#tweens+1]=t;return t
end
function platform.tweenSequence()
 local s={kills=0}
 function s:AppendInterval(delay)self.delay=delay;return self end
 function s:AppendCallback(fn)self.callback=fn;return self end
 function s:Play()self.active=true;return self end
 function s:Kill(complete)assert(complete==false);self.active=false;self.kills=self.kills+1 end
 sequences[#sequences+1]=s;return s
end
local uid=h.run.combat.hand[1].uid
Glow.bind(box,rim,true,platform,false,uid)
assert(#tweens==36 and #sequences==3 and colors==2,'native binding must allocate one fixed pool')
for i=1,36 do assert((tweens[i].active==true)==(i<=9),'only the first wave starts immediately')end
local nativeState
for i=1,20 do local _,cache=debug.getupvalue(Glow.tick,i)
 if type(cache)=='table' and getmetatable(cache) and getmetatable(cache).__mode=='k'then nativeState=cache[box];break end
end
assert(nativeState and getmetatable(nativeState.refs).__mode=='v')
for key in pairs(nativeState.refs)do if key>=0 then nativeState.refs[key]=nil end end
for i,s in ipairs(sequences)do assert(math.abs(s.delay-i*.3)<1e-8);s.callback()end
local count,colourCalls=#tweens,colors
for i=1,120 do Glow.tick(box,1/60)end
assert(#tweens==count and colors==colourCalls,'native tick allocated handles or wrote colours through Lua')
Glow.bind(box,rim,true,platform,true,uid)
assert(#tweens==count,'selecting the same UID must preserve native loop ownership')
Glow.bind(box,rim,true,platform,false,uid+1000)
assert(#tweens==72 and #sequences==6,'reusing a physical slot for a different UID must replace the old pool')
for i=1,36 do assert(tweens[i].kills==1 and not tweens[i].active)end
for i=1,3 do assert(sequences[i].kills==1)end
box:SetVisible(false);Glow.tick(box,1/60)
for i=37,72 do assert(tweens[i].kills==1 and not tweens[i].active)end
-- A startup callback queued before retirement must never revive a hidden pool.
for i=4,6 do sequences[i].callback()end
for i=37,72 do assert(not tweens[i].active)end
box:SetVisible(true);Glow.bind(box,rim,true,platform,false,uid)
local firstDead=73
local oldMeta,getChild=getmetatable(box),box.GetChild
local deadMeta={};for key,value in pairs(oldMeta)do deadMeta[key]=value end
deadMeta.__index=function(control,key)if key=='alive'then return false end;return oldMeta.__index(control,key)end
setmetatable(box,deadMeta);box.GetChild=function()error('dead cleanup must not query children')end
Glow.clear(box)
for i=firstDead,#tweens do assert(tweens[i].kills==1 and not tweens[i].active,'dead owner retained an active native Tween')end
box.GetChild=getChild;setmetatable(box,oldMeta)
Glow.bind(box,rim,true,platform,false,uid)
Glow.bind(box,rim,false,platform,false,uid)
for _,tween in ipairs(tweens)do assert(tween.kills==1)end
for _,sequence in ipairs(sequences)do assert(sequence.kills==1)end
`, 'OFFICIAL_NATIVE_GLOW_OWNERSHIP_PASS');
});

test('official pooled glow emits four staggered source-shaped waves and clears illegal slots',t=>{
 runOfficial(t,`
local Glow=require('abyss_battle_card_glow')
H.F.Theme.officialAssets.battleCardChrome.glow.motion='raw-source-wave'
local h,u,p=H.setup({'strike','defend','bludgeon'},{'cultist'})
local box=p:GetChild('card1');local rim=box:GetChild('nativePlayableRim')
assert(rim.visible)
local layers={}
for i=1,4 do layers[i]=assert(rim:GetChild(i==1 and 'pulseEdge' or 'pulseEdge'..i),'missing pooled wave '..i)end
local function close(a,b)return math.abs(a-b)<.00001 end
local function assertWave(i,remaining,focused)
 local wave=layers[i]
 assert(wave.visible,'emitted wave missing '..i)
 assert(close(wave.localScaleX,1.03+.08*(1-remaining*remaining)),'source glow scale mismatch')
 local gain=H.F.Theme.officialAssets.battleGlowFocus[focused and 'selected' or 'normal'].opacity
 assert(gain==1,'source glow must not acquire a hidden normal/selected attenuation')
 assert(wave:GetChild('vertical').imageColor.a==math.floor(remaining/2*255+.5),'source glow alpha mismatch')
end
Glow.tick(box,0);assertWave(1,1.2)
for i=2,4 do assert(not layers[i].visible,'unemitted wave appeared early')end
Glow.tick(box,.3);assertWave(1,.9);assertWave(2,1.2)
Glow.tick(box,.6)
for i=1,4 do assertWave(i,.3+(i-1)*.3)end
-- Rebinding an already-ready physical slot must preserve its wave phase.
Glow.bind(box,rim,true,function(r,g,b,a)return {r=r,g=g,b=b,a=a}end)
Glow.tick(box,.1);assertWave(1,.2)
Glow.tick(box,.2)
for i=1,4 do assertWave(i,1.2-(i==1 and 0 or (5-i)*.3))end
local soft=rim:GetChild('softEdge')
local function edgeWidth(wave)local edge=wave:GetChild('vertical');return edge.sizeDeltaX*edge.localScaleX end
local function edgeSpan(wave,blur)
 local vertical,horizontal=wave:GetChild('vertical'),wave:GetChild('horizontal')
 assert(close(vertical.sizeDeltaY*vertical.localScaleY,192+blur*2) and close(horizontal.sizeDeltaX*horizontal.localScaleX,132+blur*2),'bounded virtual geometry must preserve physical straight-edge spans')
end
local function bounded()
 for _,wave in ipairs({soft,layers[1],layers[2],layers[3],layers[4]})do
  for _,part in ipairs(wave:GetChildren())do
   assert(part.sizeDeltaX>0 and part.sizeDeltaX<=1600 and part.sizeDeltaY>0 and part.sizeDeltaY<=900,'runtime outline escaped formal encoder rect limits')
  end
 end
end
bounded()
assert(close(edgeWidth(soft),4) and close(edgeWidth(layers[1]),6),'legal glow uses 2+3 pixel alpha falloff on each side')
edgeSpan(soft,2);edgeSpan(layers[1],3)
Glow.bind(box,rim,true,function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,true)
Glow.tick(box,0)
assertWave(1,1.2,true)
assert(close(edgeWidth(soft),4) and close(edgeWidth(layers[1]),6),'STS selected card keeps the same glow kernel and phase')
bounded()
edgeSpan(soft,2);edgeSpan(layers[1],3)
assert(close(soft.localScaleX,1.04) and close(soft.localScaleY,1.03),'source main border size must not acquire a selected-only expansion')
Glow.bind(box,rim,true,function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,false)
assert(close(edgeWidth(soft),4) and close(edgeWidth(layers[1]),6),'hover/legal state must not retain selected softness')
Glow.clear(box)
for i=1,4 do assert(not layers[i].visible,'cleared wave retained pixels')end
local before=layers[1].localScaleX;Glow.tick(box,.7);assert(layers[1].localScaleX==before)
-- Native handles can be recreated after weak references are reclaimed. Drop
-- only cached weak values; the native hierarchy remains the authoritative owner.
local stateTable
for i=1,20 do local _,value=debug.getupvalue(Glow.tick,i);if type(value)=='table' and getmetatable(value) and getmetatable(value).__mode=='k' then stateTable=value;break end end
assert(stateTable,'glow states must not retain native card keys strongly')
Glow.bind(box,rim,true,function(r,g,b,a)return {r=r,g=g,b=b,a=a}end)
assert(getmetatable(stateTable[box].refs).__mode=='v','native pulse handles must remain weak')
for k in pairs(stateTable[box].refs)do stateTable[box].refs[k]=nil end
Glow.tick(box,0);assertWave(1,1.2)
Glow.clear(box)
local colourCalls=0
Glow.bind(box,rim,true,function(r,g,b,a)colourCalls=colourCalls+1;return {r=r,g=g,b=b,a=a}end)
Glow.tick(box,.9)
assert(colourCalls==4,'each active wave must construct one RGBA shared by its eight native image assignments')
local battle=h.run.combat;battle.energy=0;u:render()
assert(not rim.visible,'unplayable card kept its glow owner')
for i=1,4 do assert(not layers[i].visible,'illegal card wave survived disable')end
Glow.tick(box,.3)
assert(stateTable[box]==nil,'disabled glow retained state')
`, 'OFFICIAL_POOLED_GLOW_PASS');
});

for(const official of [false,true])test(`${official?'official':'default'} generated cards preserve strict lookup, rarity tint and required children`,t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'banner-contract-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{officialAssets:official});
 const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local official=${official}
local probes=0
local GameUI=require('abyss_game_ui');local create=GameUI.new
GameUI.new=function(root,...)
 local panel=root:GetChild('battlePanel')
 for i=1,10 do
  local box=panel:GetChild('card'..i)
  assert((box.children.stsReferenceChrome~=nil)==official and (box.children.stsReferenceBack~=nil)==official,'generated profile owns the shared reference face')
  local get=box.GetChild
  box.GetChild=function(self,key)
   if key=='nativeBannerRight' or key=='nativePlayableRim' or key=='nativeRibbon' or key=='nativeCostOrb' or key=='stsReferenceChrome' or key=='stsReferenceBack' then probes=probes+1;assert(official,'default profile probed official-only decoration')end
   return assert(get(self,key),'missing required card child '..key)
  end
 end
 return create(root,...)
end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local h,u,p=H.setup({'strike','defend','bash','anger','inflame'},{'cultist','jaw_worm'});GameUI.new=create
${sharedFaceHelpers}
local theme=H.F.Theme
assert((theme.presentationProfile=='official-assets-first')==official)
local function colour(actual,expected)
 assert(actual and actual.r==expected.r and actual.g==expected.g and actual.b==expected.b,'rarity ink mismatch')
end
for _,rarity in ipairs({'basic','common','uncommon','rare'})do
 -- Test-local copy of real card definitions; no gameplay source is changed.
 for _,def in pairs(h.run.combat.catalog.cards)do def.rarity=rarity end
 u:render()
 for i=1,#h.run.combat.hand do
  local box=p:GetChild('card'..i)
  if official then
   local face=sharedFace(box);local token=theme.officialAssets.stsCardReference.rarity[rarity=='basic'and'common'or rarity]
   local frame=imageLeaves(face.front:GetChild('frame'));assert(#frame>0)
   for _,part in ipairs(frame)do sameColour(part.imageColor,token.frame,'shared rarity frame')end
   local banner=imageLeaves(face.front:GetChild('banner'):GetChild('front'));assert(#banner>0)
   for _,part in ipairs(banner)do sameColour(part.imageColor,token.banner,'shared rarity banner')end
  else colour(box:GetChild('nameBand').imageColor,theme.color.rarityBand[rarity])end
 end
end
assert(official and probes>0 or not official and probes==0)
for _,name in ipairs(official and {'name','type','label','cost','art'} or {'nameBand','nameRule','art'})do
 local box=p:GetChild('card1');local saved=box.children[name];assert(saved)
 box.children[name]=nil
 local ok,reason=pcall(function()u:render()end)
 box.children[name]=saved
 assert(not ok and tostring(reason):find('missing required card child '..name,1,true),tostring(reason))
 u:render()
end
print('BANNER_CONTRACT_PASS')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
  encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/BANNER_CONTRACT_PASS/);
});

test('official battle status and curse reuse neutral skill materials and restore the shared Geo recycled face',t=>{
 runOfficial(t,`
local h,u,p=H.setup({'strike','defend','bash','anger','impervious'},{'cultist'})
local theme=H.F.Theme;local b=h.run.combat;local instance=b.hand[1]
local box=p:GetChild('card1');local shared=sharedFace(box);local body,skin=shared.body,shared.portraits
local reference=theme.officialAssets.stsCardReference
local originalBody={};for _,part in ipairs(imageLeaves(body))do originalBody[part]=part.imageColor end
local bodyRoles={bodyFit='outer',paperWell='body',topBevel='shade',leftBevel='shade',
 rightBevel='outer',bottomBevel='outer',innerLight='bevel',cornerBevel='bevel'}
local function material(id,kind,shape)
 instance.cardId=id;u:render()
 assert(not box:GetChild('roleRing').visible and not box:GetChild('roleMark').visible,'recycled card restored removed bottom ornament')
 local neutral=kind~='red'and theme.officialAssets.battleCardBodyMaterials[kind]
 local colours=neutral and{outer=neutral.outerBevel,shade=neutral.paperBevel,body=neutral.innerWell,bevel=neutral.leftCatchlight}
  or reference.character
 local seen={}
 for _,group in ipairs(body:GetChildren())do
  local role=assert(bodyRoles[group.name],id..' unknown shared body role '..group.name)
  assert(not seen[group.name],id..' duplicate shared body role '..group.name);seen[group.name]=true
  local leaves=imageLeaves(group);assert(#leaves>0,id..' empty shared body role '..group.name)
  for _,part in ipairs(leaves)do
   sameColour(part.imageColor,colours[role],id..' exact shared body '..group.name)
   if not neutral then sameColour(part.imageColor,originalBody[part],id..' full Geo projection was not restored')end
  end
 end
 for name in pairs(bodyRoles)do assert(seen[name],id..' missing shared body role '..name)end
 for _,name in ipairs({'attack','skill','power'})do assert(skin:GetChild(name).visible==(name==shape),id..' native portrait shape '..name)end
 local well=neutral and neutral.artWell or theme.cardSkin.artWells[shape]
 local parts=imageLeaves(skin:GetChild(shape):GetChild('well'));assert(#parts>0)
 for _,part in ipairs(parts)do sameColour(part.imageColor,well,id..' shared portrait well')end
 if kind=='curse'then
  local common=reference.rarity.common
  for _,part in ipairs(imageLeaves(shared.front:GetChild('frame')))do sameColour(part.imageColor,common.frame,id..' common frame')end
  for _,part in ipairs(imageLeaves(shared.front:GetChild('banner'):GetChild('front')))do sameColour(part.imageColor,common.banner,id..' common banner')end
  for _,part in ipairs(imageLeaves(shared.front:GetChild('banner'):GetChild('left')))do sameColour(part.imageColor,common.bannerFold,id..' common fold')end
 end
 local original=body:GetChild('paperWell').imageColor
 u.selected=instance.uid;u:render();u.selected=nil;u:render()
 assert(body:GetChild('paperWell').imageColor==original,'unchanged material was repainted during selection')
end
-- Fail at the shared paper material after preceding writes. A failed
-- material transaction must not cache its kind and skip the same-kind retry.
material('wound','status','skill');material('strike','red','attack')
local interrupted=body:GetChild('paperWell')
local priorMeta=getmetatable(interrupted);local current=interrupted.imageColor
local writes,fail=0,true
rawset(interrupted,'imageColor',nil)
setmetatable(interrupted,{
 __index=function(control,key)if key=='imageColor'then return current end;return priorMeta.__index(control,key)end,
 __newindex=function(control,key,value)
  if key~='imageColor'then return priorMeta.__newindex(control,key,value)end
  writes=writes+1
  if fail then fail=false;error('injected neutral material setter failure')end
  current=value
 end,
})
instance.cardId='wound'
local ok,reason=pcall(function()u:render()end)
assert(not ok and tostring(reason):find('injected neutral material setter failure',1,true),'intermediate setter failure was not observed')
assert(writes==1,'failed setter was unexpectedly retried inside one render')
material('wound','status','skill')
assert(writes==2,'same-kind retry skipped the interrupted material write')
setmetatable(interrupted,priorMeta);rawset(interrupted,'imageColor',current)
for _,id in ipairs({'wound','dazed','burn','slimed'})do material(id,'status','skill')end
for _,id in ipairs({'regret','necronomicurse'})do material(id,'curse','skill')end
material('strike','red','attack')
material('defend','red','skill')
material('inflame','red','power')
material('wound','status','skill')
material('bash','red','attack')
`, 'OFFICIAL_NEUTRAL_CARD_MATERIAL_PASS');
});

test('official compact exhaust entry opens the actual Offering pile without mutating combat',t=>{
 runOfficial(t,`
local h,u,p,event,tap,drain,_,root=H.setup({'offering','defend','strike','bash','inflame'},{'cultist'})
assert(not p:GetChild('exhaustIcon').visible and not p:GetChild('exhaust').visible,'empty exhaust entry must stay hidden')
local slot,uid
for i,card in ipairs(h.run.combat.hand)do if card.cardId=='offering'then slot,uid=i,card.uid end end
assert(slot)
tap('card'..slot,71);assert(u.selected==uid)
tap('playArea',72);drain()
local b=h.run.combat
assert(#b.exhaust==1 and b.exhaust[1].uid==uid and b.exhaust[1].cardId=='offering','real Offering did not reach exhaust')
assert(b.player.hp==74 and b.energy==5,'real Offering HP/energy effects differ')
local icon=p:GetChild('exhaustIcon');local hit=icon:GetChild('hit')
assert(icon.visible and p:GetChild('exhaust').visible and p:GetChild('exhaust').text=='1')
assert(icon.sizeDeltaX==32 and icon.sizeDeltaY==32 and hit.sizeDeltaX==44 and hit.sizeDeltaY==44,'runtime lost compact geometry/touch target')
local before=C.copy(b)
hit.click({touchId=73}) -- existing pile entry is a click-only native binding
assert(h.deckUI.visible and h.deckUI.pileKind=='exhaust' and #h.deckUI.cards==1 and h.deckUI.cards[1].uid==uid,'compact entry did not open the real exhaust pile')
root:GetChild('deckPanel'):GetChild('close'):GetChild('hit').click({touchId=74})
assert(not h.deckUI.visible)
unchanged(h.run.combat,before,'opening the compact exhaust entry changed combat')
`, 'OFFICIAL_COMPACT_EXHAUST_PASS');
});

test('official automatic card help shows existing keywords only and preserves the explicit reader',t=>{
 runOfficial(t,`
local h,u,p,event=H.setup({'strike','bash','offering','corruption'},{'cultist'})
local b=h.run.combat;local panel=p:GetChild('statusInfo');local before=C.copy(b)
local slots={};for i,c in ipairs(b.hand)do slots[c.cardId]=i end
local function hover(id,touch)
 local slot=assert(slots[id]);event('card'..slot,'enter',touch);h:update(.36)
 return slot
end
local strike=hover('strike',301)
assert(not u.info and not panel.visible,'keyword-free Strike must not open automatic help')
local uid=b.hand[strike].uid;local pose=u.cardPositions[uid]
event('card'..strike,'down',302,pose[1],pose[2])
assert(u.gesture and u.gesture.uid==uid and u.gesture.touch==302,'keyword-free hover lost its first Down')
event('card'..strike,'drag',302,pose[1],pose[2]+60)
assert(u.gesture.moving)
event('card'..strike,'endDrag',302,pose[1],H.F.Theme.layout.hand.y-35)
event('card'..strike,'exit',301)
local corruption=hover('corruption',303)
assert(not u.info and not panel.visible,'implicit Corruption status must not become a keyword')
event('card'..corruption,'exit',303)
for _,entry in ipairs({{'bash','易伤'},{'offering','消耗'}})do
 local slot=hover(entry[1],310);local box=p:GetChild('card'..slot)
 assert(u.info and u.info.transient and panel.visible,'existing keyword disappeared')
 assert(panel:GetChild('name1').text==entry[2],'wrong keyword row '..entry[1]..': '..tostring(panel:GetChild('name1').text))
 if entry[1]=='bash'then
  assert(panel:GetChild('text1').text==b.catalog.statuses.vulnerable.description,'automatic keyword must use the generic existing definition')
  assert(panel:GetChild('tag1').text=='','automatic keyword projected an applied duration')
 end
 assert(not panel:GetChild('title').visible and not panel:GetChild('tag').visible and not panel:GetChild('summary').visible and not panel:GetChild('rule').visible,'automatic keywords retained the empty reader header')
 assert(not panel:GetChild('name2').visible,'automatic help repeated complete effects or origin')
 assert(not panel:GetChild('hit').visible and not panel.disableCursorEventPassthrough,'automatic keywords captured input')
 assert(u:openHelp(u:cardHelpSpec(slot),box:GetChild('hit'),false))
 assert(panel:GetChild('title').visible and panel:GetChild('summary').visible and panel:GetChild('rule').visible,'explicit reader failed to restore its header')
 assert(panel:GetChild('plate').sizeDeltaX==H.F.Theme.layout.statusInfo.width and panel:GetChild('hit').visible and panel.disableCursorEventPassthrough)
 local complete=false
 for i=1,H.F.Theme.layout.statusInfo.rows do local row=panel:GetChild('name'..i);if row.visible and row.text:find('完整效果',1,true)then complete=true end end
 assert(complete,'explicit reader lost full effects')
 event('card'..slot,'down',311)
 assert(not u.gesture and u.swallow and not u.info,'explicit close must swallow its first Down')
 event('card'..slot,'up',311);event('card'..slot,'click',311)
 event('card'..slot,'exit',310);hover(entry[1],312);event('card'..slot,'exit',312)
 assert(not u.info and not panel.visible and not u.selected,'exit retained help or selected a card')
end
unchanged(b,before,'keyword hover/reader/cancel changed combat')
`, 'OFFICIAL_AUTOMATIC_KEYWORDS_PASS');
});

// Official geometry and touch callbacks must be exercised together.
test('official aim geometry follows mobile targets and cancels across canvases',t=>{
 runOfficial(t,"assert(loadfile('tests/lua/support/official_aim_visual_parity.lua'))(H)",'OFFICIAL_AIM_NATIVE_TOUCH_MATRIX 12');
});

test('generated official energy seam and live values are checked separately from visual acceptance',t=>{
 runOfficial(t,`
local function find(node,name)
 if node.name==name then return node end
 for _,c in ipairs(node.children or node.controls or {})do local r=find(c,name);if r then return r end end
end
local layout={children=H.F.Layout};local number=find(layout,'energy');local icon=find(layout,'energyIcon')
assert(icon.size[1]==86 and number.text.fontSize==26 and number.text.outlineOpacity==1)
assert(find(icon,'valueShadow').visible==false,'duplicate numeric shadow must not paint')
local chrome=find(icon,'v25Chrome');assert(#chrome.children==6,'bounded static orb layers')
for _,c in ipairs(chrome.children)do assert(c.kind=='image' and c.image==100002,'known native discs, no tinted ornament texture')end
local h,u,p=H.setup({'strike','strike','defend'})
local b=h.run.combat
for _,energy in ipairs({0,3,7})do
 b.energy=energy;u:render()
 assert(p:GetChild('energy').text==energy..'/3')
 assert(p:GetChild('energyIcon'):GetChild('light').visible==(energy>0))
end
`, 'OFFICIAL_ENERGY_VALUES_NOT_VISUAL_ACCEPTANCE');
});

test('official aim regression rejects the escaped lifted-card origin and a centred head',t=>{
 const body="assert(loadfile('tests/lua/support/official_aim_visual_parity.lua'))(H)";
 const view=readFileSync('src/lua/abyss_battle_card_view.lua','utf8');
 const anchor="return g.origin[1],g.origin[2]+height/2";
 assert.equal(view.split(anchor).length,2,'counterfactual origin anchor must be unique');
 assert.throws(()=>runOfficial(t,body,'OFFICIAL_AIM_NATIVE_TOUCH_MATRIX 12',{
  abyss_battle_card_view:view.replace(anchor,'return x,y+height/2'),
 }),/right-side enemy arrow collapsed into a vertical line/);
 const arrow=readFileSync('src/lua/abyss_battle_aim_arrow.lua','utf8');
 assert.equal(arrow.split('local apex=17*scale').length,2);
 assert.throws(()=>runOfficial(t,body,'OFFICIAL_AIM_NATIVE_TOUCH_MATRIX 12',{
  abyss_battle_aim_arrow:arrow.replace('local apex=17*scale','local apex=0'),
 }),/first target tip x/);
});
