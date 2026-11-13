local M=dofile('experiments/characters/zhongli/native/jade_checkpoint.lua')
local count=0
for jade=0,20 do for damage=0,40 do for block=0,12 do
    local remainder=math.max(0,damage-block)
    local r=M.resolve(jade,remainder,'ordinary_attack','enemy','player')
    assert(r.absorbed==math.min(jade,remainder))
    assert(r.jade+r.absorbed==jade and r.remaining+r.absorbed==remainder)
    count=count+1
end end end
for _,kind in ipairs({'retaliation','hp_loss','environment','instant_kill'})do
    local r=M.resolve(20,12,kind,'enemy','player')
    assert(r.jade==20 and r.remaining==12 and r.absorbed==0)
end
for _,pair in ipairs({{'player','enemy'},{'enemy','enemy'},{'environment','player'},{'player','player'}})do
    local r=M.resolve(20,12,'ordinary_attack',pair[1],pair[2]);assert(r.jade==20 and r.remaining==12)
end
for _,args in ipairs({{-1,1},{21,1},{0,-1},{0,2147483648},{0,0/0},{1.5,2},{0,2.5}})do
    assert(not pcall(M.resolve,args[1],args[2],'ordinary_attack','enemy','player'))
end
assert(not pcall(M.resolve,3,4,'unknown','enemy','player'))
print('isolated jade checkpoint '..count..' block/remainder cases and excluded-path negative cases passed; no Actor hook installed')
