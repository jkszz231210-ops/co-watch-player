from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np, json
R=Path(__file__).resolve().parents[1]; WEB=R/'web/assets/face-rig'; OUT=R/'assets/face-rig'
boxes={'eye_left':(338,460,468,555),'eye_right':(551,435,695,540)}
brows={'brow_left':(306,398,469,447),'brow_right':(548,381,695,432)}

def render(gaze=(0,0),brow_raise=(0,0),eye_state='open'):
 im=Image.open(WEB/'base_v07.webp').convert('RGBA')
 for s,dy in zip(brows,brow_raise):
  b=Image.open(WEB/f'{s}.png').convert('RGBA');box=brows[s];im.alpha_composite(b,(box[0],box[1]+int(dy)))
 im.alpha_composite(Image.open(WEB/'mouth.png').convert('RGBA'),(468,607))
 for s in boxes:
  x,y,x2,y2=boxes[s];w,h=x2-x,y2-y
  if eye_state=='closed':
   im.alpha_composite(Image.open(WEB/f'{s}_closed.png').convert('RGBA'),(x,y));continue
  sclera=Image.open(WEB/f'{s}_sclera.png').convert('RGBA')
  iris=Image.open(WEB/f'{s}_iris.png').convert('RGBA')
  im.alpha_composite(sclera,(x,y))
  im.alpha_composite(iris,(x+int(gaze[0]),y+int(gaze[1])))
 return im
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
shots=[('ORIGINAL',Image.open(R/'assets/source/yuzuki-front-a.png').convert('RGBA')),
 ('NEUTRAL',render()),('LOOK LEFT',render((-3,0))),('LOOK RIGHT',render((3,0))),('CURIOUS',render((1,0),(3,-2))),('SURPRISED',render((0,-2),(-2,-2)))]
w,h=460,345;out=Image.new('RGB',(w*3,(h+36)*2),'#f7f7fd');d=ImageDraw.Draw(out)
for i,(label,im) in enumerate(shots):
 x=(i%3)*w;y=(i//3)*(h+36)
 out.paste(im.crop((290,380,710,690)).resize((w,h),Image.Resampling.LANCZOS).convert('RGB'),(x,y+36))
 d.text((x+16,y+9),label,font=font,fill='#374461')
out.save(OUT/'qa-eye-detail-v07.jpg',quality=94)
original=np.asarray(shots[0][1].crop((300,385,710,685)).convert('RGB')).astype(int)
neutral=np.asarray(shots[1][1].crop((300,385,710,685)).convert('RGB')).astype(int)
print('mean absolute RGB deviation:',round(np.abs(original-neutral).mean(),2))

# Export a compact short gaze demo from the actual extracted sprites.
import math
frames=[]
for i in range(35):
 t=i/(34)
 wave=math.sin(t*math.pi*2.0)*2.6
 brow=-1.6*math.sin(t*math.pi*2.0)
 frame=render((round(wave),0),(round(brow),0)).crop((284,340,722,765)).resize((440,428),Image.Resampling.LANCZOS).convert('RGB')
 frames.append(frame)
frames[0].save(OUT/'yuzuki-iris-gaze-v07.gif',save_all=True,append_images=frames[1:],duration=76,loop=0,optimize=True)
print('Rendered six-state sheet + gaze GIF (offline approximations, not browser screenshots).')
