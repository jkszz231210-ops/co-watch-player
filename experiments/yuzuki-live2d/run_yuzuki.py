#!/usr/bin/env python3
"""Local-only preview; no build tools, cloud credentials or third party dependencies."""
import argparse
import functools
import http.server
import json
from pathlib import Path
import webbrowser

ROOT = Path(__file__).resolve().parent
WEB = ROOT / 'web'
REQUIRED = ('index.html', 'js/app.js', 'js/art-direction.js', 'assets/yuzuki-front-a.webp')


def validate():
    missing = [name for name in REQUIRED if not (WEB / name).is_file()]
    if missing:
        raise SystemExit(f'缺少文件: {", ".join(missing)}')
    lock = json.loads((ROOT / 'art-direction.lock.json').read_text(encoding='utf-8'))
    if lock.get('candidateId') != 'front-a' or not lock.get('approved'):
        raise SystemExit('主视觉配置错误，请使用完整项目包。')
    return lock


def main():
    parser = argparse.ArgumentParser(description='柚希网页原型')
    parser.add_argument('--check', action='store_true', help='Validate assets and exit')
    parser.add_argument('--no-browser', action='store_true', help='Do not open the web browser')
    parser.add_argument('--port', type=int, default=0, help='TCP port, 0 for automatic')
    args = parser.parse_args()
    validate()
    if args.check:
        print('检查通过：角色主视觉已锁定，网页文件齐全。')
        return
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(WEB))
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        raise SystemExit(f'无法打开预览端口：{error}')
    address = f'http://127.0.0.1:{server.server_address[1]}/index.html'
    print('柚希已准备就绪。直接在浏览器查看以下地址：', address, flush=True)
    print('按 Ctrl+C 可以关闭预览。', flush=True)
    if not args.no_browser:
        webbrowser.open(address)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n预览已停止。')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
