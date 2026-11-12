import {sourceEpoch as combinedCurrent,sourceSlice} from './helpers/closeout-source-epoch.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as nativeReadFileSync} from 'node:fs';
import {jointUiSourceAt} from './helpers/joint-ui-source-epoch.mjs';
import {preDefectActorSource} from './helpers/defect-actor-source-epoch.mjs';
// Original assertions retain their explicit frozen source view.
const currentRaw=p=>nativeReadFileSync(p,'utf8');
const readFileSync=(p,encoding)=>{const value=nativeReadFileSync(p,encoding);return typeof value==='string'?jointUiSourceAt(p,combinedCurrent.preCombinedSource(p,value,{target:'jointUiPrior',readSource:currentRaw}),'room'):value;};
import {roomUiSourceEpoch as room} from './helpers/room-ui-source-epoch.mjs';
import {componentUiSourceEpoch as component} from './helpers/component-ui-source-epoch.mjs';
import {preJointUiEpoch as epoch,preRoomUiEpoch as prior} from './helpers/combined-epoch/source-epoch.mjs';
const live=p=>readFileSync(p,'utf8'),raw=p=>epoch.proof.current[p]?.source??null;
const changed=['src/lua/abyss_game_ui_view.lua','src/lua/abyss_map_ui.lua','src/lua/abyss_node_ui_faces.lua'];
import {preJoustEpoch as joint,joustIntegratedEpoch as current} from './helpers/combined-epoch/source-epoch.mjs';
import {joustSourceProof} from './helpers/joust-source-epoch.mjs';
import {readdirSync} from 'node:fs';
const currentLive=p=>{try{return sourceSlice(p,nativeReadFileSync(p,'utf8'),'pr612').replaceAll('\r\n','\n');}catch(e){if(e.code==='ENOENT')return null;throw e;}};
// Preserve the original joint UI assertions against their explicit predecessor.
const jointLive=current.combinedReader(currentLive,'joustPrior');

test('joint UI current identity includes every live module and the entire inherited owner closure',()=>{
 for(const p of epoch.proof.owners)assert(joint.proof.owners.includes(p),p);
 for(const p of ['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)])
  assert.equal(jointLive(p).replaceAll('\r\n','\n'),joint.proof.current[p].source,p);
 for(const target of Object.values(joint.proof.targets))assert.deepEqual(Object.keys(target.files).sort(),Object.keys(joint.proof.current).sort());
 assert.equal(joint.proof.targets.jointUiPrior.files['src/lua/abyss_battle_card_glow.lua'],null);
});

test('joint UI projection rejects every warm owner drift and deletion from the real composed source',()=>{
 const p='config/architecture.json',source=jointLive(p),before=epoch.proof.current[p].source;
 for(const owner of joint.proof.owners){
  let bad=false;
  const reader=q=>{const s=jointLive(q);return bad&&q===owner?s+'\n':s;};
  assert.equal(joint.preCombinedSource(p,source,{target:'jointUiPrior',readSource:reader}),before);bad=true;
  assert.throws(()=>joint.preCombinedSource(p,source,{target:'jointUiPrior',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>joint.preCombinedSource(p,source,{target:'jointUiPrior',readSource:q=>q===owner?null:jointLive(q)}),/linked owner identity/,owner);
 }
 // JSON layout is explicitly supported; corrupt a token for the foreign case.
 for(const input of [source.replace('"layers"','"foreignLayers"'),source.slice(1),null,{},17]){
  let reads=0;assert.equal(joint.preCombinedSource(p,input,{target:'jointUiPrior',readSource(){reads++;throw Error('foreign');}}),input);assert.equal(reads,0);
 }
});

test('room epoch binds the exact committed owner slice without replacing component history',()=>{
 assert.equal(room.proof.currentCommit,'fbe7051b6e8698e43ba9c179e2307943a96c8491');
 assert.equal(room.proof.currentTreeCommitted,true);
 assert.equal(epoch.proof.currentTreeCommitted,false,'composed historical witnesses are not a committed full tree');
 assert.deepEqual(room.proof.owners,component.proof.owners);
 assert.deepEqual(epoch.proof.owners,prior.proof.owners,'retain the entire inherited authorization closure');
 assert.deepEqual(room.proof.owners.filter(p=>room.proof.current[p].sha256!==component.proof.current[p].sha256),changed);
 for(const p of room.proof.owners){
  assert.equal(live(p).replaceAll('\r\n','\n'),room.proof.current[p].source,p);
  assert.deepEqual(room.proof.targets.componentUiPrior.files[p],component.proof.current[p],p);
 }
 for(const p of epoch.proof.owners)assert.equal(live(p).replaceAll('\r\n','\n'),raw(p),p);
 assert.deepEqual(epoch.proof.targets.componentUiPrior.files,prior.proof.current);
 for(const [name,target]of Object.entries(prior.proof.targets))assert.deepEqual(epoch.proof.targets[name],target,name);
});

test('all changed room owners project exactly through LF CRLF and every inherited target',()=>{
 for(const p of changed){
  const current=raw(p),before=prior.proof.current[p].source;
  for(const input of [current,current.replaceAll('\n','\r\n')]){
   assert.equal(epoch.preCombinedSource(p,input,{target:'componentUiPrior',readSource:raw}),before,p);
   for(const target of Object.keys(prior.proof.targets)){
    const expected=prior.preCombinedSource(p,before,{target,readSource:q=>prior.proof.current[q]?.source??null});
    assert.equal(epoch.preCombinedSource(p,input,{target,readSource:raw}),expected,p+':'+target);
   }
  }
 }
});

test('changed-owner projection freshly rejects every inherited owner drift or deletion after warming',()=>{
 const p=changed[1],source=raw(p);
 for(const owner of epoch.proof.owners){
  let drift=false,reads=0;
  const reader=q=>{reads++;return drift&&q===owner?raw(q)+'\n':raw(q);};
  assert.equal(epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:reader}),prior.proof.current[p].source);
  assert.equal(reads,epoch.proof.owners.length,'complete fresh closure');drift=true;
  assert.throws(()=>epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:q=>q===owner?null:raw(q)}),/linked owner identity/,owner);
  assert.throws(()=>epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:q=>{if(q===owner)throw Error('removed');return raw(q);}}),/linked owner missing/,owner);
 }
 const reader=epoch.combinedReader(raw,'componentUiPrior');
 assert.equal(epoch.readerTarget(reader),'componentUiPrior');assert.equal(reader(p),prior.proof.current[p].source);
 assert.equal(epoch.combinedReader(reader,'componentUiPrior'),reader);
});

test('foreign predecessor and unchanged inputs stay opaque without authorizing reads',()=>{
 for(const p of changed)for(const source of [raw(p)+'\n',prior.proof.current[p].source]){
  let reads=0;
  assert.equal(epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource(){reads++;throw Error('unexpected');}}),source);
  assert.equal(reads,0,p);
 }
 const p='config/architecture.json';let reads=0;
 assert.equal(epoch.preCombinedSource(p,raw(p),{target:'componentUiPrior',readSource(){reads++;throw Error('unexpected');}}),raw(p));
 assert.equal(reads,0,'unchanged config cannot be used as a changed-owner authorization probe');
 assert.throws(()=>epoch.preCombinedSource(changed[0],raw(changed[0]),{target:'componentUiPrior',readSource:null}),/linked owner reader/);
});


test('Joust current source identity preserves every inherited target and all live modules',()=>{
 assert.deepEqual(current.proof.owners,[...new Set([...joint.proof.owners,joustSourceProof.path])]);
 assert.equal(current.proof.currentTreeCommitted,false);
 assert.equal(current.proof.joustCollectedBaseCommit,'6a614fc82697750ddb408750e54f59f801c24f1e');
 assert.deepEqual(current.proof.targets.joustPrior.files,joint.proof.current);
 for(const [name,target]of Object.entries(joint.proof.targets))assert.deepEqual(current.proof.targets[name],target,name);
 for(const p of ['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)])
  assert.equal(currentLive(p).replaceAll('\r\n','\n'),current.proof.current[p].source,p);
 const changed=Object.keys(current.proof.current).filter(p=>current.proof.current[p]?.sha256!==joint.proof.current[p]?.sha256);
 assert.deepEqual(changed,[joustSourceProof.path]);
 assert.equal(nativeReadFileSync('tests/fixtures/joust-event-before.lua','utf8').replaceAll('\r\n','\n'),joustSourceProof.before.source);
});

test('Joust projections retain every target and reject warm drift or deletion of each raw owner',()=>{
 const p=joustSourceProof.path,source=currentLive(p);
 for(const target of Object.keys(current.proof.targets))for(const input of [source,source.replaceAll('\n','\r\n')])
  assert.equal(current.preCombinedSource(p,input,{target,readSource:currentLive}),current.proof.targets[target].files[p].source,target);
 for(const owner of current.proof.owners){
  let drift=false,reads=0;
  const reader=q=>{reads++;const text=currentLive(q);return drift&&q===owner?text+'\n':text;};
  assert.equal(current.preCombinedSource(p,source,{target:'joustPrior',readSource:reader}),joustSourceProof.before.source);
  assert.equal(reads,current.proof.owners.length,'fresh complete closure');drift=true;
  assert.throws(()=>current.preCombinedSource(p,source,{target:'joustPrior',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>current.preCombinedSource(p,source,{target:'joustPrior',readSource:q=>q===owner?null:currentLive(q)}),/linked owner identity/,owner);
 }
 const reader=current.combinedReader(currentLive,'joustPrior');
 assert.equal(current.readerTarget(reader),'joustPrior');assert.equal(reader(p),joustSourceProof.before.source);
 assert.equal(current.combinedReader(reader,'joustPrior'),reader);
 // An inherited changed owner must also authorize the new Joust owner afresh.
 const inherited='config/architecture.json';
 assert.throws(()=>current.preCombinedSource(inherited,currentLive(inherited),{target:'jointUiPrior',readSource:q=>q===p?source+'\n':currentLive(q)}),/linked owner identity/);
});

test('Joust source proof rejects unknown source without authorization reads',()=>{
 const p=joustSourceProof.path,source=currentLive(p);
 for(const input of [source+'\n',source.replace('placeBet','foreignBet'),joustSourceProof.before.source,null,{},17]){
  let reads=0;assert.equal(current.preCombinedSource(p,input,{target:'joustPrior',readSource(){reads++;throw Error('unexpected');}}),input);assert.equal(reads,0);
 }
 assert.throws(()=>current.preCombinedSource(p,source,{target:'joustPrior',readSource:null}),/linked owner reader/);
 assert.throws(()=>current.preCombinedSource(p,source,{target:'unknown'}),/unknown source target/);
 assert.throws(()=>current.preCombinedSource(p,source,{target:'joustPrior',readSource(){throw Error('removed');}}),/linked owner missing/);
});
