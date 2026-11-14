-- Presentation-only boundaries. Keep the existing measured page budget, font and
-- copy: prefer complete sentences, then clauses; unbroken overlong text still
-- needs a bounded fallback. Returned indices refer to the original UTF-8 chars.
local M = {}
local sentence = { ['。']=true, ['！']=true, ['？']=true, ['!']=true, ['?']=true, ['\n']=true }
local clause = { ['，']=true, ['；']=true, ['：']=true, [',']=true, [';']=true, [':']=true }
local close = { ['」']=true, ['』']=true, ['”']=true, ['’']=true, ['）']=true, [')']=true }
local open = { ['「']=true, ['『']=true, ['“']=true, ['‘']=true, ['（']=true, ['(']=true }
local function boundary(chars, first, last, marks)
    local result
    for i=first,last do
        if marks[chars[i]] then
            local ending=i
            while close[chars[ending+1]] do ending=ending+1 end
            if ending<=last then result=ending end
        end
    end
    return result
end
local function pageEnd(chars, first, last, limit)
        if last<#chars then
            local full=boundary(chars,first,last,sentence)
            local part=boundary(chars,first,last,clause)
            -- Keep a following sentence whole when it fits a fresh page. If it
            -- cannot fit even there, pack its leading clause here rather than
            -- creating a tiny extra page (e.g. the greeting's "来，").
            if full and part and part>full and not boundary(chars,full+1,math.min(#chars,full+limit),sentence)
                and #chars-full>limit then full=nil end
            last=full or part or last
            -- Do not strand a closing mark on the following page or an opening
            -- quote on this one. Preserve all bytes; never consume punctuation.
            while last>first and (close[chars[last+1]] or sentence[chars[last+1]]
                or clause[chars[last+1]] or open[chars[last]]) do last=last-1 end
        end
    return last
end
function M.ends(chars, limit)
    assert(type(limit)=='number' and limit>=2 and limit==math.floor(limit), 'invalid merchant page budget')
    local ends, first = {}, 1
    while first<=#chars do
        local last=pageEnd(chars,first,math.min(#chars,first+limit-1),limit)
        ends[#ends+1]=last
        first=last+1
    end
    if #ends==0 then ends[1]=0 end
    return ends
end
return M
