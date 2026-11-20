import test from 'node:test';
import assert from 'node:assert/strict';
import {startMediaPlayback} from '../dist/recording.mjs';

test('cancel escapes an AudioContext resume promise that never settles',{timeout:300},async()=>{
  const controller=new AbortController();let paused=false;
  const video={play:()=>Promise.resolve(),pause:()=>{paused=true;}};
  const context={resume:()=>new Promise(()=>{})};
  const playback=startMediaPlayback(video,context,{signal:controller.signal,timeout:10000});
  const rejected=assert.rejects(playback,/dibatalkan/);controller.abort();await rejected;
  assert.equal(paused,true);
});
test('stalled playback startup has a bounded timeout',{timeout:300},async()=>{
  let paused=false;const video={play:()=>new Promise(()=>{}),pause:()=>{paused=true;}};
  await assert.rejects(startMediaPlayback(video,null,{timeout:10}),/terlalu lama/);assert.equal(paused,true);
});
test('play and resume are requested synchronously in the user gesture',async()=>{
  const calls=[],video={play:()=>{calls.push('play');return Promise.resolve();},pause:()=>calls.push('pause')};
  const result=startMediaPlayback(video,{resume:()=>{calls.push('resume');return Promise.resolve();}});
  assert.deepEqual(calls,['play','resume']);await result;assert.deepEqual(calls,['play','resume']);
});
