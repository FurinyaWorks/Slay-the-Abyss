package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,Run,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local Def=require('abyss_zhongli_control_definitions');local F=require('abyss_zhongli_starter_run')
local function data()local d=C.copy(D);for _,c in ipairs(Def.definitions())do d.cards.cards[#d.cards.cards+1]=c end;return d end
local function fresh(id,up)
 local deck={{cardId=id,upgraded=up}};for i=1,8 do deck[#deck+1]='defend' end
 local s=C.new(data(),{seed=4,deck=deck,enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=true}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId==id then card=table.remove(pile,i);break end end;if card then break end end
 s.hand[#s.hand+1]=card;s.enemies[1].hp=100;s.enemies[1].maxHp=100;return s,card
end
for _,up in ipairs({false,true})do
 for _,id in ipairs({'zl09','zl34','zl45'})do
  local s,c=fresh(id,up);s.enemies[1].statuses.artifact=1;assert(C.play(s,c.uid,1));eq(s.enemies[1].statuses.artifact,0);eq(s.enemies[1].statuses.weak or 0,0)
  if id=='zl45'then eq(s.enemies[1].statuses.vulnerable,up and 2 or 1);eq(s.player.block,up and 5 or 3)end
 end
 local s,c=fresh('zl45',up);s.enemies[1].statuses.artifact=2;assert(C.play(s,c.uid,1));eq(s.enemies[1].statuses.weak or 0,0);eq(s.enemies[1].statuses.vulnerable or 0,0);eq(s.enemies[1].statuses.artifact,0);eq(s.player.block,up and 5 or 3)
 s,c=fresh('zl09',up);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);eq(s.enemies[1].statuses.weak or 0,0)
 s,c=fresh('zl09',up);s.player.hp=1;s.enemies[1].statuses.thorns=5;assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.enemies[1].statuses.weak or 0,0)
 s,c=fresh('zl37',up);s.player.statuses.dexterity=2;s.player.statuses.frail=1;assert(C.play(s,c.uid));eq(s.player.block,math.floor(((up and 14 or 10)+2)*.75))
 -- Move actual existing cards to reach pre-play 10: playing frees one slot.
 s,c=fresh('zl37',up);while #s.draw>0 do s.hand[#s.hand+1]=table.remove(s.draw)end
 -- nine initial cards plus two distinct constructed native cards, one remains in draw.
 local n=s.nextCardUid or 1000
 s.hand[#s.hand+1]={uid='boundary-extra-a',cardId='defend',upgraded=false}
 s.draw[#s.draw+1]={uid='boundary-extra-b',cardId='defend',upgraded=false}
 s.draw[#s.draw+1]={uid='boundary-extra-c',cardId='defend',upgraded=false}
 eq(#s.hand,10);assert(C.play(s,c.uid));eq(#s.hand,10)
 -- Empty draw and discard is legal; the paid card remains limbo until UseCard cleanup.
 s,c=fresh('zl37',up);s.draw={};s.discard={};local hand=#s.hand;assert(C.play(s,c.uid));eq(#s.hand,hand-1);eq(s.discard[#s.discard],c)
 -- Shuffle real discarded cards, never the current limbo instance.
 s,c=fresh('zl37',up);s.discard=s.draw;s.draw={};hand=#s.hand;assert(C.play(s,c.uid));eq(#s.hand,hand-1+(up and 2 or 1));eq(s.discard[#s.discard],c)
end
print('ZHONGLI_CONTROL_BOUNDARY_PASS artifact order terminal dex/frail full-hand empty shuffle')
