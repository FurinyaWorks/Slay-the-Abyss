// Append one exact reviewed source slice; historical archives remain immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('../fixtures/curses-source-epoch.json',import.meta.url));
assert.equal(hash(bytes),'b0ffcdfa75863215c76913faafe1c15100aef9b5d44df3e44b4cda56a77e1018','Curses source witness identity');
const witness=JSON.parse(bytes);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
freeze(witness);
export function extendCursesEpoch(prior){
 const path=witness.path,old=prior.proof.current[path];
 assert.equal(old?.sha256,witness.before.sha256,'Curses exact predecessor identity');
 assert.equal(old?.source,witness.before.source,'Curses exact predecessor source');
 assert(!prior.proof.owners.includes(path),'Curses new owner must not replace an inherited owner');
 const current={...prior.proof.current,[path]:witness.current};
 const targets={...prior.proof.targets,cursesPrior:{commit:prior.proof.currentCommit,files:prior.proof.current}};
 const owners=[...prior.proof.owners,path];
 return createSourceEpochProjector(freeze({...prior.proof,currentTreeCommitted:false,
  currentCommitRole:'composed UI and Curses source identity; not a committed historical corpus',
  cursesSourceSliceCommit:witness.sourceSliceCommit,current,targets,owners}),
  {allowConfigLayout:true,reuseFrozenInput:true});
}
