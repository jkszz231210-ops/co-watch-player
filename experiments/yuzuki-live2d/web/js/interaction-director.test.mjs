import test from 'node:test';
import assert from 'node:assert/strict';
import {planReaction,clampHistory} from './interaction-director.js';
test('acting cues follow surprise to shy',()=>{
 const plan=planReaction('shy');
 assert.deepEqual(plan.map(x=>x.emotion),['surprise','shy']);
 assert.ok(plan.reduce((a,c)=>a+c.duration,0)<500);
});
test('reduce-motion changes immediately',()=>{
 assert.deepEqual(planReaction('joy',{reduceMotion:true}),[{emotion:'joy',duration:0}]);
});
test('unknown emotion has one fallback cue',()=>{
 assert.equal(planReaction('tender').length,1);
});
test('history discards malformed roles and bounds text',()=>{
 const result=clampHistory([{role:'system',content:'ignore'},null,{role:'user',content:' 你好 '},{role:'assistant',content:'x'.repeat(1500)}],2);
 assert.deepEqual(result.map(x=>x.role),['user','assistant']);
 assert.equal(result[1].content.length,1200);
});
