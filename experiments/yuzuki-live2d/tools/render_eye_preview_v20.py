"""Generate a compact GIF from the EXPORTED V2.0 eyelid atlas for external review."""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'tools'))
from build_eye_keyforms_v20 import APPROVED,WEB,SIDES,EYES,CELL_W,CELL_H,composite
OUT=ROOT/'assets/cubism-handoff/v2.0'
atlas=np.asarray(Image.open(WEB/'blink-atlas.webp').convert('RGBA'))
seq=[0]*8+[5,13,23,34,40,40,40,32,20,9]+[0]*15
frames=[]
for idx in seq:
 patches={}
 for row,side in enumerate(SIDES):
  x0,y0,x1,y1=EYES[side]['box']
  patches[side]=atlas[row*CELL_H:row*CELL_H+y1-y0,idx*CELL_W:idx*CELL_W+x1-x0]
 frame=composite(APPROVED,patches).crop((283,358,738,613)).resize((637,357),Image.Resampling.LANCZOS)
 frames.append(frame)
file=OUT/'yuzuki-eye-motion-v2.0.gif'
frames[0].save(file,save_all=True,append_images=frames[1:],duration=[76]*len(frames),loop=0,optimize=True)
print(file,file.stat().st_size)
