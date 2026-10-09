/** V2.0: 41 independently painted, single-stroke eyelid snapshots.
 * Drawing one atlas cell per frame prevents blended double eyelashes.
 * The zero-closure state intentionally draws NOTHING over approved source art.
 * Raster approximation only; no Cubism mesh deformation.
 */
export const FRAME_COUNT=41;
export const CELL_W=192;
export const CELL_H=160;
export const blinkClosure=(blink=1,wink=0,forcedEye=null)=>{
  const clamp=(v,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
  return Math.max(1-clamp(forcedEye===null?blink:forcedEye,1),clamp(wink,0));
};
export function sampleFrame(closure){
  return Math.round(Math.max(0,Math.min(1,Number.isFinite(closure)?closure:0))*(FRAME_COUNT-1));
}
export function drawBlink(ctx,atlas,box,closure,sideIndex=0){
  if(!atlas)return;
  const idx=sampleFrame(closure);
  if(idx===0)return; // pixel-identical approved source
  const [x,y,x2,y2]=box;
  ctx.drawImage(atlas,idx*CELL_W,sideIndex*CELL_H,x2-x,y2-y,x,y,x2-x,y2-y);
}
