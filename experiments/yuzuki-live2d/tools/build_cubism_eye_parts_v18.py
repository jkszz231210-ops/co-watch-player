#!/usr/bin/env python3
"""V1.8 experimental decomposition of approved-eye artwork into editable PSD layers.

This is an ART PREPARATION STUDY, not a finished or Cubism-import-certified model.
The approved front portrait is reproduced exactly at rest. The underlying iris
and lash underpainting is algorithmic, so animated movement is not production
ready without independent hand-painting and checking in Cubism.
"""
from __future__ import annotations
import hashlib
import json
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_cubism_eye_psd import assemble, make_closed_studies, EYES
from build_cubism_psd import encode_psd
SRC=ROOT/'assets/source/yuzuki-front-a.png'
OUT=ROOT/'assets/cubism-handoff'
# Original eye/iris shapes were measured individually from the approved picture;
# not mirror images. Eye_L / Eye_R are canvas-left and canvas-right.
IRISES={'eye_left':(402,502,29,36),'eye_right':(609,486,34,34)}
LASH_LINES={
 'eye_left':[(337,502),(350,487),(366,480),(384,477),(403,478),(424,482),(445,489),(467,497)],
 'eye_right':[(552,486),(563,470),(582,461),(604,457),(624,456),(645,459),(664,464),(688,480)],
}
SIDES=('eye_left','eye_right')

def alpha_sprite(pixels:np.ndarray,mask:np.ndarray)->Image.Image:
    arr=np.dstack((pixels,mask)).astype('uint8')
    return Image.fromarray(arr,'RGBA')

def channel_masks(side:str,coverage:np.ndarray)->tuple[np.ndarray,np.ndarray]:
    h,w=coverage.shape
    x,y,rx,ry=IRISES[side]
    eye=np.zeros((h,w),dtype=np.uint8)
    cv2.ellipse(eye,(x,y),(rx,ry),0,0,360,255,-1,cv2.LINE_AA)
    # Restrict to the eye patch but keep the iris edge soft where hair overlaps.
    eye=cv2.bitwise_and(eye,coverage)
    # A 1-pixel blended ring improves movement appearance. The base is
    # modified ONLY beneath the fully opaque portion to preserve rest pixels.
    iris=cv2.GaussianBlur(eye,(3,3),.55)
    lash=np.zeros((h,w),dtype=np.uint8)
    pts=np.array(LASH_LINES[side],dtype=np.int32).reshape(-1,1,2)
    cv2.polylines(lash,[pts],False,255,9,lineType=cv2.LINE_AA)
    lash=cv2.GaussianBlur(lash,(3,3),.55)
    lash=cv2.bitwise_and(lash,coverage)
    return iris,lash

def rebuild(source:Image.Image):
    approved=source.convert('RGBA')
    face_base,eye_patches,old_composite,masks=assemble(approved)
    if old_composite.tobytes()!=approved.tobytes():
        raise AssertionError('V1.7 source must compose exactly to the approved art')
    orig=np.asarray(approved.convert('RGB')).copy()
    parts={}
    iris_masks={}
    lash_masks={}
    for side in SIDES:
        eye_alpha=masks[side]['alpha']
        iris,lash=channel_masks(side,eye_alpha)
        iris_masks[side],lash_masks[side]=iris,lash
        # Underpaint separately on ONLY pixels fully covered by upper layers.
        # The feather boundary is deliberately untouched for exact fidelity
        # when all layers are in their rest positions.
        matte=np.where((iris>=254)|(lash>=254),255,0).astype('uint8')
        inpaint=cv2.inpaint(orig,matte,4,cv2.INPAINT_TELEA)
        # Telea inpainting across a large saturated iris creates radial
        # spokes that look like an empty eye socket. Paint a neutral sclera
        # gradient in that interior instead; retain original linework around
        # the iris. This is a safe STAGING underpaint, not final animation art.
        _,cy,_,ry=IRISES[side]
        yy=np.arange(orig.shape[0],dtype=np.float32)[:,None,None]
        top=np.array([213,200,208],dtype=np.float32)[None,None,:]
        mid=np.array([240,229,232],dtype=np.float32)[None,None,:]
        bot=np.array([242,230,232],dtype=np.float32)[None,None,:]
        t=np.clip((yy-(cy-ry))/(2*ry),0,1)
        gradient=np.where(t<.55,top+(mid-top)*np.minimum(1,t/.55),mid+(bot-mid)*np.maximum(0,(t-.55)/.45))
        gradient=np.broadcast_to(gradient,orig.shape).astype(np.uint8)
        underpaint=np.where(((iris>=254)&(lash<254))[:,:,None],gradient,inpaint)
        scene=np.where(matte[:,:,None]==255,underpaint,orig)
        parts[side]={
          'eye_scene':alpha_sprite(scene,eye_alpha),
          'iris':alpha_sprite(orig,iris),
          'upper_ink':alpha_sprite(orig,lash),
        }
    merged=face_base.copy()
    for side in SIDES:
        for name in ['eye_scene','iris','upper_ink']:
            merged=Image.alpha_composite(merged,parts[side][name])
    diff=np.abs(np.asarray(merged.convert('RGB'),dtype=np.int16)-np.asarray(approved.convert('RGB'),dtype=np.int16))
    stats={'rgb_mae':float(diff.mean()),'pixels_changed_gt_2':int(np.count_nonzero(diff.max(axis=2)>2)),
           'max_channel_difference':int(diff.max())}
    return approved,face_base,parts,masks,merged,stats,iris_masks,lash_masks

def make(output_dir:Path=OUT):
    output_dir.mkdir(parents=True,exist_ok=True)
    with Image.open(SRC) as f: original=f.convert('RGBA')
    approved,base,parts,masks,merged,stats,iris_masks,lash_masks=rebuild(original)
    if stats['pixels_changed_gt_2'] or stats['rgb_mae']>.002:
        raise AssertionError('Rest appearance drifted: '+str(stats))
    closed=make_closed_studies(original,masks)
    layers=[]
    # PSD layer array is top-to-bottom, with right-side eye closer to top.
    for side in ('eye_right','eye_left'):
        tag='R' if side=='eye_right' else 'L'
        layers.extend([
           {'name':f'{tag} UPPER EYELINER | study visible','image':parts[side]['upper_ink'],'visible':True},
           {'name':f'{tag} IRIS + HIGHLIGHTS | study visible','image':parts[side]['iris'],'visible':True},
           {'name':f'{tag} EYE WHITE + LOWER EYELID | study visible','image':parts[side]['eye_scene'],'visible':True},
           {'name':f'{tag} CLOSED EYE DRAFT | hidden','image':closed[side],'visible':False},
        ])
    layers.extend([
       {'name':'FACE | inpainted under both eyes','image':base,'visible':True},
       {'name':'REFERENCE ORIGINAL | hidden','image':original,'visible':False},
    ])
    psd=output_dir/'yuzuki-eye-components-v1.8.psd'
    encode_psd(layers,merged,psd)
    for side in SIDES:
        for name,art in parts[side].items():
            art.save(output_dir/f'{side}-{name}-v1.8.png',optimize=True)
    # Generate an evidence sheet. Iris shift is a *stress test*; exposed
    # inpainting artifacts demonstrate the remaining manual painting needed.
    region=(285,393,737,580)
    translated=base.copy()
    for side in SIDES:
        scene=parts[side]['eye_scene']
        translated=Image.alpha_composite(translated,scene)
        ir=parts[side]['iris']
        # Shift at most 3 px to expose edge quality without overstating motion.
        ox=2 if side=='eye_left' else -2
        shifted=Image.new('RGBA',original.size)
        shifted.alpha_composite(ir,(ox,0))
        translated=Image.alpha_composite(translated,shifted)
        translated=Image.alpha_composite(translated,parts[side]['upper_ink'])
    # Show independent matte coverage over the normal face. This is more
    # useful to a binder than an alarming "empty sockets" intermediary.
    matte_preview=approved.convert('RGBA')
    ta=np.zeros((original.height,original.width,4),dtype=np.uint8)
    for side in SIDES:
        ismask=iris_masks[side].astype('float32') / 255
        lashmask=lash_masks[side].astype('float32') / 255
        strength=np.maximum(ismask*.42,lashmask*.55)
        new=np.zeros_like(ta)
        new[:,:,:3]=[73,177,229]
        new[:,:,3]=np.clip(strength*255,0,255).astype('uint8')
        top=np.zeros_like(ta);top[:,:,:3]=[204,96,175]
        top[:,:,3]=np.clip(lashmask*.50*255,0,255).astype('uint8')
        matte_preview=Image.alpha_composite(matte_preview,Image.fromarray(new,'RGBA'))
        matte_preview=Image.alpha_composite(matte_preview,Image.fromarray(top,'RGBA'))
    views=[('APPROVED ORIGINAL',approved),('10-LAYER REST COMPOSITE',merged),
           ('BLUE=IRIS / PINK=UPPER INK',matte_preview),('IRISES SHIFTED 2px / STUDY',translated)]
    tile_w,tile_h=510,285
    sheet=Image.new('RGB',(tile_w*2,tile_h*2),(241,243,250))
    draw=ImageDraw.Draw(sheet)
    for i,(name,im) in enumerate(views):
        x=(i%2)*tile_w;y=(i//2)*tile_h
        sheet.paste(im.convert('RGB').crop(region).resize((tile_w,245),Image.Resampling.LANCZOS),(x,y+40))
        draw.text((x+14,y+12),name,fill=(39,51,72))
    qa=output_dir/'yuzuki-eye-components-qa-v1.8.jpg'
    sheet.save(qa,quality=95)
    manifest={
       'version':'1.8', 'format':'layered PSD art study',
       'approved_source':'assets/source/yuzuki-front-a.png',
       'approved_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
       'psd':psd.name,'dimensions':[1024,1536], 'total_layers':len(layers),
       'visible_layers':7,'hidden_layers':3,
       'cubism_model':False,'cubism_import_tested':False,'production_ready':False,
       'rest_art_fidelity':stats,
       'irises':{side:{'center':[geo[0],geo[1]],'radii':[geo[2],geo[3]],
           'coverage_pixels':int(np.count_nonzero(iris_masks[side]>127)),
           'file':f'{side}-iris-v1.8.png'} for side,geo in IRISES.items()},
       'upper_eyeliners':{side:{'coverage_pixels':int(np.count_nonzero(lash_masks[side]>127)),
           'file':f'{side}-upper_ink-v1.8.png'} for side in SIDES},
       'qa':qa.name,
       'limits':[
          'Iris/eyeliner masks derived from the original flattened artwork, not hand-painted source layers.',
          'Hair strands, eyelid paint and highlights are not separately reconstructed in full.',
          'Underpaint beneath iris/ink is algorithmic and imperfect when an iris is displaced.',
          'No Cubism deformation mesh, .cmo3, .moc3 or head-angle keyforms have been created.',
          'PSD has not been validated by importing it into Cubism Editor.',
       ],
    }
    (output_dir/'eye-components-v1.8.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'psd':str(psd),'mb':round(psd.stat().st_size/1048576,2),'layers':len(layers),'qa':str(qa),'rest_stats':stats}

if __name__=='__main__':
    print(json.dumps(make(),ensure_ascii=False,indent=2))
