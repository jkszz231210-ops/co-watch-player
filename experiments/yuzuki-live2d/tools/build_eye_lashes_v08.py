#!/usr/bin/env python3
"""Make preserved painted eyelash foreground strips and a 12-layer .ora.

This merely segments the existing illustration. It cannot create hidden painted anatomy.
Never treat the ORA as a Cubism-ready PSD or a finished mesh model.
"""
from pathlib import Path
import json, io, zipfile, xml.etree.ElementTree as ET
from PIL import Image, ImageFilter
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/assets/face-rig'
OUT=ROOT/'assets/face-rig'
BOXES={'eye_left':(338,460,468,555),'eye_right':(551,435,695,540)}
# Upper/lower stroke bands. The alpha is feathered at the transition, so there
# is no hard rectangular seam when the gaze tracks a few pixels.
EDGE={'eye_left':(475,493,520,539),'eye_right':(446,465,501,527)}
for side,box in BOXES.items():
    source=Image.open(WEB/f'{side}.png').convert('RGBA')
    height,width=source.height,source.width
    top0,top1,bottom0,bottom1=EDGE[side]
    yy=np.arange(box[1],box[3],dtype=float)[:,None]
    # Keep upper eyelashes and fine line intact, with gradual falloff toward iris.
    upper=np.clip((top1-yy)/max(1,(top1-top0)),0,1)
    lower=np.clip((yy-bottom0)/max(1,(bottom1-bottom0)),0,1)*.65
    alpha=np.maximum(upper,lower)
    a=np.array(source,dtype=np.uint8)
    a[:,:,3]=(a[:,:,3].astype(np.float32)*alpha).astype(np.uint8)
    painted=Image.fromarray(a,'RGBA')
    painted.save(WEB/f'{side}_lashes.png',optimize=True)
    painted.save(WEB/f'{side}_lashes.webp',format='WEBP',lossless=True,method=5)

# Preserve original v07 project. Include duplicate lash layers as named independent
# editable artwork in the v08 composite for continued hand painting.
layers=[]
def layer(name,img,xy=(0,0),visible=True):
    canvas=Image.new('RGBA',(1024,1536));canvas.alpha_composite(img,xy)
    layers.append((name,canvas,visible))
layer('mouth · source painted',Image.open(WEB/'mouth.png').convert('RGBA'),(468,607))
for side in ('eye_right','eye_left'):
    box=BOXES[side]
    layer(f'{side} · eyelashes foreground',Image.open(WEB/f'{side}_lashes.png').convert('RGBA'),box[:2])
    layer(f'{side} · iris movable',Image.open(WEB/f'{side}_iris.png').convert('RGBA'),box[:2])
    layer(f'{side} · sclera static',Image.open(WEB/f'{side}_sclera.png').convert('RGBA'),box[:2])
    layer(f'{side} · closed lid (hidden default)',Image.open(WEB/f'{side}_closed.png').convert('RGBA'),box[:2],False)
for side,point in [('brow_left',(306,398)),('brow_right',(548,381))]:
    layer(f'{side} · traced brow (experimental)',Image.open(WEB/f'{side}.png').convert('RGBA'),point)
layer('base · inpainted reference',Image.open(WEB/'base_v07.png').convert('RGBA'))
assert len(layers)==12
ora=OUT/'yuzuki-facial-prototype-v08.ora'
root=ET.Element('image',{'w':'1024','h':'1536','name':'Yuzuki V0.8 eyelash and iris layers; not Cubism PSD','version':'0.0.3'})
stack=ET.SubElement(root,'stack')
with zipfile.ZipFile(ora,'w') as z:
    z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
    for n,(name,pic,visible) in enumerate(layers):
        path=f'data/layer{n:02d}.png';buff=io.BytesIO();pic.save(buff,'PNG',optimize=True)
        z.writestr(path,buff.getvalue(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=5)
        ET.SubElement(stack,'layer',{'name':name,'src':path,'x':'0','y':'0','opacity':'1.0','visibility':'visible' if visible else 'hidden','composite-op':'svg:src-over'})
    z.writestr('stack.xml',ET.tostring(root,encoding='utf-8',xml_declaration=True))
    orig=Image.open(ROOT/'assets/source/yuzuki-front-a.png').convert('RGBA')
    buff=io.BytesIO();orig.save(buff,'PNG')
    z.writestr('mergedimage.png',buff.getvalue(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=3)
    buff=io.BytesIO();orig.resize((256,384)).save(buff,'PNG')
    z.writestr('Thumbnails/thumbnail.png',buff.getvalue())
rigpath=WEB/'rig.json'
rig=json.loads(rigpath.read_text(encoding='utf-8'))
rig['version']='0.8.0'
rig['prototype_source']='assets/face-rig/yuzuki-facial-prototype-v08.ora'
rig['eyelash_foreground']={side:f'{side}_lashes.webp' for side in BOXES}
rig['blink_method']='Unscaled eye sprites + cubic bezier lid aperture + hidden closed-line artwork'
rig['limitations']=['Painted eyelashes are extracted from source, not hand-repainted geometry','No high-quality eye occlusion at extreme glances; gaze limited to <=3px','Only slight 2D lean, not head XY rotation or Cubism deformers','No Cubism PSD, .cmo3, or .moc3']
rigpath.write_text(json.dumps(rig,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Exported',ora,'layers',len(layers),'eye foreground artwork',len(BOXES))
