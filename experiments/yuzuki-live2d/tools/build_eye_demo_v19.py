#!/usr/bin/env python3
"""Zero-install side-by-side eye-keyform reviewer. Never changes the source art."""
from pathlib import Path
from PIL import Image
import base64,io,json
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/cubism-handoff/v1.9'
TARGET=ROOT/'柚希-V1.9-眼部三态审核.html'
CROP=(266,328,760,715)

def build():
    pictures={}
    for state in ('open','half','closed'):
        im=Image.open(SRC/f'key-{state}.png').convert('RGB').crop(CROP)
        buff=io.BytesIO(); im.save(buff,'WEBP',quality=93,method=6)
        pictures[state]='data:image/webp;base64,'+base64.b64encode(buff.getvalue()).decode('ascii')
    html='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>柚希 V1.9 · 眼部三态实测</title>
    <style>*,*::before,*::after{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 20% 5%,#30384f,#0e1320 72%);color:#e8eafa;font-family:system-ui,'Microsoft YaHei',sans-serif}.wrap{max-width:1040px;margin:auto;padding:26px 18px 52px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}h1{font-size:clamp(24px,3vw,35px);margin:6px 0}p{color:#b9c0d6;line-height:1.75}.tag{font-size:12px;letter-spacing:1.4px;color:#a9b8df}.main{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:24px;margin-top:24px}.visual{background:#dae0ed;border-radius:25px;overflow:hidden;position:relative;min-height:400px;box-shadow:0 22px 68px #05071377;display:grid;place-items:center}.visual img{width:100%;height:auto;display:block}.stamp{position:absolute;left:15px;bottom:13px;background:#20263abb;color:white;padding:9px 13px;border-radius:12px;font-size:12px}.panel{padding:24px;background:#181f30de;border:1px solid #47516b80;border-radius:24px}.switch{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:20px 0}.switch button,.play{background:#273249;color:#dce5fa;border:1px solid #566078;border-radius:13px;padding:13px 8px;font-weight:650;cursor:pointer}.switch button.active{background:#8b9bda;color:#081127;border-color:#aab7ec}.play{width:100%;background:#4a5887}.rule{border-top:1px solid #42506e;margin-top:23px;padding-top:15px;color:#bbc6dc;font-size:13px;line-height:1.9}.details{font-size:13px;line-height:2.0;color:#adb8d5}.details b{color:#e4ebfc}.warning{border-left:3px solid #d9b6d2;padding:10px 13px;background:#ffffff08;font-size:13px}.count{font-variant-numeric:tabular-nums}.split{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:28px}.split figure{margin:0;background:#1c2437;border-radius:16px;overflow:hidden}.split img{width:100%;display:block}.split figcaption{padding:12px;text-align:center;font-size:13px;color:#cad6ed}@media(max-width:740px){.main{grid-template-columns:1fr}.visual{min-height:260px}.panel{padding:18px}}</style></head>
    <body><main class="wrap"><div class="top"><div><div class="tag">YUZUKI · EYE KEYFORM REVIEW · V1.9</div><h1>柚希：眼部三态审核</h1></div><div class="tag">APPROVED ORIGINAL PRESERVED</div></div><p>直接看实际导出的画面。正常睁眼完全保留你喜欢的原始立绘；半闭与全闭是可继续修画的关键形草稿，而不是 Cubism 完成模型。</p>
    <div class="main"><div class="visual"><img id="view" alt="柚希当前眼部关键形"><div class="stamp" id="stamp">原画 · 完全睁眼</div></div>
    <div class="panel"><b>选择眼部关键形</b><div class="switch"><button class="active" data-pose="open">睁眼</button><button data-pose="half">半闭</button><button data-pose="closed">闭眼</button></div><button id="play" class="play">▶ 播放眨眼节奏</button><p id="state" class="count">当前：睁眼</p>
    <div class="rule"><b>质量检查重点</b><div class="details">✓ 默认眼型与原画像素一致<br>✓ 左右眼分别制作，无镜像复制<br>✓ 三个状态可分别查看与再绘制<br>△ 半闭眼仍有局部纹理补画痕迹<br>△ 暂未通过 Cubism Editor 实际绑定</div></div>
    <div class="warning">这一版的半闭、闭眼仍为程序辅助绘画草稿。只有经过真正手工修画和 Cubism 网格绑定，才能达到高质量 Live2D。</div></div></div>
    <div class="split" id="split"></div></main><script>const assets=__ASSETS__;const labels={open:'睁眼 · 原画',half:'半闭眼 · 草稿',closed:'完全闭眼 · 草稿'};const view=document.getElementById('view'),stamp=document.getElementById('stamp'),state=document.getElementById('state');let current='open',playing=false;
    function show(pose){current=pose;view.src=assets[pose];stamp.textContent=labels[pose];state.textContent='当前：'+labels[pose];document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',b.dataset.pose===pose))}
    document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{playing=false;show(b.dataset.pose)});
    document.getElementById('play').onclick=async()=>{if(playing)return;playing=true;for(const [pose,ms] of [['open',450],['half',80],['closed',95],['half',105],['open',300]]){if(!playing)break;show(pose);await new Promise(r=>setTimeout(r,ms))}playing=false};
    document.getElementById('split').innerHTML=['open','half','closed'].map(p=>'<figure><img src="'+assets[p]+'" alt="'+labels[p]+'"><figcaption>'+labels[p]+'</figcaption></figure>').join('');show('open');</script></body></html>'''
    html=html.replace('__ASSETS__',json.dumps(pictures))
    TARGET.write_text(html,'utf-8')
    return TARGET
if __name__=='__main__':
    print('Built',build())
