// Explicit offline acquisition fixture, exercised through the exported real SDK.
// Produces state/geometry receipts for matching screenshots; does not claim FPS,
// visual acceptance, official import, or an organically reached campaign deck.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [savePath,sdkPath,output]=process.argv.slice(2);
if(!savePath||!sdkPath||!output||process.argv.length!==5||fs.existsSync(output))throw Error('Usage: node scripts/measure-battle-card-coverage.mjs <coverage.save.json> <SDK export.mjs> <new report.json>');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const saveBytes=fs.readFileSync(savePath),save=JSON.parse(saveBytes);
const receiptPath=savePath+'.receipt.json',receiptBytes=fs.readFileSync(receiptPath),fixture=JSON.parse(receiptBytes);
assert.equal(fixture.kind,'offline-sdk-card-coverage-fixture');
assert.equal(hash(fs.readFileSync(fixture.input)),fixture.inputSha256,'actual source preview changed');
const mod=save.assets.scripts.find(s=>s.path===fixture.modifiedModule);
assert.equal(hash(mod.source),fixture.fixtureModuleSha256);
const sourceSave=JSON.parse(fs.readFileSync(fixture.input));
const sourceModule=sourceSave.assets.scripts.find(s=>s.path===fixture.modifiedModule);
assert.equal(hash(sourceModule.source),fixture.originalModuleSha256);
sourceModule.source=mod.source;sourceSave.meta??={};sourceSave.meta.name=save.meta.name;
assert.deepEqual(save,sourceSave,'fixture changed content outside the permitted GameUI source and meta.name');
const sdkBytes=fs.readFileSync(sdkPath);
const {Gr,vi,dn,wi,pa,Me,d}=await import(pathToFileURL(path.resolve(sdkPath)));
const report={kind:'sdk-battle-card-coverage',status:'running',node:process.version,fixture,
 save:path.resolve(savePath),saveSha256:hash(saveBytes),sdk:path.resolve(sdkPath),sdkSha256:hash(sdkBytes),
 fixtureReceiptSha256:hash(receiptBytes),actualGilLuaExact:false,officialImport:false,deviceVerified:false,
 gpuFpsMeasured:false,visualAccepted:false,stages:[],captures:[],pointerEvents:[]};
let session,L,steps=0;
const enc=s=>new TextEncoder().encode(s);
function value(index){
 const type=d.lua_type(L,index);
 if(type===0)return null;if(type===1)return d.lua_toboolean(L,index);
 if(type===3)return d.lua_tonumber(L,index);if(type===4)return Buffer.from(d.lua_tolstring(L,index)).toString();
 assert.equal(type,5,'unexpected observer value');const out={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);
 while(d.lua_next(L,abs)!==0){out[value(-2)]=value(-1);d.lua_pop(L,1);}return out;
}
function status(){const top=d.lua_gettop(L);d.lua_getglobal(L,enc('__COVERAGE_STATUS'));const code=d.lua_pcall(L,0,1,0);const result=value(-1);d.lua_settop(L,top);assert.equal(code,0,String(result));return result;}
function step(count=1){for(let i=0;i<count;i++){dn(session,1/60);steps++;}}
function native(p){let node=session.runtime.roots[0];for(const name of p.split('/')){const found=node.children.filter(c=>c.name===name);assert.equal(found.length,1,p);node=found[0];}return node;}
function point(p){const node=native(p),boxes=wi(session),box=boxes.get(node.Id),matrix=pa(session,boxes).get(node.Id);assert(box&&matrix,p);return Me(matrix,box.centerX,box.centerY);}
function pointer(type,p){report.pointerEvents.push({step:steps,type,...p});vi(session,type,p.x,p.y);}
function stage(name,fn){const row={name,step:steps};report.stages.push(row);try{row.result=fn();row.status='passed';return row.result;}catch(error){row.status='failed';row.state=status();throw error;}}
const core=s=>({phase:s.phase,energy:s.energy,hp:s.hp,block:s.block,hand:s.cards,discard:s.discard,exhaust:s.exhaust,enemies:s.enemies});
function capture(name,state=status()){
 const item={name,step:steps,state,cards:Object.entries(state.cards).map(([slot,card])=>({slot:Number(slot),...card,point:point('stage/battlePanel/card'+slot+'/hit')}))};
 report.captures.push(item);return item;
}
try{
 session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
 report.canvas={width:session.runtime.canvasWidth,height:session.runtime.canvasHeight,coordinates:'SDK bottom-origin; browser canvas y=height-y'};
 const root=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(root?.alive);L=root.env;
 const top=d.lua_gettop(L);d.lua_getglobal(L,enc('OnUpdate'));let found=false;
 for(let i=1;i<50;i++){const key=d.lua_getupvalue(L,-1,i);if(!key)break;if(Buffer.from(key).toString()==='view'){d.lua_setglobal(L,enc('__COVERAGE_VIEW'));found=true;break;}d.lua_pop(L,1);}d.lua_settop(L,top);assert(found);
 session.runtime.runChunk(L,`function __COVERAGE_STATUS()
 local v=__COVERAGE_VIEW;local u=v.battleUI;local b=v.run.combat;local C=require('abyss_combat')
 local cards,enemies,discard,exhaust={},{},{},{}
 for i,c in ipairs(b.hand)do
  local def=C.cardDefinition(b,c);local box=v.root:GetChild('battlePanel'):GetChild('card'..i)
  local plain,reason=C.canPlay(b,c.uid,nil);local targeted=C.canPlay(b,c.uid,1)
  cards[i]={uid=c.uid,id=c.cardId,upgraded=c.upgraded==true,rarity=def.rarity,type=def.type,
   cost=C.combatBaseCost(b,c),plain=plain,targeted=targeted,reason=reason,
   title=box:GetChild('name').text,costText=box:GetChild('cost').text,label=box:GetChild('label').text}
 end
 for i,e in ipairs(b.enemies)do enemies[i]={id=e.id,hp=e.hp,block=e.block}end
 for i,c in ipairs(b.discard)do discard[i]=c.uid end
 for i,c in ipairs(b.exhaust)do exhaust[i]=c.uid end
 return {phase=v.run.phase,energy=b.energy,hp=b.player.hp,block=b.player.block,cards=cards,
  enemies=enemies,discard=discard,exhaust=exhaust,busy=u.busy,selected=u.selected,
  hovered=u.handHover and u.handHover.uid,held=u.gesture and u.gesture.uid,
  touch=u.gesture and u.gesture.touch,moving=u.gesture and u.gesture.moving==true,
  carry=u.carry and u.carry.uid,
  gesture=u.gesture and {x=u.gesture.x,y=u.gesture.y,sy=u.gesture.sy,elapsed=u.gesture.elapsed,
   enteredField=u.gesture.enteredField,cancelled=u.gesture.cancelled,handCancelY=u.gesture.handCancelY},
  info=u.info and {kind=u.info.kind,uid=u.info.uid,transient=u.info.transient}}
 end`,'READ_ONLY_COVERAGE_STATUS');
 assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'));
 assert(session.runtime.logs.some(l=>l.text.startsWith('CARD_COVERAGE_READY group='+fixture.group+' ')));
 step(120);
 stage('real-ten-card-source-and-display',()=>{
  const state=status(),rows=Object.values(state.cards);assert.equal(rows.length,10);
  for(const expected of fixture.expected){
   const actual=rows.find(c=>c.id===expected.id&&c.upgraded===expected.upgraded);assert(actual,expected.id);
   assert.equal(actual.type,expected.type);assert.equal(actual.rarity,expected.rarity);
   assert.equal(actual.cost,expected.cost==='X'?-1:expected.cost);
   assert.equal(actual.costText,expected.cost==='X'?'X':expected.cost===-2?'':String(expected.cost));
   if(expected.upgraded)assert(/[+＋]/.test(actual.title),'upgraded title '+expected.id);
  }
  capture('whole-'+fixture.group,state);return state;
 });
 stage('every-real-slot-hover-first-press-drag-cancel',()=>{
  const outcomes=[];
  for(let slot=1;slot<=10;slot++){
   pointer('move',{x:640,y:340});step(24);
   const before=status(),card=before.cards[slot],p=point('stage/battlePanel/card'+slot+'/hit');
   pointer('move',p);step(30);
   const hover=status();assert.equal(hover.hovered,card.uid,'hover UID '+slot);
   capture('hover-'+fixture.group+'-'+slot,hover);
   pointer('down',p);step();const pressed=status();
   if(card.plain||card.targeted){
    assert.equal(pressed.held,card.uid,'first Down after hover '+slot);
    pointer('move',{x:p.x,y:p.y+180});step();assert(status().moving);
   }else assert(!pressed.held,'illegal card acquired a drag');
   const cancel={x:p.x,y:20}; // native SDK canvas coordinates are bottom-origin
   pointer('move',cancel);pointer('up',cancel);step(24);
   const after=status();report.lastCancelProbe={before,pressed,after};assert(!after.held&&!after.selected);
   assert.deepEqual(core(after),core(before),'cancel spent resources '+slot);
   outcomes.push({slot,uid:card.uid,id:card.id,legal:card.plain||card.targeted,pressed,after});
  }
  return outcomes;
 });
 stage(fixture.group==='mechanics'?'real-X-cost-command':'real-exhaust-command',()=>{
  const before=status(),id=fixture.group==='mechanics'?'whirlwind':fixture.group==='status'?'slimed':'impervious';
  const [slot,card]=Object.entries(before.cards).find(([,card])=>card.id===id);
  const tap=p=>{pointer('move',p);pointer('down',p);step();pointer('up',p);step();};
  tap(point('stage/battlePanel/card'+slot+'/hit'));
  assert.equal(status().selected,card.uid,'real command must select the intended UID');
  tap(point('stage/battlePanel/playArea/hit'));
  for(let i=0;i<600&&status().busy;i++)step();
  const after=status();assert(!after.busy,'card feedback did not settle');
  assert(!Object.values(after.cards).some(c=>c.uid===card.uid),'command did not remove intended card');
  if(id!=='whirlwind'){
   assert(Object.values(after.exhaust).includes(card.uid),'played Exhaust card missing from real exhaust pile');
   assert.equal(after.energy,before.energy-card.cost);
   assert.equal(after.block,before.block+(id==='impervious'?30:0));
  }else{
   assert.equal(after.energy,0,'X command must spend all available energy');
   for(const [index,enemy]of Object.entries(before.enemies))assert.equal(after.enemies[index].hp,Math.max(0,enemy.hp-5*before.energy),'Whirlwind must deal source 5 x energy to each real enemy');
  }
  capture('after-'+id,after);return {before,after,uid:card.uid};
 });
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1;}
finally{
 report.logs=session?.runtime.logs??[];
 report.faults=report.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text));
 if(report.faults.length){report.status='failed';process.exitCode=1;}
 report.sourceStable=hash(fs.readFileSync(savePath))===report.saveSha256&&hash(fs.readFileSync(sdkPath))===report.sdkSha256&&hash(fs.readFileSync(receiptPath))===report.fixtureReceiptSha256&&hash(fs.readFileSync(fixture.input))===fixture.inputSha256;
 if(!report.sourceStable){report.status='failed';process.exitCode=1;}
 for(const runtime of session?.runtimes??[])try{runtime.destroy();}catch{}
 fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:report.status,group:fixture.group,captures:report.captures.length,error:report.error}));
}
