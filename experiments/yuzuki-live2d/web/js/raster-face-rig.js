/**
 * V0.7 artwork-preserving raster facial renderer.
 * True independently animated eye and lip art; NOT a Cubism .moc3 or simulated 3D turn.
 */
import {irregularBlink,eyeScale,resolveLip,clamp01,textVisemeAt} from './face-performance.js';
import {drawBlush,drawLips} from './facial-art.js';
import {winkEnvelope} from './eye-performance.js';
import {drawBlink,blinkClosure} from './blink-v15.js';
import {advanceFace,idleGaze,idleBreath,DEFAULT_FACE} from './performance-timeline.js';
export const RIG_VERSION='1.9.0';
export const PART_BOXES={eye_left:[339,456,469,559],eye_right:[554,451,684,554],mouth:[468,607,564,656]};
// Back-compatible QA helpers.
export const smootherstep=x=>{const v=clamp01(x);return v*v*(3-2*v);};
export function blinkValue(t){return irregularBlink(t);}
export function desiredEyeScale(open,blink=1){return eyeScale(open,blink);}
export function mouthShape(open){const v=clamp01(open);return {width:18+v*23,height:v*23,alpha:smootherstep(v/.15)};}
const getImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载分层图像 '+url));im.src=globalThis.__YUZUKI_OFFLINE_ASSETS?.[url.replace(/^\.\//,'')]||url;});
export class RasterFaceRig {
  constructor(canvas,assetRoot='./assets/face-rig'){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assetRoot=assetRoot;
    this.parts={};this.ready=false;this.params={...DEFAULT_FACE};this.renderParams={...DEFAULT_FACE};
    this.enabled=true;this.forceEye=null;this.forceMouth=null;this.forceViseme='a';this.started=performance.now();this.frame=0;
    this.voice={text:'',started:0,wordIndex:0,mode:'off'};
    this.mic=null;this.gaze={x:0,y:0,targetX:0,targetY:0};
    this.smoothedVoice=0;this.lastTime=0;this.emotion='calm';this.winkState=null;this.gazeAuto=true;this.stageTilt=0;
  }
  async load(){
    const names=['portrait_base','mouth'];
    const urls={portrait_base:'./assets/yuzuki-front-a.webp',mouth:`${this.assetRoot}/mouth.webp`};
    const loaded=await Promise.all(names.map(name=>getImage(urls[name])));
    names.forEach((name,i)=>this.parts[name]=loaded[i]);
    this.parts.blinkAtlas=await getImage(`${this.assetRoot}/blink-v19/blink-atlas.webp`);this.ready=true;
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
  setGaze(x,y){this.gazeAuto=false;this.gaze.targetX=Math.max(-1,Math.min(1,x));this.gaze.targetY=Math.max(-1,Math.min(1,y));}
  resumeIdleGaze(){this.gazeAuto=true;}
  setTestPose({eye=null,mouth=null,viseme='a'}={}){this.forceEye=eye;this.forceMouth=mouth;this.forceViseme=viseme;this.draw(performance.now());}
  start(){if(this.frame||!this.ready)return;const loop=t=>{this.draw(t);this.frame=requestAnimationFrame(loop);};this.frame=requestAnimationFrame(loop);}
  stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
  draw(t){
    if(!this.ready)return;
    const ctx=this.ctx,delta=Math.max(0,Math.min(.05,(t-this.lastTime)/1000||.016));this.lastTime=t;
    this.renderParams=advanceFace(this.renderParams,this.params,delta,this.enabled);const p=this.renderParams;
    const active=this.enabled;
    const idle=active&&this.gazeAuto?idleGaze(t-this.started):null;
    const gx=idle?idle.x:this.gaze.targetX,gy=idle?idle.y:this.gaze.targetY;
    this.gaze.x+=(gx-this.gaze.x)*Math.min(1,delta*5);
    this.gaze.y+=(gy-this.gaze.y)*Math.min(1,delta*5);
    this.stageTilt=active?idleBreath(t-this.started,this.emotion):0;
    this.onFrame?.(this.stageTilt,p);
    ctx.clearRect(0,0,1024,1536);ctx.drawImage(this.parts.portrait_base,0,0);
    const winkProgress=this.winkState&&active ? winkEnvelope(t-this.winkState.started) : 0;
    if(this.winkState&&t-this.winkState.started>850)this.winkState=null;
    for(const side of ['eye_left','eye_right']){
      // Natural open state is pixel-identical to the approved concept portrait.
      // Both eyes share a blink clock; their artwork preserves natural asymmetry.
      const blink=this.forceEye!==null?clamp01(this.forceEye):(active?irregularBlink(t-this.started):1);
      const wink=side===this.winkState?.side?winkProgress:0;
      const closure=blinkClosure(blink,wink);
      const bounds=side==='eye_left'?[319,442,489,571]:[536,414,713,563];
      drawBlink(ctx,this.parts.blinkAtlas,bounds,closure,side==='eye_left'?0:1);
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
