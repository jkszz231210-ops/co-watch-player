#!/usr/bin/env python3
"""Generate the offline, frame-accurate V2.0 eyelid review UI."""
from pathlib import Path
import base64,io,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
EYES=ROOT/'assets/cubism-handoff/v2.0'
ATLAS=ROOT/'web/assets/face-rig/blink-v20/blink-atlas.webp'
ORIGINAL=ROOT/'assets/source/yuzuki-front-a.png'
OUTPUT=ROOT/'柚希-V2.0-眨眼成品审核.html'
CROP=(266,328,760,715)

def dataurl(image):
    buf=io.BytesIO();image.save(buf,'WEBP',quality=95,method=6)
    return 'data:image/webp;base64,'+base64.b64encode(buf.getvalue()).decode()

def build():
    original=dataurl(Image.open(ORIGINAL).convert('RGB').crop(CROP))
    atlas='data:image/webp;base64,'+base64.b64encode(ATLAS.read_bytes()).decode()
    html='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>柚希 V2.0 · 眼部动效审核</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 20% 0%,#343c58,#111827 76%);color:#eef1fa;font-family:system-ui,"Microsoft YaHei",sans-serif}main{max-width:1150px;margin:auto;padding:30px 20px 60px}h1{font-size:clamp(24px,3vw,35px);margin:4px 0 9px}p{color:#bec9dc;line-height:1.7}.kicker{letter-spacing:.25em;color:#9fb7ea;font-size:12px}.screens{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:28px 0}.screen{border:1px solid #66718e70;border-radius:22px;overflow:hidden;background:#cdd4e1;box-shadow:0 16px 48px #0408105c}.screen figure{margin:0}.screen img,.screen canvas{width:100%;height:auto;display:block;aspect-ratio:494/387}.screen figcaption{padding:12px 16px;color:#d6e2fb;background:#1b2438;font-size:13px}.panel{background:#202a40;border:1px solid #63718e60;border-radius:20px;padding:22px}.btns{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}.btn{appearance:none;border:1px solid #778bb2;background:#34435f;color:#eaf0ff;border-radius:12px;padding:11px 15px;cursor:pointer;font-size:14px}.btn.active{background:#a6b9ef;color:#121b2b}.row{display:flex;gap:14px;align-items:center}.slider{width:100%;accent-color:#acc7ff}.small{font-size:12px;color:#b8c3d7}.warn{border-left:3px solid #ddaebf;padding:10px 16px;background:#ffffff0a;margin-top:18px}strong{color:#fff}@media(max-width:700px){.screens{grid-template-columns:1fr}main{padding:19px 12px}.panel{padding:17px}}</style></head><body><main>
<div class="kicker">YUZUKI · EYE MOTION PRODUCTION REVIEW</div><h1>柚希 · V2.0 眼部动效审核</h1><p>左侧始终是你选定的原画，右侧是本轮实际导出的眨眼图集。对比“自然感、眼线是否重影、左右眼开合一致性”，不用再靠图层数量评价美术。</p>
<section class="screens"><div class="screen"><figure><img id="original" alt="审核通过的原始角色眼部"><figcaption>原画 · 不做任何眼睛重绘</figcaption></figure></div><div class="screen"><figure><canvas id="preview" width="494" height="387" role="img" aria-label="可调节闭合程度的柚希双眼"></canvas><figcaption id="status">动态结果 · 睁眼 0%</figcaption></figure></div></section>
<section class="panel"><strong>直接查看连续眨眼</strong><div class="btns"><button class="btn active" data-pose="0">睁眼</button><button class="btn" data-pose="25">微眯 25%</button><button class="btn" data-pose="50">半闭 50%</button><button class="btn" data-pose="75">将闭 75%</button><button class="btn" data-pose="100">闭眼</button><button class="btn" id="play">▶ 播放眨眼</button></div><div class="row"><label for="slider">开合试镜</label><input class="slider" type="range" id="slider" min="0" max="100" step="2.5" value="0"><output id="value">0%</output></div><p class="small" id="quality">41 档单帧显示，不叠画两条睫毛；0% 时与原画完全一致。</p><div class="warn"><strong>交付边界：</strong>这是改进后的二维栅格眨眼动效，而不是已通过 Cubism Editor 验收的 Live2D 模型。半闭与闭眼仍需要进一步人工审美校正。</div></section>
</main><script>
const art=new Image(),atlas=new Image();art.src=__ORIGINAL__;atlas.src=__ATLAS__;
const cv=document.getElementById('preview'),ctx=cv.getContext('2d');const slider=document.getElementById('slider'),value=document.getElementById('value'),status=document.getElementById('status');
const eyes=[{x:319,y:442,w:170,h:129,row:0},{x:536,y:414,w:177,h:149,row:1}], crop=[266,328];let closing=0,playing=false,raf=0,token=0;
function paint(percent){closing=Math.max(0,Math.min(100,percent));if(!art.complete||!atlas.complete)return;ctx.clearRect(0,0,494,387);ctx.drawImage(art,0,0);const step=Math.round(closing/2.5);if(step){for(const e of eyes){ctx.drawImage(atlas,step*192,e.row*160,e.w,e.h,e.x-crop[0],e.y-crop[1],e.w,e.h)}}value.textContent=Math.round(closing)+'%';status.textContent='动态结果 · 闭合 '+Math.round(closing)+'%';slider.value=closing;document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',Number(b.dataset.pose)===closing));}
function ready(){if(art.complete&&atlas.complete)paint(closing)};art.onload=ready;atlas.onload=ready;
document.getElementById('original').src=__ORIGINAL__;
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{playing=false;cancelAnimationFrame(raf);paint(Number(b.dataset.pose))});slider.oninput=()=>{playing=false;cancelAnimationFrame(raf);paint(Number(slider.value))};
document.getElementById('play').onclick=()=>{cancelAnimationFrame(raf);const my=++token;playing=true;const start=performance.now();const duration=850;function tick(t){if(!playing||my!==token)return;const pos=(t-start)%duration;let c=0;if(pos<170)c=0;else if(pos<250)c=(pos-170)/80;else if(pos<340)c=1;else if(pos<500)c=1-(pos-340)/160;paint(c*100);if(t-start<duration*4)raf=requestAnimationFrame(tick);else{playing=false;paint(0)}}raf=requestAnimationFrame(tick)};
</script></body></html>'''
    html=html.replace('__ORIGINAL__',json.dumps(original)).replace('__ATLAS__',json.dumps(atlas))
    OUTPUT.write_text(html,encoding='utf-8')
    return OUTPUT
if __name__=='__main__':print(build())
