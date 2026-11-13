"""Focused browser/source check; requires Python Playwright and Chromium, no game input."""
import hashlib
import json
from pathlib import Path
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import os

root = Path(__file__).resolve().parents[1]
base = root / 'art/characters/liyue-four/idle-candidate-v1'
manifest = json.loads((base / 'asset_manifest.json').read_text())
for path, item in manifest['files'].items():
    data = (base / path).read_bytes()
    assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256'], path

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/art/characters/liyue-four/idle-candidate-v1/preview.html'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1200, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_function("document.documentElement.dataset.ready === 'true'")
        assert page.locator('article').count() == 4
        assert page.locator('canvas').count() == 16
        assert page.locator('canvas').evaluate_all('(xs)=>xs.every(c=>c.getBoundingClientRect().width===c.width)')
        for link in page.locator('a').evaluate_all('(xs)=>xs.map(a=>a.href)'):
            assert page.request.get(link).ok, link
        snapshot = lambda kind: page.locator(f'canvas[data-kind={kind}]').evaluate_all('(xs)=>xs.map(c=>c.toDataURL())')
        initial_static, initial_motion = snapshot('static'), snapshot('motion')
        assert initial_static == initial_motion
        page.locator('#frame').fill('7')
        assert snapshot('static') == initial_static
        assert all(a != b for a, b in zip(snapshot('motion'), initial_motion))
        page.locator('#static').click()
        assert snapshot('motion') == initial_motion
        page.locator('#play').click()
        page.wait_for_function("document.querySelector('#frame').value !== '0'")
        page.locator('#play').click()
        paused = snapshot('motion')
        page.wait_for_timeout(250)
        assert snapshot('motion') == paused
        page.locator('#static').click()
        assert snapshot('motion') == initial_motion
        page.locator('#background').select_option('light')
        assert page.locator('.pair.light').count() == 8
        page.set_viewport_size({'width': 375, 'height': 800})
        assert page.locator('canvas').evaluate_all('(xs)=>xs.every(c=>c.getBoundingClientRect().width===c.width)')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        # Actual pointer bytes must fail visibly, rather than masquerade as loaded media.
        page.route('**/ganyu_idle_133px_spritesheet.png', lambda route: route.fulfill(content_type='image/png', body='version https://git-lfs.github.com/spec/v1\n'))
        page.reload()
        page.wait_for_function("document.documentElement.dataset.ready === 'error'")
        assert page.locator('#play').is_disabled()
        assert 'LFS' in page.locator('#status').inner_text()
        browser.close()
    print('PASS: manifest, local links, 16 canvas sizes, frame changes, fixed references, pause/static, mobile overflow, LFS pointer error')
finally:
    server.shutdown()
    server.server_close()
