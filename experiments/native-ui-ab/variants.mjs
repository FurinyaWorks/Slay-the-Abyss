// Isolated interventions only; production source remains the A control.
import assert from 'node:assert/strict';
export function intervene(source, mode) {
 const once=(old,next)=>{assert.equal(source.split(old).length,2,'intervention anchor changed');source=source.replace(old,next);};
 if(mode==='diff') {
  once("local name=box:GetChild('name');name:SetVisible(owner.active and offset~=nil and state.alpha>0)",
   "local name=box:GetChild('name');local visible=owner.active and offset~=nil and state.alpha>0\n            if name.visible~=visible then assert(name:SetVisible(visible)~=false,'name visibility rejected')end");
 } else if(mode==='tween') {
  once('local function hideOverlay(landing, all)',`local dissolveTween
    local function stopDissolve()
        local previous=dissolveTween;dissolveTween=nil
        if previous then previous:Kill(false)end
    end
    local function hideOverlay(landing, all)`);
  once('if not landing then self.dissolve = nil end','if not landing then stopDissolve();self.dissolve = nil end');
  once('self.dissolve = 0',`stopDissolve()
            self.dissolve = 0
            dissolveTween=game.Tween(card,{localScaleX=0,localScaleY=0},T.fast)
            dissolveTween:SetEase(Enum.EaseType.OutQuad)
            dissolveTween:Play()`);
  once('card:SetLocalScale((1 - easeOut(p)) / 2, (1 - easeOut(p)) / 2, 1)','-- Native Tween is the exclusive scale writer during dissolve.');
  once('if p >= 1 then self.dissolve = nil end','if p >= 1 then stopDissolve();self.dissolve = nil end');
 } else assert.fail('unknown intervention');
 return source;
}
