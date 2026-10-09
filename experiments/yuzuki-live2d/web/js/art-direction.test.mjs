import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ART_DIRECTION,approvedPortraitPath} from './art-direction.js';
const root=new URL('../../',import.meta.url);
const lock=JSON.parse(readFileSync(new URL('art-direction.lock.json',root),'utf8'));
test('selected picture is frozen and consistent across config',()=>{
  assert.equal(lock.approved,true);assert.equal(lock.candidateId,ART_DIRECTION.candidateId);
  assert.equal(approvedPortraitPath(),ART_DIRECTION.portraitPath);
  assert.equal(lock.webImage,'web/assets/yuzuki-front-a.webp');
});
test('approved source image matches exact uploaded selection',()=>{
  const bytes=readFileSync(new URL(lock.sourceImage,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),lock.sourceSha256);
});
