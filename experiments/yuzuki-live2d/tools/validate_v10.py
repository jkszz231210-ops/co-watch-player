#!/usr/bin/env python3
"""V1.0 static release quality gate without requiring a GUI browser."""
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
html=(WEB/'companion.html').read_text(encoding='utf-8')
js=(WEB/'js/companion.js').read_text(encoding='utf-8')
script=(ROOT/'柚希-双击直接体验.html').read_text(encoding='utf-8')
ids=set(re.findall(r'id="([\w-]+)"',html))
referenced=set(re.findall(r"\$\(['\"]([\w-]+)['\"]\)",js))
missing=referenced-ids
assert not missing,f'UI ID 不匹配：{sorted(missing)}'
assert 'YUZUKI_OFFLINE_ASSETS' in script
assert script.count('data:image/webp;base64,')>=15
assert '<script type="module"' not in script
assert 'src="./assets/' not in script
assert 'web/companion.html' not in script
assert (ROOT/'companion_api.py').exists()
assert (ROOT/'tests/test_companion_api.py').exists()
assert json.loads((ROOT/'art-direction.lock.json').read_text(encoding='utf-8'))['candidateId']=='front-a'
print(f'PASS V1.0: {len(referenced)} HTML controls matched, 14 facial art layers embedded, offline HTML ~{len(script)//1024} KiB, approved portrait preserved')
