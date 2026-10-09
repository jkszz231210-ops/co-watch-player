#!/usr/bin/env python3
"""Export editable 14-layer OpenRaster from the user-approved face asset.

This remains an experimental art handoff, not a production-ready .PSD or Cubism .cmo3.
"""
from pathlib import Path
import json,io,zipfile,xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/assets/face-rig'; OUT=ROOT/'assets/face-rig'
BOX={'eye_left':(338,460),'eye_right':(551,435)}
LAYERS=[]
def add(name,src,pos=(0,0),visible=True):
    pic=Image.new('RGBA',(1024,1536));pic.alpha_composite(Image.open(WEB/src).convert('RGBA'),pos)
    LAYERS.append((name,pic,visible))
add('mouth · painted source','mouth.png',(468,607))
for side in ('eye_right','eye_left'):
    pos=BOX[side]
    add(f'{side} · soft closed lid art (hidden)',f'{side}_soft_closed.png',pos,False)
    add(f'{side} · transitional fold (hidden)',f'{side}_fold.png',pos,False)
    add(f'{side} · original lashes',f'{side}_lashes.png',pos)
    add(f'{side} · iris isolated',f'{side}_iris.png',pos)
    add(f'{side} · sclera isolated',f'{side}_sclera.png',pos)
for side,pos in [('brow_right',(548,381)),('brow_left',(306,398))]:
    add(f'{side} · preliminary painted line',f'{side}.png',pos)
add('base · retouched original reference','base_v07.png')
assert len(LAYERS)==14
out=OUT/'yuzuki-facial-prototype-v09.ora'
root=ET.Element('image',{'w':'1024','h':'1536','name':'Yuzuki 0.9 facial study; not final PSD','version':'0.0.3'})
stack=ET.SubElement(root,'stack')
with zipfile.ZipFile(out,'w') as z:
    z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
    for n,(name,pic,visible) in enumerate(LAYERS):
        path=f'data/layer{n:02d}.png';buf=io.BytesIO();pic.save(buf,'PNG',optimize=True)
        z.writestr(path,buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=5)
        ET.SubElement(stack,'layer',{'name':name,'src':path,'x':'0','y':'0','opacity':'1.0','visibility':'visible' if visible else 'hidden','composite-op':'svg:src-over'})
    original=Image.open(ROOT/'assets/source/yuzuki-front-a.png').convert('RGBA')
    buf=io.BytesIO();original.save(buf,'PNG');z.writestr('mergedimage.png',buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=3)
    buf=io.BytesIO();original.resize((256,384)).save(buf,'PNG');z.writestr('Thumbnails/thumbnail.png',buf.getvalue())
    z.writestr('stack.xml',ET.tostring(root,encoding='utf-8',xml_declaration=True))
rigfile=WEB/'rig.json';rig=json.loads(rigfile.read_text(encoding='utf-8'))
rig.update(version='0.9.0',prototype_source='assets/face-rig/yuzuki-facial-prototype-v09.ora',lid_art='2 softly repainted shut-eyes, plus independent crease art',idle_control='slow interpolated expressions + bounded stationary saccades')
rig['limitations']=['Automatically repaired/segmented eyes still need an illustrator to rework extreme expression shapes','Canvas animation with art overlay only, not Cubism geometry or head XY turn','No independently hand-painted hidden areas beyond the repaired facial reference','No official PSD, .cmo3 or .moc3']
rigfile.write_text(json.dumps(rig,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('V0.9 ORA:',out,'layers',len(LAYERS))
