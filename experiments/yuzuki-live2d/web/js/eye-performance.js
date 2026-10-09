/**
 * V0.6 expression-aware per-eye controller.
 * No pretend pupil tracking, brow deformers, or Cubism mesh claims.
 * A side can close separately while the other remains attentive.
 */
import { clamp01, eyeScale, irregularBlink } from './face-performance.js';
export const SIDES=Object.freeze(['eye_left','eye_right']);
const ease=v=>{const x=clamp01(v);return x*x*(3-2*x);};

/** Smooth, asymmetric wink envelope: quick closing, slower recovery. */
export function winkEnvelope(elapsedMs, durationMs=760){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>=durationMs)return 0;
  const progress=elapsedMs/durationMs;
  if(progress<.23)return ease(progress/.23);
  if(progress<.48)return 1;
  return 1-ease((progress-.48)/.52);
}

/** The same automatic blink, a tiny stagger so both lids do not look copied. */
export function blinkForSide(timeMs,side){
  return irregularBlink(timeMs+(side==='eye_right'?12:0));
}

export function eyePose({emotionEye=.62,smile=.08,browTension=0,blink=1,wink=0,side='eye_left',emotion='calm'}={}){
  const normal=eyeScale(emotionEye,blink);
  const warmSquint=clamp01((smile-.28)/.85)*.15;
  const attention=emotion==='focus' ? .08 : 0;
  const surprised=emotion==='surprise' ? .1:0;
  const curiousBias=emotion==='curious' ? (side==='eye_left'?.07:-.06) : 0;
  const proudBias=emotion==='proud' ? (side==='eye_right'?.10:0) : 0;
  const stress=clamp01(browTension)*.065;
  const expression=Math.max(.04,Math.min(1,normal-warmSquint-stress-proudBias+attention+surprised+curiousBias));
  return Math.max(.035,expression*(1-.965*clamp01(wink)));
}

export function eyeLidOpacity(openness){return ease((.28-clamp01(openness))/.19);}
export function eyeArtOpacity(openness){return ease((clamp01(openness)-.045)/.31);}
export function eyeOffsetsFromGaze(x,y){
  // Whole-eye movement can tear painted eyeliner; keep subpixel offset only.
  return {x:Math.max(-.6,Math.min(.6,x*.6)),y:Math.max(-.35,Math.min(.35,y*.35))};
}

/** Iris-only gaze. Eye whites, upper lashes and eye contour remain stationary. */
export function irisOffset(x=0,y=0){
  const finite=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
  return {x:finite(x)*2.8,y:finite(y)*1.6};
}
/** Independent eyebrow accents; restrained range until the occluded brows are manually repainted. */
export function browYOffset({emotion='calm',side='brow_left',tension=0}={}){
  const bias={surprise:-2.5,curious:side==='brow_left'?-2.3:1.0,proud:side==='brow_right'?-1.8:.6,joy:-.7,shy:.7,focus:-.5};
  const base=bias[emotion]??0;
  return Math.max(-3.2,Math.min(2.6,base+clamp01(tension)*1.1));
}
