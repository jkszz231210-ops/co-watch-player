#!/usr/bin/env python3
"""V1.7: produce an independently editable *eye-level* Cubism preparation PSD.

The approved source face is preserved exactly at rest: two open-eye patches
cover retouched skin where the eyes were. This is not a finished Cubism rig.
The eye patches currently contain their immediate eyelash/skin surroundings;
professional eyelid/iris separation and repainting are still required.
"""
from __future__ import annotations
from pathlib import Path
import hashlib
import json
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_cubism_psd import encode_psd

SOURCE = ROOT/'assets/source/yuzuki-front-a.png'
OUT = ROOT/'assets/cubism-handoff'
# Explicit polygons follow the shapes and original asymmetric positions of the two eyes.
# Editor space: 1024 x 1536, top-left origin. No assumption of mirror symmetry.
EYES = {
    'eye_left': {
        'polygon': [(331,500),(336,482),(349,470),(366,466),(397,462),
                    (423,464),(453,475),(471,484),(473,503),(466,526),
                    (443,545),(409,553),(380,552),(352,538),(338,526)],
        'bbox': [328,458,479,559],
    },
    'eye_right': {
        'polygon': [(547,485),(550,465),(566,452),(591,447),(625,446),
                    (661,452),(685,461),(691,481),(685,505),(666,522),
                    (640,535),(604,535),(574,523),(555,510)],
        'bbox': [544,443,695,541],
    },
}


def assemble(portrait: Image.Image):
    if portrait.size != (1024, 1536):
        raise ValueError('Approved portrait must be 1024x1536')
    original = np.asarray(portrait.convert('RGB'))
    base = original.copy()
    patches = {}
    masks = {}
    for side, spec in EYES.items():
        mask = np.zeros((1536, 1024), np.uint8)
        points = np.array(spec['polygon'], np.int32)
        cv2.fillPoly(mask, [points], 255)
        # A 1px anti-alias around the ink contour only; region *beneath* eyes is removed.
        # Outermost 6px are kept as original skin, ensuring no visible seam at rest.
        erased = cv2.erode(mask, np.ones((13,13),np.uint8), iterations=1)
        # Since the base is already the source outside erased, pixel fidelity is exact
        # even with a feathered cutout boundary.
        base = cv2.inpaint(base, erased, 7, cv2.INPAINT_TELEA)
        alpha = cv2.GaussianBlur(mask,(0,0),1.25)
        rgba = np.dstack([original, alpha])
        patches[side] = Image.fromarray(rgba, 'RGBA')
        masks[side] = {'alpha': alpha, 'removed':erased}
    layer_base = Image.fromarray(base, 'RGB').convert('RGBA')
    # PSD-compatible compositing in the same layer order (left then right).
    composite = layer_base.copy()
    for side in ('eye_left','eye_right'):
        composite = Image.alpha_composite(composite,patches[side])
    return layer_base, patches, composite, masks


def make_closed_studies(original: Image.Image, masks: dict) -> dict[str,Image.Image]:
    """Construct *hidden* close-eye prototypes from prior validated raster artwork.

    The exported layer is the complete eye/adjacent skin patch, not a promise
    of independently editable iris, lash or eyelid geometry.
    """
    atlas_file=ROOT/'web/assets/face-rig/blink-v15/blink-atlas.webp'
    if not atlas_file.is_file():
        raise FileNotFoundError('V1.5 blink atlas is required for closed-eye study layers')
    atlas=np.asarray(Image.open(atlas_file).convert('RGBA'))
    src=np.asarray(original.convert('RGB')).copy()
    result={}
    for row,side in enumerate(('eye_left','eye_right')):
        # frame index 20 = 100% closed, cell 192x160
        x0,y0,x1,y1=([319,442,489,571] if side=='eye_left' else [536,414,713,563])
        h,w=y1-y0,x1-x0
        patch=atlas[row*160:row*160+h,20*192:20*192+w].astype(np.float32)
        al=patch[:,:,3:4]/255.0
        composed=src.astype(np.float32).copy()
        region=composed[y0:y1,x0:x1]
        composed[y0:y1,x0:x1]=region*(1-al)+patch[:,:,:3]*al
        # Re-use the exact coverage from the approved open state to avoid
        # introducing a second region boundary in the PSD.
        rgba=np.dstack((np.clip(composed,0,255).astype('uint8'),masks[side]['alpha']))
        result[side]=Image.fromarray(rgba,'RGBA')
    return result

def make(source: Path = SOURCE, output_dir: Path = OUT) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as im:
        original = im.convert('RGBA')
    base, parts, merged, masks = assemble(original)
    closed_parts = make_closed_studies(original, masks)
    orig_array = np.array(original.convert('RGB'),dtype=np.int16)
    recovered = np.array(merged.convert('RGB'),dtype=np.int16)
    diffs = np.abs(orig_array - recovered)
    # At rest the extracted open-eye layers must reproduce the exact source
    # within a tiny subpixel/RGBA rounding budget; drift outside eyes = 0.
    changed = int((diffs.max(axis=2)>2).sum())
    mae = float(diffs.mean())
    max_delta = int(diffs.max())
    if changed > 120 or mae > .002:
        raise AssertionError(f'Art regression: changed={changed}, mean={mae:.5f}, max={max_delta}')
    # The bottom ref stays hidden. All three editable working layers are visible.
    # PSD record order is top to bottom.
    layers = [
        {'name':'EYE_R 02 | closed draft HIDDEN repaint', 'visible':False, 'image':closed_parts['eye_right']},
        {'name':'EYE_R 01 | approved open + lash editable', 'visible':True, 'image':parts['eye_right']},
        {'name':'EYE_L 02 | closed draft HIDDEN repaint', 'visible':False, 'image':closed_parts['eye_left']},
        {'name':'EYE_L 01 | approved open + lash editable', 'visible':True, 'image':parts['eye_left']},
        {'name':'FACE 00 | repaired skin under eyes', 'visible':True, 'image':base},
        {'name':'REFERENCE | approved original DO NOT CHANGE', 'visible':False, 'image':original},
    ]
    psd = output_dir/'yuzuki-eye-separated-v1.7.psd'
    encode_psd(layers, merged, psd)
    base.save(output_dir/'yuzuki-eye-underpainting-v1.7.png',optimize=True)
    for side, part in parts.items():
        part.save(output_dir/f'{side}-source-part-v1.7.png',optimize=True)
        closed_parts[side].save(output_dir/f'{side}-closed-draft-v1.7.png', optimize=True)
    # Comparison makes it possible to audit visible open-eye quality, underpainting
    # and the actual detached eye sprites without relying on a renderer.
    region=(280,372,736,607)
    closed = base.copy()
    for side in ('eye_left','eye_right'):
        closed=Image.alpha_composite(closed,closed_parts[side])
    views=[
        ('APPROVED ORIGINAL',original.convert('RGB')),
        ('REBUILT OPEN EYES / 3 LAYERS',merged.convert('RGB')),
        ('CLOSED-EYE DRAFT / NO OPEN EYES',closed.convert('RGB')),
    ]
    W,H=570,344
    qa=Image.new('RGB',(W*len(views),H),(242,242,248))
    draw=ImageDraw.Draw(qa)
    for i,(label,pic) in enumerate(views):
        cropped=pic.crop(region).resize((W,293),Image.Resampling.LANCZOS)
        qa.paste(cropped,(i*W,51)); draw.text((i*W+20,17),label,(43,47,69))
    preview=output_dir/'yuzuki-eye-separation-qa-v1.7.jpg'
    qa.save(preview,quality=95)
    manifest={
        'version':'1.7', 'approved_source':'assets/source/yuzuki-front-a.png',
        'approved_source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'model_complete':False, 'cubism_rigged':False, 'production_ready':False,
        'psd':psd.name, 'dimensions':[1024,1536],
        'working_layers':3,'closed_study_layers_hidden':2,'reference_layers_hidden':1,
        'parts':{s:{'polygon':spec['polygon'],'bbox':spec['bbox'],'png':f'{s}-source-part-v1.7.png'} for s,spec in EYES.items()},
        'qa':{'mean_absolute_rgb_channel_difference':mae,'pixels_different_over_2':changed,'maximum_channel_difference':max_delta},
        'limits':['Open eye+lash+adjacent skin is a single editable patch, not independently rigged eyelids/iris.',
                  'Background under eye was retouched by inpainting and requires artist verification while blinking.',
                  'Closed-eye draft layers are derived from the V1.5 sprite atlas, not repainted human art.',
                  'No head turn, hair/body separation, mesh deformers or .moc3 assets exist.']
    }
    (output_dir/'eye-separation-v1.7.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    return {'psd':str(psd),'psd_mb':round(psd.stat().st_size/1048576,1),'visible_working_layers':3,'hidden_closed_studies':2,'qa':manifest['qa'],'image':str(preview)}


if __name__=='__main__':
    print(json.dumps(make(),ensure_ascii=False,indent=2))
