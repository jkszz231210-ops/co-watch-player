/**
 * V0.7 artwork-preserving raster facial renderer.
 * True independently animated eye and lip art; NOT a Cubism .moc3 or simulated 3D turn.
 */
import {irregularBlink,eyeScale,resolveLip,clamp01,textVisemeAt} from './face-performance.js';
import {drawBlush,drawLips} from './facial-art.js';
import {blinkForSide,eyePose,eyeLidOpacity,eyeArtOpacity,winkEnvelope,browYOffset,irisOffset} from './eye-performance.js';
import {eyelidAperture,traceAperture,paintMovingLid} from './eye-aperture.js';
export const RIG_VERSION='0.8.0';
export const PART_BOXES={eye_left:[338,460,468,555],eye_right:[551,435,695,540],mouth:[468,607,564,656]};
// Back-compatible QA helpers.
export const smootherstep=x=>{const v=clamp01(x);return v*v*(3-2*v);};
export function blinkValue(t){return irregularBlink(t);}
export function desiredEyeScale(open,blink=1){return eyeScale(open,blink);}
export function mouthShape(open){const v=clamp01(open);return {width:18+v*23,height:v*23,alpha:smootherstep(v/.15)};}
const getImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载分层图像 '+url));im.src=url;});
export class RasterFaceRig {
  constructor(canvas,assetRoot='./assets/face-rig'){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assetRoot=assetRoot;
    this.parts={};this.ready=false;this.params={eyeOpen:.62,mouthOpen:0,smile:.08,blush:0,browTension:0,headTilt:0};
    this.enabled=true;this.forceEye=null;this.forceMouth=null;this.forceViseme='a';this.started=performance.now();this.frame=0;
    this.voice={text:'',started:0,wordIndex:0,mode:'off'};
    this.mic=null;this.gaze={x:0,y:0,targetX:0,targetY:0};
    this.smoothedVoice=0;this.lastTime=0;this.emotion='calm';this.winkState=null;
  }
  async load(){
    const names=['base_v07','eye_left_sclera','eye_right_sclera','eye_left_iris','eye_right_iris','brow_left','brow_right','mouth','eye_left_closed','eye_right_closed','eye_left_lashes','eye_right_lashes'];
    const loaded=await Promise.all(names.map(name=>getImage(`${this.assetRoot}/${name}${name.endsWith('_closed')?'.svg':'.webp'}`)));
    names.forEach((name,i)=>this.parts[name]=loaded[i]);this.ready=true;
    this.draw(performance.now());return this;
  }
  update(params,emotion=null){this.params={...this.params,...params};if(emotion)this.emotion=emotion;}
  setMotion(enabled){this.enabled=Boolean(enabled);this.draw(performance.now());}
  /** The speechSynthesis API does not expose synthesized PCM, so this is a rhythm estimate. */
  setSpeaking(value,text=''){
    if(value){this.voice={mode:'tts',text:String(text),started:performance.now(),wordIndex:0};}
    else this.voice={mode:'off',text:'',started:0,wordIndex:0};
  }
  setSpeechBoundary(index){if(this.voice.mode==='tts')this.voice.wordIndex=Math.max(0,Math.floor(index));}
  setMicrophone(mic){this.mic=mic;}
  winkEye(side='eye_left'){if(!['eye_left','eye_right'].includes(side))return false;this.forceEye=null;this.winkState={side,started:performance.now()};return true;}
  setGaze(x,y){this.gaze.targetX=Math.max(-1,Math.min(1,x));this.gaze.targetY=Math.max(-1,Math.min(1,y));}
  setTestPose({eye=null,mouth=null,viseme='a'}={}){this.forceEye=eye;this.forceMouth=mouth;this.forceViseme=viseme;this.draw(performance.now());}
  start(){if(this.frame||!this.ready)return;const loop=t=>{this.draw(t);this.frame=requestAnimationFrame(loop);};this.frame=requestAnimationFrame(loop);}
  stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
  draw(t){
    if(!this.ready)return;
    const ctx=this.ctx,p=this.params,delta=Math.max(0,Math.min(.05,(t-this.lastTime)/1000||.016));this.lastTime=t;
    const active=this.enabled;
    this.gaze.x+=(this.gaze.targetX-this.gaze.x)*Math.min(1,delta*6);
    this.gaze.y+=(this.gaze.targetY-this.gaze.y)*Math.min(1,delta*6);
    ctx.clearRect(0,0,1024,1536);ctx.drawImage(this.parts.base_v07,0,0);
    // Eyebrow strokes are separately addressable. Keep displacement tiny while original bangs await artist cleanup.
    for(const side of ['brow_left','brow_right']){
      const box=side==='brow_left'?[306,398,469,447]:[548,381,695,432];
      const shift=active?browYOffset({emotion:this.emotion,tension:p.browTension,side}):0;
      ctx.drawImage(this.parts[side],box[0],box[1]+shift,box[2]-box[0],box[3]-box[1]);
    }
    const winkProgress=this.winkState&&active ? winkEnvelope(t-this.winkState.started) : 0;
    if(this.winkState&&t-this.winkState.started>850)this.winkState=null;
    const gaze=irisOffset(this.gaze.x,this.gaze.y);
    for(const side of ['eye_left','eye_right']){
      const blink=this.forceEye!==null?clamp01(this.forceEye):(active?blinkForSide(t-this.started,side):1);
      const wink=side===this.winkState?.side?winkProgress:0;
      const openness=eyePose({emotionEye:p.eyeOpen,smile:p.smile,browTension:p.browTension,blink,wink,side,emotion:this.emotion});
      const [x,y,x2,y2]=PART_BOXES[side],w=x2-x,h=y2-y;
      const shape=eyelidAperture(side,openness);
      // Keep iris and sclera at their painted dimensions. An eye-shaped
      // aperture clips both instead of crushing the pupil during blinking.
      ctx.save();ctx.globalAlpha=eyeArtOpacity(openness);
      if(openness<.96){traceAperture(ctx,shape);ctx.clip();}
      ctx.drawImage(this.parts[`${side}_sclera`],x,y,w,h);
      ctx.drawImage(this.parts[`${side}_iris`],x+gaze.x,y+gaze.y,w,h);
      // Lashes are in the foreground. This preserves the original ink edge.
      ctx.drawImage(this.parts[`${side}_lashes`],x,y,w,h);
      ctx.restore();
      if(openness<.95&&openness>.19)paintMovingLid(ctx,shape);
      const lidAlpha=eyeLidOpacity(openness);
      if(lidAlpha>.001){ctx.save();ctx.globalAlpha=lidAlpha;ctx.drawImage(this.parts[`${side}_closed`],x,y,w,h);ctx.restore();}
    }
    drawBlush(ctx,p.blush);
    let viseme='a',targetVoice=0;
    if(this.mic?.active){targetVoice=active?this.mic.sample():0;viseme=targetVoice<.1?'rest':'a';}
    else if(this.voice.mode==='tts'&&active){
      const elapsed=t-this.voice.started;
      const index=Math.max(this.voice.wordIndex,Math.floor(elapsed/220));
      const letter=Array.from(this.voice.text)[index]||'';
      viseme=letter?textVisemeAt(letter,0):'rest';
      targetVoice=viseme==='rest'?0:.44+.22*Math.abs(Math.sin(elapsed/109));
    }
    if(this.forceMouth!==null)viseme=this.forceViseme;
    const follow=targetVoice>this.smoothedVoice?10:7;
    this.smoothedVoice+=(targetVoice-this.smoothedVoice)*Math.min(1,delta*follow);
    const open=resolveLip({emotionOpen:p.mouthOpen,voiceOpen:this.smoothedVoice,forcedOpen:this.forceMouth});
    const [mx,my,mx2,my2]=PART_BOXES.mouth;
    if(open<.035&&Math.abs(p.smile-.08)<.13){ctx.drawImage(this.parts.mouth,mx,my,mx2-mx,my2-my);}
    else{drawLips(ctx,{openness:open,smile:p.smile,viseme,blush:p.blush});}
  }
}
