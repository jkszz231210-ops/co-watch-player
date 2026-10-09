#!/usr/bin/env python3
"""V0.5 offline visual QA for actual extracted face parts and analogous drawn poses.
This PIL implementation is a visual approximation of web/js/facial-art.js;
it is explicitly NOT a Chromium screenshot nor a Cubism render.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'web/assets/face-rig'
OUT=ROOT/'assets/face-rig'
base=Image.open(ART/'base.webp').convert('RGBA')
eyes={k:Image.open(ART/f'{k}.webp').convert('RGBA') for k in ['eye_left','eye_right','mouth']}
boxes={'eye_left':(338,460,468,555),'eye_right':(551,435,695,540),'mouth':(468,607,564,656)}
def curve(points,count=28):
    p0,p1,p2,p3=points;result=[]
    for i in range(count+1):
        t=i/count;u=1-t
        result.append(tuple(round(u**3*p0[j]+3*u*u*t*p1[j]+3*u*t*t*p2[j]+t**3*p3[j]) for j in [0,1]))
    return result

def render(eye=1,opening=0,smile=.08,blush=0,viseme='a'):
    im=base.copy()
    for side in ('eye_left','eye_right'):
        p=eyes[side];x,y,x2,y2=boxes[side];height=int(round((y2-y)*max(eye,.055)))
        patch=p.resize((x2-x,height),Image.Resampling.LANCZOS)
        if eye>.04:
            a=max(0,min(1,(eye-.04)/.30));a=a*a*(3-2*a)
            patch.putalpha(patch.getchannel('A').point(lambda v:round(v*a)))
            im.alpha_composite(patch,(x,int((y+y2)/2-5-height/2)))
        if eye<.22:
            ctrls=([(347,505),(375,516),(416,523),(457,501)] if side=='eye_left'
                else [(556,487),(590,499),(646,503),(683,479)])
            alpha=max(0,min(1,(.24-eye)/.18))
            d=ImageDraw.Draw(im,'RGBA')
            d.line(curve(ctrls),fill=(102,81,93,round(240*alpha)),width=3,joint='curve')
    if blush:
        # Pillow-compatible soft radial overlay at cheek locations.
        overlay=Image.new('RGBA',im.size);d=ImageDraw.Draw(overlay)
        for x,y in [(339,567),(688,543)]:
            d.ellipse((x-48,y-35,x+48,y+35),fill=(225,110,137,int(65*blush)))
        overlay=overlay.filter(ImageFilter.GaussianBlur(29))
        im=Image.alpha_composite(im,overlay)
    if opening<.035 and abs(smile-.08)<.13:
        im.alpha_composite(eyes['mouth'],boxes['mouth'][:2]);return im
    d=ImageDraw.Draw(im,'RGBA');cx,cy=517,631
    sizes={'rest':(.05,.03),'a':(.76,1),'i':(1,.22),'u':(.44,.5),'e':(.86,.51),'o':(.53,.85)}
    vw,vh=sizes.get(viseme,sizes['a']);w=19+20*vw*opening+max(0,smile)*7;h=max(1,2+19*vh*opening)
    if opening<.13:
        lift=-max(0,smile)*4
        d.line(curve([(cx-w/2,cy+lift),(cx-w/4,cy+2),(cx+w/7,cy+3),(cx+w/2,cy+lift)]),fill=(172,112,121,255),width=2,joint='curve')
    else:
        ry=h/2;rx=w/2;lift=-smile*2.6
        poly=curve([(cx-rx,cy-ry*.16+lift),(cx-rx*.65,cy-ry*.95),(cx+rx*.6,cy-ry*.95),(cx+rx,cy-ry*.16+lift)])
        poly+=curve([(cx+rx,cy-ry*.16+lift),(cx+rx*.9,cy+ry*.92),(cx-rx*.8,cy+ry*.95),(cx-rx,cy-ry*.16+lift)])
        d.polygon(poly,fill=(109,63,85,255))
        d.line(poly+[poly[0]],fill=(191,119,137,255),width=2,joint='curve')
        if ry>6:
            d.ellipse((cx-rx*.51,cy+ry*.40,cx+rx*.51,cy+ry*.66),fill=(223,149,162,245))
    return im

font_file='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try:font=ImageFont.truetype(font_file,20)
except OSError:font=ImageFont.load_default()
states=[('NEUTRAL',1,0,.08,0,'a'),('BLINK',.055,0,.08,0,'a'),('SMILE',.7,.04,.82,.06,'a'),('SPEECH-A',1,.78,.32,.12,'a'),('SPEECH-O',1,.78,.20,.10,'o'),('SHY',.53,.04,.37,.88,'a')]
width=400;height=420;sheet=Image.new('RGB',(width*len(states),height+45),'#f6f5fc');d=ImageDraw.Draw(sheet)
for n,(title,e,m,s,b,v) in enumerate(states):
    crop=render(e,m,s,b,v).crop((230,225,785,810)).resize((width,height),Image.Resampling.LANCZOS).convert('RGB')
    sheet.paste(crop,(n*width,40));d.text((n*width+15,12),title,font=font,fill='#53607c')
sheet.save(OUT/'qa-face-states-v05.jpg',quality=93)
frames=[]
for i in range(54):
    t=i/15;phase=t%3.2
    eyelid=1 if phase<2.3 or phase>2.54 else 1-.945*math.sin(math.pi*(phase-2.3)/.24)**2
    opening=.12+.60*abs(math.sin(t*9.4)) if 1.1<t<3.3 else 0
    viseme=['a','i','o','e','u'][int(t*4.6)%5]
    frame=render(eyelid,opening,.32 if opening else .08,.2,viseme)
    thumb=frame.crop((228,225,785,910)).resize((356,438),Image.Resampling.LANCZOS).convert('RGB')
    frames.append(thumb)
frames[0].save(OUT/'yuzuki-face-motion-v05.gif',save_all=True,append_images=frames[1:],duration=80,loop=0,optimize=True)
print('Generated 6-pose visual QA and 54-frame animation, PIL approximation, not browser capture')
