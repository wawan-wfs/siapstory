import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaKind, outputSettings, originalResult, isMP4 } from '../dist/core.mjs';

test('filename fallback accepts camera files with an empty MIME type',()=>{
  assert.equal(mediaKind({type:'',name:'holiday.MOV'}),'video');
  assert.equal(mediaKind({type:'',name:'camera.HEIC'}),'image');
  assert.equal(mediaKind({type:'text/plain',name:'image.jpg'}),null);
  assert.equal(mediaKind({type:'',name:'document.pdf'}),null);
});
test('small portrait is never enlarged when source protection is on',()=>{
  const s=outputSettings('ig','hd',{width:480,height:640,mode:'contain',protect:true});
  assert.ok(s.width<=480); assert.equal(s.width/s.height,9/16);
  assert.equal(s.width%2,0); assert.equal(s.height%2,0);
});
test('cover mode protects the cropped source area rather than only its width',()=>{
  const s=outputSettings('wa','hd',{width:1920,height:1080,mode:'cover',protect:true});
  assert.ok(s.height<=1080); assert.equal(s.width/s.height,9/16);
});
test('large landscape can keep the full HD frame without enlarging foreground pixels',()=>{
  const s=outputSettings('wa','hd',{width:4000,height:3000,mode:'contain',protect:true});
  assert.deepEqual([s.width,s.height],[1080,1920]);
});
test('explicit enlargement uses the chosen resolution',()=>{
  const s=outputSettings('ig','hd',{width:480,height:640,mode:'cover',protect:false});
  assert.deepEqual([s.width,s.height],[1080,1920]);
});
test('original mode retains the identical source Blob and filename',async()=>{
  const file=new Blob([new Uint8Array([0,255,10,23])],{type:'image/jpeg'});file.name='original.jpg';
  const result=originalResult(file);
  assert.equal(result.blob,file);assert.equal(result.filename,'original.jpg');
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()),new Uint8Array([0,255,10,23]));
});
test('MP4 detection checks the container bytes, not just a filename or MIME type',async()=>{
  assert.equal(await isMP4(new Blob([new Uint8Array([0,0,0,20,102,116,121,112,105,115,111,109])])),true);
  assert.equal(await isMP4(new Blob(['this is not mp4'],{type:'video/mp4'})),false);
  assert.equal(await isMP4(new Blob([])),false);
});
