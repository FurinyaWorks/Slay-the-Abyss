// Offline numerical fixture on the exported real SDK. All play/cancel commands
// use its pointer dispatcher; setup is explicitly synthetic and never published.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const [savePath,sdkPath,output]=process.argv.slice(2);
if(!savePath||!sdkPath||!output||process.argv.length!==5||fs.existsSync(output))
 throw Error('Usage: node scripts/measure-battle-preview-state.mjs <fixture.save.json> <existing SDK export.mjs> <new report.json>');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const saveBytes=fs.readFileSync(savePath),save=JSON.parse(saveBytes);
const receiptPath=savePath+'.receipt.json',receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
assert.equal(receipt.kind,'offline-sdk-pressure-fixture');
assert.equal(hash(receipt.input),receipt.inputSha256);
const fixtureModule=save.assets.scripts.find(s=>s.path.endsWith(receipt.modifiedModule));
assert(fixtureModule,'missing annotated fixture module');
assert.equal(createHash('sha256').update(fixtureModule.source).digest('hex'),receipt.fixtureModuleSha256);
const report={kind:'sdk-battle-preview-state-fixture',status:'running',
 measurementScope:'real-sdk-pointer-input-with-explicit-offline-runtime-state-setup',
 originalUnmodifiedPlaythrough:false,actualGilLuaExact:false,deviceVerified:false,gpuFpsMeasured:false,
 node:process.version,save:path.resolve(savePath),saveSha256:hash(savePath),
 sdk:path.resolve(sdkPath),sdkSha256:hash(sdkPath),fixtureReceipt:receipt,fixtureReceiptSha256:hash(receiptPath),
 oracle:'same loaded abyss_combat.cardPreview as production UI; expected cases from tests/lua/card_preview.lua',
 runtimeSetup:[{actor:'player',api:'Core.addStatus',statuses:{strength:4,weak:1}},
  {actor:'enemy[2]',api:'Core.addStatus',statuses:{vulnerable:1}},
  {actor:'enemy[2]',api:'Core.block(state, actor, 5, true)',fixedBlock:5},
  {actor:'player',api:'Core.addStatus',statuses:{dexterity:3,frail:1}}],stages:[],pointerEvents:[]};
const {Gr,vi,dn,wi,pa,Me,d}=await import(pathToFileURL(path.resolve(sdkPath)));
let session,L,steps=0;
const enc=s=>new TextEncoder().encode(s);
function exposeView(){
 const top=d.lua_gettop(L);d.lua_getglobal(L,enc('OnUpdate'));let found=false;
 for(let i=1;i<50;i++){
  const key=d.lua_getupvalue(L,-1,i);if(!key)break;
  if(Buffer.from(key).toString()==='view'){d.lua_setglobal(L,enc('__PREVIEW_VIEW'));found=true;break;}
  d.lua_pop(L,1);
 }
 d.lua_settop(L,top);assert(found,'missing actual root script view upvalue');
}
function value(index,depth=0){
 assert(depth<12);const type=d.lua_type(L,index);
 if(type===0)return null;if(type===1)return d.lua_toboolean(L,index);
 if(type===3)return d.lua_tonumber(L,index);if(type===4)return Buffer.from(d.lua_tolstring(L,index)).toString();
 if(type!==5)return '<type-'+type+'>';
 const result={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);
 while(d.lua_next(L,abs)!==0){result[value(-2,depth+1)]=value(-1,depth+1);d.lua_pop(L,1);}return result;
}
function status(uid){
 const top=d.lua_gettop(L);d.lua_getglobal(L,enc('__PREVIEW_STATUS'));
 if(uid==null)d.lua_pushnil(L);else d.lua_pushnumber(L,uid);
 const code=d.lua_pcall(L,1,1,0);
 if(code!==0){const error=value(-1);d.lua_settop(L,top);throw Error('preview status: '+error);}
 const result=value(-1);d.lua_settop(L,top);return result;
}
function native(p){
 let node=session.runtime.roots[0];
 for(const name of p.split('/')){const rows=node.children.filter(c=>c.name===name);assert.equal(rows.length,1,'native path '+p);node=rows[0];}
 return node;
}
function point(node){
 if(typeof node==='string')node=native(node);
 const boxes=wi(session),box=boxes.get(node.Id),matrix=pa(session,boxes).get(node.Id);
 assert(box&&matrix,'native geometry unavailable');return Me(matrix,box.centerX,box.centerY);
}
function step(count=1){for(let i=0;i<count;i++){dn(session,1/60);steps++;}}
function pointer(type,xy){report.pointerEvents.push({step:steps,type,...xy});vi(session,type,xy.x,xy.y);}
function tap(p){const xy=typeof p==='string'?point(p):p;pointer('move',xy);pointer('down',xy);step();pointer('up',xy);step();}
function drain(){for(let i=0;i<600;i++){const state=status();if(!state.busy)return state;step();}throw Error('feedback did not settle');}
function stage(name,fn){const row={name,atStep:steps};report.stages.push(row);try{row.state=fn();row.status='passed';return row.state;}catch(error){row.state=status();row.status='failed';throw error;}}
function rules(s){return {phase:s.phase,hand:s.hand,energy:s.energy,hp:s.hp,block:s.block,cards:s.cards,enemies:s.enemies};}
function preview(uid,expected,target){
 const state=status(uid);assert.equal(state.uid,uid);assert.equal(state.target??null,target??null,'actual UI aim target');
 assert.equal(state.preview.low,expected,'core preview');assert.equal(state.preview.high,expected,'single-value preview');
 const text=state.label.replace(/<color=#[\da-f]+>/gi,'').replace(/<\/color>/gi,'').replace(/[↑↓]/g,'');
 assert.deepEqual(text.match(/\d+/g),[String(state.preview.low)],'displayed sentence differs from the shared core preview');return state;
}
function entry(id){return Object.entries(status().cards).find(([,card])=>card.id===id&&!card.upgraded);}
function cardPoint(uid){const slot=Object.entries(status().cards).find(([,card])=>card.uid===uid)?.[0];assert(slot,'card no longer in hand');return point('stage/battlePanel/card'+slot+'/hit');}
function enemyPoint(index){
 const enemies=Object.entries(status().enemies).filter(([,e])=>e.hp>0).sort((a,b)=>a[1].x-b[1].x);
 const hits=native('stage/battlePanel/actorLayer').children.filter(a=>a.visible)
  .map(a=>a.children.find(c=>c.name==='hit')).filter(Boolean).map(point).sort((a,b)=>a.x-b.x);
 assert.equal(hits.length,enemies.length,'native actor/core actor mapping');
 const rank=enemies.findIndex(([key])=>Number(key)===index);assert(rank>=0);return hits[rank];
}
function setup(kind){session.runtime.runChunk(L,`__PREVIEW_SETUP('${kind}')`,'ANNOTATED_OFFLINE_PREVIEW_SETUP_'+kind);step();}
try{
 session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
 const root=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(root?.alive);L=root.env;exposeView();
 session.runtime.runChunk(L,`
 function __PREVIEW_STATUS(uid)
  local v=__PREVIEW_VIEW;local u=v.battleUI;local c=v.run.combat;local C=require('abyss_combat')
  local cards,enemies={},{}
  local panel=v.root:GetChild('battlePanel')
  for i,card in ipairs(c.hand)do cards[i]={uid=card.uid,id=card.cardId,upgraded=card.upgraded==true}end
  for i,e in ipairs(c.enemies)do local g=require('abyss_battle_enemy_view').geometry(e)
   enemies[i]={id=e.id,hp=e.hp,block=e.block,x=g.hitX,y=g.hitY,statuses=C.copy(e.statuses)}end
  local target,instance,slot
  local aim=u.cardAim
  if aim and aim.uid==uid and aim.previewReady()then target=aim.slot end
  local held=u.gesture or u.carry
  if held and held.moving and held.uid==uid then target=held.drawnTarget end
  for i,card in ipairs(c.hand)do if card.uid==uid then instance,slot=card,i end end
  return {phase=v.run.phase,hand=#c.hand,energy=c.energy,hp=c.player.hp,block=c.player.block,
   playerStatuses=C.copy(c.player.statuses),cards=cards,enemies=enemies,busy=u.busy,selected=u.selected,
   heldUid=held and held.uid,target=target,uid=instance and instance.uid,
   preview=instance and C.cardPreview(c,instance,target)[1],label=slot and panel:GetChild('card'..slot):GetChild('label').text}
 end
 function __PREVIEW_SETUP(kind)
  local v=__PREVIEW_VIEW;local c=v.run.combat;local C=require('abyss_combat')
  assert(v.run.phase=='combat' and c.phase=='player' and not v.battleUI.busy and not v.battleUI.gesture)
  if kind=='attack'then
   assert(#c.enemies>=2 and c.enemies[2].hp>6 and c.enemies[2].block==0)
   for _,id in ipairs({'strength','weak','dexterity','frail'})do assert((c.player.statuses[id]or 0)==0)end
   assert((c.enemies[1].statuses.vulnerable or 0)==0 and (c.enemies[2].statuses.vulnerable or 0)==0)
   C.addStatus(c.player,'strength',4);C.addStatus(c.player,'weak',1);C.addStatus(c.enemies[2],'vulnerable',1)
  elseif kind=='blocked-target'then C.block(c,c.enemies[2],5,true)
  elseif kind=='defend'then C.addStatus(c.player,'dexterity',3);C.addStatus(c.player,'frail',1)
  else error('unknown offline fixture setup')end
  v:refresh()
 end`,'READ_ONLY_PREVIEW_STATUS_AND_EXPLICIT_RUNTIME_SETUP');
 assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'),'new SDK session is not ready');step(120);drain();
 const strike=entry('strike'),defend=entry('defend');assert(strike&&defend,'fixture needs unupgraded Strike and Defend');
 const strikeUid=strike[1].uid,defendUid=defend[1].uid;
 stage('annotated-strength-weak-vulnerable-setup',()=>{setup('attack');return status(strikeUid);});
 const before=stage('strike-unaimed-7',()=>preview(strikeUid,7,null));
 let origin=cardPoint(strikeUid);
 stage('strike-neutral-aim-7',()=>{pointer('move',origin);pointer('down',origin);step();assert.equal(status().heldUid,strikeUid);pointer('move',enemyPoint(1));step();return preview(strikeUid,7,1);});
 stage('strike-vulnerable-aim-11',()=>{pointer('move',enemyPoint(2));step();return preview(strikeUid,11,2);});
 stage('strike-cancel-returns-7-without-command',()=>{pointer('move',origin);pointer('up',origin);step();const after=preview(strikeUid,7,null);assert(!after.selected&&!after.heldUid);assert.deepEqual(rules(after),rules(before));return after;});
 const blocked=stage('annotated-target-block5-display-stays-11',()=>{setup('blocked-target');origin=cardPoint(strikeUid);pointer('move',origin);pointer('down',origin);step();pointer('move',enemyPoint(2));step();const state=preview(strikeUid,11,2);assert.equal(state.enemies[2].block,5);return state;});
 stage('strike-real-pointer-release-hp-minus6-block0-energy-minus1',()=>{pointer('up',enemyPoint(2));step();const after=drain();assert.equal(after.enemies[2].hp,blocked.enemies[2].hp-6);assert.equal(after.enemies[2].block,0);assert.equal(after.energy,blocked.energy-1);assert.equal(after.hand,blocked.hand-1);assert(!Object.values(after.cards).some(c=>c.uid===strikeUid));step(90);return after;});
 const defense=stage('annotated-dex3-frail1-defend-preview6',()=>{setup('defend');const xy=cardPoint(defendUid);tap(xy);const state=preview(defendUid,6,null);assert.equal(state.selected,defendUid);return state;});
 stage('defend-real-pointer-play-block-plus6',()=>{tap('stage/battlePanel/playArea/hit');const after=drain();assert.equal(after.block-defense.block,defense.preview.low);assert.equal(after.block-defense.block,6);assert.equal(after.energy,defense.energy-1);assert.equal(after.hand,defense.hand-1);assert(!Object.values(after.cards).some(c=>c.uid===defendUid));return after;});
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1;}
finally{
 report.steps=steps;report.logs=session?.runtime.logs??[];
 report.faults=report.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text));
 report.sourceStable=hash(savePath)===report.saveSha256&&hash(sdkPath)===report.sdkSha256&&hash(receiptPath)===report.fixtureReceiptSha256&&hash(receipt.input)===receipt.inputSha256;
 if(report.faults.length||!report.sourceStable){report.status='failed';process.exitCode=1;}
 for(const runtime of session?.runtimes??[])try{runtime.destroy();}catch{}
 fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:report.status,error:report.error,stages:report.stages.map(s=>({name:s.name,status:s.status})),faults:report.faults.length,sourceStable:report.sourceStable}));
}
