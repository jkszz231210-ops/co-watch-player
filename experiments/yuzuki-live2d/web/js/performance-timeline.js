/**
 * Yuzuki V0.9: frame-rate-independent facial motion, intentional idle gaze,
 * and bounded secondary motion. Renderer neutral, no Cubism claims.
 */
import {clamp01} from './face-performance.js';

export const TRANSITION_TIME = Object.freeze({
  eyeOpen:.12, mouthOpen:.095, smile:.23, blush:.42,
  browTension:.20, headTilt:.52,
});
export const DEFAULT_FACE = Object.freeze({
  eyeOpen:.62,mouthOpen:0,smile:.08,blush:0,browTension:0,headTilt:0,
});
const finiteOr=(v,d)=>Number.isFinite(v)?v:d;

/** Exponential response is identical over equal elapsed time at any FPS. */
export function approach(current,target,dt,tau=.2){
  const c=finiteOr(current,0),t=finiteOr(target,c);
  if(!Number.isFinite(dt)||dt<=0)return c;
  if(!Number.isFinite(tau)||tau<=0)return t;
  return c+(t-c)*(-Math.expm1(-Math.min(2,dt)/tau));
}
export function advanceFace(current,target,dt,enabled=true){
  const next={};
  for(const [key,tau] of Object.entries(TRANSITION_TIME)){
    const aim=finiteOr(target?.[key],DEFAULT_FACE[key]);
    const previous=finiteOr(current?.[key],DEFAULT_FACE[key]);
    const value=enabled?approach(previous,aim,dt,tau):aim;
    next[key]=(key==='headTilt'||key==='smile')?Math.max(-1,Math.min(1,value)):clamp01(value);
  }
  return next;
}

const EYE_TARGETS=Object.freeze([
  [0,0],[.21,-.16],[-.22,.10],[.07,.07],[.0,0],[-.12,-.08],[.13,.13],[0,0]
]);
const fade=t=>{const s=clamp01(t);return s*s*(3-2*s);};
/** Small, deterministic gaze drifts with meaningful rests, not continuous scanning. */
export function idleGaze(elapsedMs=0){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0)return {x:0,y:0};
  const t=elapsedMs%30000;
  const slot=Math.floor(t/3750),fraction=(t%3750)/3750;
  const from=EYE_TARGETS[slot],to=EYE_TARGETS[(slot+1)%EYE_TARGETS.length];
  // Hold the eye for most of the time, then glance and settle.
  const progress=fade((fraction-.73)/.18);
  return {x:from[0]+(to[0]-from[0])*progress,y:from[1]+(to[1]-from[1])*progress};
}
/** Subtle body breath only; never claim true head-angle rotation. */
export function idleBreath(elapsedMs=0,emotion='calm'){
  if(!Number.isFinite(elapsedMs))return 0;
  const amplitude=emotion==='focus'?.23:emotion==='shy'?.32:.16;
  return Math.sin(elapsedMs*2*Math.PI/5700)*amplitude;
}
