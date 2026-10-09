#!/usr/bin/env python3
"""Deterministic Pillow preview of the V0.8 Canvas aperture math. NOT browser QA."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np, math
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/assets/face-rig'; OUT=ROOT/'assets/face-rig'
BOX={'eye_left':(338,460,468,555),'eye_right':(551,435,695,540)}
GEO={'eye_left':(346,460,502,35,34,-3.5),'eye_right':(557,687,484,36,35,-3)}


def bezier(a,b,c,d,segments=64):
    p=[]
    for n in range(segments+1):
        t=n/segments;u=1-t
        p.append((u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]))
    return p


def aperture(side,o):
    l,r,center,upper,lower,slope=GEO[side];w=r-l
    def corner(x):return (x,center+(x-l)/w*slope)
    def control(x,top):return (x,corner(x)[1]+(-upper*1.35*o if top else lower*1.35*o))
    x=bezier(corner(l),control(l+w*.24,True),control(l+w*.76,True),corner(r))
    y=bezier(corner(r),control(l+w*.76,False),control(l+w*.24,False),corner(l))
    return x+y


def eased(v):
    t=max(0,min(1,v));return t*t*(3-2*t)


def render(left=1,right=1):
    pic=Image.open(WEB/'base_v07.png').convert('RGBA')
    for s,box in [('brow_left',(306,398)),('brow_right',(548,381))]:
        pic.alpha_composite(Image.open(WEB/f'{s}.png').convert('RGBA'),box)
    pic.alpha_composite(Image.open(WEB/'mouth.png').convert('RGBA'),(468,607))
    for side,o in [('eye_left',left),('eye_right',right)]:
        x,y,x2,y2=BOX[side];w=x2-x;h=y2-y
        eye=Image.new('RGBA',(w,h))
        for part in ('sclera','iris','lashes'):
            eye.alpha_composite(Image.open(WEB/f'{side}_{part}.png').convert('RGBA'))
        alpha=eye.getchannel('A')
        if o<.96:
            mask=Image.new('L',(w,h),0);d=ImageDraw.Draw(mask)
            d.polygon([(round(px-x),round(py-y)) for px,py in aperture(side,o)],fill=255)
            alpha=Image.fromarray((np.asarray(alpha,dtype=float)*np.asarray(mask,dtype=float)/255*eased((o-.045)/.31)).astype('uint8'),'L')
        eye.putalpha(alpha)
        pic.alpha_composite(eye,(x,y))
        if .19<o<.95:
            d=ImageDraw.Draw(pic,'RGBA')
            line=aperture(side,o)[:65]
            strength=max(0,min(1,(1-o)*2.1))
            d.line(line,fill=(118,87,102,round(168*strength)),width=2,joint='curve')
        cover=eased((.28-o)/.19)
        if cover>0:
            overlay=Image.open(WEB/f'{side}_closed.png').convert('RGBA')
            overlay.putalpha(overlay.getchannel('A').point(lambda p:round(p*cover)))
            pic.alpha_composite(overlay,(x,y))
    return pic

font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
cases=[('ORIGINAL',None),('OPEN / 1.0',(1,1)),('SOFT / .75',(.75,.75)),('HALF / .50',(.5,.5)),('ALMOST / .22',(.22,.22)),('CLOSED / .04',(.04,.04)),('WINK LEFT',(.04,1)),('WINK RIGHT',(1,.04))]
w,h=485,350
out=Image.new('RGB',(4*w,2*(h+34)), '#f4f3fa');draw=ImageDraw.Draw(out)
for i,(label,args) in enumerate(cases):
    if args is None:picture=Image.open(ROOT/'assets/source/yuzuki-front-a.png').convert('RGBA')
    else:picture=render(*args)
    crop=picture.crop((285,374,723,690)).resize((w,h),Image.Resampling.LANCZOS).convert('RGB')
    tx=(i%4)*w;ty=(i//4)*(h+34)
    out.paste(crop,(tx,ty+34));draw.text((tx+13,ty+8),label,font=font,fill='#415174')
file=OUT/'qa-aperture-v08.jpg'
out.save(file,quality=93,optimize=True)
original=np.asarray(Image.open(ROOT/'assets/source/yuzuki-front-a.png').convert('RGB').crop((300,380,710,675)),dtype=np.int16)
neutral=np.asarray(render().convert('RGB').crop((300,380,710,675)),dtype=np.int16)
print('V0.8 offline 8-case qa:',file,'default mean absolute RGB diff:',round(float(np.abs(original-neutral).mean()),3))
# Animated wink sequence for art direction review, NOT a browser capture.
frames=[]
for n in range(31):
    t=n/30
    if t<.28:o=1-eased(t/.28)*.96
    elif t<.42:o=.04
    else:o=.04+.96*eased((t-.42)/.58)
    im=render(left=o).crop((280,330,730,780)).resize((380,380),Image.Resampling.LANCZOS).convert('RGB')
    frames.append(im)
frames[0].save(OUT/'yuzuki-lid-v08.gif',save_all=True,append_images=frames[1:],duration=56,loop=0,optimize=True)
print('Generated',len(frames),'preview frames')
