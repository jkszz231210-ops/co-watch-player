/** V1.5 raster blink atlas. Preserve approved original at closure 0.
 * Eye occlusion is sampled from 21 paired eyelid drawings with consistent
 * lid geometry; no extracted iris/eyeball is ever pasted over the original.
 * This is not a Cubism model.
 */
export const BLINK_STEPS=Object.freeze(Array.from({length:21},(_,i)=>i/20));
export function blinkClosure(blink=1,wink=0,forcedEye=null){
  const clamp=(v,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
  const b=forcedEye===null?blink:forcedEye;
  return Math.max(1-clamp(b,1),clamp(wink,0));
}
export function sampleFrame(closure){
  const q=Number.isFinite(closure)?Math.max(0,Math.min(1,closure)):0;
  return Math.round(q*20);
}
export function drawBlink(ctx,atlas,box,closure,sideIndex=0){
  if(!atlas||closure<=.002)return;
  const frame=sampleFrame(closure);
  if(frame===0)return;
  const [x,y,x2,y2]=box;
  const cellW=192,cellH=160;
  ctx.drawImage(atlas,frame*cellW,sideIndex*cellH,x2-x,y2-y,x,y,x2-x,y2-y);
}
