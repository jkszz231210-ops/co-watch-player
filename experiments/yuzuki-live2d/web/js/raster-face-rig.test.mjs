import test from 'node:test';import assert from 'node:assert/strict';
import {PART_BOXES,blinkValue,desiredEyeScale,mouthShape,smootherstep} from './raster-face-rig.js';
test('all face regions lie within the approved 1024x1536 portrait',()=>{for(const [name,[x,y,r,b]] of Object.entries(PART_BOXES)){assert.ok(x>=0&&y>=0&&r<=1024&&b<=1536&&r>x&&b>y,name);}});
test('blink interval closes and reopens deterministically',()=>{assert.equal(blinkValue(100),1);assert.ok(blinkValue(3570)<.06);assert.equal(blinkValue(3700),1);});
test('eye openness is clamped and respects blink override',()=>{assert.equal(desiredEyeScale(.62,1),1);assert.equal(desiredEyeScale(2,1),1);assert.ok(desiredEyeScale(.62,.1)<.11);assert.ok(desiredEyeScale(0,1)>0);});
test('mouth shape grows monotonically and zero is closed',()=>{assert.equal(mouthShape(0).height,0);assert.ok(mouthShape(.65).height>mouthShape(.2).height);assert.equal(mouthShape(9).height,23);});
test('smoothstep clamps out of range',()=>{assert.equal(smootherstep(-100),0);assert.equal(smootherstep(100),1);});
