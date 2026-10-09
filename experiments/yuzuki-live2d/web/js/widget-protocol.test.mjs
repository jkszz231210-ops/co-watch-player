import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWidgetCommand,widgetEvent,WIDGET_EMOTIONS} from './widget-protocol.js';

test('reject unrecognized messages including prototype keys and malformed content',()=>{
 for(const val of [null,[],{},'hello',{type:'yuzuki:command',command:'unknown'},{type:'yuzuki:command',command:'emotion',emotion:'__proto__'},{type:'yuzuki:command',command:'gaze',x:'1',y:0},{type:'yuzuki:command',command:'say',text:{}}])assert.equal(normalizeWidgetCommand(val),null);
});
test('all 16 supported emotions are addressable',()=>{
 assert.equal(WIDGET_EMOTIONS.size,16);
 for(const emotion of WIDGET_EMOTIONS)assert.deepEqual(normalizeWidgetCommand({type:'yuzuki:command',command:'emotion',emotion}),{command:'emotion',emotion});
});
test('text is trimmed and bounded for safe rendering',()=>{
 const out=normalizeWidgetCommand({type:'yuzuki:command',command:'say',text:' '+('好'.repeat(300))+' ',emotion:'shy'});
 assert.equal(out.text.length,180);assert.equal(out.emotion,'shy');
 assert.equal(normalizeWidgetCommand({type:'yuzuki:command',command:'say',text:'\t'}),null);
});
test('gaze clamps and rejects non-finite numbers',()=>{
 assert.deepEqual(normalizeWidgetCommand({type:'yuzuki:command',command:'gaze',x:20,y:-8}),{command:'gaze',x:1,y:-1});
 assert.equal(normalizeWidgetCommand({type:'yuzuki:command',command:'gaze',x:NaN,y:0}),null);
});
test('motion requires boolean and ping yields event',()=>{
 assert.deepEqual(normalizeWidgetCommand({type:'yuzuki:command',command:'motion',enabled:false}),{command:'motion',enabled:false});
 assert.equal(normalizeWidgetCommand({type:'yuzuki:command',command:'motion',enabled:1}),null);
 assert.deepEqual(widgetEvent('ready',{version:'1.2.0'}),{type:'yuzuki:event',event:'ready',version:'1.2.0'});
});
