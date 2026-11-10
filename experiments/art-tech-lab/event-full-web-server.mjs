// Local experiment host only: original readonly server/worker/renderer remain
// untouched. Relax its documented worker budget and the frontend fetch budget.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [bundle,file,port='4190',budget='120000']=process.argv.slice(2);
assert(bundle&&file&&Number(budget)>=15000,'Usage: event-full-web-server.mjs <readonly-server.js> <workspace-relative-save> [port] [timeout-ms]');
process.env.QXQY_PLAY_TIMEOUT_MS=budget;
const playFile=path.join(path.dirname(bundle),'public','play.js'),original=fs.readFileSync(playFile,'utf8');
assert.equal(original.split('AbortSignal.timeout(15_000)').length,2,'Expected one upstream play request timeout');
const adjusted=original.replace('AbortSignal.timeout(15_000)',`AbortSignal.timeout(${Number(budget)})`);
const output=path.dirname(path.resolve(file));
fs.writeFileSync(path.join(output,'host-play.js'),adjusted);
const hash=s=>createHash('sha256').update(s).digest('hex');
const {createWebServer}=await import(pathToFileURL(path.resolve(bundle)));
const app=await createWebServer({workspace:process.cwd(),initialPath:file,host:'127.0.0.1',port:Number(port)});
const handlers=app.server.listeners('request');assert.equal(handlers.length,1);
app.server.removeAllListeners('request');
app.server.on('request',(request,response)=>{
 if(request.method==='GET'&&new URL(request.url,'http://127.0.0.1').pathname==='/editor/play.js'){
  response.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});response.end(adjusted);return;
 }
 handlers[0].call(app.server,request,response);
});
fs.writeFileSync(path.join(output,'host.json'),JSON.stringify({scope:'Independent loopback experiment host; upstream readonly bundle unchanged; fetch and worker timeout increased only',node:process.version,bundle,upstreamPlaySha256:hash(original),localPlaySha256:hash(adjusted),workerTimeoutMs:Number(budget),frontendTimeoutMs:Number(budget),url:app.url},null,2));
console.log('EVENT_FULL_WEB_SERVER '+app.url+' node='+process.version+' timeout='+budget);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().finally(()=>process.exit(0)));
