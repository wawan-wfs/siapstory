import {frame,settings,outputSettings,trimRange,selectMP4,validateFile,mediaKind,originalResult,isMP4} from './core.mjs';
import {DEFAULT_STYLE,PRESETS,LOOKS,sanitizeStyle,buildFilter,drawOverlay,drawFinishing,decodePresets} from './premium.mjs';
import {prepareRecording,startMediaPlayback} from './recording.mjs';

const $=id=>document.getElementById(id);
const video=$('sourceVideo'),preview=$('previewCanvas'),canvas=$('exportCanvas');
const backdrop=document.createElement('canvas');backdrop.width=18;backdrop.height=32;
const state={file:null,kind:null,media:null,url:null,resultURL:null,blob:null,filename:'',platform:'wa',quality:'hd',mode:'contain',x:50,y:50,busy:false,loading:false,cancel:null,previewStop:null,audioContext:null,audioSource:null,audioDest:null,decodeError:'',style:{...DEFAULT_STYLE},compare:false};
const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const size=b=>b<1024*1024?`${Math.round(b/1024)} KB`:`${(b/1024/1024).toFixed(1)} MB`;
const detectMP4=audio=>typeof MediaRecorder!=='undefined'&&typeof MediaRecorder.isTypeSupported==='function'?selectMP4(t=>MediaRecorder.isTypeSupported(t),audio):null;
const range=()=>trimRange(video.duration,Number($('clipStart').value),Number($('clipLength').value));

function dimensions(){
  if(!state.media)return null;
  return state.kind==='video'?{width:video.videoWidth,height:video.videoHeight}:{width:state.media.naturalWidth,height:state.media.naturalHeight};
}
function config(){const source=dimensions();return outputSettings(state.platform,state.quality,source?{...source,mode:state.mode,protect:$('protectSource').checked}:null);}
function notify(text,success=false){$('message').textContent=text;$('message').hidden=!text;$('message').classList.toggle('success',success);}
function clearResult(){
  $('resultVideo').pause();$('resultVideo').removeAttribute('src');$('resultVideo').load();$('resultImage').removeAttribute('src');
  if(state.resultURL)URL.revokeObjectURL(state.resultURL);
  state.resultURL=null;state.blob=null;$('result').hidden=true;$('download').removeAttribute('href');
}
function update(){
  const locked=state.busy||state.loading;
  for(const el of document.querySelectorAll('.editor button,.editor input,.editor select,.editor textarea'))if(el.id!=='cancelBtn')el.disabled=locked;
  for(const id of ['compareBtn','safeToggle','playBtn'])$(id).disabled=locked;
  updateHistoryButtons();
  let c,geometryError='';try{c=config();}catch(e){c=settings(state.platform,state.quality);geometryError=e.message;}
  const mp4=detectMP4($('keepAudio').checked),canvasVideo=typeof HTMLCanvasElement.prototype.captureStream==='function';
  $('specSize').textContent=`${c.width} × ${c.height}`;
  $('specFormat').textContent=state.kind==='video'?'MP4 · 30 fps':state.kind==='image'?$('imageFormat').value==='png'?'PNG':$('imageFormat').value==='webp'?'WEBP':'JPG':'JPG / MP4';
  $('imageOptions').hidden=state.kind!=='image';$('videoControls').hidden=state.kind!=='video';$('playback').hidden=state.kind!=='video'||!state.media;
  $('positionControls').hidden=state.mode!=='cover';
  $('frameHint').textContent=state.mode==='contain'?'Semua bagian tetap terlihat. Latar mengikuti pilihan di Creative Suite.':'Layar terisi penuh. Geser posisi untuk menjaga subjek tetap terlihat.';
  $('formatHint').textContent=$('imageFormat').value==='png'?'Tanpa kompresi lossy tambahan; ukuran bisa lebih besar.':$('imageFormat').value==='webp'?'Format efisien untuk foto dan Story.':'Ukuran seimbang, kompresi berkualitas tinggi.';
  $('exportBtn').disabled=!state.media||locked||!!geometryError||(state.kind==='video'&&(!mp4||!canvasVideo));
  $('exportBtn').querySelector('span').textContent=state.kind==='video'?'Siapkan video Story':'Siapkan Story';
  $('originalBtn').hidden=!state.file;$('sourceAnalysis').hidden=!state.file;
  $('fileRow').hidden=!state.file;$('pickFile').hidden=!!state.file;$('emptyPreview').hidden=!!state.media;
  $('browserStatus').textContent=mp4&&canvasVideo?'Dukungan ekspor MP4 terdeteksi.':'Foto tersedia. Dukungan ekspor MP4 terbatas di browser ini.';
  let notice=geometryError||state.decodeError;
  const d=dimensions();
  if(state.file){
    if(d){
      const target=settings(state.platform,state.quality),smaller=c.width<target.width;
      $('sourceSummary').textContent=`Sumber ${d.width} × ${d.height}. ${smaller&&$('protectSource').checked?`Hasil dibatasi ${c.width} × ${c.height} agar isi tidak diperbesar.`:'Ukuran sumber terbaca. Simpan asli bila tidak membutuhkan bingkai atau format baru.'}`;
    }else $('sourceSummary').textContent='File asli tetap tersedia. Browser belum bisa membaca pratinjau; coba JPG, PNG, atau MP4 H.264.';
  }
  if(state.kind==='video'&&state.media){
    const r=range();$('startLabel').textContent=clock(r.start);$('clipInfo').textContent=`Bagian ${clock(r.start)}–${clock(r.end)} · ${r.duration.toFixed(1).replace('.0','')} detik dari ${clock(video.duration)}`;
    if(!canvasVideo)notice='Browser ini belum mendukung pemrosesan video dari kanvas. Anda tetap bisa menyimpan file asli.';
    else if(!mp4)notice=$('keepAudio').checked&&detectMP4(false)?'MP4 dengan suara AAC belum didukung. Coba nonaktifkan “Sertakan suara asli”, atau simpan file asli.':'Browser ini belum mendukung ekspor MP4 H.264. Coba browser lain atau simpan file asli.';
  }
  $('sourceNotice').textContent=notice;$('sourceNotice').hidden=!notice;
  document.body.classList.toggle('busy',state.busy);
}
function draw(ctx,w,h,compare=false){
  const d=dimensions();if(!d||!d.width||!d.height)return;
  const style=compare?DEFAULT_STYLE:state.style;
  ctx.save();ctx.filter='none';ctx.fillStyle='#101a2a';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(state.mode==='contain'){
    if(style.background==='blur'){
      const r=frame(d.width,d.height,18,32,'cover'),small=backdrop.getContext('2d',{alpha:false});
      small.drawImage(state.media,r.sx,r.sy,r.sw,r.sh,0,0,18,32);
      ctx.filter=buildFilter(style);ctx.drawImage(backdrop,-w*.06,-h*.06,w*1.12,h*1.12);ctx.filter='none';ctx.fillStyle='#00000035';ctx.fillRect(0,0,w,h);
    }else{if(style.background==='gradient'){const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,style.color);g.addColorStop(1,'#262333');ctx.fillStyle=g;}else ctx.fillStyle=style.color;ctx.fillRect(0,0,w,h);}
  }
  const r=frame(d.width,d.height,w,h,state.mode,state.x,state.y);
  ctx.filter=buildFilter(style);ctx.drawImage(state.media,r.sx,r.sy,r.sw,r.sh,r.dx,r.dy,r.dw,r.dh);ctx.filter='none';
  if(!compare){drawFinishing(ctx,w,h,style);drawOverlay(ctx,w,h,style);}ctx.restore();
}
function render(){draw(preview.getContext('2d',{alpha:false}),preview.width,preview.height,state.compare);}
function pausePreview(){video.pause();state.previewStop?.();state.previewStop=null;$('playBtn').textContent='▶';}
function changed(){if(state.busy)return;clearResult();notify('');update();render();remember();}
function frames(callback){
  let active=true,id,last=-Infinity;const native=typeof video.requestVideoFrameCallback==='function';
  const schedule=()=>{id=native?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);};
  const tick=now=>{if(!active)return;if(now-last>=1000/30-2){last=now;callback();}if(active)schedule();};schedule();
  return ()=>{active=false;if(native)video.cancelVideoFrameCallback(id);else cancelAnimationFrame(id);};
}
function waitForMedia(element,event,trigger,timeout=20000,signal){
  return new Promise((resolve,reject)=>{
    let timer;
    const clean=()=>{clearTimeout(timer);element.removeEventListener(event,ready);element.removeEventListener('error',failed);signal?.removeEventListener('abort',abort);};
    const ready=()=>{clean();resolve();};
    const failed=()=>{clean();reject(new Error('File belum dapat dibaca di browser ini. Coba JPG, PNG, atau MP4 H.264.'));};
    const abort=()=>{clean();reject(new Error('Ekspor dibatalkan. File asli tetap aman.'));};
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    element.addEventListener(event,ready,{once:true});element.addEventListener('error',failed,{once:true});timer=setTimeout(failed,timeout);
    try{trigger();}catch(e){clean();reject(e);}
  });
}
async function loadFile(file){
  if(state.busy||state.loading)return;
  const invalid=validateFile(file);if(invalid){notify(invalid);return;}
  pausePreview();clearResult();state.loading=true;state.decodeError='';state.media=null;
  if(state.url)URL.revokeObjectURL(state.url);
  state.url=URL.createObjectURL(file);state.file=file;state.kind=mediaKind(file);update();notify('Membaca file…',true);
  $('fileName').textContent=file.name||'File dari perangkat';$('fileMeta').textContent=size(file.size);$('fileIcon').querySelector('use').setAttribute('href',state.kind==='video'?'#video':'#photo');
  try{
    if(state.kind==='image'){
      video.removeAttribute('src');video.load();const img=new Image();img.decoding='async';
      await waitForMedia(img,'load',()=>{img.src=state.url;});state.media=img;
    }else{
      video.muted=true;video.preload='auto';
      await waitForMedia(video,'loadeddata',()=>{video.src=state.url;video.load();});
      if(!Number.isFinite(video.duration)||video.duration<=0)throw new Error('Durasi video tidak dapat dibaca. Pilih video MP4 lain.');
      state.media=video;$('clipStart').max=Math.max(0,video.duration-.05);$('clipStart').value=0;$('playTime').textContent='0:00';
    }
    const d=dimensions();if(!d.width||!d.height)throw new Error('Ukuran file tidak dapat dibaca. Coba file lain.');
    state.x=state.y=50;$('posX').value=$('posY').value=50;
    $('fileMeta').textContent=`${d.width} × ${d.height} · ${size(file.size)}${state.kind==='video'?` · ${clock(video.duration)}`:''}`;notify('');render();
  }catch(e){state.media=null;state.decodeError=e.message;notify(e.message);}
  finally{state.loading=false;update();resetHistory();}
}

$('pickFile').addEventListener('click',()=>$('fileInput').click());$('replaceFile').addEventListener('click',()=>$('fileInput').click());
$('fileInput').addEventListener('change',e=>{const file=e.target.files[0];if(file)loadFile(file);e.target.value='';});
for(const event of ['dragenter','dragover'])$('pickFile').addEventListener(event,e=>{e.preventDefault();$('pickFile').classList.add('dragging');});
for(const event of ['dragleave','drop'])$('pickFile').addEventListener(event,e=>{e.preventDefault();$('pickFile').classList.remove('dragging');if(event==='drop'&&e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);});
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>e.preventDefault());
for(const attribute of ['platform','mode'])document.querySelectorAll(`[data-${attribute}]`).forEach(button=>button.addEventListener('click',()=>{
  if(state.busy)return;state[attribute]=button.dataset[attribute];
  document.querySelectorAll(`[data-${attribute}]`).forEach(el=>{const active=el===button;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});changed();
}));
$('quality').addEventListener('change',e=>{state.quality=e.target.value;changed();});
for(const id of ['protectSource','imageFormat','clipLength','keepAudio'])$(id).addEventListener('change',changed);
for(const id of ['posX','posY'])$(id).addEventListener('input',e=>{state[id==='posX'?'x':'y']=Number(e.target.value);changed();});
$('clipStart').addEventListener('input',()=>{pausePreview();video.currentTime=Number($('clipStart').value);changed();});
video.addEventListener('seeked',()=>{if(!state.busy){render();$('playTime').textContent=clock(video.currentTime);}});
video.addEventListener('ended',()=>{if(!state.busy){pausePreview();render();}});
$('playBtn').addEventListener('click',async()=>{
  if(state.busy||!state.media)return;
  if(!video.paused){pausePreview();return;}
  try{
    video.muted=true;const r=range();if(video.ended||video.currentTime<r.start||video.currentTime>=r.end)video.currentTime=r.start;
    await startMediaPlayback(video,state.audioContext);$('playBtn').textContent='Ⅱ';
    state.previewStop=frames(()=>{render();$('playTime').textContent=clock(video.currentTime);if(video.currentTime>=r.end)pausePreview();});
  }catch{notify('Pratinjau belum dapat diputar. Ketuk tombol putar lagi atau pilih file MP4 lain.');}
});
$('safeToggle').addEventListener('click',()=>{const show=$('safeOverlay').hidden;$('safeOverlay').hidden=!show;$('safeToggle').setAttribute('aria-pressed',String(show));});
$('guideOpen').addEventListener('click',()=>$('guide').showModal());$('guideClose').addEventListener('click',()=>$('guide').close());
$('guide').addEventListener('click',e=>{if(e.target===$('guide')){const r=$('guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('guide').close();}});
$('loadDemo').addEventListener('click',async()=>{
  if(state.busy||state.loading)return;$('loadDemo').disabled=true;
  try{const response=await fetch('assets/story-coast.webp');if(!response.ok)throw new Error();const blob=await response.blob();await loadFile(new File([blob],'Contoh-pantai.webp',{type:'image/webp'}));}catch{notify('Foto contoh belum dapat dibuka. Pilih foto dari galeri untuk mencoba.');}finally{update();}
});

function resultMetadata(info){return [info.width&&info.height?`${info.width} × ${info.height}`:null,info.original?'FILE ASLI':info.extension.toUpperCase(),size(info.blob.size),info.duration>0?`${info.duration.toFixed(1)} detik`:null].filter(Boolean).join(' · ');}
function publishResult(info){
  if(!info.blob||!info.blob.size)throw new Error('File hasil kosong. Coba lagi dengan file lain.');
  clearResult();state.blob=info.blob;state.filename=info.filename;state.resultURL=URL.createObjectURL(info.blob);
  $('download').href=state.resultURL;$('download').download=info.filename;$('download').lastChild.textContent=info.original?' Simpan file asli':' Simpan hasil';
  $('resultEyebrow').textContent=info.original?'ASLINYA, TETAP ASLI.':'LANGKAH TERAKHIR.';
  $('resultTitle').textContent=info.original?'File asli. Tanpa konversi.':'Periksa hasilnya. Lalu bagikan ceritanya.';
  $('resultMeta').textContent=resultMetadata(info);$('resultPreviewLabel').textContent=info.original?'FILE ASLI · TANPA KONVERSI':'FILE HASIL EKSPOR';
  $('resultDescription').textContent=info.original?'File ini identik dengan yang kamu pilih. Ukuran, format dan isinya tidak diubah oleh aplikasi.':'Ini file sebenarnya yang akan disimpan. Perhatikan detail dan, untuk video, periksa suaranya sebelum mengunggah.';
  const image=state.kind==='image';$('resultImage').hidden=!image;$('resultVideo').hidden=image;$('resultPreviewNote').hidden=true;
  const target=image?$('resultImage'):$('resultVideo');
  target.onerror=()=>{target.hidden=true;$('resultPreviewNote').hidden=false;};target.src=state.resultURL;
  if(!image)$('resultVideo').load();
  $('resultTip').textContent=state.platform==='wa'?'Simpan ke perangkat, lalu buka WhatsApp → Pembaruan → Status. Pilih dari galeri. WhatsApp tetap dapat memproses ulang unggahan.':'Simpan ke perangkat, lalu pilih dari galeri Instagram Story. Cari pengaturan kualitas unggahan tertinggi jika tersedia. Kompresi platform tetap berlaku.';
  let share=false;try{share=!!navigator.canShare?.({files:[new File([info.blob],info.filename,{type:info.blob.type})]});}catch{}
  $('shareBtn').hidden=!share;$('result').hidden=false;
  $('result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
async function inspectResult(blob,kind,signal){
  const url=URL.createObjectURL(blob),element=kind==='image'?new Image():document.createElement('video');
  try{
    if(kind==='image'){await waitForMedia(element,'load',()=>{element.src=url;},10000,signal);return {width:element.naturalWidth,height:element.naturalHeight};}
    element.preload='metadata';element.muted=true;element.playsInline=true;
    await waitForMedia(element,'loadedmetadata',()=>{element.src=url;element.load();},10000,signal);
    if(!element.videoWidth||!element.videoHeight)throw new Error('File hasil belum dapat dibaca. Coba resolusi 720p.');
    return {width:element.videoWidth,height:element.videoHeight,duration:Number.isFinite(element.duration)&&element.duration>0?element.duration:null};
  }finally{element.removeAttribute('src');if(kind==='video')element.load();URL.revokeObjectURL(url);}
}
function outputName(extension,c){const base=(state.file.name.replace(/\.[^.]+$/,'')||'story').slice(0,65);return `${base}-story-${state.platform}-${c.width}x${c.height}.${extension}`;}
$('originalBtn').addEventListener('click',()=>{
  if(!state.file||state.busy||state.loading)return;pausePreview();
  const original=originalResult(state.file),d=dimensions();
  publishResult({...original,...d,original:true,duration:state.kind==='video'&&Number.isFinite(video.duration)?video.duration:null});notify('File asli siap disimpan, tanpa pemrosesan ulang.',true);
});
async function exportImage(){
  const c=config(),mime=$('imageFormat').value==='png'?'image/png':$('imageFormat').value==='webp'?'image/webp':'image/jpeg';
  canvas.width=c.width;canvas.height=c.height;draw(canvas.getContext('2d',{alpha:false}),c.width,c.height);$('progress').value=50;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,c.quality));
  if(!blob||!['image/jpeg','image/png','image/webp'].includes(blob.type))throw new Error('Foto gagal diekspor. Coba format atau file lain.');
  if(blob.type!==mime)throw new Error('Browser belum mendukung format ini. Pilih JPG atau PNG.');
  const extension=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg',meta=await inspectResult(blob,'image');$('progress').value=100;
  publishResult({blob,extension,...meta,filename:outputName(extension,c)});
}
function seek(time,signal){
  if(Math.abs(video.currentTime-time)<.01)return Promise.resolve();
  return waitForMedia(video,'seeked',()=>{video.currentTime=time;},8000,signal);
}
async function exportVideo(){
  const c=config(),r=range(),mime=detectMP4($('keepAudio').checked);
  if(!mime)throw new Error('Ekspor MP4 belum didukung di browser ini. Simpan file asli atau coba browser lain.');
  const controller=new AbortController();
  let stream,recording,stopFrames,timer,watchdog,wakeLock,stopping=false,failure=null,recordedDuration=0,completed=false;
  const stop=()=>{if(stopping)return;stopping=true;recordedDuration=Math.max(0,Math.min(r.duration,video.currentTime-r.start));video.pause();stopFrames?.();recording?.stop();};
  const cancel=()=>{failure=new Error('Ekspor dibatalkan. File asli tetap aman; kamu bisa mencoba lagi.');controller.abort();stop();};state.cancel=cancel;
  const videoFailed=()=>{failure=new Error('Video berhenti karena tidak dapat dibaca. Coba MP4 lain.');stop();};
  try{
    video.muted=true;
    if($('keepAudio').checked&&!state.audioContext){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Browser belum mendukung pengambilan suara video. Nonaktifkan suara asli atau simpan file asli.');
      state.audioContext=new Audio();state.audioSource=state.audioContext.createMediaElementSource(video);state.audioDest=state.audioContext.createMediaStreamDestination();state.audioSource.connect(state.audioDest);
    }
    // Unlock playback and audio in the export button's user gesture before waiting for seek.
    await startMediaPlayback(video,state.audioContext,{signal:controller.signal});video.pause();
    if(failure)throw failure;await seek(r.start,controller.signal);if(failure)throw failure;
    canvas.width=c.width;canvas.height=c.height;const ctx=canvas.getContext('2d',{alpha:false});draw(ctx,c.width,c.height);stream=canvas.captureStream(c.fps);
    if($('keepAudio').checked&&state.audioDest)for(const track of state.audioDest.stream.getAudioTracks())stream.addTrack(track);
    if(navigator.wakeLock)try{wakeLock=await navigator.wakeLock.request('screen');}catch{}
    if(failure)throw failure;
    recording=prepareRecording(stream,{mimeType:mime,videoBitsPerSecond:c.bitrate,audioBitsPerSecond:128000});recording.finished.catch(()=>{});
    video.muted=!$('keepAudio').checked;video.addEventListener('error',videoFailed);
    recording.recorder.start(250);let count=0,lastTime=video.currentTime,lastMoved=performance.now();
    stopFrames=frames(()=>{draw(ctx,c.width,c.height);if(count++%3===0)render();});
    timer=setInterval(()=>{
      if(stopping)return;const now=performance.now(),elapsed=video.currentTime-r.start;
      if(video.currentTime!==lastTime){lastTime=video.currentTime;lastMoved=now;}
      $('progress').value=Math.min(97,Math.max(0,elapsed/r.duration*97));$('progressText').textContent=`Memproses video… ${Math.max(0,Math.min(r.duration,elapsed)).toFixed(0)} / ${Math.ceil(r.duration)} detik`;
      if(video.currentTime>=r.end-.025||video.ended){$('progressText').textContent='Menyelesaikan file MP4…';stop();}
      else if(now-lastMoved>12000){failure=new Error('Video berhenti terlalu lama. Coba 720p dan biarkan halaman tetap terbuka.');stop();}
    },30);
    watchdog=setTimeout(()=>{failure=new Error('Pemrosesan terlalu lama. Coba resolusi 720p atau klip lebih pendek.');stop();},(r.duration+30)*1000);
    try{await startMediaPlayback(video,state.audioContext,{signal:controller.signal});}catch(e){failure=failure||e;stop();}
    const blob=await recording.finished;if(failure)throw failure;
    if(!await isMP4(blob))throw new Error('Browser tidak menghasilkan kontainer MP4 yang terbaca. Coba browser lain.');
    $('progress').value=98;$('progressText').textContent='Memeriksa file hasil…';
    const meta=await inspectResult(blob,'video',controller.signal);if(failure)throw failure;
    publishResult({blob,extension:'mp4',...meta,duration:meta.duration||recordedDuration,filename:outputName('mp4',c)});$('progress').value=100;completed=true;
  }catch(e){throw failure||e;}
  finally{
    state.cancel=null;clearInterval(timer);clearTimeout(watchdog);stopFrames?.();pausePreview();video.muted=true;video.removeEventListener('error',videoFailed);
    if(recording&&recording.recorder.state!=='inactive')try{recording.recorder.stop();}catch{}
    if(stream)for(const track of stream.getVideoTracks())track.stop();
    if(wakeLock)try{await wakeLock.release();}catch{}
    if(state.audioContext?.state==='running')try{await state.audioContext.suspend();}catch{}
    if(completed)try{await seek(r.start);render();}catch{}
    else try{video.currentTime=r.start;}catch{}
  }
}
$('exportBtn').addEventListener('click',async()=>{
  if(state.busy||state.loading||!state.media)return;
  pausePreview();clearResult();notify('');state.busy=true;update();$('progressPanel').hidden=false;$('cancelBtn').hidden=state.kind!=='video';$('progress').value=0;$('progressText').textContent=state.kind==='video'?'Menyiapkan video…':'Menyiapkan foto…';
  try{if(state.kind==='image')await exportImage();else await exportVideo();notify('File sudah disiapkan. Periksa pratinjau hasil sebelum menyimpannya.',true);}
  catch(e){clearResult();notify(e.message||'Proses gagal. Coba file lain atau resolusi yang lebih kecil.');}
  finally{state.busy=false;$('progressPanel').hidden=true;update();}
});
$('cancelBtn').addEventListener('click',()=>state.cancel?.());
$('shareBtn').addEventListener('click',async()=>{if(!state.blob)return;try{await navigator.share({files:[new File([state.blob],state.filename,{type:state.blob.type})]});}catch(e){if(e.name!=='AbortError')notify('File belum dapat dibagikan dari browser ini. Gunakan Simpan hasil.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state.busy&&state.kind==='video')state.cancel?.();else pausePreview();}});
window.addEventListener('pagehide',()=>{state.cancel?.();pausePreview();});

let history=[],historyIndex=-1;
let savedPresets=[];
try{savedPresets=decodePresets(localStorage.getItem('storysiap.presets.v3'));}catch{}
const fieldMap={lookSelect:'look',brightness:'brightness',contrast:'contrast',saturation:'saturation',warmth:'warmth',grain:'grain',vignette:'vignette',background:'background',brandColor:'color',storyTitle:'title',storySubtitle:'subtitle',watermark:'watermark',textPosition:'textPosition',textSize:'textSize',fontFamily:'fontFamily',textAlign:'textAlign',textColor:'textColor',watermarkPosition:'watermarkPosition',frameBorder:'frameBorder'};
function creativeMessage(message){$('creativeStatus').textContent=message;}
function syncStyle(){
  for(const [id,key] of Object.entries(fieldMap))$(id).value=String(state.style[key]);
  // Stored values may use any supported size; preserve it in the select.
  if(!$('textSize').value){const option=document.createElement('option');option.value=state.style.textSize;option.textContent=`${state.style.textSize} px`;option.dataset.custom='true';$('textSize').append(option);$('textSize').value=state.style.textSize;}
  for(const id of ['brightness','contrast','saturation','warmth','grain','vignette'])$(id+'Value').textContent=`${state.style[id]}%`;
  document.querySelectorAll('[data-preset]').forEach(b=>{const active=JSON.stringify(sanitizeStyle(PRESETS[b.dataset.preset]))===JSON.stringify(state.style);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
}
function snapshot(){return {style:{...state.style},platform:state.platform,quality:state.quality,mode:state.mode,x:state.x,y:state.y,protect:$('protectSource').checked,format:$('imageFormat').value};}
function updateHistoryButtons(){if(!history)return;$('undoBtn').disabled=state.busy||state.loading||historyIndex<=0;$('redoBtn').disabled=state.busy||state.loading||historyIndex>=history.length-1;}
function remember(){const next=snapshot();if(JSON.stringify(next)===JSON.stringify(history[historyIndex]))return;history=history.slice(0,historyIndex+1);history.push(next);if(history.length>40)history.shift();historyIndex=history.length-1;updateHistoryButtons();}
function resetHistory(){history=[];historyIndex=-1;remember();}
function restoreHistory(index){if(state.busy||state.loading)return;const h=history[index];if(!h)return;historyIndex=index;state.style={...h.style};for(const k of ['platform','quality','mode','x','y'])state[k]=h[k];$('quality').value=h.quality;$('posX').value=h.x;$('posY').value=h.y;$('protectSource').checked=h.protect;$('imageFormat').value=h.format;for(const attr of ['platform','mode'])document.querySelectorAll(`[data-${attr}]`).forEach(b=>{const on=b.dataset[attr]===state[attr];b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});syncStyle();clearResult();update();render();}
for(const [id,key] of Object.entries(fieldMap))$(id).addEventListener(['storyTitle','storySubtitle','watermark','brightness','contrast','saturation','warmth','grain','vignette','brandColor'].includes(id)?'input':'change',()=>{if(state.busy||state.loading)return;state.style=sanitizeStyle({...state.style,[key]:$(id).value});syncStyle();changed();});
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{if(state.busy||state.loading)return;state.style=sanitizeStyle(PRESETS[b.dataset.preset]);syncStyle();changed();creativeMessage(`Preset ${b.textContent.trim()} diterapkan.`);}));
$('undoBtn').addEventListener('click',()=>restoreHistory(historyIndex-1));$('redoBtn').addEventListener('click',()=>restoreHistory(historyIndex+1));
$('resetStyleBtn').addEventListener('click',()=>{state.style={...DEFAULT_STYLE};syncStyle();changed();creativeMessage('Gaya kembali ke awal.');});
$('compareBtn').addEventListener('click',()=>{if(state.busy||state.loading)return;state.compare=!state.compare;$('compareBtn').setAttribute('aria-pressed',String(state.compare));$('compareBtn').textContent=state.compare?'Lihat efek':'Tanpa efek';document.querySelector('.preview-caption').textContent=state.compare?'Pembanding tanpa efek. Ekspor tetap memakai gaya pilihanmu.':'Pratinjau langsung. Sentuhanmu ikut diekspor.';render();});
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{creativeMessage('Penyimpanan browser tidak tersedia. Perubahan tetap bisa diekspor.');return false;}}
$('saveBrandBtn').addEventListener('click',()=>{if(writeLocal('storysiap.brand.v3',{color:state.style.color,watermark:state.style.watermark,fontFamily:state.style.fontFamily,textColor:state.style.textColor,watermarkPosition:state.style.watermarkPosition}))creativeMessage('Brand kit tersimpan di browser ini.');});
$('applyBrandBtn').addEventListener('click',()=>{try{const b=JSON.parse(localStorage.getItem('storysiap.brand.v3')||'null');if(!b||typeof b!=='object'){creativeMessage('Simpan brand kit terlebih dahulu.');return;}state.style=sanitizeStyle({...state.style,color:b.color,watermark:b.watermark,fontFamily:b.fontFamily,textColor:b.textColor,watermarkPosition:b.watermarkPosition});syncStyle();changed();creativeMessage('Brand kit diterapkan.');}catch{creativeMessage('Brand kit tidak dapat dibaca. Simpan kembali.');}});
function refreshPresets(){const select=$('savedPreset');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=savedPresets.length?'Pilih preset…':'Belum ada preset';select.append(empty);savedPresets.forEach((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=p.name;select.append(o);});}
$('savePresetBtn').addEventListener('click',()=>{const name=$('presetName').value.trim();if(!name){creativeMessage('Isi nama preset terlebih dahulu.');$('presetName').focus();return;}const index=savedPresets.findIndex(p=>p.name.toLowerCase()===name.toLowerCase());if(index<0&&savedPresets.length>=8){creativeMessage('Delapan preset sudah tersimpan. Hapus satu untuk membuat yang baru.');return;}const next=[...savedPresets],p={name,style:{...state.style}};if(index>=0)next[index]=p;else next.push(p);if(writeLocal('storysiap.presets.v3',next)){savedPresets=next;refreshPresets();creativeMessage(`Preset “${name}” tersimpan.`);}});
$('applyPresetBtn').addEventListener('click',()=>{const value=$('savedPreset').value;if(value===''){creativeMessage('Pilih preset tersimpan terlebih dahulu.');return;}state.style=sanitizeStyle(savedPresets[Number(value)].style);syncStyle();changed();creativeMessage('Preset pribadi diterapkan.');});
$('deletePresetBtn').addEventListener('click',()=>{const value=$('savedPreset').value;if(value===''){creativeMessage('Pilih preset yang ingin dihapus.');return;}const next=savedPresets.filter((_,i)=>i!==Number(value));if(writeLocal('storysiap.presets.v3',next)){savedPresets=next;refreshPresets();creativeMessage('Preset dihapus.');}});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||state.busy||state.loading)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restoreHistory(historyIndex+(e.shiftKey?1:-1));}});
const initialPreset=new URLSearchParams(location.search).get('preset');if(Object.hasOwn(PRESETS,initialPreset)){state.style=sanitizeStyle(PRESETS[initialPreset]);creativeMessage('Preset pilihanmu sudah siap. Pilih media atau gunakan foto contoh.');}
syncStyle();refreshPresets();resetHistory();update();
