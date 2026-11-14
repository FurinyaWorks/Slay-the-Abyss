-- Preserve the approved ordinary list; expand only independent multi-item rows.
local Theme=require('abyss_theme')
local RelicView=require('abyss_relic_view_ui')
local M={}
local rowFaces=setmetatable({},{__mode='k'})
local names={'goldReward','stolenGold','relicReward1','relicReward2','emeraldKeyReward','claimPotion','cardReward'}
local rowNames={};for _,name in ipairs(names)do rowNames[name]=true end
local function iconId(value)return type(value)=='table'and value.id or value end
local function rewardIcon(name,run)
 if name=='goldReward'or name=='stolenGold'then return iconId(Theme.icon.gold)end
 if name=='cardReward'then return iconId(Theme.icon.deck)end
 if name=='emeraldKeyReward'then return iconId(Theme.icon.lock)end
 local rewards=run and run.rewards
 if name=='claimPotion'then return Theme.icon.potion[rewards and rewards.potion and rewards.potion.id]or Theme.icon.potion.empty end
 local index=tonumber(name:match('^relicReward(%d)$'))
 local item=rewards and rewards.relics and rewards.relics[index]
 return item and RelicView.icon(item.sourceId or item.id,true)or iconId(Theme.icon.node.treasure)
end
local function paintIcon(cached,name,run,platform)
 local id=rewardIcon(name,run)
 if platform.imageSource and cached.id~=id then cached.icon:SetImage(platform.imageSource,id);cached.id=id end
end
function M.paintButton(name,part,state,run,platform,tint,ink)
 local token=Theme.officialAssets and Theme.officialAssets.rewardRows
 if Theme.presentationProfile~='official-assets-first'or not token then return false end
 if name=='continue'then ink(part:GetChild('label'),state=='disabled'and Theme.color.textMuted or token.ink);return true end
 if not rowNames[name]then return false end
 local cached=rowFaces[part]
 if not cached then
  cached={parts=part:GetChild('stsRewardFace'):GetChildren(),icon=part:GetChild('rewardIcon')};rowFaces[part]=cached
 end
 local tone=token[state]or token.normal
 if cached.tone~=tone then for _,image in ipairs(cached.parts)do tint(image,tone)end;cached.tone=tone end
 ink(part:GetChild('label'),state=='disabled'and Theme.color.textMuted or token.ink)
 paintIcon(cached,name,run,platform)
 return true
end
-- Last successful size writer per native handle; owner tokens hold no view references.
local sizes=setmetatable({},{__mode='k'})
local function size(control,width,height,owner)
 local painted=sizes[control]
 if owner and painted and painted.owner==owner and painted.width==width
  and painted.height==height and control.alive~=false then return end
 -- Revoke both promises when native setters overlap in either completion order.
 local pending={};sizes[control]=pending
 local ok,result=pcall(control.SetSizeDelta,control,width,height)
 local current=sizes[control]==pending
 sizes[control]=nil
 if not ok then error(result,0)end
 if result~=false and current and owner then
  sizes[control]={owner=owner,width=width,height=height}
 end
end
local function visibleRewards(frame)
 local run=frame.run
 local rewards=frame.listing and run.rewards
 local visible={goldReward=rewards and not rewards.goldClaimed,stolenGold=frame.stolen and not frame.stolen.claimed,
  emeraldKeyReward=rewards and rewards.emeraldKey and not rewards.emeraldKey.claimed,
  claimPotion=frame.pendingPotion,cardReward=rewards and not rewards.cardResolved}
 for i=1,2 do
  local item=rewards and rewards.relics and rewards.relics[i]
  visible['relicReward'..i]=item and not item.claimed
 end
 return visible
end
local function positionHost(box,layout)
 -- The shared approved reward host follows the existing ordinary/expanded
 -- layout; its opaque field stays below the battle bar in canvas coordinates.
 if Theme.presentationProfile~='v25-reference'
  and Theme.presentationProfile~='official-assets-first' then return end
 local stage=layout.stage
 local field=box:GetChild('v25RewardField')
 if field then field:SetAnchoredPosition(-stage[1],-stage[2])end
 local paper=box:GetChild('v25RewardPaper')
 if paper then paper:SetAnchoredPosition(layout.title[1]-stage[1],layout.title[2]-stage[2])end
 if Theme.presentationProfile=='official-assets-first'and Theme.officialAssets.rewardRows then
  local token=Theme.officialAssets.rewardRows
  local panel=box:GetChild('stsRewardPanel')
  panel:SetAnchoredPosition(token.panelPosition[1]-stage[1],token.panelPosition[2]-stage[2])
  local height=token.panelSize[2]+stage[4]-Theme.layout.battleRewards.stage[4]
  panel:SetLocalScale(1,height/token.panelSize[2],1)
 end
end
function M.render(frame,child,sizeOwner)
 local visible=visibleRewards(frame)
 local count=0;for _,name in ipairs(names)do if visible[name]then count=count+1 end end
 local base=Theme.layout.battleRewards
 local layout=count>4 and base.expanded or base
 local box=child('rewardList');local stage=layout.stage
 box:SetAnchoredPosition(stage[1],stage[2]);size(box,stage[3],stage[4],sizeOwner)
 positionHost(box,layout)
 size(box:GetChild('border'),stage[3],stage[4],sizeOwner)
 size(box:GetChild('plate'),stage[3]-Theme.space.border*2,stage[4]-Theme.space.border*2,sizeOwner)
 for _,name in ipairs({'title','subtitle'})do
  local position=layout[name];local control=box:GetChild(name)
  control:SetAnchoredPosition(position[1]-stage[1],position[2]-stage[2])
  size(control,position[3],position[4],sizeOwner)
 end
 local row=0
 for _,name in ipairs(names)do
  local control=child(name);control:SetVisible(not not visible[name])
  if visible[name]then
   control:SetAnchoredPosition(layout.rowOrigin[1],layout.rowOrigin[2]-row*layout.rowStep)
   row=row+1
  end
 end
 if frame.manual then child('continue'):SetAnchoredPosition(layout.continue[1],layout.continue[2])end
 local caption=child('potionReward');local position=layout.potionLabel
 caption:SetVisible(frame.pendingPotion==true)
 caption:SetAnchoredPosition(position[1],position[2]);size(caption,position[3],position[4],sizeOwner)
 frame.rewardRows=count
end
return M
