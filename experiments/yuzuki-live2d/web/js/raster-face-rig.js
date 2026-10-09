/**
 * Raster Face Rig V0.4. The approved portrait is separated into actual eye,
 * mouth and reconstructed-base images. This renders real local eye and lip motion,
 * but is NOT a Live2D Cubism rig and does not simulate 3D head rotation.
 */
export const RIG_VERSION='0.4.0';
export const PART_BOXES={
  eye_left:[338,460,468,555],
  eye_right:[551,435,695,540],
  mouth:[468,607,564,656]
};
export function smootherstep(x){const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);}
export function blinkValue(milliseconds){
  const phase=((milliseconds%4200)+4200)%4200;
  if(phase<3450||phase>3690)return 1;
  const fraction=(phase-3450)/240;
  return 1-0.95*Math.sin(Math.PI*fraction)**2;
}
export function desiredEyeScale(open,blink=1){return Math.max(0.065,Math.min(1,(open/0.62)))*blink;}
export function mouthShape(open){const value=Math.max(0,Math.min(1,open));return {width:18+value*23,height:value*23,alpha:smootherstep(value/.15)};}
const getImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载分层图像 '+url));im.src=url;});
export class RasterFaceRig{
  constructor(canvas,assetRoot='./assets/face-rig'){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assetRoot=assetRoot;
    this.parts={};this.ready=false;this.params={eyeOpen:.62,mouthOpen:0,smile:.08,blush:0,browTension:0,headTilt:0};
    this.enabled=true;this.forceEye=null;this.forceMouth=null;this.started=performance.now();this.frame=0;this.speaking=false;
  }
  async load(){
    const names=['base','eye_left','eye_right','mouth'];
    const loaded=await Promise.all(names.map(name=>getImage(`${this.assetRoot}/${name}.webp`)));
    names.forEach((name,i)=>this.parts[name]=loaded[i]);this.ready=true;
    this.draw(performance.now());return this;
  }
  update(params){this.params={...this.params,...params};}
  setMotion(enabled){this.enabled=Boolean(enabled);this.draw(performance.now());}
  setSpeaking(isSpeaking){this.speaking=Boolean(isSpeaking);}
  setTestPose({eye=null,mouth=null}={}){this.forceEye=eye;this.forceMouth=mouth;this.draw(performance.now());}
  start(){if(this.frame||!this.ready)return;const loop=t=>{this.draw(t);this.frame=requestAnimationFrame(loop);};this.frame=requestAnimationFrame(loop);}
  stop(){cancelAnimationFrame(this.frame);this.frame=0;}
  draw(t){
    if(!this.ready)return;
    const ctx=this.ctx;const p=this.params;
    ctx.clearRect(0,0,1024,1536);ctx.drawImage(this.parts.base,0,0);
    const blink=this.forceEye!==null?this.forceEye:(this.enabled?blinkValue(t-this.started):1);
    const openness=desiredEyeScale(p.eyeOpen,blink);
    const gaze=this.enabled?Math.sin((t-this.started)/2100)*.8:0;
    for(const side of ['eye_left','eye_right']){
      const [x,y,x2,y2]=PART_BOXES[side],cx=(x+x2)/2,cy=(y+y2)/2;
      const w=x2-x,h=y2-y;
      // Local vertical warping of original coloured eye layers; skin is underneath.
      // These transform independently instead of moving the entire face image.
      const eyelashCentre=cy-5;
      ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(openness-.075)/.22));ctx.drawImage(this.parts[side],x+gaze,eyelashCentre-(h*openness)/2,w,h*openness);ctx.restore();
      if(openness<.2){
        const opacity=(.2-openness)/.2;
        ctx.save();ctx.globalAlpha=opacity*.67;ctx.beginPath();
        if(side==='eye_left'){
          ctx.moveTo(347,508);ctx.bezierCurveTo(372,517,420,521,457,502);
        }else{
          ctx.moveTo(557,488);ctx.bezierCurveTo(582,498,637,503,682,478);
        }
        ctx.strokeStyle='#725c68';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke();ctx.restore();
      }
    }
    const [mx,my,mx2,my2]=PART_BOXES.mouth;
    const open=this.forceMouth!==null?this.forceMouth:Math.max(p.mouthOpen,this.speaking&&this.enabled?0.22+0.36*Math.abs(Math.sin(t/135)):0);
    // At zero we show the extracted authentic lips from the approved artwork.
    ctx.globalAlpha=Math.max(0,1-open*1.9);
    ctx.drawImage(this.parts.mouth,mx,my,mx2-mx,my2-my);ctx.globalAlpha=1;
    if(open>.02){
      const sh=mouthShape(open);const centreX=517,centreY=631;
      ctx.save();ctx.globalAlpha=sh.alpha;
      ctx.beginPath();ctx.ellipse(centreX,centreY,sh.width/2,Math.max(1,sh.height/2),0,0,Math.PI*2);
      const fill=ctx.createLinearGradient(centreX,centreY-sh.height/2,centreX,centreY+sh.height/2);
      fill.addColorStop(0,'#ae6d7b');fill.addColorStop(.5,'#713e55');fill.addColorStop(1,'#bf7c8a');ctx.fillStyle=fill;ctx.fill();
      ctx.lineWidth=1.7;ctx.strokeStyle='#c98994';ctx.stroke();
      if(open>.48){ctx.fillStyle='#fee0da';ctx.beginPath();ctx.ellipse(centreX,centreY+sh.height*.19,sh.width*.31,1.6,0,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  }
}
