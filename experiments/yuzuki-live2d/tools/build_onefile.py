#!/usr/bin/env python3
"""Build a self-contained HTML preview with offline face rig and script modules.

This is a tiny project-specific ESM bundler, not intended for arbitrary JS syntax.
No network access and no third-party dependencies.
"""
from pathlib import Path
import base64
import re
import json

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
TARGET=ROOT/'柚希-双击直接体验.html'
MODULES=['face-performance','eye-aperture','eye-performance','performance-timeline',
         'facial-art','blink-v15','character-engine','raster-face-rig','interaction-director','session-store','companion']


def compile_module(name):
    code=(WEB/'js'/f'{name}.js').read_text(encoding='utf-8')
    def import_replacer(m):
        bindings=m.group(1)
        spec=m.group(2)
        if not spec.startswith('./') or not spec.endswith('.js'):
            raise ValueError('Unexpected module dependency: '+spec)
        return f"const {{{bindings}}}=__require__('{spec[2:-3]}');"
    code=re.sub(r"^import[ \t]*\{([^}]+)\}[ \t]*from[ \t]*['\"]([^'\"]+)['\"];[ \t]*(?:\r?\n)?",lambda m: import_replacer(m)+"\n",code,flags=re.M)
    exports=re.findall(r'^export\s+(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)',code,re.M)
    code=re.sub(r'^export\s+(?=(?:const|let|function|class)\s)', '', code,flags=re.M)
    if re.search(r'^\s*(?:import |export )',code,re.M):
        raise ValueError('Unsupported module syntax: '+name)
    assigns='\n'.join(f'exports.{key}={key};' for key in exports)
    return f"__define__({json.dumps(name)},function(__require__,exports){{\n{code}\n{assigns}\n}});"


def build():
    html=(WEB/'companion.html').read_text(encoding='utf-8')
    style=(WEB/'companion.css').read_text(encoding='utf-8')
    assets={}
    for name in ['mouth','eye_left_soft_closed','eye_right_soft_closed','eye_left_fold','eye_right_fold']:
        f=WEB/'assets/face-rig'/f'{name}.webp'
        assert f.is_file(),f
        assets[f'assets/face-rig/{name}.webp']='data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    atlas=(WEB/'assets/face-rig/blink-v19/blink-atlas.webp').read_bytes()
    assets['assets/face-rig/blink-v19/blink-atlas.webp']='data:image/webp;base64,'+base64.b64encode(atlas).decode()
    portrait=WEB/'assets/yuzuki-front-a.webp'
    embedded_portrait='data:image/webp;base64,'+base64.b64encode(portrait.read_bytes()).decode()
    assets['assets/yuzuki-front-a.webp']=embedded_portrait
    html=html.replace('<link rel="stylesheet" href="./companion.css">','<style>'+style+'</style>')
    html=html.replace('<script type="module" src="./js/companion.js"></script>','')
    html=html.replace('src="./assets/yuzuki-front-a.webp"','src="'+embedded_portrait+'"')
    html=html.replace('<a href="./index.html">高级调试 ↗</a>','<span>离线单文件版</span>')
    code='''const __modules__=new Map(),__instances__=new Map();
function __define__(name, factory){__modules__.set(name,factory)}
function __require__(name){if(__instances__.has(name))return __instances__.get(name);
const loader=__modules__.get(name);if(!loader)throw Error('Missing module: '+name);
const exports={};__instances__.set(name,exports);loader(__require__,exports);return exports;}
'''
    code+='window.__YUZUKI_OFFLINE_ASSETS='+json.dumps(assets,ensure_ascii=False)+';\n'
    for m in MODULES:code+=compile_module(m)+'\n'
    code+="__require__('companion');\n"
    html=html.replace('</body>','<script>'+code.replace('</script','<\\/script')+'</script>\n</body>')
    TARGET.write_text(html,encoding='utf-8')
    print(f'Created {TARGET.name} ({TARGET.stat().st_size/1024/1024:.2f} MiB; {len(assets)} face sprites)')
    return TARGET


WIDGET_MODULES=['face-performance','eye-aperture','eye-performance','performance-timeline',
                'facial-art','blink-v15','character-engine','raster-face-rig','widget-protocol','widget']

def build_widget():
    """Self-contained independently embeddable widget with the existing approved rig."""
    html=(WEB/'widget.html').read_text('utf-8')
    style=(WEB/'widget.css').read_text('utf-8')
    source=(WEB/'assets/yuzuki-front-a.webp').read_bytes()
    portrait='data:image/webp;base64,'+base64.b64encode(source).decode()
    assets={'assets/yuzuki-front-a.webp':portrait}
    for name in ['mouth','eye_left_soft_closed','eye_right_soft_closed','eye_left_fold','eye_right_fold']:
        f=WEB/'assets/face-rig'/f'{name}.webp'
        assets[f'assets/face-rig/{name}.webp']='data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    atlas=(WEB/'assets/face-rig/blink-v19/blink-atlas.webp').read_bytes()
    assets['assets/face-rig/blink-v19/blink-atlas.webp']='data:image/webp;base64,'+base64.b64encode(atlas).decode()
    html=html.replace('<link rel="stylesheet" href="./widget.css">','<style>'+style+'</style>')
    html=html.replace('<script type="module" src="./js/widget.js"></script>','')
    html=html.replace('src="./assets/yuzuki-front-a.webp"','src="'+portrait+'"')
    code="const __modules__=new Map(),__instances__=new Map();\nfunction __define__(name, factory){__modules__.set(name,factory)}\nfunction __require__(name){if(__instances__.has(name))return __instances__.get(name);const loader=__modules__.get(name);if(!loader)throw Error('Missing module: '+name);const exports={};__instances__.set(name,exports);loader(__require__,exports);return exports;}\n"
    code+='window.__YUZUKI_OFFLINE_ASSETS='+json.dumps(assets,ensure_ascii=False)+';\n'
    for module in WIDGET_MODULES:code+=compile_module(module)+'\n'
    code+="__require__('widget');\n"
    html=html.replace('</body>','<script>'+code.replace('</script','<\\/script')+'</script>\n</body>')
    target=ROOT/'柚希-悬浮挂件.html'
    target.write_text(html,'utf-8')
    return target

def build_embed_demo(widget_path=None):
    """Single self-contained host site; the character runs inside an isolated srcdoc frame."""
    widget_path=widget_path or build_widget()
    html=(WEB/'demo-embed.html').read_text('utf-8')
    widget=widget_path.read_text('utf-8')
    loader=(WEB/'js/embed-loader.js').read_text('utf-8')
    # Preserve the entire inline widget document as a JS string; no remote fetch.
    literal=json.dumps(widget,ensure_ascii=False).replace('</script','<\\/script')
    html=html.replace('<script src="./js/embed-loader.js"></script>',
                      '<script>window.__YUZUKI_STANDALONE_WIDGET_HTML='+literal+';</script><script>'+loader+'</script>')
    html=html.replace('YuzukiEmbed.mount({onEvent:',
                      'YuzukiEmbed.mount({srcdoc:window.__YUZUKI_STANDALONE_WIDGET_HTML,onEvent:')
    target=ROOT/'柚希-网页嵌入演示.html'
    target.write_text(html,'utf-8')
    return target

if __name__=='__main__':
    build()
    print('Created',build_widget().name)
    print('Created',build_embed_demo().name)
