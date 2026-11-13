-- UID-only private planner, not a payment/queue/choice transaction.
local M={}
local function integer(n,lo,hi)return type(n)=='number'and n==n and n%1==0 and n>=lo and n<=hi end
local function dense(a)
 assert(type(a)=='table'and getmetatable(a)==nil,'invalid uid array')
 local n=0;for k in pairs(a)do assert(integer(k,1,2147483647),'invalid array key');n=n+1 end
 local seen={};for i=1,n do local u=rawget(a,i);assert(integer(u,1,2147483647)and not seen[u],'invalid or duplicate uid');seen[u]=true end
 return n
end
function M.offer(draw,count,handCount,locked)
 local n=dense(draw);assert(count==3 or count==4,'invalid inspect window');assert(integer(handCount,0,10),'invalid hand count');assert(type(locked)=='boolean','invalid draw lock')
 local out={};if locked or handCount==10 then return out end
 for i=n,math.max(1,n-count+1),-1 do out[#out+1]=draw[i]end
 return out
end
function M.take(draw,offered,chosen)
 local n=dense(draw);local m=dense(offered);assert(m>=1 and m<=4 and m<=n,'invalid offered window');assert(integer(chosen,1,2147483647),'invalid selected uid')
 local index;for i=1,m do assert(draw[n-i+1]==offered[i],'stale window');if offered[i]==chosen then index=n-i+1 end end
 assert(index,'selection outside revealed window')
 local remaining={};for i=1,n do if i~=index then remaining[#remaining+1]=draw[i]end end
 return remaining,index
end
return M
