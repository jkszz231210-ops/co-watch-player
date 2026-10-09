#!/usr/bin/env python3
"""Offline visual regression sprites; exercises the same layered art idea as Web canvas.
This does not replace an end-to-end browser test.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import math
root=Path(__file__).resolve().parents[1]
assets=root/'web/assets/face-rig'
base=Image.open(assets/'base.png').convert('RGBA')
eyes={name:Image.open(assets/f'{name}.png').convert('RGBA') for name in ['eye_left','eye_right','mouth']}
boxes={'eye_left':(338,460,468,555),'eye_right':(551,435,695,540),'mouth':(468,607,564,656)}
def frame(eye_open=1,mouth_open=0):
 im=base.copy();draw=ImageDraw.Draw(im,'RGBA')
 for key in ('eye_left','eye_right'):
  patch=eyes[key]; x,y,r,b=boxes[key];w,h=patch.size
  center=(y+b)/2-5
  eh=max(2,round(h*eye_open))
  patch=patch.resize((w,eh),Image.Resampling.LANCZOS)
  if eye_open>.075:
   patch.putalpha(patch.getchannel('A').point(lambda a:round(a*max(0,min(1,(eye_open-.075)/.22)))))
   im.alpha_composite(patch,(x,int(center-eh/2)))
  if eye_open<.2:
   # Brow/lash hint; animated output is still a prototype.
   d=ImageDraw.Draw(im,'RGBA');opacity=round((.2-eye_open)/.2*160)
   # smooth eyelid curve approximated by segments (matching browser bezier).
   if key=='eye_left':ctrl=((347,508),(372,517),(420,521),(457,502))
   else:ctrl=((557,488),(582,498),(637,503),(682,478))
   points=[]
   for n in range(25):
    t=n/24;u=1-t
    x=u**3*ctrl[0][0]+3*u*u*t*ctrl[1][0]+3*u*t*t*ctrl[2][0]+t**3*ctrl[3][0]
    y=u**3*ctrl[0][1]+3*u*u*t*ctrl[1][1]+3*u*t*t*ctrl[2][1]+t**3*ctrl[3][1]
    points.append((round(x),round(y)))
   d.line(points,fill=(114,92,104,opacity),width=2,joint='curve')
 x,y,r,b=boxes['mouth']
 p=eyes['mouth'];p.putalpha(p.getchannel('A').point(lambda a:round(a*max(0,1-mouth_open*1.9))))
 im.alpha_composite(p,(x,y))
 if mouth_open>.02:
  d=ImageDraw.Draw(im,'RGBA');w=18+mouth_open*23;h=mouth_open*23
  d.ellipse((517-w/2,631-h/2,517+w/2,631+h/2),fill=(109,59,80,240),outline=(201,135,143,255),width=2)
  if mouth_open>.5:d.ellipse((517-w*.3,631+h*.11,517+w*.3,631+h*.25),fill=(254,225,219,220))
 return im
states=[('默认',1,0),('闭眼',.055,0),('说话',1,.65),('眨眼说话',.12,.76)]
W=560; H=560
sheet=Image.new('RGB',(4*W,H+50),'#f5f4fa');d=ImageDraw.Draw(sheet)
for n,(title,e,m) in enumerate(states):
 f=frame(e,m).crop((210,180,810,780)).resize((W,H))
 sheet.paste(f.convert('RGB'),(n*W,30));d.text((n*W+15,8),title,fill='#505d79')
sheet.save(root/'assets/face-rig/qa-face-states.jpg',quality=89)
imgs=[]
for i in range(48):
 t=i/12
 phase=(t%3.2)
 eyelid=1 if phase<2.3 or phase>2.55 else 1-.96*math.sin(math.pi*(phase-2.3)/.25)**2
 # speech starts later, mouth opens and closes smoothly with capped audio-style curve
 mouth=(.12+.56*abs(math.sin(2*math.pi*t*2.6))) if 1.3<t<3.5 else 0
 f=frame(eyelid,mouth).crop((180,95,840,1015)).resize((330,460)).convert('RGB')
 imgs.append(f)
imgs[0].save(root/'assets/face-rig/yuzuki-face-motion-preview.gif',save_all=True,append_images=imgs[1:],duration=80,loop=0,optimize=True)
print('QA preview generated:',root/'assets/face-rig/qa-face-states.jpg', 'GIF frames:',len(imgs))
