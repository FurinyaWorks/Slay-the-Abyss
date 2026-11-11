-- Lifecycle probe only. The separate actual SDK run owns interpolation evidence.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
package.loaded.abyss_feedback=dofile('.artifacts/native-ui-ab/tween/abyss_feedback.lua')
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local handles={}
game=game or {};Enum=Enum or {};Enum.EaseType={OutQuad='OutQuad'}
game.Tween=function(control,values,duration)
 local t={control=control,values=values,duration=duration}
 function t:SetEase(ease)assert(ease=='OutQuad');return self end
 function t:Play()self.played=true end
 function t:Kill(complete)assert(complete==false);self.killed=true end
 handles[#handles+1]=t;return t
end
for _,ending in ipairs({'cancel','disable'})do
 local host,ui,panel,_,tap=H.setup({'strike'},{'cultist'})
 tap('card1',1);tap('enemy1',1)
 for _=1,40 do if #handles>0 and not handles[#handles].killed then break end;host:update(1/60)end
 local active=assert(handles[#handles]);assert(active.played and not active.killed,'native Tween not actually started')
 assert(active.duration==require('abyss_theme').motion.fast)
 assert(active.values.localScaleX==0 and active.values.localScaleY==0)
 if ending=='cancel' then ui.feedback:cancel()else host:disable()end
 assert(active.killed,'retired Tween was not killed')
 assert(ui.feedback.dissolve==nil,'retired dissolve clock retained')
 assert(not panel:GetChild('feedback'):GetChild('playedCard').visible,'retired card is visible')
end
print('TWEEN_BOUNDARIES_PASS actual-feedback/cancel/disable/Kill(false)/no-completion-callback')
