local Pages=require('abyss_merchant_pages')
local Prologue=require('abyss_prologue')
local function pages(text,limit)
 local chars=Prologue.chars(text);local ends=Pages.ends(chars,limit);local result={};local first=1
 for _,last in ipairs(ends)do
  assert(last-first+1<=limit,'over budget')
  result[#result+1]=table.concat(chars,'',first,last);first=last+1
 end
 assert(table.concat(result)==text,'copy changed')
 return result
end
local function same(text,limit,wanted)
 local actual=pages(text,limit)
 assert(#actual==#wanted,'page count: '..table.concat(actual,' | '))
 for i,v in ipairs(wanted)do assert(actual[i]==v,actual[i]..' ~= '..v)end
end
same('「眼光不错。」',9,{'「眼光不错。」'})
same('「路不好走吧？来，看看有没有用得上的。」',12,{'「路不好走吧？来，','看看有没有用得上的。」'})
same('短句。另一个完整句。',8,{'短句。','另一个完整句。'})
same('甲乙，丙丁，戊己庚辛壬。',8,{'甲乙，丙丁，','戊己庚辛壬。'})
same('甲乙丙丁戊己庚辛。',8,{'甲乙丙丁戊己庚','辛。'})
same('甲乙丙丁「戊己」',5,{'甲乙丙丁','「戊己」'})
same('甲乙\n丙丁戊己',5,{'甲乙\n','丙丁戊己'})
same('',9,{''})
for _,limit in ipairs({9,12})do
 for _,text in ipairs({'「这可不够啊，小姑娘。」','「做生意嘛，总得知道哪条路安全。」','「前面可不像这里太平。一路小心。」',string.rep('长',50)..'。','ASCII abc, def! xyz?'})do pages(text,limit)end
end
assert(not pcall(Pages.ends,{},0));assert(not pcall(Pages.ends,{},1.5))
print('merchant semantic pages: short/medium/long, quotes, newline, 9/12 budgets and lossless fallback PASS')
