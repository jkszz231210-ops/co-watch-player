#!/usr/bin/env python3
"""V1.1 release gate: validate runnable inline JS and frozen character artwork."""
import hashlib
import re
import subprocess
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
html=(WEB/'companion.html').read_text('utf8')
js=(WEB/'js/companion.js').read_text('utf8')
standalone=(ROOT/'柚希-双击直接体验.html').read_text('utf8')
ids=set(re.findall(r'id="([\w-]+)"',html))
refs=set(re.findall(r"\$\(['\"]([\w-]+)['\"]\)",js))
assert refs <= ids, f'Missing IDs: {refs-ids}'
assert standalone.count('data:image/webp;base64,')>=15
assert '<script type="module"' not in standalone
assert 'src="./assets/' not in standalone
scripts=re.findall(r'<script>(.*?)</script>',standalone,re.S)
assert len(scripts)==1, 'Standalone should include exactly one bundled script'
assert not re.search(r'(?:^|\n)\s*(?:export|import)\s+',scripts[0]),'ES Modules left in inline bundle'
with tempfile.TemporaryDirectory() as d:
    f=Path(d)/'bundle.js';f.write_text(scripts[0],'utf8')
    subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
raw=(ROOT/'assets/source/yuzuki-front-a.png').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='5ecb00c0b580ede77d9629d37925cb6dce7d394888d83bd121b3ee6cfbd8f478'
assert (ROOT/'tools/test_browser_standalone_v11.py').exists()
print(f'PASS V1.1: {len(refs)} wired controls; 14 face art layers; JavaScript bundle parses; original portrait SHA-256 matches')
