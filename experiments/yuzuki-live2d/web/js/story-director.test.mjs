import test from 'node:test';import assert from 'node:assert/strict';import {EXPRESSIONS} from './character-engine.js';import {CHOREOGRAPHIES,getStory,validateStories} from './story-director.js';
test('all scenes reference existing emotions with humane transitions',()=>assert.equal(validateStories(CHOREOGRAPHIES,new Set(EXPRESSIONS.map(x=>x.id))),true));
test('unknown scene is never fabricated',()=>assert.equal(getStory('missing'),null));
test('compliment and comfort scenarios have distinctly different timing',()=>assert.notDeepEqual(getStory('compliment').steps.map(x=>x.emotion),getStory('comfort').steps.map(x=>x.emotion)));
