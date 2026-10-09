#!/usr/bin/env python3
"""Static release verification when browser GUI is not available."""
from pathlib import Path
import hashlib,re,json,zipfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
html=(WEB/'index.html').read_text(encoding='utf-8')
js=(WEB/'js/app.js').read_text(encoding='utf-8')
check_ids=re.findall(r'\$\([\'\"]([\w-]+)[\'\"]\)',js)
missing=sorted(set(check_ids)-set(re.findall(r'id=[\'\"]([\w-]+)[\'\"]',html)))
assert not missing, f'Missing DOM elements: {missing}'
assert 'FACE RIG · V0.6' in html
assert 'Cubism' in html
all_scripts=[WEB/'js/app.js',WEB/'js/raster-face-rig.js',WEB/'js/audio-mouth.js',WEB/'js/facial-art.js',WEB/'js/face-performance.js', WEB/'js/eye-performance.js']
for file in all_scripts:
    source=file.read_text(encoding='utf-8')
    for spec in re.findall(r'from\s+[\'\"](\.[^\'\"]+)[\'\"]',source):
        assert (file.parent/spec).is_file(),f'{file.name}: missing import {spec}'
for name in ['base.webp','eye_left.webp','eye_right.webp','mouth.webp','eye_left_closed.svg','eye_right_closed.svg','rig.json']:
    assert (WEB/'assets/face-rig'/name).is_file(),name
for name in ['yuzuki-face-motion-v05.gif','qa-face-states-v05.jpg','yuzuki-facial-prototype-v06.ora']:
    assert (ROOT/'assets/face-rig'/name).is_file(),name
with zipfile.ZipFile(ROOT/'assets/face-rig/yuzuki-facial-prototype-v06.ora') as z:
    assert z.testzip() is None
    layer_names=[x.get('name') for x in ET.fromstring(z.read('stack.xml')).iter('layer')]
    assert len(layer_names)==6
art=json.loads((ROOT/'art-direction.lock.json').read_text(encoding='utf-8'))
sha=hashlib.sha256((ROOT/'assets/source/yuzuki-front-a.png').read_bytes()).hexdigest()
assert sha=='5ecb00c0b580ede77d9629d37925cb6dce7d394888d83bd121b3ee6cfbd8f478'
print(f'PASS: DOM references ({len(set(check_ids))}), JS imports, face assets, 6-layer ORA, approved art SHA256, V0.6 marker')
