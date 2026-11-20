import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const asset=name=>readFile(new URL(`../dist/${name}`,import.meta.url),'utf8');
test('cinematic hero no longer uses split right-side background',async()=>{
 const css=await asset('landing.css');
 assert.doesNotMatch(css,/right:0;width:53\.5%;height:100%;background:/);
 assert.match(css,/\.hero\{background:#090911/);
 assert.match(css,/\.hero::after\{inset:0;width:100%/);
});
test('scroll-driven portal contains three semantic chapters',async()=>{
 const html=await asset('index.html');
 const script=await asset('cinematic-v5.mjs');
 assert.match(html,/id="portal"/);
 for(const cls of ['portal-line-one','portal-line-two','portal-line-three'])assert.match(html,new RegExp(cls));
 assert.match(script,/requestAnimationFrame\(render\)/);
 assert.match(script,/getBoundingClientRect\(\)/);
 assert.match(script,/--opacity-a/);
});
test('real interactive controls from v4.1 are retained',async()=>{
 const html=await asset('index.html');
 for(const id of ['autoScrollToggle','backToTop','motionToggle','scrollSpeed','scrollMode','compareRange'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/cinematic-v6\.mjs/);
});
test('portal has reduced motion and responsive styles',async()=>{
 const css=await asset('landing.css');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/html\.motion-off \.cinema-portal/);
 assert.match(css,/\.portal-photo/);
 assert.match(css,/\.portal-sphere/);
});
