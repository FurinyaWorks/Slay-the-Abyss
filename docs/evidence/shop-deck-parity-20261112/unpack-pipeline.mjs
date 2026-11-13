import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
const root=process.cwd();
const input=path.join(root,'docs/evidence/battle-piles-final-20261111');
const output=path.join(root,'.artifacts/shop-deck-parity-20261112/pipeline');
fs.mkdirSync(output,{recursive:true});
for(const name of ['readback-adapter.mjs','prepare-readback.mjs','browser-runner-before-cleanup.mjs','visual-capture.mjs','whole-page-runner.mjs','adapter-receipt.json','package-evidence.mjs']){
 fs.writeFileSync(path.join(output,name),gunzipSync(fs.readFileSync(path.join(input,name+'.gz'))));
}
console.log(output);
