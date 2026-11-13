-- Author verified against shared 822fcb93; see public-rebuild-paid-results.json.
-- No simulated payment or draw implementation.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local function fresh(id,up,jade,full)
 local d=C.copy(D)
 d.cards.cards[#d.cards.cards+1]={id='zl20',name='HOLD',type='skill',cost=1,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='emptyJade',value=9}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=12}}}}
 d.cards.cards[#d.cards.cards+1]={id='zl62',name='HOLD',type='skill',cost=1,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,exhaust=true,effects={{op='zhongliCard',kind='emptyJade',value=6},{op='draw',value=1}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=8},{op='draw',value=2}}}}
 local deck={{cardId=id,upgraded=up}};for i=1,11 do deck[#deck+1]='strike'end
 local s=C.new(d,{seed=4,deck=deck,enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 -- Controlled rearrangement of existing native UIDs supplies hand-limit/draw cases.
 local c;for _,v in ipairs(s.hand)do if v.cardId==id then c=v end end
 if not c then for i,v in ipairs(s.draw)do if v.cardId==id then c=table.remove(s.draw,i);s.hand[#s.hand+1]=c;break end end end
 for i=#s.hand,1,-1 do if s.hand[i]~=c then s.draw[#s.draw+1]=table.remove(s.hand,i)end end
 if full then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end end
 s.zhongliCandidate.jade=jade;return s,c
end
local count=0
for _,id in ipairs({'zl20','zl62'})do for _,up in ipairs({false,true})do for _,jade in ipairs({0,1,20})do for _,full in ipairs({false,true})do
 local s,c=fresh(id,up,jade,full);local beforeCount=#s.hand;local amount=id=='zl20'and(up and 12 or 9)or(up and 8 or 6)
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.zhongliCandidate.jade,jade==0 and amount or jade)
 local draws=id=='zl62'and(up and 2 or 1)or 0
 eq(#s.hand,math.min(10,beforeCount-1+draws));eq(#s.exhaust,id=='zl62'and 1 or 0)
 eq(id=='zl62'and s.exhaust[1]or s.discard[1],c)
 for _,v in ipairs(s.hand)do assert(v~=c,'resolving card redrawn')end
 local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before);count=count+1
end end end end
print('AUTHOR_PUBLIC_ZL_REBUILD_PAID_PASS '..count..' zero/residual/full jade, base/upgrade, hand limit, draw/exhaust UID and paid no-op')
