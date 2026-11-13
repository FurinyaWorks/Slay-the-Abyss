import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('KQ043 ordered native effect mapping rejects instead of paying or reordering',()=>{
 buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq-discard-boundary-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
for _,up in ipairs({false,true})do
 local data=C.copy(D);data.cards.cards[#data.cards.cards+1]={id='KQ043',name='ordered boundary probe',type='skill',target='SELF',cost=1,rarity='special',color='colorless',experimental=true,
 effects={{op='draw',value=1},{op='requestDiscard',value=1},{op='block',value=4}},upgrade={effects={{op='draw',value=1},{op='requestDiscard',value=1},{op='block',value=7}}}}
 local deck={};for i=1,7 do deck[i]={cardId='KQ043',upgraded=up}end
 -- No character marker: this specifically isolates the core effect admission,
 -- not the separate candidate allowed-op filter.
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=11});local before=C.copy(s);local hand=s.hand;local card=s.hand[1]
 local ok,why=C.play(s,card.uid,1);eq(ok,false);eq(why,'unsupported_effect:discard_must_end_card');same(s,before);eq(s.hand,hand);eq(s.hand[1],card)
end
print('KQ043_ORDERED_ADMISSION_DENIED')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ043_ORDERED_ADMISSION_DENIED/);}finally{rmSync(dir,{recursive:true,force:true});}
});
