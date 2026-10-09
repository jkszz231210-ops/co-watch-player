/**
 * V0.6 expression-aware per-eye controller.
 * No Cubism mesh. Closure artwork remains two independent raster/SVG overlays.
 */
import { clamp01, eyeScale, irregularBlink } from './face-performance.js';
export const SIDES=Object.freeze(['eye_left','eye_right']);
const ease=v=>{const x=clamp01(v);return x*x*(3-2*x);};
export function winkEnvelope(elapsedMs,durationMs=760){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>=durationMs)return 0;
  const progress=elapsedMs/durationMs;
  if(progress<.23)return ease(progress/.23);
  if(progress<.48)return 1;
  return 1-ease((progress-.48)/.52);
}
export function blinkForSide(timeMs,side){
  return irregularBlink(timeMs+(side==='eye_right'?12:0));
}
export function eyePose({emotionEye=.62,smile=.08,browTension=0,blink=1,wink=0,side='eye_left',emotion='calm'}={}){
  const normal=eyeScale(emotionEye,blink);
  const warmSquint=clamp01((smile-.28)/.85)*.15;
  const attention=emotion==='focus'?.08:0;
  const surprised=emotion==='surprise'?.1:0;
  const curiousBias=emotion==='curious'?(side==='eye_left'?.07:-.06):0;
  const proudBias=emotion==='proud'?(side==='eye_right'?.10:0):0;
  const stress=clamp01(browTension)*.065;
  const expression=Math.max(.04,Math.min(1,normal-warmSquint-stress-proudBias+attention+surprised+curiousBias));
  return Math.max(.035,expression*(1-.965*clamp01(wink)));
}
export function eyeLidOpacity(openness){return ease((.28-clamp01(openness))/.19);}
export function eyeArtOpacity(openness){return ease((clamp01(openness)-.045)/.31);}
export function eyeOffsetsFromGaze(x,y){return{x:Math.max(-.6,Math.min(.6,x*.6)),y:Math.max(-.35,Math.min(.35,y*.35))};}
