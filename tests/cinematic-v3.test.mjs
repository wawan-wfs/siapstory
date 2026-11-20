import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_STYLE,sanitizeStyle,buildFilter,drawFinishing} from '../dist/premium.mjs';
const root=new URL('../dist/',import.meta.url);

test('new finishing controls are safely bounded and neutral by default',()=>{
  for(const name of ['warmth','grain','vignette'])assert.equal(DEFAULT_STYLE[name],0);
  const style=sanitizeStyle({warmth:'1000',grain:-90,vignette:'invalid'});
  assert.equal(style.warmth,100);assert.equal(style.grain,0);assert.equal(style.vignette,0);
  assert.equal(sanitizeStyle({warmth:53,grain:15,vignette:70}).grain,15);
  assert.match(buildFilter({warmth:75}),/sepia\(0\.263\)/);
});

test('vignette finishing renders safely on the output canvas and restores context',()=>{
  let save=0,restore=0,fill=0,stops=0;
  const ctx={save(){save++;},restore(){restore++;},createRadialGradient(){return {addColorStop(){stops++;}};},fillRect(){fill++;}};
  drawFinishing(ctx,1080,1920,{vignette:80});
  assert.equal(save,1);assert.equal(restore,1);assert.equal(fill,1);assert.equal(stops,3);
  drawFinishing(ctx,1080,1920,{});
  assert.equal(save,1,'Neutral default should not modify drawing context');
});

test('grain tile renders deterministically without requiring network assets',()=>{
  const was=globalThis.document;
  try{
    let pattern=0,draw=0,seeded=0;
    globalThis.document={createElement(){return {width:0,height:0,getContext(){return {createImageData(w,h){assert.equal(w,96);assert.equal(h,96);return {data:new Uint8ClampedArray(w*h*4)};},putImageData(image){seeded=image.data.length;}};}};}};
    const ctx={save(){},restore(){},createPattern(){pattern++;return {};},fillRect(){draw++;}};
    drawFinishing(ctx,540,960,{grain:54});
    assert.equal(seeded,96*96*4);assert.equal(pattern,1);assert.equal(draw,1);
    assert.equal(ctx.globalCompositeOperation,'soft-light');
  }finally{globalThis.document=was;}
});

test('cinematic UI exposes chapter tour, accessible compare, scroll controls and responsive motion',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  const js=await readFile(new URL('landing.mjs',root),'utf8');
  const css=await readFile(new URL('landing.css',root),'utf8');
  for(const id of ['chapterRail','compareRange','comparePercent','motionToggle','scrollMode','scrollSpeed','autoScrollToggle','backToTop'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/aria-label="Bandingkan foto asli/);
  assert.match(js,/function nextChapter/);
  assert.match(js,/function renderComparison/);
  assert.match(js,/motionEnabled\(\)/);
  assert.match(css,/\.comparison/);
  assert.match(css,/\.kinetic-track/);
});

test('new finishing controls are wired through studio preview and export',async()=>{
  const html=await readFile(new URL('studio.html',root),'utf8');
  const js=await readFile(new URL('app.mjs',root),'utf8');
  for(const id of ['warmth','grain','vignette'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(js,/drawFinishing\(ctx,w,h,style\)/);
});
