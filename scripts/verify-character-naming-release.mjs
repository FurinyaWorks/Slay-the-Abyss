// Explicit release/name-approval gate. A draft HOLD manifest remains testable but can never pass here.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateNamingManifest,validateArtifactParity} from './validate-character-source-priority.mjs';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const input=process.argv[2];
if(!input){console.error('Usage: npm run verify:character-naming -- <repo-relative naming-review.json>');process.exit(2);}
try{
 const manifestPath=resolve(root,input);
 if(!manifestPath.startsWith(root+'/')&&!manifestPath.startsWith(root+'\\'))throw new Error('manifest path outside repo');
 const m=JSON.parse(readFileSync(manifestPath,'utf8'));
 const denied=JSON.parse(readFileSync(resolve(root,'tests/fixtures/character-name-denials.json'),'utf8'));
 const check=validateNamingManifest(m,denied);
 const html=readFileSync(resolve(root,m.artifact),'utf8');
 const parity=validateArtifactParity(m,html);
 const result={role:m.role,status:m.status,approved:check.approved,total:check.total,ready:check.ready,blockers:check.blockers.length,errors:[...check.errors,...parity.errors],manifest:input};
 console.log(JSON.stringify(result,null,2));
 if(!result.ready||result.errors.length)process.exitCode=1;
}catch(err){console.error('character naming gate: '+err.message);process.exitCode=1;}
