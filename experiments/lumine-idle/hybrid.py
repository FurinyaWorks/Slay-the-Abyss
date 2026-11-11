"""One same-source test of the installed mixed primitive fitter, no new art."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import json
import hashlib
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.artifacts/lumine-idle/hybrid'
OUT.mkdir(parents=True, exist_ok=True)
VENDOR = Path('F:/New folder/tools/vendor/primitive-shape')
SOURCE = ROOT / 'art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert digest(SOURCE) == '32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de'
if sys.argv[1] == 'fit':
    import tempfile
    (OUT/'tmp').mkdir(exist_ok=True)
    tempfile.tempdir = str(OUT/'tmp')
    import numpy as np
    import cv2
    from PIL import Image
    sys.path.insert(0, str(VENDOR))
    import primitive_backend, fill_shaper, lua_export
    config = {'num_primitives': 768, 'allowed_shapes': ['circle','rect','triangle'],
              'detail_scale': 1, 'workers': 2, 'transparent_output': True}
    image = Image.open(SOURCE).convert('RGBA').resize((210,192), Image.Resampling.LANCZOS)
    image.save(OUT / 'input.png')
    start = time.perf_counter()
    fitted = primitive_backend.fit_image_with_primitive(np.asarray(image)[:,:,[2,1,0,3]], config)
    elapsed = time.perf_counter() - start
    (OUT / 'fit.json').write_text(json.dumps(fitted['results'], default=lambda v: v.item()))
    # This preview uses the original alpha map and is NOT native evidence.
    cv2.imwrite(str(OUT / 'masked-diagnostic.png'), fitted['preview'])
    elements = fill_shaper.results_to_elements(fitted['results'], 1, (105,96), output_alpha=None)
    for e in elements:
        e['center']['y'] += 192
    result = {'mode':'fill','image_size':{'width':210,'height':192},
              'config':{'pixel_per_unit':1,**config},'elements':elements}
    (OUT / 'primitive.lua').write_text(lua_export.build_lua_export_text(result,image_name='approved-lumine-mixed'),encoding='utf-8')
    report = {'sourceSha256':digest(SOURCE),'size':[210,192],'config':config,'fitSeconds':elapsed,
              'elements':len(elements),'runtimeLuaSha256':digest(OUT/'primitive.lua'),
              'toolInputs':{str(p):digest(p) for p in [VENDOR/'primitive_backend.py',VENDOR/'fill_shaper.py',VENDOR/'lua_export.py',VENDOR/'tools/primitive.exe']},
              'limits':'masked-diagnostic.png is source-alpha-clipped, not native output; canonical export still required'}
    (OUT / 'receipt.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))
elif sys.argv[1] == 'render':
    sys.path.insert(0,'F:/New folder/tools/vendor/image-editor/backend')
    from app import main as editor
    imported = editor.import_scene(editor.ImportRequest(sourceType='lua',content=(OUT/'primitive.lua').read_text(encoding='utf-8'),sourceName='approved-lumine-mixed'))
    scene = imported.scene
    (OUT/'scene.json').write_text(json.dumps(scene.model_dump(),ensure_ascii=False,indent=2),encoding='utf-8')
    response = editor.export_png(editor.ExportRequest(scene=scene))
    (OUT/'native-shapes.png').write_bytes(response.body)
    print(json.dumps({'elements':len(scene.elements),'pngSha256':digest(OUT/'native-shapes.png'),'canvas':scene.canvas.model_dump()}))
else:
    raise ValueError('fit or render required')
