"""Render full actual-SDK event scenes with one headless browser and Pixi page.

Usage: python event-state-browser.py <replay-dir> <new-output-dir> [--software]
       [--canvas-png] [--names=cleric,designer-four-options] [--frames=frames.json]
Requires the existing Simulator asset server at http://127.0.0.1:4180.
These are Simulator projections, never official client/device acceptance.
Both capture modes await the real renderer's sprite promises; --canvas-png
exports its actual canvas pixels, while the default takes a page screenshot.
"""
import json
import base64
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

source, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=False)
report_file = source / 'report.json'
manifest_file = next((item for item in [report_file, source / 'baseline-ready.json', source / 'capture-index.json'] if item.exists()), None)
manifest = json.loads(manifest_file.read_text(encoding='utf8')) if manifest_file else {'captures':[{'name':item.name.removesuffix('.state.json')} for item in sorted(source.glob('*.state.json'))]}
if not manifest['captures']:
    raise RuntimeError('No actual SDK state inputs found')
software = '--software' in sys.argv
canvas_png = '--canvas-png' in sys.argv
frames_arg = next((arg.removeprefix('--frames=') for arg in sys.argv if arg.startswith('--frames=')), None)
frame_states = json.loads(Path(frames_arg).read_text(encoding='utf8')) if frames_arg else []
names_arg = next((arg.removeprefix('--names=') for arg in sys.argv if arg.startswith('--names=')), None)
if names_arg:
    requested_names = names_arg.split(',')
    by_name = {capture['name']:capture for capture in manifest['captures']}
    if any(name not in by_name for name in requested_names):
        raise RuntimeError('Requested scene names are missing from the capture manifest')
    manifest['captures'] = [by_name[name] for name in requested_names]
if frame_states:
    expected_frame_name = manifest['captures'][-1]['name'] + '.frames.json'
    if Path(frames_arg).name != expected_frame_name:
        raise RuntimeError('Frame deltas must match the final selected full-state baseline: ' + expected_frame_name)
    if len(frame_states) != 120 or any(frame.get('scene', {}).get('reset') is not False for frame in frame_states):
        raise RuntimeError('Expected exactly 120 incremental sceneRev frames')
start = time.perf_counter()
results, errors, frame_report = [], [], None
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe', headless=True,
        args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if software else [])
    page = browser.new_page(viewport={'width':1280, 'height':720}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/event-projection', lambda route: route.fulfill(status=200, content_type='text/html', body='<!doctype html><meta charset="utf-8"><body style="margin:0;overflow:hidden;background:#030504"><canvas id="event"></canvas>'))
    page.goto('http://127.0.0.1:4180/event-projection', wait_until='networkidle')
    page.evaluate('''async ()=>{
      const {PixiPlayRenderer,loadBrowserFont}=await import('/editor/play-renderer.js');
      window.eventRenderer=new PixiPlayRenderer(document.getElementById('event'),{fontReady:loadBrowserFont()});
    }''')
    for capture in manifest['captures']:
        name = capture['name']
        state = json.loads((source / (name + '.state.json')).read_text(encoding='utf8'))
        result = page.evaluate('''async ({s,canvasPng})=>{
          const t=performance.now();await eventRenderer.applyScene(s.scene,s.canvasWidth,s.canvasHeight);eventRenderer.app.render();
          const initialApplyRenderMs=performance.now()-t;
          // applyScene creates sprite requests without awaiting their completion.
          // Await the installed renderer's actual per-texture promises before
          // capturing, so a fast PNG cannot record red pending-asset placeholders.
          const assetStart=performance.now();
          await Promise.allSettled([...eventRenderer.imageTextures.values()].map(texture=>texture.promise).filter(Boolean));
          const assetWaitMs=performance.now()-assetStart;
          eventRenderer.app.render();
          const fullReadyMs=performance.now()-t;
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const gl=eventRenderer.app.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
          const result={initialApplyRenderMs,fullReadyMs,projectionMs:performance.now()-t,webgl:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',nodes:s.scene.nodes.length,canvas:[s.canvasWidth,s.canvasHeight],assetWaitMs,assetCount:eventRenderer.imageTextures.size,assetErrors:[...eventRenderer.imageTextures.entries()].filter(([,texture])=>texture.error).map(([key,texture])=>({key,error:texture.error}))};
          if(canvasPng){eventRenderer.app.render();result.png=document.getElementById('event').toDataURL('image/png').split(',')[1];}
          return result;
        }''', {'s':state, 'canvasPng':canvas_png})
        screenshot_start = time.perf_counter()
        png = result.pop('png', None)
        if png:
            (out / (name + '.png')).write_bytes(base64.b64decode(png))
        else:
            page.screenshot(path=str(out / (name + '.png')))
        result['screenshotMs'] = (time.perf_counter()-screenshot_start)*1000
        results.append({'name':name, **result})
        print('RENDER ' + name, flush=True)
    if frame_states:
        # The selected final screenshot must be the full baseline corresponding
        # to these sceneRev deltas.
        frame_report = page.evaluate('''async frames=>{
          const samples=[];
          for(const s of frames){const t=performance.now();await eventRenderer.applyScene(s.scene,s.canvasWidth,s.canvasHeight);eventRenderer.app.render();samples.push(performance.now()-t);}
          const sorted=[...samples].sort((a,b)=>a-b),q=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
          return {count:samples.length,p50Ms:q(.5),p95Ms:q(.95),maxMs:sorted.at(-1),samplesMs:samples,scope:'CPU wall time of actual Pixi applyScene + app.render; no requestAnimationFrame wait and no GPU FPS claim'};
        }''', frame_states)
        print('FRAMES ' + str(frame_report['count']), flush=True)
    version = browser.version
    browser.close()
asset_errors = [error for scene in results for error in scene.get('assetErrors', [])]
report = {'status':'failed' if errors or asset_errors else 'passed', 'scope':'Actual SDK scenes through installed Simulator Pixi, one headless Chrome/page; no official client/device/GPU FPS claim', 'capture':'Browser canvas PNG immediately after actual Pixi render' if canvas_png else 'Headless browser page screenshot', 'browser':version, 'softwareRequested':software, 'totalSeconds':time.perf_counter()-start, 'scenes':results, 'frameReplay':frame_report, 'pageErrors':errors, 'assetErrors':asset_errors}
(out / 'browser-render.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
if errors:
    raise RuntimeError('Pixi page errors: ' + '; '.join(errors))
if asset_errors:
    raise RuntimeError('Pixi asset errors: ' + json.dumps(asset_errors))
