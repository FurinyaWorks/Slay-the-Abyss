import fs from 'node:fs';
import {Client} from 'file:///D:/MiliastraTools/genshin-miliastra-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from 'file:///D:/MiliastraTools/genshin-miliastra-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const out='.artifacts/lumine-idle/audit';fs.mkdirSync(out,{recursive:true});
const client=new Client({name:'lumine-idle-audit',version:'1'});
await client.connect(new StdioClientTransport({command:process.execPath,args:['D:/MiliastraTools/genshin-miliastra-mcp/src/server.mjs'],env:{...process.env,MILIASTRA_WORKSPACE:process.cwd()+'/'+out,MILIASTRA_ALLOW_LIVE_WRITE:'0'}}));
try{
 for(const uri of ['miliastra://workflow','miliastra://platform-rules']){
  const r=await client.readResource({uri});fs.writeFileSync(out+'/'+uri.split('//')[1]+'.json',JSON.stringify(r,null,2));
  console.log(uri+' saved');
 }
 const list=await client.listTools();fs.writeFileSync(out+'/tools.json',JSON.stringify(list,null,2));
 for(const [name,args] of [['list_maps',{}],['image_catalog',{}]]){
  const result=await client.callTool({name,arguments:args});fs.writeFileSync(out+'/'+name+'.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result).slice(0,5000));
 }
}finally{await client.close()}
