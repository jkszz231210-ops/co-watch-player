#!/usr/bin/env python3
"""Extract non-destructive experimental facial layers from the user-approved image.

Output is an OpenRaster layer stack and transparent PNG patches, NOT finished
hand-painted PSD assets or a Cubism .moc3 model. No remote model required.
"""
from pathlib import Path
import io, json, zipfile, xml.etree.ElementTree as ET
import numpy as np
import cv2
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source/yuzuki-front-a.png'
OUT=ROOT/'web/assets/face-rig'
OUT.mkdir(parents=True,exist_ok=True)
IMAGE=Image.open(SOURCE).convert('RGBA')
W,H=IMAGE.size
# Each eye is a bounded artwork region; those patches can be warped separately.
REGIONS={
 'eye_left': {'box':[338,460,468,555],'ellipse':[337,466,470,550], 'blur':7},
 'eye_right':{'box':[551,435,695,540],'ellipse':[550,441,694,538], 'blur':7},
 'mouth':{'box':[468,607,564,656],'ellipse':[469,610,562,651], 'blur':5},
}
np_src=np.array(IMAGE.convert('RGB'))
mask_all=np.zeros((H,W),np.uint8)
patches={}
info={'canvas':[W,H],'source':'../source/yuzuki-front-a.png','regions':{},'status':'EXPERIMENTAL_AUTO_EXTRACTED_NOT_FINAL_PSD'}
for key,opt in REGIONS.items():
 x0,y0,x1,y1=opt['box']; a,b,c,d=opt['ellipse'];
 alpha=Image.new('L',(W,H),0);brush=ImageDraw.Draw(alpha)
 brush.ellipse([a,b,c,d],fill=255)
 alpha=alpha.filter(ImageFilter.GaussianBlur(opt['blur']))
 # Avoid unsafe inpaint outside targeted art feature. The mask is tighter than the visible feather.
 m=np.zeros_like(mask_all);cv2.ellipse(m,((a+c)//2,(b+d)//2),((c-a)//2-4,(d-b)//2-4),0,0,360,255,-1)
 mask_all=cv2.bitwise_or(mask_all,m)
 patch=IMAGE.copy();patch.putalpha(alpha)
 # Strip hidden RGB colour before storing sparse PNG layers. Visible pixels remain identical.
 packed=np.array(patch);packed[packed[:,:,3]==0,:3]=0;patch=Image.fromarray(packed,'RGBA')
 patch_crop=patch.crop((x0,y0,x1,y1));patch_crop.save(OUT/f'{key}.png',optimize=True)
 patches[key]=patch
 info['regions'][key]={'box':opt['box'],'centre':[(x0+x1)/2,(y0+y1)/2],'canvas_box':[a,b,c,d]}
# Mouth removal: small original line can be reconstructed by local inpaint.
# Eyes use a cheek-colour surrogate, not giant inpaint that drags black lashes
# into the hole. This experimental auto-retouch still needs an artist pass.
base=np_src.astype(np.float32).copy()
for key,opt in list(REGIONS.items())[:2]:
 a,b,c,d=opt['ellipse']; cx=(a+c)/2; cy=(b+d)/2
 x0=max(0,a-10);x1=min(W,c+11);y0=max(0,b-10);y1=min(H,d+11)
 yy,xx=np.mgrid[y0:y1,x0:x1].astype(np.float32)
 sx=np.clip(cx+.4*(xx-cx),0,W-1)
 sy=np.clip(cy+70+.14*(yy-cy),0,H-1)
 cheek=cv2.remap(np_src,sx,sy,cv2.INTER_CUBIC).astype(np.float32)
 cheek=cv2.GaussianBlur(cheek,(0,0),5)
 local_alpha=np.array(Image.fromarray(np.array(patches[key].getchannel('A'))[y0:y1,x0:x1]).filter(ImageFilter.GaussianBlur(2)),dtype=np.float32)/255
 local_alpha=local_alpha[...,None]
 base[y0:y1,x0:x1]=base[y0:y1,x0:x1]*(1-local_alpha)+cheek*local_alpha
mouth_mask=np.zeros_like(mask_all)
a,b,c,d=REGIONS['mouth']['ellipse']
cv2.ellipse(mouth_mask,((a+c)//2,(b+d)//2),((c-a)//2-4,(d-b)//2-4),0,0,360,255,-1)
base=cv2.inpaint(cv2.cvtColor(np.uint8(np.clip(base,0,255)),cv2.COLOR_RGB2BGR),mouth_mask,6,cv2.INPAINT_TELEA)
base_img=Image.fromarray(cv2.cvtColor(base,cv2.COLOR_BGR2RGB)).convert('RGBA')
base_img.save(OUT/'base.png',optimize=True)
(OUT/'rig.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Export an interoperable OpenRaster document with actual transparent image layers.
# Layers store canvas-size images; the .ora opens directly in Krita or GIMP.
ora=ROOT/'assets/face-rig/yuzuki-facial-prototype.ora'
ora.parent.mkdir(parents=True,exist_ok=True)
layer_sequence=[('Mouth · original artwork',patches['mouth']),('Right eye · original artwork',patches['eye_right']),('Left eye · original artwork',patches['eye_left']),('Retouched base · automatic inpaint',base_img)]
stack=ET.Element('image',{'version':'0.0.3','w':str(W),'h':str(H),'name':'Yuzuki - experimental face art'})
st=ET.SubElement(stack,'stack')
with zipfile.ZipFile(ora,'w') as z:
 z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
 for i,(label,im) in enumerate(layer_sequence):
  src=f'data/layer{i}.png';bio=io.BytesIO();im.save(bio,format='PNG');z.writestr(src,bio.getvalue());
  ET.SubElement(st,'layer',{'name':label,'src':src,'x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
 z.writestr('stack.xml',ET.tostring(stack,encoding='utf-8',xml_declaration=True))
 # composite should be base underneath overlays
 preview=base_img.copy()
 for k in ['eye_left','eye_right','mouth']:preview=Image.alpha_composite(preview,patches[k]);
 imgbio=io.BytesIO();preview.save(imgbio,format='PNG');z.writestr('mergedimage.png',imgbio.getvalue())
 thumb=preview.copy();thumb.thumbnail((256,256));imgbio=io.BytesIO();thumb.save(imgbio,format='PNG');z.writestr('Thumbnails/thumbnail.png',imgbio.getvalue())
preview.save(ROOT/'assets/face-rig/composite-reference.png')
# A reproducible quality baseline. Focus on the face because eye positions are tricky.
diff=np.mean(np.abs(np.array(preview.convert('RGB'),np.float32)-np_src))
print(json.dumps({'size':[W,H],'parts':list(REGIONS),'ora':str(ora),'pixel_mean_abs_error':round(float(diff),3),'output':str(OUT)},ensure_ascii=False))
