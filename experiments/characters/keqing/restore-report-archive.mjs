import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const archive=path.join(root,'historical-report-archive');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export function restoreReport(entry,readPart){
 if(!/^[a-z0-9-]+\.json$/.test(entry.path))throw Error('invalid report path');
 let compact='';
 for(const part of entry.parts){
  if(!/^[a-z0-9.-]+\.part$/.test(part.path))throw Error('invalid shard path');
  const s=readPart(part.path);
  if(sha(s)!==part.sha256)throw Error('shard digest mismatch');
  compact+=s;
 }
 const original=JSON.stringify(JSON.parse(compact),null,2)+'\n';
 if(Buffer.byteLength(original)!==entry.originalBytes||sha(original)!==entry.originalSha256)throw Error('original digest mismatch');
 return original;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length && !(args.length===2&&args[0]==='--restore'))throw Error('usage: node restore-report-archive.mjs [--restore NEW_DIRECTORY]');
 const index=JSON.parse(fs.readFileSync(path.join(archive,'index.json'),'utf8'));
 // Validate all reports before writing any. Default is read-only verification.
 const restored=index.reports.map(e=>({path:e.path,content:restoreReport(e,p=>fs.readFileSync(path.join(archive,p),'utf8'))}));
 if(args.length){fs.mkdirSync(args[1]);for(const r of restored)fs.writeFileSync(path.join(args[1],r.path),r.content,{flag:'wx'});}
 console.log(JSON.stringify({verified:restored.length,restored:args.length?args[1]:false,note:'Historical reports; not current 75-card evidence.'}));
}
