/**
 * Hand-shaped lip contours and eyelid strokes for a 1024x1536 portrait.
 * These are vector overlays on experimental extracted facial art, not Cubism meshes.
 */
import {clamp01,visemeGeometry} from './face-performance.js';
export function drawEyelid(ctx,side,opacity=1){
  if(opacity<=0)return;
  ctx.save();ctx.globalAlpha=clamp01(opacity);
  const left=side==='eye_left';
  const points=left?[[347,505],[375,516],[416,523],[457,501]]:[[556,487],[590,499],[646,503],[683,479]];
  ctx.beginPath();ctx.moveTo(...points[0]);ctx.bezierCurveTo(...points.slice(1).flat());
  ctx.lineWidth=3.0;ctx.strokeStyle='#66515d';ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.moveTo(points[0][0]+5,points[0][1]+5);
  ctx.bezierCurveTo(points[1][0],points[1][1]+5,points[2][0],points[2][1]+5,points[3][0]-6,points[3][1]+5);
  ctx.lineWidth=1.4;ctx.strokeStyle='#ad737b';ctx.globalAlpha=opacity*.30;ctx.stroke();
  // Diminishing end lashes turn the shut line into a soft natural eye.
  ctx.globalAlpha=opacity*.68;ctx.beginPath();
  const x=points[3][0],y=points[3][1];ctx.moveTo(x-1,y+1);ctx.quadraticCurveTo(x+3,y-1,x+7,y-4);
  ctx.lineWidth=1.8;ctx.strokeStyle='#735765';ctx.stroke();ctx.restore();
}
export function drawLips(ctx,{openness=0,smile=0,viseme='a',blush=0}={}){
  const open=clamp01(openness),happy=Math.max(-1,Math.min(1,smile));
  const v=visemeGeometry(viseme,1),wide=19+20*v.width*open+Math.max(0,happy)*7;
  const tall=2+19*v.height*open;
  const cx=517,cy=631;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(open<.13){
    // A natural curved closed mouth, not a hard oval stamped onto the face.
    const smileLift=-Math.max(0,happy)*4;
    const pout=Math.max(0,-happy)*3;
    ctx.beginPath();ctx.moveTo(cx-wide/2,cy+smileLift);ctx.bezierCurveTo(cx-wide*.25,cy+2, cx+wide*.14,cy+3+pout,cx+wide/2,cy+smileLift);
    ctx.strokeStyle='#ac7079';ctx.lineWidth=1.9;ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-wide*.30,cy+6);ctx.quadraticCurveTo(cx,cy+8,cx+wide*.28,cy+5);
    ctx.strokeStyle='rgba(224,143,155,.24)';ctx.lineWidth=2.4;ctx.stroke();
  }else{
    const rx=wide/2,ry=Math.max(2,tall/2); const lift=-happy*2.6;
    ctx.beginPath();ctx.moveTo(cx-rx,cy-ry*.16+lift);
    ctx.bezierCurveTo(cx-rx*.65,cy-ry*.95,cx+rx*.6,cy-ry*.95,cx+rx,cy-ry*.16+lift);
    ctx.bezierCurveTo(cx+rx*.9,cy+ry*.92,cx-rx*.8,cy+ry*.95,cx-rx,cy-ry*.16+lift);
    const cavity=ctx.createLinearGradient(cx,cy-ry,cx,cy+ry);
    cavity.addColorStop(0,'#8f5366');cavity.addColorStop(.5,'#6d3f56');cavity.addColorStop(1,'#b06c7e');
    ctx.fillStyle=cavity;ctx.fill();ctx.strokeStyle='#b87986';ctx.lineWidth=1.75;ctx.stroke();
    if(ry>6){
      ctx.beginPath();ctx.ellipse(cx,cy+ry*.53,rx*.51,Math.max(1.2,ry*.18),0,0,Math.PI*2);
      ctx.fillStyle='#df95a2';ctx.fill();
    }
    if(v.width>.6&&ry>5){
      ctx.beginPath();ctx.moveTo(cx-rx*.52,cy-ry*.52);ctx.quadraticCurveTo(cx,cy-ry*.70,cx+rx*.52,cy-ry*.52);
      ctx.strokeStyle='rgba(254,230,224,.67)';ctx.lineWidth=1.6;ctx.stroke();
    }
  }
  ctx.restore();
}
export function drawBlush(ctx,intensity=0){
  const strength=clamp01(intensity);if(!strength)return;
  ctx.save();
  for(const [x,y] of [[339,567],[688,543]]){
    const g=ctx.createRadialGradient(x,y,5,x,y,73);
    g.addColorStop(0,`rgba(226,113,134,${(strength*.20).toFixed(3)})`);
    g.addColorStop(.55,`rgba(234,137,150,${(strength*.11).toFixed(3)})`);
    g.addColorStop(1,'rgba(234,137,150,0)');
    ctx.fillStyle=g;ctx.fillRect(x-75,y-75,150,150);
  }
  ctx.restore();
}
