import test from 'node:test';
import assert from 'node:assert/strict';
import {EYE_GEOMETRY,eyelidAperture,traceAperture,paintMovingLid} from './eye-aperture.js';
for(const side of Object.keys(EYE_GEOMETRY)){
  test(`${side}: iris isn't geometrically squashed during closure`,()=>{
    const full=eyelidAperture(side,1),half=eyelidAperture(side,.5),shut=eyelidAperture(side,0);
    assert.equal(full.width,half.width);
    assert.equal(half.height,full.height*.5);
    assert.equal(shut.height,0);
    assert.ok(half.top1.y>full.top1.y&&half.bottom1.y<full.bottom1.y);
    assert.ok(full.top1.y<full.bottom2.y);
  });
  test(`${side}: invalid inputs remain bounded`,()=>{
    assert.equal(eyelidAperture(side,-2).open,0);
    assert.equal(eyelidAperture(side,99).open,1);
    assert.equal(eyelidAperture(side,NaN).open,0);
  });
}
test('unknown side throws instead of silently drawing at wrong position',()=>assert.throws(()=>eyelidAperture('nose',.5),RangeError));
test('Bezier aperture forms a closed clipping path',()=>{
  const calls=[];const ctx={beginPath(){calls.push('begin')},moveTo(){calls.push('move')},bezierCurveTo(){calls.push('bezier')},lineTo(){calls.push('line')},closePath(){calls.push('close')}};
  traceAperture(ctx,eyelidAperture('eye_left',.5));
  assert.deepEqual(calls,['begin','move','bezier','line','bezier','close']);
});
test('moving lid line only rendered on partially closed eyes',()=>{
 const calls=[];const ctx={save(){calls.push('save')},restore(){calls.push('restore')},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){calls.push('stroke')}};
 paintMovingLid(ctx,eyelidAperture('eye_left',1));assert.equal(calls.length,0);
 paintMovingLid(ctx,eyelidAperture('eye_left',.55));assert.deepEqual(calls,['save','stroke','restore']);
});
