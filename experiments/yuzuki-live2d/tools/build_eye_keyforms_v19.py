#!/usr/bin/env python3
"""Yuzuki V1.9: editable open / half / closed eye keyforms, plus web atlas.

Safeguards: the artist-approved open frame is untouched; generated middle/closed
frames are annotated as *raster studies*, not a Cubism rig or artist repaint.
This script makes manually adjustable 3-pose layers and consistent web sprites.
"""
from __future__ import annotations
import json, hashlib, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from build_blink_v15 import EYES, CELL_W, CELL_H, SOURCE, frame as old_frame, apply_frame, smoothstep
from build_cubism_psd import encode_psd

OUT=ROOT/'assets/cubism-handoff/v1.9'
WEB=ROOT/'web/assets/face-rig/blink-v19'
SRC=ROOT/'assets/source/yuzuki-front-a.png'
APPROVED=Image.open(SRC).convert('RGBA')
SIDES=list(EYES)
STEPS=[round(i/20,2) for i in range(21)]


def tuned_art(side, closure: float):
    """Refine the upper-lash stroke over the validated V1.5 occlusion frame.

    Reusable/adjustable curves are parameterized in source-picture pixels;
    not a raster face extract. The lash is a single tapered hand-authored stroke.
    """
    c=float(np.clip(closure,0,1))
    rgba=old_frame(side,c)
    if c < .27: return rgba
    spec=EYES[side]
    x0,y0,x1,y1=spec['box']; w=x1-x0; h=y1-y0
    left=spec['upper'][0][0];right=spec['upper'][-1][0]
    values=np.linspace(left+1,right-1,260)
    original=np.interp(values,[p[0] for p in spec['upper']],[p[1] for p in spec['upper']])
    center=spec['closed_y']-spec['arch']*np.sin(np.pi*(values-left)/(right-left))
    eased=smoothstep(c)
    top=original*(1-eased)+center*eased
    strength=smoothstep((c-.27)/.44)
    scale=4
    extra=Image.new('RGBA',(w*scale,h*scale),(0,0,0,0))
    d=ImageDraw.Draw(extra)
    # A very thin upper lash, tapered at corners; warm gray ink like the source.
    for i in range(1,len(values)):
        x=(values[i]-left)/(right-left)
        fade=min(1,x/.10,(1-x)/.10)
        fade=max(0,fade)
        a=int((28+89*strength)*fade)
        width=max(1,int(round(scale*(.65+1.15*strength*fade))))
        d.line([((values[i-1]-x0)*scale,(top[i-1]-y0)*scale),
                ((values[i]-x0)*scale,(top[i]-y0)*scale)],fill=(74,55,69,a),width=width)
    # Warm crease shadow above the fold; keep it much lighter than the lash.
    if c>.62:
        crease_strength=smoothstep((c-.62)/.38)
        for i in range(1,len(values)-1):
            x=(values[i]-left)/(right-left)
            fade=max(0,min(1,x/.13,(1-x)/.13))
            a=int(21*crease_strength*fade)
            if a:
                lift=8.0+2.0*np.sin(np.pi*x)
                d.line([((values[i-1]-x0)*scale,(top[i-1]-y0-lift)*scale),
                        ((values[i]-x0)*scale,(top[i]-y0-lift)*scale)],
                       fill=(154,99,112,a),width=scale)
    extra=extra.resize((w,h),Image.Resampling.LANCZOS)
    dst=Image.fromarray(rgba,'RGBA')
    dst.alpha_composite(extra)
    return np.asarray(dst,dtype=np.uint8)


def apply_sprites(source: Image.Image, frames: dict):
    out=np.asarray(source.convert('RGB'),dtype=np.float32).copy()
    for side in SIDES:
        out=apply_frame(out,side,frames[side])
    return Image.fromarray(np.uint8(np.clip(out,0,255)),'RGB')


def extract_overlay(side, closure):
    """Cropped painted PNG area in full-canvas coordinates (for layer editing)."""
    x0,y0,x1,y1=EYES[side]['box']
    overlay=Image.new('RGBA',APPROVED.size,(0,0,0,0))
    overlay.paste(Image.fromarray(tuned_art(side,closure),'RGBA'),(x0,y0))
    return overlay


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    WEB.mkdir(parents=True,exist_ok=True)
    atlas=Image.new('RGBA',(len(STEPS)*CELL_W,CELL_H*len(SIDES)),(0,0,0,0))
    for i,side in enumerate(SIDES):
        for idx,c in enumerate(STEPS):
            frame=tuned_art(side,c)
            atlas.paste(Image.fromarray(frame,'RGBA'),(idx*CELL_W,i*CELL_H))
    atlas_path=WEB/'blink-atlas.webp'
    atlas.save(atlas_path,'WEBP',lossless=True,method=6)
    # Check what will actually be delivered, not only data in RAM.
    readback=np.asarray(Image.open(atlas_path).convert('RGBA'))
    states={}
    for label,index in [('open',0),('half',10),('closed',20)]:
        patches={}
        for row,side in enumerate(SIDES):
            x0,y0,x1,y1=EYES[side]['box']
            patches[side]=readback[row*CELL_H:row*CELL_H+y1-y0,index*CELL_W:index*CELL_W+x1-x0]
        output=apply_sprites(APPROVED,patches)
        output.save(OUT/f'key-{label}.png',optimize=True)
        states[label]=output
    # Preserve the approved portrait as fully pixel-identical rest art.
    assert np.array_equal(np.asarray(APPROVED.convert('RGB')),np.asarray(states['open']))
    # PSD layers: original art as visible background; two per-pose transparent
    # overlays hidden by default, thus no scary floating duplicate eye.
    layers=[]
    for label,c in [('closed',1.0),('half',.5)]:
        for side in SIDES[::-1]:
            name=f'{side.upper()} | {label.upper()} | transparent pose draft [hidden]'
            layers.append({'name':name,'visible':False,'image':extract_overlay(side,c)})
    # Image underpaint / isolated iris etc from V1.8 can still be opened in its
    # own PSD; keep this pose PSD narrowly scoped and easy to review.
    layers.append({'name':'APPROVED ORIGINAL | open pose | visible','visible':True,'image':APPROVED})
    layers.append({'name':'REFERENCE LOCKED | approved source [hidden]','visible':False,'image':APPROVED})
    psd=OUT/'yuzuki-eye-keyforms-v1.9.psd'
    encode_psd(layers,APPROVED,psd)
    # QA gallery and old-v-new half eye comparison; all screenshots are real composites.
    original=APPROVED.convert('RGB')
    oldhalf=apply_sprites(APPROVED,{s:old_frame(s,.5) for s in SIDES})
    cols=[('APPROVED / OPEN',original),('V1.5 / HALF',oldhalf),('V1.9 / HALF',states['half']),('V1.9 / CLOSED',states['closed'])]
    W,H=560,340
    gallery=Image.new('RGB',(W*4,H),(244,243,250))
    d=ImageDraw.Draw(gallery)
    crop=(283,358,738,613)
    for i,(label,pic) in enumerate(cols):
        gallery.paste(pic.crop(crop).resize((W,288),Image.Resampling.LANCZOS),(i*W,52))
        d.text((i*W+18,17),label,fill=(49,55,78))
    qa=OUT/'yuzuki-three-keyforms-v1.9.jpg'
    gallery.save(qa,quality=94)
    # Transparent full-sized individual PNG frames facilitate artist refinements.
    # Encode sprites from reloaded atlas, not in-memory estimates.
    for side in SIDES:
        for label,c in [('half',.5),('closed',1.0)]:
            extract_overlay(side,c).save(OUT/f'{side}-{label}-overlay.png',optimize=True)
    manifest={'version':'1.9','character':'Yuzuki','source':str(SRC.relative_to(ROOT)),
        'approved_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
        'psd':psd.name,'pose_layers':4,'total_psd_layers':6,
        'poses':['open','half','closed'],'atlas':str(atlas_path.relative_to(ROOT)),
        'atlas_size':list(atlas.size),'frames':len(STEPS),'states':STEPS,
        'pixel_identical_open':True,'actual_cubism_model':False,'cubism_import_verified':False,
        'limitation':'Half/closed eyelids are refined algorithmic artwork studies, not professionally hand-drawn keyforms; must be artist-approved before Cubism rig.'}
    (OUT/'manifest-v1.9.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (WEB/'manifest.json').write_text(json.dumps({'version':'1.9','states':STEPS,'cell':[CELL_W,CELL_H],
        'eyes':{s:{'box':EYES[s]['box'],'row':i} for i,s in enumerate(SIDES)}},indent=2),encoding='utf-8')
    return {'psd':str(psd),'layer_count':len(layers),'preview':str(qa),'atlas_size':list(atlas.size),'bytes':psd.stat().st_size}

if __name__=='__main__':print(json.dumps(build(),ensure_ascii=False,indent=2))
