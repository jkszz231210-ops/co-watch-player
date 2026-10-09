import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPRESSIONS, PARAM_LABELS,findExpression,mixParameters,localReply } from './character-engine.js';
test('all sixteen expressions have unique IDs and complete finite parameters',()=>{assert.equal(EXPRESSIONS.length,16);assert.equal(new Set(EXPRESSIONS.map(e=>e.id)).size,16);for(const e of EXPRESSIONS){assert.deepEqual(Object.keys(e.parameters),Object.keys(PARAM_LABELS));for(const n of Object.values(e.parameters))assert.equal(Number.isFinite(n),true);}});
test('unknown expression falls back to calm',()=>assert.equal(findExpression('unknown').id,'calm'));
test('parameter blending is stable and clamped',()=>{const a=findExpression('calm').parameters,b=findExpression('joy').parameters;assert.deepEqual(mixParameters(a,b,-1),a);assert.deepEqual(mixParameters(a,b,1.5),b);assert.ok(Math.abs(mixParameters(a,b,.5).smile-(a.smile+b.smile)/2)<1e-10);});
test('offline conversation maps tone to relevant emotion',()=>{assert.equal(localReply('你好').emotion,'smile');assert.equal(localReply('今天我好累').emotion,'comfort');assert.equal(localReply('你真可爱').emotion,'shy');assert.equal(localReply('成功完成了').emotion,'joy');});
