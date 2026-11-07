// Passive native screenshots. No focus changes, keyboard, mouse or game writes.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {connect,data} from './rpc.mjs';
import {fileRecord,prepareOutputDirectory} from '../evidence-files.mjs';

export async function observeNative({call,output,now=Date.now}={}){
 const windows=(await call('list_editor_windows',{})).windows;
 const games=windows?.filter(w=>/[\\/](?:YuanShen|GenshinImpact)\.exe$/i.test(w.executable??''))??[];
 if(games.length!==1||games[0].minimized)throw Error('Need exactly one visible native game window; observer never opens or focuses it');
 const window=games[0],started=now();
 const capture=await call('capture_editor_window',{windowId:window.windowId,method:window.foreground?'screen':'window',maxWidth:1600});
 if(capture.window?.windowId!==window.windowId||!capture.path||!Number.isFinite(capture.capturedAtUnixMs)
  ||capture.capturedAtUnixMs<started-250||capture.suspectBlank===true)throw Error('Capture identity, timestamp or image is invalid');
 const bytes=readFileSync(capture.path);
 if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Native capture is not a PNG');
 const receipt={observedAt:new Date(now()).toISOString(),window,capture,image:fileRecord(capture.path),
  inputSent:false,focusChanged:false,renderFreshness:window.foreground?'screen capture':'unverified: PrintWindow may contain stale GPU pixels',
  scope:'Native screenshot only. A human/agent must inspect the image; this does not pass composition or gameplay checks.'};
 mkdirSync(output,{recursive:true});
 const receiptPath=join(output,`frame-${randomUUID()}.json`);writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
 return {...receipt,receiptPath};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const count=Number(process.argv[2]??1);
 if(!Number.isSafeInteger(count)||count<1||count>30)throw Error('Frame count must be 1..30');
 const output=join(prepareOutputDirectory(process.cwd(),'.artifacts/native-observer'),randomUUID());
 const client=await connect(output);
 try{
  for(const uri of ['miliastra://workflow','miliastra://platform-rules'])
   writeFileSync(join(output,uri.split('//')[1]+'.json'),JSON.stringify(await client.readResource({uri})));
  for(let i=0;i<count;i++){
   const frame=await observeNative({output,call:async(name,args)=>data(await client.callTool({name,arguments:args}))});
   console.log(JSON.stringify({frame:i+1,imagePath:frame.image.path,receiptPath:frame.receiptPath,renderFreshness:frame.renderFreshness,inputSent:false}));
   if(i+1<count)await new Promise(done=>setTimeout(done,1000));
  }
 }finally{await client.close()}
}
