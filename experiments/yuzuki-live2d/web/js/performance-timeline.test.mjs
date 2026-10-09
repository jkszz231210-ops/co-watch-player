import test from 'node:test';
import assert from 'node:assert/strict';
import {approach,advanceFace,idleGaze,idleBreath,DEFAULT_FACE} from './performance-timeline.js';
test('exponential smoothing is stable across FPS',()=>{
 const once=approach(0,1,.4,.18);let a=0;for(let i=0;i<40;i++)a=approach(a,1,.01,.18);
 assert.ok(Math.abs(once-a)<1e-10);
});
test('face changes smoothly but reduced motion is immediate',()=>{
 const target={...DEFAULT_FACE,blush:1,smile:1,eyeOpen:.3};
 const first=advanceFace(DEFAULT_FACE,target,.016);
 assert.ok(first.blush>0&&first.blush<.08);
 assert.ok(first.smile>.08&&first.smile<1);
 assert.deepEqual(advanceFace(DEFAULT_FACE,target,.016,false),target);
});
test('invalid target values cannot corrupt canvas parameters',()=>{
 const r=advanceFace({}, {eyeOpen:NaN, smile:Infinity,blush:-100,headTilt:100},.1);
 assert.equal(r.eyeOpen,.62);assert.equal(r.smile,.08);
 assert.equal(r.blush,0);assert.ok(r.headTilt<=1);
});
test('idle gaze is small, bounded, and repeatable',()=>{
 for(let time=0;time<30000;time+=17){const a=idleGaze(time);const b=idleGaze(time);assert.deepEqual(a,b);assert.ok(Math.abs(a.x)<=.22&&Math.abs(a.y)<=.16);}
});
test('idle gaze holds before soft saccade, not constant shaking',()=>{
 assert.deepEqual(idleGaze(200),idleGaze(1000));
 const a=idleGaze(2750),b=idleGaze(3350);assert.notDeepEqual(a,b);
});
test('breathing remains restrained and disabled elsewhere',()=>{
 for(let t=0;t<=10000;t+=100)assert.ok(Math.abs(idleBreath(t,'shy'))<=.33);
 assert.equal(idleBreath(NaN),0);
});

test('negative smile and nuanced frown are preserved during easing',()=>{const f=advanceFace(DEFAULT_FACE,{...DEFAULT_FACE,smile:-.8},.2);assert.ok(f.smile<0&&f.smile>-.8);});
