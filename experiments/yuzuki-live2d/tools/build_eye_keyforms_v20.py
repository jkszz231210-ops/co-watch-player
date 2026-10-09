#!/usr/bin/env python3
"""V2.0: single-ink eyelid keyforms, sharp full-open identity and no doubled lashes.

These are still carefully parameterized RASTER DRAWING STUDIES. They are not a
replacement for manual eye artwork or Live2D Cubism mesh rigging.
"""
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_blink_v15 import EYES,CELL_W,CELL_H,frame as base_frame,apply_frame,smoothstep
from build_cubism_psd import encode_psd

APPROVED=Image.open(ROOT/'assets/source/yuzuki-front-a.png').convert('RGBA')
SIDES=tuple(EYES)
STEPS=[round(i/40,3) for i in range(41)]
OUT=ROOT/'assets/cubism-handoff/v2.0'
WEB=ROOT/'web/assets/face-rig/blink-v20'


def authored_ink(side: str, closing: float) -> np.ndarray:
    """One tapered lash stroke, not strokes painted twice on top of each other."""
    c=float(np.clip(closing,0,1)); spec=EYES[side]; x0,y0,x1,y1=spec['box']; w=x1-x0; h=y1-y0
    image=base_frame(side,c,draw_lash=False).copy()
    if c < .095: return image
    left=spec['upper'][0][0];right=spec['upper'][-1][0]
    vals=np.linspace(left,right,210)
    ys0=np.interp(vals,[p[0] for p in spec['upper']],[p[1] for p in spec['upper']])
    frac=np.clip((vals-left)/(right-left),0,1)
    closed=spec['closed_y']-spec['arch']*np.sin(np.pi*frac)
    shape=smoothstep(c)
    ys=ys0*(1-shape)+closed*shape
    strength=float(smoothstep((c-.095)/.42))
    scale=4
    layer=Image.new('RGBA',(w*scale,h*scale),(0,0,0,0))
    dr=ImageDraw.Draw(layer,'RGBA')
    # First lay down a faint warm fold, subtly displaced above the lash.
    for i in range(1,len(vals)):
        f0=np.sin(np.pi*frac[i-1])**.65; f1=np.sin(np.pi*frac[i])**.65
        fade=max(0,float((f0+f1)/2))
        if fade<.025:continue
        a=int(27*strength*fade)
        dr.line([((vals[i-1]-x0)*scale,(ys[i-1]-y0-6.5)*scale),
                 ((vals[i]-x0)*scale,(ys[i]-y0-6.5)*scale)],
                 fill=(157,116,131,a),width=max(1,int(scale*.65)))
    # Single warm-ink lash. Gentle nonuniform width, smoothly taper at corners.
    for i in range(1,len(vals)):
        f0=np.sin(np.pi*frac[i-1])**.55; f1=np.sin(np.pi*frac[i])**.55
        fade=max(0,float((f0+f1)/2))
        if fade<.01:continue
        alpha=int((95+90*strength)*strength*fade)
        width=max(1,round(scale*(.55+1.06*strength*fade)))
        dr.line([((vals[i-1]-x0)*scale,(ys[i-1]-y0)*scale),
                 ((vals[i]-x0)*scale,(ys[i]-y0)*scale)],
                 fill=(87,67,81,alpha),width=width)
    layer=layer.resize((w,h),Image.Resampling.LANCZOS)
    rgba=np.asarray(layer,dtype=np.float32)
    ia=rgba[:,:,3:4]/255
    original=image.astype(np.float32)
    oa=ia+original[:,:,3:4]/255*(1-ia)
    color=(rgba[:,:,:3]*ia+original[:,:,:3]*(original[:,:,3:4]/255)*(1-ia))/np.maximum(oa,1e-7)
    image=np.concatenate([color,np.clip(oa*255,0,255)],axis=2).clip(0,255).astype(np.uint8)
    return image


def composite(source,overlays):
    out=np.asarray(source.convert('RGB'),dtype=np.float32).copy()
    for side in SIDES: out=apply_frame(out,side,overlays[side])
    return Image.fromarray(np.uint8(np.clip(out,0,255)),'RGB')


def overlay_full_canvas(side,c):
    x0,y0,_,_=EYES[side]['box']
    layer=Image.new('RGBA',APPROVED.size,(0,0,0,0))
    layer.paste(Image.fromarray(authored_ink(side,c),'RGBA'),(x0,y0))
    return layer


def build():
    OUT.mkdir(parents=True,exist_ok=True);WEB.mkdir(parents=True,exist_ok=True)
    atlas=Image.new('RGBA',(len(STEPS)*CELL_W,CELL_H*len(SIDES)),(0,0,0,0))
    for row,side in enumerate(SIDES):
        for idx,c in enumerate(STEPS):
            atlas.paste(Image.fromarray(authored_ink(side,c),'RGBA'),(idx*CELL_W,row*CELL_H))
    atlas_file=WEB/'blink-atlas.webp'
    atlas.save(atlas_file,'WEBP',lossless=True,method=6)
    read=np.asarray(Image.open(atlas_file).convert('RGBA'))
    states={}
    for name,idx in [('open',0),('quarter',10),('half',20),('three-quarter',30),('closed',40)]:
        patch={}
        for row,side in enumerate(SIDES):
            x0,y0,x1,y1=EYES[side]['box'];w=x1-x0;h=y1-y0
            patch[side]=read[row*CELL_H:row*CELL_H+h,idx*CELL_W:idx*CELL_W+w]
        states[name]=composite(APPROVED,patch)
        states[name].save(OUT/f'key-{name}.png',optimize=True)
    assert np.array_equal(np.asarray(states['open']),np.asarray(APPROVED.convert('RGB')))
    layers=[]
    for name,degree in [('CLOSED',1),('HALF',.5),('QUARTER',.25)]:
        for side in reversed(SIDES):layers.append({'name':f'{side} | {name} | editable eye study [HIDDEN]','visible':False,'image':overlay_full_canvas(side,degree)})
    layers.extend([{'name':'APPROVED | original open eyes [VISIBLE]','visible':True,'image':APPROVED},
                   {'name':'REFERENCE | original [HIDDEN]','visible':False,'image':APPROVED}])
    psd=OUT/'yuzuki-single-ink-keyforms-v2.0.psd';encode_psd(layers,APPROVED,psd)
    # New-v-old comparison; use final exported sprites, never cached intermediate art.
    old=Image.open(ROOT/'assets/cubism-handoff/v1.9/key-half.png').convert('RGB')
    crop=(283,358,738,613);W=560;H=345
    samples=[('ORIGINAL / OPEN',APPROVED.convert('RGB')),('V1.9 / HALF',old),('V2.0 / 25%',states['quarter']),('V2.0 / HALF',states['half']),('V2.0 / CLOSED',states['closed'])]
    sheet=Image.new('RGB',(W*len(samples),H),(243,243,248));d=ImageDraw.Draw(sheet)
    for i,(label,pic) in enumerate(samples):
        sheet.paste(pic.crop(crop).resize((W,300),Image.Resampling.LANCZOS),(i*W,45))
        d.text((i*W+15,13),label,fill=(51,51,72))
    sheet.save(OUT/'eye-quality-compare-v2.0.jpg',quality=94)
    manifest={'version':'2.0','keyforms':['open','quarter','half','three-quarter','closed'],
      'atlas':str(atlas_file.relative_to(ROOT)),'states':STEPS,'cell':[CELL_W,CELL_H],
      'eyes':{s:{'box':EYES[s]['box'],'row':i} for i,s in enumerate(SIDES)},
      'original_sha256':hashlib.sha256((ROOT/'assets/source/yuzuki-front-a.png').read_bytes()).hexdigest(),
      'open_pixel_identical':True,'single_lash_stroke':True,'psd_layers':len(layers),
      'actual_cubism_model':False,'import_verified':False,
      'limitations':'Still parameterized raster studies; half/closed eyelids require artist review and Cubism deformation.'}
    (OUT/'manifest-v2.0.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (WEB/'manifest.json').write_text(json.dumps({'version':'2.0','states':STEPS,'cell':[CELL_W,CELL_H],
       'eyes':manifest['eyes']},ensure_ascii=False,indent=2),encoding='utf-8')
    return psd,atlas_file
if __name__=='__main__':print(build())
