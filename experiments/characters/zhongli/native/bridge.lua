-- Detached opt-in definitions only. No shared registry, player state or op monkey patch.
local Copy=require('abyss_copy').copy
local inventory=require('experiments.characters.zhongli.native.catalog')
local M={}
function M.prepare(data,ids)
    assert(type(ids)=='table' and #ids>0,'explicit native card subset required')
    local definitions={}
    for _,entry in ipairs(inventory)do definitions[entry.id]=entry end
    local chosen,seen={},{}
    for _,id in ipairs(ids)do
        local entry=assert(definitions[id],'unknown Zhongli candidate')
        assert(entry.ready,'unsupported Zhongli native operations: '..id)
        assert(not seen[id],'duplicate Zhongli candidate')
        seen[id]=true
        chosen[#chosen+1]=Copy(entry.definition)
    end
    local result=Copy(data)
    for _,existing in ipairs(result.cards.cards)do assert(not seen[existing.id],'Zhongli candidate collision')end
    for _,definition in ipairs(chosen)do result.cards.cards[#result.cards.cards+1]=definition end
    return result
end
return M
