-- Native image/text replacement for AbstractCreature.renderPowerIcons' ordered row.
-- Source list membership/order stays in Actors; this module only owns native outputs.
local Combat=require('abyss_combat')
local Theme=require('abyss_theme')
local Surfaces=require('abyss_monster_power_surfaces')
local EnemyView=require('abyss_battle_enemy_view')
local number=require('abyss_numbers').integer
local M={}
function M.new(platform,picture,tint,ink,onCreate,onRetire)
 local self={pools={},missingIcons={}}
 local function valid()assert(not self.engineDestroyed,'monster power publication cancelled')end
 local function native(control,name,...)
  valid();local value=control[name](control,...);valid();return value
 end
 local function paintIcon(icon,entry,size)
  native(icon,'SetVisible',not entry.overflow)
  native(icon,'SetAnchoredPosition',0,0);native(icon,'SetSizeDelta',size,size)
  if entry.overflow then return end
  local image=Theme.icon.status[entry.icon or entry.id]
  if (not image or Theme.icon.statusReplacementNotes and Theme.icon.statusReplacementNotes[entry.id])and not self.missingIcons[entry.id]then
   self.missingIcons[entry.id]=true;print('ABYSS_POWER_ICON_MISSING '..entry.id..' using labelled unknown placeholder')
  end
  valid();picture(icon,image or Theme.icon.intent.unknown);valid()
  tint(icon,{r=255,g=255,b=255,a=255});valid()
 end
 local function paint(box,entry,index,g,visible)
  local mobile=platform.touchScreen and platform.touchScreen()
  local layout=EnemyView.powerLayout(g,mobile)
  local x=layout.firstX+(index-1)%layout.columns*layout.pitch
  local y=layout.firstY-math.floor((index-1)/layout.columns)*layout.rowPitch
  -- Native icons have no transparent atlas padding: keep their full rectangle below HP.
  native(box,'SetAnchoredPosition',x,y)
  for _,name in ipairs({'edge','body','badge'})do native(box,'GetChild',name):SetVisible(false)end
  paintIcon(native(box,'GetChild','icon'),entry,layout.icon)
  local amount=entry.sourceAmount or entry.amount
  local count=native(box,'GetChild','count')
  local shown=amount>0 or amount<0 and entry.canGoNegative==true
  native(count,'SetVisible',shown)
  valid();count.text=entry.overflow and '+'..number(amount)or shown and number(amount)or '';valid()
  local width=math.max(Theme.layout.nativeText.lineHeight,utf8.len(count.text)*Theme.font.small)
  native(count,'SetSizeDelta',width,Theme.layout.nativeText.lineHeight)
  native(count,'SetAnchoredPosition',layout.countX-width/2,layout.countY)
  local colour=entry.overflow and Theme.color.text or amount<0 and {r=255,g=0,b=0,a=255}or entry.isTurnBased and {r=255,g=255,b=255,a=255}or {r=0,g=255,b=0,a=255}
  ink(count,colour);valid()
  local hit=native(box,'GetChild','hit');native(hit,'SetVisible',true);native(hit,'SetAnchoredPosition',0,0);native(hit,'SetSizeDelta',layout.pitch,layout.hitHeight)
  native(box,'SetVisible',visible)
 end
 function self.release(_,actorBox,engineDestroyed)
  local pool=self.pools[actorBox]
  if pool then
   if engineDestroyed then pool:onEngineDestroy()else pool:clear()end;self.pools[actorBox]=nil
  end
 end
 function self.onEngineDestroy(_)
  self.engineDestroyed=true
  local pools=self.pools;self.pools={}
  local failure
  for _,pool in pairs(pools)do local ok,why=pcall(pool.onEngineDestroy,pool);if not ok then failure=why end end
  assert(not failure,failure)
 end
 function self.render(_,actorBox,actorSlot,actor,g)
  assert(not self.engineDestroyed,'monster power view engine destroyed')
  local pool=self.pools[actorBox]
  if not pool then
   pool=Surfaces.new(actorBox:GetChild('statusRow'),platform,function(slot,box)onCreate(actorSlot,slot,box,self.pools[actorBox])end,onRetire)
   self.pools[actorBox]=pool
  end
  local rows={}
  for _,entry in ipairs(Combat.statusView(actor))do rows[#rows+1]={id=entry.id,status=entry}end
  local layout=EnemyView.powerLayout(g,platform.touchScreen and platform.touchScreen())
  local capacity=layout.columns*Theme.layout.statusIcon.rows
  local overflow=#rows>capacity
  if overflow then rows[#rows+1]={id='@more',status={overflow=true,amount=#rows-capacity+1}}end
  pool:select(rows,actor.id)
  for index,row in ipairs(rows)do
   row.hidden=overflow and not row.status.overflow and index>=capacity
   local slot=row.status.overflow and capacity or index
   paint(assert(pool:find(row.id)),row.status,slot,g,not row.hidden)
  end
 end
 return self
end
return M
