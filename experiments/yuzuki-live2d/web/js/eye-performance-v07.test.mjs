import test from 'node:test';
import assert from 'node:assert/strict';
import {irisOffset,browYOffset} from './eye-performance.js';
test('iris offsets are clamped and finite',()=>{
  assert.deepEqual(irisOffset(),{x:0,y:0});
  assert.deepEqual(irisOffset(50,-50),{x:2.8,y:-1.6});
  assert.deepEqual(irisOffset(NaN,Infinity),{x:0,y:0});
});
test('eyebrows have independently controlled curious pose',()=>{
  const a=browYOffset({emotion:'curious',side:'brow_left'});
  const b=browYOffset({emotion:'curious',side:'brow_right'});
  assert.ok(a<0&&b>0);
  assert.notEqual(a,b);
});
test('expression changes keep brow motion restrained',()=>{
  for(const emotion of ['calm','surprise','curious','proud','joy','shy','focus','sad']){
    for(const side of ['brow_left','brow_right']){
      for(const tension of [0,.5,1,10]){
        const y=browYOffset({emotion,side,tension});
        assert.ok(y>=-3.2&&y<=2.6,`${emotion}/${side}: ${y}`);
      }
    }
  }
});
