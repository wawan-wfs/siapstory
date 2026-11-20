import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRecording } from '../dist/recording.mjs';

test('repeated stop waits for the final MP4 data before resolving',async()=>{
  const RealRecorder=globalThis.MediaRecorder;
  class DelayedRecorder{
    constructor(){this.state='recording';this.mimeType='video/mp4';}
    stop(){this.state='inactive';setTimeout(()=>{this.ondataavailable({data:new Blob(['final-mp4-data'])});this.onstop();},25);}
  }
  globalThis.MediaRecorder=DelayedRecorder;
  try{
    const recording=prepareRecording({},{});let resolved=false;
    recording.finished.then(()=>{resolved=true;});recording.stop();recording.stop();
    await Promise.resolve();assert.equal(resolved,false,'Only onstop may finalize the file');
    const blob=await recording.finished;assert.equal(await blob.text(),'final-mp4-data');assert.equal(blob.type,'video/mp4');
  }finally{globalThis.MediaRecorder=RealRecorder;}
});
test('encoder errors reject instead of returning partial media',async()=>{
  const RealRecorder=globalThis.MediaRecorder;
  globalThis.MediaRecorder=class{constructor(){this.state='recording';this.mimeType='video/mp4';}stop(){this.state='inactive';}};
  try{const recording=prepareRecording({},{});const rejected=assert.rejects(recording.finished,/720p/);recording.recorder.onerror();await rejected;}finally{globalThis.MediaRecorder=RealRecorder;}
});
test('missing final stop event times out instead of leaving export stuck',{timeout:300},async()=>{
  const RealRecorder=globalThis.MediaRecorder;
  globalThis.MediaRecorder=class{constructor(){this.state='recording';this.mimeType='video/mp4';}stop(){this.state='inactive';}};
  try{const recording=prepareRecording({},{},{flushTimeout:10});const rejected=assert.rejects(recording.finished,/menyelesaikan/);recording.stop();await rejected;}finally{globalThis.MediaRecorder=RealRecorder;}
});
