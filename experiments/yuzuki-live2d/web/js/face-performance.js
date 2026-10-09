/**
 * Yuzuki V0.5: deterministic facial choreography, independent from Canvas/Cubism.
 * Speaking is approximated from text rhythm unless the microphone meter is active.
 * It is not phoneme recognition or audio-derived lip sync for browser TTS.
 */
export const VISEMES = Object.freeze(['rest','a','i','u','e','o']);
export const clamp01 = v => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
export const ease = v => { const t=clamp01(v);return t*t*(3-2*t); };
export function irregularBlink(ms, seed=17) {
  if(!Number.isFinite(ms)) return 1;
  const time=Math.max(0,ms)%120000;let cycle=0,start=0;
  // Repeating, deterministic pseudo-random intervals: about 2.5–5 seconds.
  while(cycle<100000){
    const hash = Math.sin((cycle+1)*12.9898+seed*78.233)*43758.5453;
    const interval=2500+(hash-Math.floor(hash))*2400;
    const blinkStart=start+interval;
    const length=175+(cycle%3)*22;
    const gap=time-blinkStart;
    if(gap<0)return 1;
    if(gap<=length){
      const fraction=gap/length;
      // Fast closure and slightly slower reopening.
      const openness=fraction<.42?1-ease(fraction/.42):ease((fraction-.42)/.58);
      return Math.max(.04,openness);
    }
    start=blinkStart+length;
    cycle++;
    // Avoid pathological loops for an always-open tab.
    if(start>time)return 1;
  }
  return 1;
}
export function charToViseme(char){
  if(!char || /[\s，。！？,.!?、；：;:…]/u.test(char))return 'rest';
  if(/[iíìī]/i.test(char))return 'i';
  if(/[oóòō]/i.test(char))return 'o';
  if(/[fwmn]/i.test(char))return 'rest';
  if(/[eêēéè]/i.test(char))return 'e';
  if(/[uüvūúù]/i.test(char))return 'u';
  if(/[a-z]/i.test(char))return 'a';
  // For Chinese text no G2P is assumed. Evenly varying approximate mouth types.
  const code=char.codePointAt(0);
  return ['a','e','i','a','o','u'][code%6];
}
export function textVisemeAt(text,elapsedMs,rate=1){
  const units=Array.from(String(text||''));
  if(!units.length||elapsedMs<0||!Number.isFinite(elapsedMs))return 'rest';
  // Roughly 4–5 Chinese characters per second. Boundary events can override.
  const step=Math.floor(elapsedMs*clamp01(rate/2)*.009);
  if(step>=units.length)return 'rest';
  return charToViseme(units[step]);
}
export function visemeGeometry(viseme='rest',strength=1){
  const shape=({rest:[.05,.03],a:[.76,1],i:[1,.22],u:[.44,.50],e:[.86,.51],o:[.53,.85]})[viseme]||[.05,.03];
  const s=clamp01(strength);
  return {width:shape[0]*s,height:shape[1]*s};
}
/** Suppress normal mouth openness when the microphone/TTS signal is louder. */
export function resolveLip({emotionOpen=0,voiceOpen=0,forcedOpen=null}={}){
  if(forcedOpen!==null)return clamp01(forcedOpen);
  return clamp01(Math.max(emotionOpen*.65,voiceOpen));
}
export function rmsToOpenness(rms,noiseFloor=.018){
  const active=Math.max(0,Number.isFinite(rms)?rms-noiseFloor:0);
  return clamp01(1-Math.exp(-active*22));
}
export function eyeScale(openness,blink=1){
  return Math.max(.055,Math.min(1,Math.max(0,openness)/.62))*clamp01(blink);
}
