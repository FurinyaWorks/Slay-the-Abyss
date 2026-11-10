# Render actual SDK scene projections through the installed Simulator Pixi
# renderer. No DOM imitation, image substitution or screenshot reconstruction.
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
state=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'));out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
frames=json.loads(Path(sys.argv[3]).read_text(encoding='utf8')) if len(sys.argv)>3 else []
with sync_playwright() as p:
 software='--software' in sys.argv
 b=p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe',headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] if software else [])
 page=b.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/map-projection',lambda r:r.fulfill(status=200,content_type='text/html',body='<!doctype html><meta charset="utf-8"><body style="margin:0;overflow:hidden;background:#030504"><canvas id="map"></canvas>'))
 page.goto('http://127.0.0.1:4180/map-projection',wait_until='networkidle')
 result=page.evaluate('''async s=>{
  const {PixiPlayRenderer,loadBrowserFont}=await import('/editor/play-renderer.js');
  const canvas=document.getElementById('map');window.mapRenderer=new PixiPlayRenderer(canvas,{fontReady:loadBrowserFont()});
  window.mapLongTasks=[];new PerformanceObserver(list=>mapLongTasks.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration})))).observe({type:'longtask',buffered:true});
  const t=performance.now();await mapRenderer.applyScene(s.scene,s.canvasWidth,s.canvasHeight);mapRenderer.app.render();
  const gl=mapRenderer.app.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
  return {firstProjectionCompleteMs:performance.now()-t,webgl:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',canvas:[s.canvasWidth,s.canvasHeight],nodes:s.scene.nodes.length};
 }''',state)
 page.screenshot(path=str(out/'map.png'))
 samples=[]
 for frame in frames:
  samples.append(page.evaluate('''async s=>{const t=performance.now();await mapRenderer.applyScene(s.scene,s.canvasWidth,s.canvasHeight);mapRenderer.app.render();return performance.now()-t}''',frame))
 page.screenshot(path=str(out/'map-warm.png'))
 resources=page.evaluate('performance.getEntriesByType("resource").map(x=>({url:x.name,duration:x.duration,bytes:x.transferSize}))')
 result.update({'errors':errors,'renderer':'Installed Simulator Pixi via headless Chrome; not official device FPS','softwareRequested':software,'samplesMs':samples,'browser':b.version,'resources':resources,'longTasks':page.evaluate('mapLongTasks')})
 (out/'browser-render.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 b.close()
