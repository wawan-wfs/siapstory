import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STYLE,PRESETS,sanitizeStyle,buildFilter,decodePresets,drawOverlay} from '../dist/premium.mjs';
test('untrusted saved styles are bounded and cannot inject canvas filter expressions',()=>{
  const s=sanitizeStyle({look:'url(https://bad.example)',brightness:999,contrast:-12,saturation:Infinity,color:'red;url(x)',textSize:-5,background:'url(x)',title:'A'.repeat(140),watermark:'B'.repeat(60)});
  assert.equal(s.look,'original');assert.equal(s.brightness,150);assert.equal(s.contrast,50);assert.equal(s.saturation,100);assert.equal(s.color,DEFAULT_STYLE.color);assert.equal(s.background,'blur');assert.equal(s.textSize,36);assert.equal(s.title.length,100);assert.equal(s.watermark.length,40);assert.doesNotMatch(buildFilter(s),/url\(/);
});
test('corrupted preset storage recovers and keeps at most eight sanitized styles',()=>{
  assert.deepEqual(decodePresets('broken'),[]);assert.deepEqual(decodePresets('{"name":"bad"}'),[]);
  const p=decodePresets(JSON.stringify(Array.from({length:12},()=>({name:'N'.repeat(40),style:{brightness:600}}))));assert.equal(p.length,8);assert.equal(p[0].name.length,32);assert.equal(p[0].style.brightness,150);
});
test('all advertised creative presets produce supported rendering parameters',()=>{
  assert.equal(Object.keys(PRESETS).length,6);for(const p of Object.values(PRESETS)){assert.deepEqual(sanitizeStyle(p),p);assert.match(buildFilter(p),/brightness\(1\)/);}
});
test('overlay preserves canvas state and bounds a long unbroken title',()=>{
  let balance=0;const calls=[];const ctx={save(){balance++;},restore(){balance--;},measureText(t){return {width:t.length*50};},createLinearGradient(){return {addColorStop(){}};},fillRect(){},fillText(...args){calls.push(args);}};
  drawOverlay(ctx,1080,1920,{title:'A'.repeat(100),watermark:'@brand',textPosition:'bottom'});assert.equal(balance,0);assert.ok(calls.length<=5);assert.equal(calls.at(-1)[0],'@brand');for(const [,x,y] of calls){assert.ok(x>=0&&x<=1080);assert.ok(y>=0&&y<1920);}
});
test('no text or brand means the renderer adds no overlay',()=>{drawOverlay({save(){throw Error('Should not draw');}},1080,1920,DEFAULT_STYLE);});
test('premium typography, watermark placement, and frame options are safely sanitized',()=>{
  const s=sanitizeStyle({fontFamily:'serif',textAlign:'center',textColor:'accent',watermarkPosition:'top-right',frameBorder:'bold'});
  assert.equal(s.fontFamily,'serif');assert.equal(s.textAlign,'center');assert.equal(s.textColor,'accent');
  assert.equal(s.watermarkPosition,'top-right');assert.equal(s.frameBorder,'bold');
  const unsafe=sanitizeStyle({fontFamily:'url(x)',textAlign:'justify',textColor:'url(x)',watermarkPosition:'center',frameBorder:'url(x)'});
  assert.equal(unsafe.fontFamily,'sans');assert.equal(unsafe.textAlign,'left');assert.equal(unsafe.textColor,'white');
  assert.equal(unsafe.watermarkPosition,'bottom-right');assert.equal(unsafe.frameBorder,'none');
});
test('signature frame can render without title or watermark',()=>{
  let balance=0,stroke=0;
  const ctx={save(){balance++;},restore(){balance--;},strokeRect(){stroke++;}};
  drawOverlay(ctx,1080,1920,{...DEFAULT_STYLE,frameBorder:'thin'});
  assert.equal(balance,0);assert.equal(stroke,1);
});
