import fs from 'node:fs';import {connectMcp} from '../../art/spikes/art-pressure/mcp.mjs';
fs.mkdirSync('.artifacts/menu-rules',{recursive:true});
const client=await connectMcp('menu-2d-scene','.artifacts/menu-rules');
try{for(const uri of ['miliastra://workflow','miliastra://platform-rules']){const r=await client.readResource({uri});console.log(JSON.stringify(r));}}finally{await client.close()}
