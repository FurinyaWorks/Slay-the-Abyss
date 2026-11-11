// Exact composition; original room/component/official archives remain immutable.
import {preBattleQueueSource} from './battle-queue-source-epoch.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./joint-ui-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'67777c3571d86bc82427fbb6ac5cd2254ed480b58285f41aa17d05d7490413f9','joint UI archive identity');
const archive=JSON.parse(gunzipSync(bytes));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
for(const row of Object.values(archive.files))for(const b of Object.values(row))if(b){assert.equal(hash(b.source),b.sha256);assert.equal(b.source.replaceAll('\r\n','\n'),b.source);}
freeze(archive);
export function jointUiSourceAt(path,source,view){
 assert(['room','component','official'].includes(view),'explicit UI source view');
 if(view!=='official')source=preBattleQueueSource(path,source);
 const row=Object.hasOwn(archive.files,path)?archive.files[path]:null;
 return row&&row[view]&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.current.sha256?row[view].source:source;
}
export function extendJointUiEpoch(prior){
 const current={...prior.proof.current};
 for(const [p,row]of Object.entries(archive.files)){assert.deepEqual(row.room,prior.proof.current[p]??null,'joint room predecessor: '+p);current[p]=row.current;}
 const paths=Object.keys(current),complete=files=>Object.fromEntries(paths.map(p=>[p,files[p]??null]));
 const targets=Object.fromEntries(Object.entries(prior.proof.targets).map(([name,t])=>[name,{...t,files:complete(t.files)}]));
 targets.jointUiPrior={commit:prior.proof.currentCommit,files:complete(prior.proof.current)};
 const owners=paths.filter(p=>Object.values(targets).some(t=>t.files[p]?.sha256!==current[p]?.sha256));
 return createSourceEpochProjector(freeze({...prior.proof,currentTreeCommitted:false,currentCommitRole:'composed UI source identity; not a committed historical corpus',current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
