/**
 * V0.8 eyelid aperture geometry. The eyeball remains at its original size;
 * moving upper/lower lid boundaries reveal or hide it instead of scaling the iris.
 * Native Canvas bezier path. This is a raster animation trial, NOT Cubism deformation.
 */
import {clamp01} from './face-performance.js';
export const EYE_GEOMETRY = Object.freeze({
  eye_left: Object.freeze({left:346,right:460,center:502,upper:35,lower:34,cornerSlope:-3.5}),
  eye_right:Object.freeze({left:557,right:687,center:484,upper:36,lower:35,cornerSlope:-3}),
});
export function eyelidAperture(side,openness=1){
  const spec=EYE_GEOMETRY[side];
  if(!spec)throw new RangeError(`Unknown eye side ${side}`);
  const open=clamp01(openness),{left,right,center,upper,lower,cornerSlope}=spec;
  const span=right-left;
  // The asymmetry is subtle: soft inner corners and slightly raised outer corners.
  // Eye corners meet at a single point. Control points sweep the eyelids
  // into a shallow lens: no horizontal rectangle-like crop seams.
  const corner=(x)=>({x,y:center+(x-left)/span*cornerSlope});
  const upperPoint=(x)=>({x,y:center+(x-left)/span*cornerSlope-upper*1.35*open});
  const lowerPoint=(x)=>({x,y:center+(x-left)/span*cornerSlope+lower*1.35*open});
  return {side,open,left,right,span,
    start:corner(left),end:corner(right),
    top1:upperPoint(left+span*.24),top2:upperPoint(left+span*.76),
    bottom1:lowerPoint(left+span*.76),bottom2:lowerPoint(left+span*.24),
    bottomStart:corner(left),bottomEnd:corner(right),
    width:span,height:(upper+lower)*open};
}
export function traceAperture(ctx,shape){
  ctx.beginPath();
  ctx.moveTo(shape.start.x,shape.start.y);
  ctx.bezierCurveTo(shape.top1.x,shape.top1.y,shape.top2.x,shape.top2.y,shape.end.x,shape.end.y);
  ctx.lineTo(shape.bottomEnd.x,shape.bottomEnd.y);
  ctx.bezierCurveTo(shape.bottom1.x,shape.bottom1.y,shape.bottom2.x,shape.bottom2.y,shape.bottomStart.x,shape.bottomStart.y);
  ctx.closePath();
}
export function paintMovingLid(ctx,shape){
  const strength=Math.max(0,Math.min(1,(1-shape.open)*2.1));
  if(strength<=.01)return;
  ctx.save();ctx.globalAlpha=.66*strength;
  ctx.beginPath();ctx.moveTo(shape.start.x,shape.start.y);
  ctx.bezierCurveTo(shape.top1.x,shape.top1.y,shape.top2.x,shape.top2.y,shape.end.x,shape.end.y);
  ctx.lineWidth=2.5;ctx.strokeStyle='#765766';ctx.lineCap='round';ctx.stroke();
  ctx.restore();
}
