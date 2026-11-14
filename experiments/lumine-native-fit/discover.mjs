import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tool=process.env.MILIASTRA_MCP_ROOT??'D:/MiliastraTools/genshin-miliastra-mcp';
const {Client}=await import(pathToFileURL(tool+'/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js'));
const {StdioClientTransport}=await import(pathToFileURL(tool+'/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js'));
const out=path.resolve('.artifacts/lumine-discovery');fs.mkdirSync(out,{recursive:true});
const client=new Client({name:'lumine-native-fit-readonly',version:'1'});
try{
 await client.connect(new StdioClientTransport({command:process.execPath,args:[tool+'/src/server.mjs'],env:{...process.env,MILIASTRA_ALLOW_LIVE_WRITE:'0',MILIASTRA_WORKSPACE:out}}));
 for(const uri of ['miliastra://workflow','miliastra://platform-rules']){const r=await client.readResource({uri});fs.writeFileSync(out+'/'+uri.split('//')[1]+'.json',JSON.stringify(r,null,2));console.log(uri,JSON.stringify(r).length+' bytes read');}
 const list=await client.listTools();fs.writeFileSync(out+'/tools.json',JSON.stringify(list,null,2));
 const maps=await client.callTool({name:'list_maps',arguments:{}});fs.writeFileSync(out+'/maps.json',JSON.stringify(maps,null,2));console.log(JSON.stringify(maps).slice(0,4500));
}finally{await client.close();}
