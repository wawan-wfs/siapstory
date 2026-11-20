// The recorder becomes inactive before its final data arrives. Only onstop seals the Blob.
export function prepareRecording(stream,options,{flushTimeout=10000}={}){
  const recorder=new MediaRecorder(stream,options),chunks=[];
  let done=false,timer,rejectRecording;
  const finished=new Promise((resolve,reject)=>{
    rejectRecording=error=>{if(done)return;done=true;clearTimeout(timer);reject(error);};
    recorder.ondataavailable=e=>{if(!done&&e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{if(done)return;done=true;clearTimeout(timer);resolve(new Blob(chunks,{type:recorder.mimeType}));};
    recorder.onerror=()=>rejectRecording(new Error('Browser gagal mengekspor video. Coba resolusi 720p atau MP4 lain.'));
  });
  return {recorder,finished,stop(){
    if(done)return;
    if(!timer)timer=setTimeout(()=>rejectRecording(new Error('Browser terlalu lama menyelesaikan video. Coba lagi dengan resolusi 720p.')),flushTimeout);
    if(recorder.state!=='inactive')try{recorder.stop();}catch(error){rejectRecording(error);}
  }};
}

export function startMediaPlayback(video,audioContext,{signal,timeout=15000}={}){
  return new Promise((resolve,reject)=>{
    let settled=false,timer;
    const finish=error=>{
      if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      if(error){video.pause();reject(error);}else resolve();
    };
    const abort=()=>finish(new Error('Ekspor dibatalkan. File asli tetap aman.'));
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>finish(new Error('Video terlalu lama memulai pemutaran. Coba lagi atau gunakan file asli.')),timeout);
    try{Promise.all([video.play(),audioContext?.resume()]).then(()=>finish(),finish);}catch(error){finish(error);}
  });
}
