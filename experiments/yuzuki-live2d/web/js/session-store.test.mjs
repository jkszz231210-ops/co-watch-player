import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSaved,saveHistory,clearHistory} from './session-store.js';
function fake(){const d=new Map();return {getItem:k=>d.get(k)||null,setItem:(k,v)=>d.set(k,v),removeItem:k=>d.delete(k)};}
test('history off by default',()=>{const s=fake();assert.deepEqual(loadSaved(s),{enabled:false,messages:[]});});
test('opt in save/load and clear',()=>{const s=fake();assert.equal(saveHistory(s,true,[{role:'user',content:'test'}]),true);assert.deepEqual(loadSaved(s).messages,[{role:'user',content:'test'}]);clearHistory(s);assert.deepEqual(loadSaved(s).messages,[]);});
test('opt out deletes saved history and setting',()=>{const s=fake();saveHistory(s,true,[{role:'user',content:'test'}]);saveHistory(s,false,[]);assert.equal(loadSaved(s).enabled,false);});
test('unavailable storage degrades safely',()=>{const s={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.equal(loadSaved(s).enabled,false);assert.equal(saveHistory(s,true,[]),false);});
