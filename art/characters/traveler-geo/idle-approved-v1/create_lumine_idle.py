#!/usr/bin/env python3
"""Source-locked, deterministic idle motion visual spike. No new artwork or textures.
Authoring preview only; does NOT claim native Miliastra importer compatibility or 57 UI primitives.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np, cv2, math, hashlib, json
import sys
HERE = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else HERE / 'lumine_static_approved.png'
OUT = Path(sys.argv[2]).expanduser().resolve() if len(sys.argv) > 2 else HERE / 'preview'
OUT.mkdir(parents=True, exist_ok=True)
src=Image.open(SOURCE).convert('RGBA')
SIZE=(640,585); W,H=SIZE
base=np.asarray(src.resize(SIZE,Image.Resampling.LANCZOS)).astype(np.uint8)
# Precompute continuous coordinate field. Every piece is connected by the same warp;
# no cutout discontinuities, all pixels map to the frozen original artwork.
y,x=np.mgrid[0:H,0:W].astype(np.float32)
# Anchored across lower leg/shoe region; movement smoothly falls to zero above it.
p=(H-y)/470.0
s=np.clip(p,0.0,1.0)
vertical=s*s*(3-2*s)
# For exact immutable feet, no motion for y>=H-95
vertical=np.where(y>H-95,0,vertical)
# Smooth local wind ripple only on the long loose streamers, not on the torso.
leftwind=np.exp(-0.5*((x-106)/113)**2-0.5*((y-330)/200)**2)
# Whole-person sway, shallow spine breathe, small cloth follow through.
N=20; DUR=110
photos=[]
source_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
for k in range(N):
    phase=2*math.pi*k/N
    sway=8.8*math.sin(phase)
    lift=-8.3*(0.5-0.5*math.cos(phase))
    # Small secondary movement remains smoothly connected to parent warp.
    ribbon=5.2*math.sin(phase-0.58)
    dx = (sway*vertical + ribbon*leftwind*vertical).astype(np.float32)
    dy = (lift*vertical + 1.7*leftwind*vertical*math.sin(phase-0.85)).astype(np.float32)
    rx=(x-dx).astype(np.float32)
    ry=(y-dy).astype(np.float32)
    im=cv2.remap(base,rx,ry,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))
    # Exact source pixels at shoes and frame1, to verify invariant foot anchors.
    im[H-95:]=base[H-95:]
    photos.append(Image.fromarray(im,'RGBA'))
    photos[-1].save(OUT/f'frame_{k:02d}.png',optimize=True)
# Colors deliberately flat, neutral and simple; no imported game/art assets.
BG=(24,29,43); PANEL=(31,37,51)
show=[]
for im in photos:
    b=Image.new('RGB',SIZE,BG)
    b.paste(im,(0,0),mask=im.getchannel('A'))
    show.append(b)
# PIL palette optimize false to avoid disposal ghosts: all frames are fully opaque RGB.
show[0].save(OUT/'lumine_idle_review.gif',save_all=True,append_images=show[1:],duration=DUR,loop=0,optimize=False,disposal=2)
# Sprite sheet in columns of five, full RGBA cells, no labels inside each frame.
COLS=5;ROWS=(N+COLS-1)//COLS
sheet=Image.new('RGBA',(W*COLS,H*ROWS),(0,0,0,0))
for k,pic in enumerate(photos):sheet.paste(pic,((k%COLS)*W,(k//COLS)*H))
sheet.save(OUT/'lumine_idle_spritesheet.png',optimize=True)
# Animated side-by-side battle-size validation. Visual contains two versions
# side by side with unchanged reference image to make sway obvious at 1x.
fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; font=ImageFont.truetype(fontfile,17)
compare=[]
CW,CH=780,420
for im in photos:
    canv=Image.new('RGB',(CW,CH),(24,28,39)); d=ImageDraw.Draw(canv)
    d.rectangle((12,14,385,402),fill=(35,41,56),outline=(68,80,99),width=1)
    d.rectangle((395,14,767,402),fill=(35,41,56),outline=(68,80,99),width=1)
    d.text((26,23),'REFERENCE / STATIC',fill=(202,210,223),font=font)
    d.text((408,23),'IDLE / RIG TEST',fill=(202,210,223),font=font)
    # Exact same scale, fixed baseline. Slight motion should be visible.
    targetH=322; factor=targetH/H
    fw=round(W*factor)
    for offset,frame in [(20,photos[0]),(405,im)]:
        scaled=frame.resize((fw,targetH),Image.Resampling.LANCZOS)
        ix=offset+int((355-fw)/2)
        iy=61
        canv.paste(scaled,(ix,iy),scaled)
    d.line((30,384,364,384),fill=(101,115,129),width=1)
    d.line((410,384,745,384),fill=(101,115,129),width=1)
    compare.append(canv)
compare[0].save(OUT/'lumine_idle_compare.gif',save_all=True,append_images=compare[1:],duration=DUR,loop=0,optimize=False,disposal=2)
# Real game sprite width 133px, height keeping same ratio (not presumed exact game slot height)
small=[]
for im in photos:
    small.append(im.resize((133,122),Image.Resampling.LANCZOS))
ss=Image.new('RGBA',(133*5,122*4),(0,0,0,0))
for k,im in enumerate(small):ss.paste(im,((k%5)*133,(k//5)*122))
ss.save(OUT/'lumine_idle_133px_spritesheet.png',optimize=True)
# Edge / foot invariants and screen-level motion metrics. Using differences in alpha, weighted.
a0=np.asarray(photos[0],dtype=np.int16);allframe=[np.asarray(im,dtype=np.int16) for im in photos]
foot_changes=[int(np.count_nonzero(frame[H-95:]-a0[H-95:])) for frame in allframe]
frame_changes=[int(np.mean(np.abs(frame-a0))) for frame in allframe]
smallbase=np.array(small[0],dtype=np.int16)
smallchanges=[round(float(np.mean(np.abs(np.array(im,dtype=np.int16)-smallbase))),2) for im in small]
report={"source_file":SOURCE.name,"source_sha256":source_hash,"technique":"whole-character continuous spatial warp (feet fixed; modest ribbon phase lag)","nframes":N,"frame_duration_ms":DUR,"loop_ms":N*DUR,"preview_size":SIZE,"reference_pose":"unaltered source png, no redraw","foot_region_px":95,"foot_region_change_values":foot_changes,"luminance_alpha_mean_delta_from_first":frame_changes,"small_133px_mean_rgba_delta_from_first":smallchanges,"still_pending":"No native GIL conversion; no true primitive count; no mobile FPS; no independent visual review. Experimental preview, not production-ready.","preview_files":["lumine_idle_compare.gif","lumine_idle_review.gif","lumine_idle_spritesheet.png","lumine_idle_133px_spritesheet.png"]}
(OUT/'evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
# html local interactive viewer, review without an image editor, no JS file dependencies.
from html import escape
ht='''<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>荧战斗待机评审</title><style>body{font:15px system-ui,Arial;background:#151924;color:#e5e8ef;margin:0 auto;max-width:940px;padding:22px;}h1{font-size:23px;margin:0 0 8px}p{color:#aab7ca}img{width:100%;border-radius:10px}section{padding:14px;background:#242b3a;border-radius:12px;margin-top:12px}.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}button{background:#ddd;color:#222;border:0;padding:9px 14px;border-radius:7px;cursor:pointer}a{color:#b3cdfb}</style><h1>荧 · 战斗待机竖切</h1><p>同构图、原图不重画。左静态，右为连续变形待机。只评审整体感和是否能明显看出自然循环。</p><section><img src="lumine_idle_compare.gif" alt="对照动画"></section><section><b>交付与边界</b><p>20帧 / 2.2秒；锁定下肢落地处，躯干缓动+少量飘带滞后。不是Spine原工程、不是千星实际GIL，也未证明57图元。</p><div class="actions"><a href="lumine_idle_review.gif">独立GIF</a><a href="lumine_idle_spritesheet.png">完整PNG帧表</a><a href="lumine_idle_133px_spritesheet.png">133px帧表</a><a href="evidence.json">参数证据</a></div></section></html>'''
(OUT/'review.html').write_text(ht,encoding='utf8')
print(json.dumps({"out":str(OUT),"files":{p.name:p.stat().st_size for p in OUT.iterdir() if p.is_file() and not p.name.startswith('frame_')},"foot_invariant":max(foot_changes)==0,"small_motion_range":(min(smallchanges),max(smallchanges))},ensure_ascii=False,indent=2))
