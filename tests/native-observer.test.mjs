import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {observeNative} from '../scripts/native-3d/observe.mjs';
const game={windowId:'fresh:1',executable:'G:/Genshin/YuanShen.exe',minimized:false,foreground:false};
function setup(options={}){
 const output=mkdtempSync(join(tmpdir(),'native-observer-')),path=join(output,'source.png'),calls=[];
 writeFileSync(path,Buffer.from([137,80,78,71,13,10,26,10]));
 const call=async(name,args)=>{
  calls.push({name,args});
  if(name==='list_editor_windows')return {windows:options.windows??[game]};
  if(name==='capture_editor_window')return {path,window:{windowId:game.windowId},capturedAtUnixMs:1000,suspectBlank:false,...options.capture};
  throw Error('Observer attempted a non-observation tool: '+name);
 };
 return {output,call,calls,now:()=>1000};
}
test('background observation never grabs focus or sends input, and retains freshness caveat',async()=>{
 const h=setup(),receipt=await observeNative(h);
 assert.deepEqual(h.calls.map(c=>c.name),['list_editor_windows','capture_editor_window']);
 assert.equal(h.calls[1].args.method,'window');assert.equal(receipt.inputSent,false);assert.equal(receipt.focusChanged,false);
 assert.match(receipt.renderFreshness,/unverified/);
});
test('foreground observation uses actual screen pixels without activating the window',async()=>{
 const h=setup({windows:[{...game,foreground:true}]});await observeNative(h);
 assert.equal(h.calls[1].args.method,'screen');
});
test('ambiguous/minimized windows and stale/mismatched/blank capture receipts fail closed',async()=>{
 for(const options of [{windows:[]},{windows:[game,game]},{windows:[{...game,minimized:true}]},
  {capture:{capturedAtUnixMs:0}},{capture:{window:{windowId:'old:2'}}},{capture:{suspectBlank:true}}])
  await assert.rejects(observeNative(setup(options)),/window|Capture/);
});
