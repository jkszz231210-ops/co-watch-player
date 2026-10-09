import test from 'node:test';import assert from 'node:assert/strict';
import {irregularBlink,eyeScale,resolveLip,rmsToOpenness,charToViseme,textVisemeAt,visemeGeometry,VISEMES} from './face-performance.js';
test('natural blink closes and reopens, stays within [0,1]',()=>{const values=Array.from({length:250},(_,i)=>irregularBlink(i*25));assert.ok(values.some(v=>v<.06));assert.ok(values.every(v=>v>=0&&v<=1));assert.equal(irregularBlink(1000),1);});
test('natural blink is deterministic and time bounded even for very long sessions',()=>{assert.equal(irregularBlink(3600000),irregularBlink(3600000));assert.ok(irregularBlink(999999999)>=0);});
test('mouth states are finite and bounded for all supported visemes',()=>{for(const v of VISEMES){const p=visemeGeometry(v,.75);assert.ok(p.width>=0&&p.width<=1&&p.height>=0&&p.height<=1);}});
test('punctuation creates a speech pause, and Chinese uses approximate patterns',()=>{assert.equal(charToViseme('，'),'rest');assert.equal(charToViseme(' '),'rest');assert.ok(VISEMES.includes(charToViseme('你')));assert.equal(textVisemeAt('你好',99999),'rest');});
test('mouth is overridden by explicit manual test pose',()=>{assert.equal(resolveLip({emotionOpen:1,voiceOpen:1,forcedOpen:0}),0);assert.equal(resolveLip({emotionOpen:0,voiceOpen:1,forcedOpen:.34}),.34);});
test('mic level respects noise gate and never overflows',()=>{assert.equal(rmsToOpenness(0),0);assert.ok(rmsToOpenness(.1)>rmsToOpenness(.02));assert.equal(rmsToOpenness(999),1);});
test('eye openness is robust against extreme input',()=>{assert.equal(eyeScale(999,1),1);assert.equal(eyeScale(-10,1),.055);assert.ok(eyeScale(.62,.04)<.05);});
