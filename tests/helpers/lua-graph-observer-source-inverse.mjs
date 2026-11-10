// Test-only projection for planning receipts predating the optional event sink.
// Current execution and raw-current source checks must keep using the live file.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const observerSourcePath='tests/helpers/lua-graph-observer.mjs';
export const observerCurrentSha256='c75f1ed7356d1c2163e096af5765922593ad0081a53fb5f261d401d1d743a62a';
export const observerPriorSha256='a93fb46a50b261dea20156bd1d0c2dfdfe06c912b13966ccb9568e6fe9229b3f';
const hash=source=>createHash('sha256').update(source).digest('hex');
const signature="export function installLuaGraphObserver(L,name='ABYSS_HOST_GRAPH',writeGraph,writeEvent){";
const priorSignature=signature.replace(',writeEvent','');
const bridge=" if(writeEvent){\n  lua.lua_pushcfunction(L,L=>{writeEvent(observe(L,true));return 0;});\n  lua.lua_setglobal(L,to_luastring(name+'_EVENT_WRITE'));\n }\n";
const anchor=' const returned=(L,eventArgs=false)=>';
export function preObserverEventWriteSource(path,source){
 if(path!==observerSourcePath||typeof source!=='string')return source;
 const text=source.replaceAll('\r\n','\n');
 // Admit only a complete known LF file or its uniform CRLF checkout, not mixed
 // endings or partial source that happens to contain the two changed regions.
 if(source!==text&&source!==text.replaceAll('\n','\r\n'))return source;
 if(hash(text)!==observerCurrentSha256)return source;
 const prior=text.replace(signature,priorSignature).replace(bridge,'');
 assert.equal(hash(prior),observerPriorSha256,'complete prior observer identity');
 assert.equal(prior.replace(priorSignature,signature).replace(anchor,bridge+anchor),text,'complete observer forward identity');
 return prior;
}
