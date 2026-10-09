#!/usr/bin/env python3
"""Build eye-occlusion frames from approved original + clean underlying art.

Conservative raster prototype, not a Cubism model. Original artwork at open eye
is returned byte-identically by the renderer, and is never split/recomposed.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
OUT=WEB/'assets'/'face-rig'/'blink-v15'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=np.asarray(Image.open(WEB/'assets'/'yuzuki-front-a.webp').convert('RGB'),dtype=np.float32)
CLEAN=np.asarray(Image.open(WEB/'assets'/'face-rig'/'base_v07.png').convert('RGB'),dtype=np.float32)
EYES={
    'eye_left': {'box':[319,442,489,571],'upper':[(341,497),(364,483),(392,478),(419,483),(465,491)],'lower':[(341,518),(364,539),(392,545),(419,539),(465,516)],'closed_y':511,'arch':11},
    'eye_right':{'box':[536,414,713,563],'upper':[(552,484),(576,468),(613,459),(651,463),(687,470)],'lower':[(552,506),(576,527),(613,534),(651,527),(687,492)],'closed_y':496,'arch':10},
}
STEPS=[round(i/20,2) for i in range(21)]
CELL_W,CELL_H=192,160


def smoothstep(x):
    t=np.clip(x,0,1)
    return t*t*(3-2*t)


def skin_mask(spec):
    x0,y0,x1,y1=spec['box']
    original=SOURCE[y0:y1,x0:x1]
    clean=CLEAN[y0:y1,x0:x1]
    delta=np.max(np.abs(original-clean),axis=2)
    # The difference from the artist-accepted open-eye painting defines its
    # actual affected footprint. Include lashes; exclude most of the bangs.
    definite=np.uint8(delta>11)
    count, labels, stats, _=cv2.connectedComponentsWithStats(definite,8)
    if count>1:
        labels_to_keep=[i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]>200]
        footprint=np.isin(labels,labels_to_keep).astype(np.uint8)
    else:footprint=definite
    footprint=cv2.morphologyEx(footprint,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    # Filled external eye contour prevents bright iris islands leaking through
    # the fully closed lid (the previous model's unsettling 'dead eye' dots).
    contours,_=cv2.findContours(footprint,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    drawn=np.zeros_like(footprint)
    cv2.drawContours(drawn,[c for c in contours if cv2.contourArea(c)>90],-1,1,thickness=-1)
    footprint=cv2.dilate(drawn,np.ones((5,5),np.uint8),iterations=1)
    footprint=cv2.GaussianBlur(footprint.astype(np.float32),(0,0),2)
    return np.clip(footprint,0,1)


def line_curve(xx,pts):
    pts=np.array(pts,dtype=np.float32)
    return np.interp(xx,pts[:,0],pts[:,1])


def frame(side,c):
    spec=EYES[side];x0,y0,x1,y1=spec['box'];w,h=x1-x0,y1-y0
    rgba=np.zeros((h,w,4),dtype=np.uint8)
    if c==0:return rgba
    xx,yy=np.meshgrid(np.arange(x0,x1,dtype=np.float32),np.arange(y0,y1,dtype=np.float32))
    lo,hi=spec['upper'][0][0],spec['upper'][-1][0]
    u=np.clip((xx-lo)/max(hi-lo,1),0,1)
    center=spec['closed_y']-spec['arch']*np.sin(np.pi*u)
    upper0=line_curve(xx,spec['upper'])
    lower0=line_curve(xx,spec['lower'])
    # Eyelids approach a shared crease. Eye textures are *masked*, never scaled.
    eased=smoothstep(c)
    top=upper0*(1-eased)+center*eased
    bottom=lower0*(1-eased)+center*eased
    feather=2.1
    aperture=smoothstep((yy-top)/feather)*smoothstep((bottom-yy)/feather)
    # Keep the original image untouched outside actual eye/eyelash pixels.
    original_footprint=skin_mask(spec)
    # Full replacement within occluded area eliminates doubled original lashes.
    # The alpha ramps in the first few percent to avoid abrupt eye-outline jumps.
    mask=original_footprint*(1-aperture)*smoothstep(c/.18)
    # When almost fully closed, also cover a little under-ink surrounding the lid.
    if c>.75:
        mask=np.maximum(mask,original_footprint*smoothstep((c-.75)/.20))
    rgba[:,:,:3]=np.uint8(np.clip(CLEAN[y0:y1,x0:x1],0,255))
    rgba[:,:,3]=np.uint8(np.clip(mask*255,0,255))
    # Supersampled tapered eyeliner, placed on the animated upper boundary.
    S=4
    ink=Image.new('RGBA',(w*S,h*S),(0,0,0,0));brush=ImageDraw.Draw(ink,'RGBA')
    vals=np.linspace(lo,hi,200)
    yy_top=line_curve(vals,spec['upper'])*(1-eased)+(spec['closed_y']-spec['arch']*np.sin(np.pi*np.clip((vals-lo)/(hi-lo),0,1)))*eased
    positions=[((float(x)-x0)*S,(float(y)-y0)*S) for x,y in zip(vals,yy_top)]
    # No new line at the open state: existing real lash contours already look good.
    strength=float(smoothstep((c-.16)/.34))
    if strength>.001:
        brush.line(positions,fill=(101,73,90,int(186*strength)),width=max(2,round((1.45+1.0*c)*S)),joint='curve')
        if c>.75:
            s=(c-.75)/.25
            vals2=vals[15:-15]
            coords=[((float(x)-x0)*S,(float(y)-y0-10)*S) for x,y in zip(vals2,yy_top[15:-15])]
            brush.line(coords,fill=(165,111,130,int(35*s)),width=S)
    ink=np.asarray(ink.resize((w,h),Image.Resampling.LANCZOS)).astype(np.float32)
    # Porter-Duff over compositor for editable RGBA sprite output.
    ia=ink[:,:,3]/255;pa=rgba[:,:,3].astype(np.float32)/255
    oa=ia+pa*(1-ia)
    safe=np.maximum(oa,1e-7)
    out=(ink[:,:,:3]*ia[:,:,None]+rgba[:,:,:3].astype(np.float32)*pa[:,:,None]*(1-ia[:,:,None]))/safe[:,:,None]
    rgba[:,:,:3]=np.uint8(np.clip(out,0,255))
    rgba[:,:,3]=np.uint8(np.clip(oa*255,0,255))
    return rgba


def apply_frame(source,side,rgba):
    x0,y0,x1,y1=EYES[side]['box']
    a=rgba[:,:,3:4].astype(np.float32)/255
    output=source.copy()
    output[y0:y1,x0:x1]=output[y0:y1,x0:x1]*(1-a)+rgba[:,:,:3].astype(np.float32)*a
    return output


def build():
    all_frames={side:[] for side in EYES}
    for side in EYES:
        for c in STEPS:
            all_frames[side].append(frame(side,c))
    atlas=Image.new('RGBA',(CELL_W*len(STEPS),CELL_H*len(EYES)),(0,0,0,0))
    for row,(side,frames) in enumerate(all_frames.items()):
        for index,arr in enumerate(frames):
            atlas.paste(Image.fromarray(arr,'RGBA'),(index*CELL_W,row*CELL_H))
    atlas.save(OUT/'blink-atlas.webp',format='WEBP',lossless=True)
    manifest={'version':'1.5.0','states':STEPS,'cell':[CELL_W,CELL_H], 'eyes':{side:{'box':spec['box'],'row':i} for i,(side,spec) in enumerate(EYES.items())}}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    # Render QA from exactly the exported atlas, not in-memory draft layers.
    readback=np.asarray(Image.open(OUT/'blink-atlas.webp').convert('RGBA'))
    def rendered(c):
        idx=round(c*20)
        result=SOURCE.copy()
        for row,(side,spec) in enumerate(EYES.items()):
            box=spec['box']; w,h=box[2]-box[0],box[3]-box[1]
            patch=readback[row*CELL_H:row*CELL_H+h,idx*CELL_W:idx*CELL_W+w]
            result=apply_frame(result,side,patch)
        return Image.fromarray(np.uint8(np.clip(result,0,255)))
    chosen=[0,.15,.35,.5,.7,.85,1]
    W=490;H=315
    sheet=Image.new('RGB',(W*len(chosen),H),(248,247,250));d=ImageDraw.Draw(sheet)
    for j,c in enumerate(chosen):
        cropped=rendered(c).crop((285,355,742,615)).resize((W,279),Image.Resampling.LANCZOS)
        sheet.paste(cropped,(j*W,36));d.text((j*W+13,12),f'V1.5 / {round(c*100)}% CLOSED',fill=(62,54,71))
    out=ROOT/'assets'/'face-rig'/'qa-eyes-v15.jpg';sheet.save(out,quality=93)
    sequence=[0]*10+[.15,.35,.5,.7,.85,1,1,.85,.7,.5,.35,.15]+[0]*13
    frames=[rendered(c).crop((285,355,742,615)).resize((640,363),Image.Resampling.LANCZOS) for c in sequence]
    frames[0].save(ROOT/'assets'/'face-rig'/'yuzuki-blink-v15.gif',save_all=True,append_images=frames[1:],duration=[90]*len(sequence),loop=0,optimize=True)
    print(f'V1.5 created {len(STEPS)} states x 2 eyes, atlas={atlas.size}, QA={out.name}')
    return out

if __name__=='__main__':build()
