#!/usr/bin/env python3
"""Paint two antialiased original lid illustrations and two soft crease layers.

Artwork is a hand-authored vector-style overlay, not a re-generated face.
Retains all pixels of the approved base portrait. Does NOT generate Cubism mesh.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import math
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/assets/face-rig'
SCALE=4
EYES={
 'eye_left':{'size':(130,95),'coords':[(8,54),(43,63),(86,61),(121,50)], 'slope':1},
 'eye_right':{'size':(144,105),'coords':[(6,63),(44,72),(95,69),(134,57)], 'slope':1},
}

def curve(a,b,c,d,steps=100):
    for n in range(steps+1):
        t=n/steps;u=1-t
        yield (round((a[0]*u**3+3*b[0]*u*u*t+3*c[0]*u*t*t+d[0]*t**3)*SCALE),
               round((a[1]*u**3+3*b[1]*u*u*t+3*c[1]*u*t*t+d[1]*t**3)*SCALE))

def stroke(d,coords,fill,width):
    pts=list(curve(*coords))
    d.line(pts,fill=fill,width=round(width*SCALE),joint='curve')
    r=width*SCALE/2
    for x,y in (pts[0],pts[-1]):d.ellipse((round(x-r),round(y-r),round(x+r),round(y+r)),fill=fill)

for side,eye in EYES.items():
    w,h=eye['size'];coords=eye['coords']
    img=Image.new('RGBA',(w*SCALE,h*SCALE));d=ImageDraw.Draw(img)
    stroke(d,coords,(193,132,146,41),6.5)
    stroke(d,coords,(113,77,96,198),2.15)
    under=[(x,y+4.6) for x,y in coords]
    stroke(d,under,(213,141,157,49),1.15)
    # Short outer lashes, gently tilted away from the lid, not a cartoon spike.
    x,y=coords[-1]
    for j in range(3):
        bx=x-(j+1)*3.8;by=y+(j+1)*1.3
        d.line([(round(bx*SCALE),round(by*SCALE)),(round((bx+4.8-j*.9)*SCALE),round((by-4.5+j*.65)*SCALE))],fill=(105,73,87,105-j*25),width=round(.85*SCALE))
    img=img.resize((w,h),Image.Resampling.LANCZOS)
    img.save(WEB/f'{side}_soft_closed.png',optimize=True)
    img.save(WEB/f'{side}_soft_closed.webp',format='WEBP',lossless=True,method=5)
    # Eyelid fold independent layer, used only during expression transition.
    fold=Image.new('RGBA',(w*SCALE,h*SCALE));df=ImageDraw.Draw(fold)
    upper=[(x,y-8) for x,y in coords]
    stroke(df,upper,(182,123,143,83),1.35)
    fold=fold.resize((w,h),Image.Resampling.LANCZOS)
    fold.save(WEB/f'{side}_fold.png',optimize=True)
    fold.save(WEB/f'{side}_fold.webp',format='WEBP',lossless=True,method=5)
print('V0.9 soft eye artwork: 2 closed-lid sprites + 2 independent crease sprites')
