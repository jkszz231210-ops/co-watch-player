import test from 'node:test';
import assert from 'node:assert/strict';
import {BLINK_STEPS,blinkClosure,sampleFrame,drawBlink} from './blink-v15.js';
test('21 paired eyelid frames remain ordered',()=>{
  assert.equal(BLINK_STEPS.length,21); assert.equal(BLINK_STEPS.at(0),0);
  assert.equal(BLINK_STEPS.at(-1),1);
});
test('open-eye frame never redraws the approved portrait',()=>{
  const ctx={drawImage(){throw Error('must preserve original')}};
  drawBlink(ctx,{},[0,0,170,129],0,0);
  drawBlink(ctx,{},[0,0,170,129],.01,0);
});
test('closed eye selects final cell, no cross-faded double eyelash',()=>{
  const calls=[];const ctx={drawImage(...args){calls.push(args)}};
  drawBlink(ctx,{},[319,442,489,571],1,0);
  assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(1,5),[3840,0,170,129]);
});
test('eye closure clamps invalid values and preserves wink behavior',()=>{
  assert.equal(blinkClosure(1,0),0);assert.equal(blinkClosure(1,1),1);
  assert.equal(sampleFrame(0.49),10);assert.equal(sampleFrame(100),20);
  assert.equal(sampleFrame(Number.NaN),0);
});
