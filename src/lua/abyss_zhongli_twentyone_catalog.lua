-- Isolated source-common research domain; does not mutate the frozen sixteen.
local Old=require('abyss_zhongli_sixteen_catalog')
local M={sourceVersion=Old.sourceVersion,modelSHA256=Old.modelSHA256}
function M.definitions()
 local cards=Old.definitions()
 for _,c in ipairs(require('abyss_zhongli_native_definitions').definitions())do cards[#cards+1]=c end
 return cards
end
return M
