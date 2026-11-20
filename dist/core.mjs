export function frame(sw,sh,w,h,mode='contain',x=50,y=50){
  if (![sw,sh,w,h].every(n=>Number.isFinite(n)&&n>0)) throw new Error('Ukuran media tidak valid.');
  if(mode==='contain'){
    const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
    return {sx:0,sy:0,sw,sh,dx:(w-dw)/2,dy:(h-dh)/2,dw,dh};
  }
  const scale=Math.max(w/sw,h/sh),cw=w/scale,ch=h/scale;
  return {sx:(sw-cw)*Math.max(0,Math.min(100,x))/100,sy:(sh-ch)*Math.max(0,Math.min(100,y))/100,sw:cw,sh:ch,dx:0,dy:0,dw:w,dh:h};
}
export function settings(platform,quality){
  const light=quality==='light';
  return {width:light?720:1080,height:light?1280:1920,quality:platform==='ig'?.94:.92,bitrate:light?4000000:platform==='ig'?10000000:8000000,fps:30};
}
export function outputSettings(platform,quality,source){
  const result=settings(platform,quality);
  if(!source||!source.protect)return result;
  const r=frame(source.width,source.height,result.width,result.height,source.mode);
  const scale=Math.max(r.dw/r.sw,r.dh/r.sh);
  if(scale<=1)return result;
  // Multiples of 18×32 preserve 9:16 and even dimensions for AVC encoders.
  const units=Math.floor(Math.min(result.width/scale/18,result.height/scale/32)+1e-9);
  if(units<1)throw new Error('Resolusi sumber terlalu kecil untuk bingkai ini. Pilih file lain atau ubah tampilan bingkai.');
  const width=units*18,height=units*32;
  return {...result,width,height,bitrate:Math.max(500000,Math.round(result.bitrate*width*height/(result.width*result.height)))};
}
export function mediaKind(file){
  if(!file)return null;
  if(file.type?.startsWith('image/'))return 'image';
  if(file.type?.startsWith('video/'))return 'video';
  if(file.type&&file.type!=='application/octet-stream')return null;
  const ext=(file.name||'').split('.').pop().toLowerCase();
  if(['jpg','jpeg','png','webp','heic','heif','avif','gif'].includes(ext))return 'image';
  if(['mp4','mov','m4v','webm','3gp','mkv'].includes(ext))return 'video';
  return null;
}
export function originalResult(file){return {blob:file,filename:file.name||'story-original'};}
export async function isMP4(blob){
  if(blob.size<12)return false;
  const b=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  return b[4]===102&&b[5]===116&&b[6]===121&&b[7]===112;
}
export function trimRange(total,start,length){
  if(!Number.isFinite(total)||total<=0)throw new Error('Durasi video tidak dapat dibaca.');
  const s=Math.max(0,Math.min(total-.05,Number(start)||0));
  const duration=Math.min(total-s,Math.max(.05,Math.min(60,Number(length)||30)));
  return {start:s,end:s+duration,duration};
}
export function selectMP4(supported,withAudio=true){
  const codecs=withAudio?['avc1.420028,mp4a.40.2','avc1,mp4a.40.2']:['avc1.420028','avc1'];
  return codecs.map(c=>`video/mp4;codecs=${c}`).find(supported)||null;
}
export function validateFile(file){
  if(!mediaKind(file))return 'Pilih file foto atau video dari galeri Anda.';
  if(file.size>500*1024*1024)return 'Ukuran maksimal 500 MB. Pilih video yang lebih pendek atau file yang lebih kecil.';
  if(file.size===0)return 'File ini kosong. Silakan pilih file lain.';
  return null;
}
