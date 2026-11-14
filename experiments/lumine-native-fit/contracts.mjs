// Narrow state/failure contracts on actual candidate Lua inside the installed SDK.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [saveArg,sdkArg,outArg]=process.argv.slice(2);assert(saveArg&&sdkArg&&outArg&&!fs.existsSync(outArg));
const sdk=await import(pathToFileURL(path.resolve(sdkArg))),save=JSON.parse(fs.readFileSync(saveArg));const mount=sdk.Qi.prototype.mountScript;
sdk.Qi.prototype.mountScript=function(options){return mount.call(this,{...options,params:{...options.params,...(/abyss_ui\.lua$/.test(options.path)?{lumineFitBudget:3200}:{})}})};
let session;const report={scope:'Actual GIL Lua, Simulator API. Test-local view/platform arguments and injected destroy rejection; no official/device acceptance.',saveSha256:createHash('sha256').update(fs.readFileSync(saveArg)).digest('hex'),checks:[],status:'running'};
try{
 session=sdk.Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
 const mounted=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path)),L=mounted.env,d=sdk.d,enc=s=>new TextEncoder().encode(s);
 d.lua_getglobal(L,enc('OnUpdate'));let found=false;for(let i=1;i<50;i++){const k=d.lua_getupvalue(L,-1,i);if(!k)break;if(Buffer.from(k).toString()==='view'){d.lua_setglobal(L,enc('__FIT_VIEW'));found=true;break;}d.lua_pop(L,1);}d.lua_pop(L,1);assert(found);
 const check=(name,source)=>{const before=session.runtime.logs.length;session.runtime.runChunk(L,source,'FIT_CONTRACT_'+name);const faults=session.runtime.logs.slice(before).filter(l=>l.level==='lua-error');assert.equal(faults.length,0,JSON.stringify(faults));report.checks.push(name);};
 check('menu-no-preload',`local f=require('abyss_lumine_fit');assert(f.status().created==0 and not f.status().active)`);
 check('selection-role-boundaries',`
 local fit=require('abyss_lumine_fit');local view=require('abyss_game_ui_view');local calls={}
 local platform={portraits={sync=function(_,mode,open,stopped,character,preload) calls[#calls+1]={mode=mode,open=open,character=character,preload=preload}end}}
 local state={root=__FIT_VIEW.root,mode='menu',characterOpen=true,characterSelection={info={id='hutao'}}}
 local sync=view.syncPortraits(platform,state);sync()
 assert(calls[#calls].character=='hutao' and calls[#calls].open==true);assert(fit.status().created==0)
 state.characterSelection.info=nil;sync();assert(not fit.status().active)
 state.characterSelection.info={id='ironclad'};sync()
 assert(calls[#calls].open==true and calls[#calls].character==nil and calls[#calls].preload==false)
 assert(fit.status().active and fit.status().created==1)
 state.disabled=true;sync();assert(not fit.status().active)
 state.disabled=false;state.characterSelection.info={id='hutao'};sync();assert(calls[#calls].character=='hutao' and not fit.status().active)
 state.characterOpen=false;state.mode='battle';state.run={character='ironclad'};sync()
 assert(calls[#calls].mode=='battle' and calls[#calls].character=='ironclad' and not fit.status().active)
 `);
 check('invalid-budget-retains-state',`local f=require('abyss_lumine_fit');assert(not pcall(f.configure,7));assert(f.status().budget==3200)`);
 check('switch-releases-bounded-cache',`local f=require('abyss_lumine_fit');f.configure(800);assert(f.status().destroyed==1);f.sync(__FIT_VIEW.root,true);assert(f.status().created==2 and f.status().images<=800);f.configure(0);assert(f.status().destroyed==2 and not f.status().active)`);
 check('locked-role-does-not-unlock',`assert(__FIT_VIEW:start());local ok,why=__FIT_VIEW:selectCharacter('hutao');assert(not ok and why=='competition_character_unavailable');assert(__FIT_VIEW.characterSelection.info.id=='ironclad')`);
 check('partial-create-and-cleanup-rejection-falls-back',`
 local fit=require('abyss_lumine_fit');fit.configure(1600)
 local create,destroy=game.InstantiateClientUIControl,game.DestroyClientUIControl;local attempts=0
 game.InstantiateClientUIControl=function(...)attempts=attempts+1;if attempts==1 then return create(...)end;return nil end
 game.DestroyClientUIControl=function()return false end
 local calls={};local platform={portraits={sync=function(_,mode,open,stopped,character)calls[#calls+1]={character=character}end}}
 local state={root=__FIT_VIEW.root,mode='menu',characterOpen=true,characterSelection={info={id='ironclad'}}}
 local ok,why=pcall(require('abyss_game_ui_view').syncPortraits(platform,state))
 game.InstantiateClientUIControl,game.DestroyClientUIControl=create,destroy
 assert(ok,tostring(why));assert(fit.status().phase=='failed' and not fit.enabled());assert(fit.status().cleanupError)
 assert(calls[#calls].character=='ironclad','original selection art was not resumed')
 assert(not __FIT_VIEW.disabled,'optional artwork disabled GameUI');fit.release()
 `);
 check('destroy-rejection-preserves-normal-cleanup',`
 local f=require('abyss_lumine_fit');f.configure(3200);f.sync(__FIT_VIEW.root,true)
 local destroy=game.DestroyClientUIControl;game.DestroyClientUIControl=function()return false end
 local ok,why=pcall(OnDestroy);game.DestroyClientUIControl=destroy
 assert(ok,tostring(why));assert(__FIT_VIEW.disabled==true,'normal GameUI cleanup was skipped')
 f.release()
 `);
 assert(session.runtime.logs.some(l=>/LUMINE_FIT cleanup_failed/.test(l.text)),'Rejected cleanup was not diagnosed');report.status='pass';
}catch(e){report.status='failed';report.error=String(e.stack);process.exitCode=1;console.error(e);}
finally{report.logs=session?.runtime.logs??[];if(session)for(const r of session.runtimes??[])r.destroy();report.remainingControls=session?.runtime.controlsById.size;sdk.Qi.prototype.mountScript=mount;fs.mkdirSync(path.dirname(outArg),{recursive:true});fs.writeFileSync(outArg,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks,remainingControls:report.remainingControls}));}
