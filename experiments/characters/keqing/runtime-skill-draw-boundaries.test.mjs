import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{skillDrawProbe}from'./runtime-skill-draw.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('049 native draw hand cap, reshuffle rollback and draw-reaction death',()=>{buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq049-boundary-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same;local D=C.copy(H.Data);D.cards.cards[#D.cards.cards+1]=${toLua(skillDrawProbe())}
local function fresh(up,n)local deck={};for i=1,n do deck[i]={cardId='KQ049',upgraded=up}end;return C.new(D,{deck=deck,enemies={'jaw_worm'},seed=42,experimental=true})end
for _,up in ipairs({false,true})do
 local s=fresh(up,12);C.draw(s,5);eq(#s.hand,10);local source=s.hand[1];local drawn=s.draw[#s.draw];assert(C.play(s,source.uid));eq(#s.hand,10);eq(s.energy,2);eq(s.player.block,up and 7 or 4);local present=false;for _,c in ipairs(s.hand)do if c==drawn then present=true end end;assert(present);eq(s.discard[#s.discard],source)
 -- A real shuffle occurs, then an injected exception must restore pre-pay graph.
 s=fresh(up,7);source=s.hand[1];for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end
 local before=C.copy(s);local hand,drawPile,discard,rng=s.hand,s.draw,s.discard,s.rng;local draw=C.draw;local reached=false
 C.draw=function(state,n,...)local out=draw(state,n,...);if state==s then reached=true;assert(#out==1);error('after actual draw/reshuffle')end;return out end
 eq(pcall(C.play,s,source.uid),false);C.draw=draw;assert(reached);same(s,before);eq(s.hand,hand);eq(s.draw,drawPile);eq(s.discard,discard);eq(s.rng,rng);eq(s.hand[1],source)
 assert(C.play(s,source.uid));eq(s.energy,2);eq(s.player.block,up and 7 or 4);eq(#s.draw,1)
 -- Controlled reaction uses real loseHp after actual draw; dead source gets no follow-up shield.
 s=fresh(up,7);source=s.hand[1];draw=C.draw
 C.draw=function(state,n,...)local out=draw(state,n,...);if state==s then C.applyEffects(state,{{op='loseHp',value=state.player.hp}},state.player,state.player)end;return out end
 local ok,result=pcall(C.play,s,source.uid);C.draw=draw;assert(ok,result);assert(result);eq(s.player.hp,0);eq(s.player.block,0);eq(s.energy,2);eq(C.outcome(s),'defeat');eq(s.cardInUse,source);eq(s.pendingPlay,nil)
 local terminal=C.copy(s);eq(C.play(s,s.hand[1].uid),false);same(s,terminal)
end
print('KQ049_BOUNDARIES_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ049_BOUNDARIES_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
