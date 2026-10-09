#!/usr/bin/env python3
"""V0.7: non-destructive iris/brow experimental layer authoring from approved portrait.

No claim of Cubism rig or manually illustrated hidden anatomy. Eye motion stays deliberately subtle.
Reproducible with pillow/numpy/opencv-python in tools/requirements.txt.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import cv2, zipfile, xml.etree.ElementTree as ET, io, json
R=Path(__file__).resolve().parents[1]
WEB=R/'web/assets/face-rig'
OUT=R/'assets/face-rig'
ART=R/'assets/source/yuzuki-front-a.png'
assert ART.exists()
original=Image.open(ART).convert('RGBA')
base=Image.open(WEB/'base.png').convert('RGBA')
boxes={'eye_left':(338,460,468,555),'eye_right':(551,435,695,540)}
# Coordinates traced from original (first-person left/right remain asset identifiers).
irises={'eye_left':(404,498,29,29),'eye_right':(613,480,31,30)}
brows={
 'brow_left':{'box':(306,398,469,447),'pts':[(315,423),(347,413),(405,410),(444,423)]},
 'brow_right':{'box':(548,381,695,432),'pts':[(556,412),(583,397),(635,396),(671,408)]}
}

def bezier(a,b,c,d,n=160):
 out=[]
 for i in range(n+1):
  t=i/n;u=1-t
  out.append((u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]))
 return out

# RGB inpaint only; preserve the previously extracted eye alpha.
for side,(cx,cy,rx,ry) in irises.items():
 x0,y0,x1,y1=boxes[side]
 eye=Image.open(WEB/f'{side}.png').convert('RGBA')
 ww,hh=eye.size
 loc=(cx-x0,cy-y0)
 irisMask=Image.new('L',(ww,hh),0);draw=ImageDraw.Draw(irisMask)
 draw.ellipse((loc[0]-rx+1,loc[1]-ry+2,loc[0]+rx-1,loc[1]+ry-2),fill=255)
 # Do not let the iris jump on top of the upper eyeliner, nose bangs, or lower lash line.
 cover=Image.new('L',(ww,hh),0);p=ImageDraw.Draw(cover)
 p.rectangle((0,loc[1]-ry+5,ww,loc[1]+ry-6),fill=255)
 # Also keep a slim static fringe at top of iris so the upper eyelid stays attached.
 mask=np.minimum(np.array(irisMask),np.array(cover)).astype(np.uint8)
 # Mask feathering for compositing without sharp circle-edge seams.
 feather=Image.fromarray(mask,'L').filter(ImageFilter.GaussianBlur(1.35))
 transparent=np.asarray(eye.getchannel('A'),dtype=np.uint8)
 new_alpha=np.minimum(np.asarray(feather),transparent)
 rgba=np.array(eye);rgba[:,:,3]=new_alpha
 iris=Image.fromarray(rgba,'RGBA')
 iris.save(WEB/f'{side}_iris.png',optimize=True)
 iris.save(WEB/f'{side}_iris.webp',format='WEBP',quality=98,method=5)
 # Open-eye plate minus iris, with color sampled from nearby sclera.
 # Inpaint one extra pixel to avoid an unmoving colored iris border.
 ms=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
 rgb=np.asarray(eye.convert('RGB'))
 cleaned=cv2.inpaint(rgb,ms,5,cv2.INPAINT_TELEA)
 cleaned=np.dstack([cleaned,np.asarray(eye.getchannel('A'))])
 sclera=Image.fromarray(cleaned,'RGBA')
 sclera.save(WEB/f'{side}_sclera.png',optimize=True)
 sclera.save(WEB/f'{side}_sclera.webp',format='WEBP',quality=96,method=5)

# Manual eyebrow outlines: trace only very thin existing lines. Background fill is
# slightly expanded and repaired; bangs are not segmented and can overlap eyebrow,
# therefore this prototype MUST NOT exaggerate movement or call these true painted layers.
patched=np.array(base)
for side,spec in brows.items():
 x0,y0,x1,y1=spec['box'];w=x1-x0;h=y1-y0
 original_patch=original.crop(spec['box'])
 line=bezier(*spec['pts'])
 local=[(round(x-x0),round(y-y0)) for x,y in line]
 detail=Image.new('L',(w,h));dr=ImageDraw.Draw(detail)
 dr.line(local,fill=245,width=5,joint='curve')
 detail=detail.filter(ImageFilter.GaussianBlur(.9))
 rgba=np.array(original_patch)
 rgba[:,:,3]=np.asarray(detail)
 transparent=Image.fromarray(rgba,'RGBA')
 transparent.save(WEB/f'{side}.png',optimize=True)
 transparent.save(WEB/f'{side}.webp',format='WEBP',quality=97,method=5)
 # Protect the existing hair strokes by replacing only 1-2px eyebrow center, leaving
 # original bangs intact, and use tiny expression motion to minimize artifacts.
 m=Image.new('L',(w,h));d=ImageDraw.Draw(m);d.line(local,fill=255,width=4)
 m=np.array(m,dtype=np.uint8)
 target=np.array(base.crop(spec['box']).convert('RGB'))
 filled=cv2.inpaint(target,m,3,cv2.INPAINT_TELEA)
 patch=patched[y0:y1,x0:x1]
 feather=np.asarray(Image.fromarray(m,'L').filter(ImageFilter.GaussianBlur(.7)),dtype=np.float32)/255
 patch[:,:,:3]=(filled*feather[:,:,None]+patch[:,:,:3]*(1-feather[:,:,None])).astype('uint8')
 # Original hair crossing close by intentionally remains and is not repainted.

browless=Image.fromarray(patched,'RGBA')
browless.save(WEB/'base_v07.png',optimize=True)
browless.save(WEB/'base_v07.webp',format='WEBP',quality=96,method=5)

# Build an editable 10-part OpenRaster from masks. ORA is working art, not a production PSD.
contents=[]
def layer(name,img,xy=(0,0),visible=True):
 canvas=Image.new('RGBA',(1024,1536));canvas.alpha_composite(img,xy)
 contents.append((name,canvas,visible))
layer('mouth · source',Image.open(WEB/'mouth.png').convert('RGBA'),(468,607))
for side in ('eye_right','eye_left'):
 x0,y0,x1,y1=boxes[side]
 layer(f'{side} · iris movable',Image.open(WEB/f'{side}_iris.png').convert('RGBA'),(x0,y0))
 layer(f'{side} · sclera and lashes',Image.open(WEB/f'{side}_sclera.png').convert('RGBA'),(x0,y0))
 layer(f'{side} · closed lid',Image.open(WEB/f'{side}_closed.png').convert('RGBA'),(x0,y0),False)
for side,spec in brows.items():layer(f'{side} · moving brow (prototype)',Image.open(WEB/f'{side}.png').convert('RGBA'),spec['box'][:2])
layer('base · eyebrows repainted (experimental)',browless)

output=OUT/'yuzuki-facial-prototype-v07.ora';xml=ET.Element('image',{'w':'1024','h':'1536','name':'Yuzuki V0.7 independently movable brow and iris prototype','version':'0.0.3'});stack=ET.SubElement(xml,'stack')
with zipfile.ZipFile(output,'w') as z:
 z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
 for i,(name,img,visible) in enumerate(contents):
  dest=f'data/layer{i:02}.png';buf=io.BytesIO();img.save(buf,'PNG',optimize=True)
  z.writestr(dest,buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=5)
  ET.SubElement(stack,'layer',{'name':name,'src':dest,'x':'0','y':'0','opacity':'1.0','visibility':'visible' if visible else 'hidden','composite-op':'svg:src-over'})
 z.writestr('stack.xml',ET.tostring(xml,encoding='utf-8',xml_declaration=True))
 # Full merged is reference original, not proof of exact compositing equality.
 b=io.BytesIO();original.save(b,'PNG');z.writestr('mergedimage.png',b.getvalue(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=3)
 b=io.BytesIO();original.resize((256,384)).save(b,'PNG');z.writestr('Thumbnails/thumbnail.png',b.getvalue())
metadata=json.loads((WEB/'rig.json').read_text(encoding='utf-8'))
metadata['version']='0.7.0';metadata['iris_centres']={side:list(irises[side][:2]) for side in irises};metadata['brow_boxes']={side:v['box'] for side,v in brows.items()};metadata['experimental_layers']=['base_v07.webp','eye_left_sclera.webp','eye_right_sclera.webp','eye_left_iris.webp','eye_right_iris.webp','brow_left.webp','brow_right.webp'];metadata['prototype_source']='assets/face-rig/yuzuki-facial-prototype-v07.ora';metadata['limitations']=['Brow line extraction is retouched from original; bang occlusion needs painter cleanup','Iris only moves 1-3px; no eye-geometry or Cubism warp','Not a Cubism PSD, Cubism .cmo3 or runtime .moc3']
(WEB/'rig.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('V0.7 generated', len(contents),'editable ORA layers + separate irises/brows/sclera; original unchanged.')
