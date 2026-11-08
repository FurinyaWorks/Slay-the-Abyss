import test from 'node:test';
import assert from 'node:assert/strict';
import {gameBuildArgs} from '../scripts/build-game.mjs';
test('default Enhanced selects existing bounded 2D and hidden-page lifecycle',()=>{
 const args=gameBuildArgs(['base.gil','build/candidates']);
 assert(args.includes('--lightweight-2d'));assert(args.includes('--native-page-lifecycle'));
 assert(args.includes('--art-cards=false'));assert(args.includes('--art-monsters=false'));
});
test('Legacy selects classic artwork path without changing core data or rules',()=>{
 const args=gameBuildArgs(['base.gil','--art-version=legacy']);
 assert(!args.includes('--lightweight-2d'));assert(!args.includes('--native-page-lifecycle'));
 assert(args.includes('--art-menu-background=true'));assert(args.includes('--art-selection-avatar=true'));
});
test('unaccepted 3D and ambiguous options fail before spawning any builder',()=>{
 for(const args of [['base.gil','--combat=3d'],['base.gil','--art-version=bad'],['base.gil','--combat=2d','--combat=3d'],['base.gil','--playtest']])assert.throws(()=>gameBuildArgs(args));
});
