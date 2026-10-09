import test from 'node:test';
import assert from 'node:assert/strict';
import {FRAME_COUNT,CELL_W,CELL_H,sampleFrame,drawBlink,blinkClosure} from './blink-v20.js';
test('41 frame atlas supports 2.5 percent samples',()=>{assert.equal(FRAME_COUNT,41);assert.equal(sampleFrame(0),0);assert.equal(sampleFrame(.025),1);assert.equal(sampleFrame(.5),20);assert.equal(sampleFrame(1),40)});
test('open eyes are never overwritten',()=>{const operations=[]; const ctx={drawImage(...args){operations.push(args)}};drawBlink(ctx,{},[10,20,40,60],0,0);assert.equal(operations.length,0)});
test('only one eyelid sprite is drawn for each sampled pose',()=>{let count=0;let args;const ctx={drawImage(...value){count++;args=value}};drawBlink(ctx,{},[319,442,489,571],.5,1);assert.equal(count,1);assert.equal(args[1],20*CELL_W);assert.equal(args[2],CELL_H);assert.equal(args[7],170);assert.equal(args[8],129)});
test('wink and blink closure stay bounded',()=>{assert.equal(blinkClosure(0,0),1);assert.equal(blinkClosure(1,0),0);assert.equal(blinkClosure(1,1),1);assert.equal(blinkClosure(1,.5),.5)})
