-- Offline dynamic tree exporter. Unknown SDK textures remain unknown.
-- Reuses native-ui-parity-preview's traversal, adding native actors and button states.
local Layout=require('abyss_ui_layout')
local Templates=require('abyss_ui_templates')
for _,s in ipairs(Layout)do if s.name=='stage' then Layout=s.children;break end end
local function encode(v)
 if type(v)=='string' then return '"'..v:gsub('[%c"\\]',function(c)return ({['"']='\\"',['\\']='\\\\',['\n']='\\n'})[c] or string.format('\\u%04x',c:byte())end)..'"'end
 if type(v)~='table'then return v==nil and 'null' or tostring(v)end
 local out={};if #v>0 then for _,x in ipairs(v)do out[#out+1]=encode(x)end;return '['..table.concat(out,',')..']'end
 for k,x in pairs(v)do out[#out+1]=encode(k)..':'..encode(x)end;return '{'..table.concat(out,',')..'}'
end
local function hex(c)return type(c)=='table' and string.format('#%02X%02X%02X%02X',c.r,c.g,c.b,c.a)or c end
local function dump(c,s)
 if not c or c.visible==false or c.activeInHierarchy==false then return {name=s.name,visible=false}end
 local children,known={},{}
 for _,spec in ipairs(s.children or {})do
  known[spec.name]=true
  if s.kind~='presetButton' or spec.name=='normal' then children[#children+1]=dump(c:GetChild(spec.name),spec)end
 end
 for name,child in pairs(c.children or {})do
  if not known[name] and name:match('^nativeActor')then
   local spec
   if child.name=='actorPage'then spec={name=child.name,kind='container',size={1280,720}}
   elseif child.name==Templates.AbyssMonsterActor.name then spec=Templates.AbyssMonsterActor
   elseif child.name==Templates.AbyssMonsterPower.name then spec=Templates.AbyssMonsterPower
   else error('Unsupported native actor template '..tostring(child.name))end
   children[#children+1]=dump(child,spec)
  end
 end
 if s.kind=='grid' then
  for i=0,math.min(c.itemCount or 0,12)-1 do
   local card=dump(c.items[i],Templates[s.itemTemplate]);local g=s.grid
   card.position={-s.size[1]/2+g.padding[3]+g.itemSize[1]/2+(i%g.columns)*(g.itemSize[1]+g.spacing[1]),s.size[2]/2-g.padding[1]-g.itemSize[2]/2-math.floor(i/g.columns)*(g.itemSize[2]+g.spacing[2])};children[#children+1]=card
  end
 end
 local states={};if s.kind=='presetButton' then for _,v in ipairs(s.children or {})do states[#states+1]=v end end
 return {name=s.name,kind=s.kind,visible=c.visible,position={c.x or (s.position or {0,0})[1],c.y or (s.position or {0,0})[2]},size={c.sizeDeltaX or s.size[1],c.sizeDeltaY or s.size[2]},scale=c.scale,image=c.imageId or s.image,colour=hex(c.imageColor)or s.colour,rotation=c.localRotationZ or(c.rotation and c.rotation[3]),opacity=s.opacity,interactable=c.kind~='cursorArea' and c.interactable or nil,raycastTarget=c.raycastTarget,states=states,text=s.text and {content=c.text,fontSize=s.text.fontSize,minFontSize=s.text.minFontSize,colour=hex(c.fontColor)or s.text.colour,align=s.text.align,valign=s.text.valign},children=children}
end
local M={scenes={}}
function M.capture(name,ui,root,provenance)
 local controls={};for _,s in ipairs(Layout)do controls[#controls+1]=dump(root:GetChild(s.name),s)end
 M.scenes[#M.scenes+1]={name=name,provenance=provenance,mode=ui.mode,phase=ui.run and ui.run.phase,tree={name='root',kind='container',size={1280,720},children=controls}}
end
function M.print()print('OFFICIAL_VISUAL_SCENES '..encode(M.scenes))end
return M
