#!/usr/bin/env python3
"""Single-command Yuzuki companion preview, optional local-only AI proxy."""
import argparse
import http.server
import json
from pathlib import Path
import webbrowser
from urllib.parse import urlsplit
from companion_api import config,complete

ROOT=Path(__file__).resolve().parent
WEB=ROOT/'web'
REQUIRED=('companion.html','companion.css','js/companion.js','js/raster-face-rig.js','assets/yuzuki-front-a.webp','assets/face-rig/base_v07.webp')

def validate():
    missing=[part for part in REQUIRED if not (WEB/part).is_file()]
    if missing:raise SystemExit('缺少文件：'+', '.join(missing))
    lock=json.loads((ROOT/'art-direction.lock.json').read_text(encoding='utf-8'))
    if lock.get('candidateId')!='front-a' or not lock.get('approved'):
        raise SystemExit('角色主视觉配置错误')

class CompanionHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(WEB),**kwargs)

    def reply_json(self,status,payload):
        data=json.dumps(payload,ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Length',str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if urlsplit(self.path).path=='/api/status':
            cfg=config()
            self.reply_json(200,{'ai':cfg['enabled'],'model':cfg['model'] if cfg['enabled'] else None})
        else:super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path!='/api/chat':
            self.reply_json(404,{'error':'未知接口'});return
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:length=0
        if length<1 or length>16_384:
            self.reply_json(413,{'error':'消息过长或为空'});return
        try:
            incoming=json.loads(self.rfile.read(length))
            message=incoming.get('message','')
            if not isinstance(message,str) or not message.strip() or len(message)>400:
                self.reply_json(400,{'error':'消息需为 1 到 400 字'});return
            if not config()['enabled']:
                self.reply_json(503,{'error':'未配置 AI 服务'});return
            result=complete(message.strip(),incoming.get('history',[]))
            self.reply_json(200,result)
        except (ValueError,AttributeError,TypeError):
            self.reply_json(400,{'error':'请求格式无效'})
        except RuntimeError as e:
            self.reply_json(502,{'error':str(e)})
        except Exception:
            self.reply_json(502,{'error':'模型服务暂时不可用'})

def main():
    parser=argparse.ArgumentParser(description='柚希陪伴演示版')
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--port',type=int,default=0)
    args=parser.parse_args()
    validate()
    if args.check:
        print('PASS: 柚希 V1.0 演示版文件齐全，主视觉已锁定');return
    with http.server.ThreadingHTTPServer(('127.0.0.1',args.port),CompanionHandler) as server:
        url=f'http://127.0.0.1:{server.server_address[1]}/companion.html'
        print('柚希 V1.0 已启动：',url,flush=True)
        print('AI 服务：', '已配置' if config()['enabled'] else '未配置，使用离线演示',flush=True)
        print('Ctrl+C 关闭本地服务',flush=True)
        if not args.no_browser:webbrowser.open(url)
        try:server.serve_forever()
        except KeyboardInterrupt:pass

if __name__=='__main__':main()
