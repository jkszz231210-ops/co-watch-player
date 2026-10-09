#!/usr/bin/env python3
"""Small independent-eye layer generator: first build_face_rig.py, then this script.
Source OpenRaster from V0.4 is required; this is experimental raster art, not Cubism.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import io,zipfile,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
W=R/'web/assets/face-rig'
SRC=R/'assets/face-rig/yuzuki-facial-prototype.ora'
PARAM={'eye_left':((338,460,468,555),[(347,503),(380,509),(426,511),(458,502)]),
       'eye_right':((551,435,695,540),[(556,484),(591,491),(648,492),(683,482)])}
def points(v,n=45):
 a,b,c,d=v
 for i in range(n+1):
  t=i/n;q=1-t
  yield tuple(round(q**3*a[k]+3*q*q*t*b[k]+3*q*t*t*c[k]+t**3*d[k]) for k in range(2))
assets={}
for key,(rect,curve) in PARAM.items():
 x,y,x1,y1=rect;w=x1-x;h=y1-y
 im=Image.new('RGBA',(w,h));dr=ImageDraw.Draw(im)
 local=[(a-x,b-y) for a,b in curve]
 dr.line(list(points(local)),fill=(107,81,94,209),width=2,joint='curve')
 im.save(W/(key+'_closed.png'))
 im.save(W/(key+'_closed.webp'),format='WEBP',quality=95)
 full=Image.new('RGBA',(1024,1536));full.alpha_composite(im,(x,y));assets[key]=full
if not SRC.is_file():raise SystemExit('Run python tools/build_face_rig.py first')
dest=R/'assets/face-rig/yuzuki-facial-prototype-v06.ora'
with zipfile.ZipFile(SRC) as source,zipfile.ZipFile(dest,'w') as out:
 out.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
 doc=ET.fromstring(source.read('stack.xml'));stack=doc.find('stack')
 for i,(key,image) in enumerate(assets.items()):
  b=io.BytesIO();image.save(b,format='PNG',optimize=True);p=f'data/eyelid_{i}.png';out.writestr(p,b.getvalue())
  ET.SubElement(stack,'layer',{'name':key+' closed eyelid','src':p,'x':'0','y':'0','opacity':'1','visibility':'hidden','composite-op':'svg:src-over'})
 for n in source.namelist():
  if n not in ('mimetype','stack.xml'):out.writestr(n,source.read(n))
 out.writestr('stack.xml',ET.tostring(doc,encoding='utf-8',xml_declaration=True))
print(dest)
