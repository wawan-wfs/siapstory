import test from 'node:test';
import assert from 'node:assert/strict';
import { frame, settings, trimRange, selectMP4, validateFile } from '../dist/core.mjs';

test('contain retains landscape content without distortion', () => {
  const r = frame(1920,1080,1080,1920,'contain');
  assert.equal(r.dw,1080); assert.equal(r.dh,607.5);
  assert.equal(r.dy,656.25); assert.equal(r.sx,0); assert.equal(r.sw,1920);
});
test('crop fills frame and respects position at either edge', () => {
  const left=frame(1920,1080,1080,1920,'cover',0);
  const right=frame(1920,1080,1080,1920,'cover',100);
  assert.equal(left.sx,0); assert.equal(right.sx+right.sw,1920);
  assert.equal(left.dw,1080); assert.equal(left.dh,1920);
});
test('portrait image crops vertically with bounded positions', () => {
  const r=frame(1000,3000,1080,1920,'cover',50,100);
  assert.equal(r.sy+r.sh,3000); assert.ok(Math.abs(r.sw-1000)<1e-9);
  assert.throws(()=>frame(0,100,1080,1920,'cover'));
});
test('presets advertise exact export dimensions', () => {
  assert.deepEqual([settings('wa','hd').width,settings('wa','hd').height],[1080,1920]);
  assert.deepEqual([settings('ig','light').width,settings('ig','light').height],[720,1280]);
  assert.ok(settings('ig','hd').bitrate>settings('wa','light').bitrate);
});
test('trim is limited by source duration and at most 60 seconds', () => {
  assert.deepEqual(trimRange(10,8,60),{start:8,end:10,duration:2});
  assert.deepEqual(trimRange(200,0,100),{start:0,end:60,duration:60});
  assert.throws(()=>trimRange(NaN,0,30));
});
test('MP4 detection refuses WebM-only browsers', () => {
  assert.equal(selectMP4(t=>t.includes('webm')),null);
  assert.equal(selectMP4(t=>t==='video/mp4'),null,'An MP4 container alone does not ensure compatible codecs');
  assert.ok(selectMP4(t=>t.includes('avc1')&&t.includes('mp4a')).includes('mp4a'));
  assert.equal(selectMP4(t=>t.includes('avc1')&&!t.includes('mp4a'),true),null);
  assert.ok(selectMP4(t=>t.includes('avc1')&&!t.includes('mp4a'),false));
});
test('bad files are rejected before decoding', () => {
  assert.match(validateFile({type:'text/plain',size:20}),/foto atau video/);
  assert.match(validateFile({type:'video/mp4',size:600*1024*1024}),/500 MB/);
  assert.equal(validateFile({type:'image/jpeg',size:100}),null);
});
