// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/round3-catalog-source-inverse.mjs';
import { preRound3CatalogSource as original } from './epochs/develop/tests/helpers/round3-catalog-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
function unusedOriginalFacade(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'develop')});
}

import assert from 'node:assert/strict';
import {existsSync,realpathSync,rmSync,statSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {round3CatalogProof} from './epochs/develop/tests/helpers/round3-catalog-source-inverse.mjs';
import {preIntegrationSource as legacyIntegration} from './epochs/develop/tests/helpers/pr372-integration-source.mjs';
import {preNativeMonsterArtSource as legacyMonster} from './epochs/develop/tests/helpers/native-monster-art-source-inverse.mjs';
import {preRelicRound3CompositionSource as legacyComposition} from './epochs/develop/tests/helpers/relic-round3-composition.mjs';
import {preColorlessCatalogSource as originalColorless,prepareColorlessCatalogRetirement} from './epochs/colorless/tests/helpers/colorless-catalog-source-inverse.mjs';
import {preparePotionCallbackRetirement} from './epochs/potion/tests/helpers/potion-callback-source-inverse.mjs';
import {prepareActorPresenceRetirement} from './epochs/actor/tests/helpers/actor-presence-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex');
function projectRound3(path,source,{readSource=live}={}){
 source=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 readSource=sourceEpoch.combinedReader(readSource,'develop');
 source=legacyIntegration(path,source,'base',{readSource});
 source=legacyMonster(path,source,{readSource});
 source=legacyComposition(path,source,'round3');
 const binding=round3CatalogProof.files[path];
 if(!binding||typeof source!=='string'||hash(source)!==binding.afterSha256)return source;
 const added='src/lua/abyss_combat_catalog.lua',linked=readSource(added);
 assert.equal(hash(linked),round3CatalogProof.files[added].afterSha256,'catalog linked module identity');
 if(path===added)return null;
 const lines=source.replaceAll('\r\n','\n').split('\n');
 for(const hunk of [...binding.hunks].reverse()){
  assert.deepEqual(lines.slice(hunk.at,hunk.at+hunk.after.length),hunk.after,'exact catalog inverse hunk');
  lines.splice(hunk.at,hunk.after.length,...hunk.before);
 }
 const previous=lines.join('\n');assert.equal(hash(previous),binding.beforeSha256,'complete pre-catalog identity');return previous;
}
const inside=(root,path)=>{const r=relative(root,path);return r!==''&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../')&&!r.startsWith('..\\');};
export function prepareRound3CatalogModuleRetirement(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory),source=realpathSync.native(sourceRoot);
 assert(destination!==source&&!inside(destination,source),'separate retirement destination');
 // Capture all witness retirement closures now, including the no-catalog path.
 const extras=[prepareColorlessCatalogRetirement,preparePotionCallbackRetirement,prepareActorPresenceRetirement]
  .map(prepare=>prepare(directory,{sourceRoot}));
 const path='src/lua/abyss_combat_catalog.lua',target=join(directory,path),livePath=join(sourceRoot,path);
 const retireExtras=()=>{for(const retire of extras)retire();};
 if(!existsSync(target))return retireExtras;
 const actual=realpathSync.native(target),initial=statSync(actual),liveLua=realpathSync.native(join(sourceRoot,'src/lua'));
 const raw=p=>readFileSync(join(sourceRoot,p),'utf8');
 const check=()=>{
  assert.equal(realpathSync.native(directory),destination,'retirement destination changed');
  assert.equal(realpathSync.native(target),actual,'retirement target changed');
  const now=statSync(actual),liveStat=statSync(livePath);
  assert(inside(destination,actual)&&actual!==realpathSync.native(livePath)&&!inside(liveLua,actual),'retirement target aliases live source');
  assert.equal(now.dev,initial.dev);assert.equal(now.ino,initial.ino);assert.equal(now.nlink,1,'retirement requires single link');
  assert(now.dev!==liveStat.dev||now.ino!==liveStat.ino,'retirement inode aliases live source');
  const input=sourceEpoch.preCombinedSource(path,readFileSync(target,'utf8'),{target:'colorless',readSource:raw});
  const previous=originalColorless(path,input,{readSource:sourceEpoch.combinedReader(raw,'colorless')});
  assert.equal(hash(previous),round3CatalogProof.files[path].afterSha256,'complete retirement catalog identity');
 };
 check();return ()=>{check();retireExtras();rmSync(target);};
}

export {projectRound3 as preRound3CatalogSource};
