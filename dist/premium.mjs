export const DEFAULT_STYLE = Object.freeze({
  look:'original',brightness:100,contrast:100,saturation:100,warmth:0,grain:0,vignette:0,background:'blur',color:'#b9a7ff',
  title:'',subtitle:'',watermark:'',textPosition:'bottom',textSize:72,
  fontFamily:'sans',textAlign:'left',textColor:'white',watermarkPosition:'bottom-right',frameBorder:'none'
});
export const LOOKS = Object.freeze({original:'none',cinema:'contrast(1.12) saturate(.78) sepia(.12)',golden:'sepia(.27) saturate(1.18) contrast(1.04)',arctic:'saturate(.75) hue-rotate(12deg) contrast(1.08)',mono:'grayscale(1) contrast(1.16)',vivid:'saturate(1.4) contrast(1.09)'});
export const PRESETS = Object.freeze({
  clean:{...DEFAULT_STYLE},
  cinema:{...DEFAULT_STYLE,look:'cinema',title:'A little escape.',subtitle:'MOMENTS WORTH KEEPING',textPosition:'bottom',fontFamily:'serif',frameBorder:'thin'},
  editorial:{...DEFAULT_STYLE,look:'mono',title:'The everyday.',subtitle:'A STORY BY YOU',textPosition:'top',fontFamily:'serif',textAlign:'center'},
  sunset:{...DEFAULT_STYLE,look:'golden',background:'gradient',color:'#f4ad82',title:'Golden state.',subtitle:'STAY A LITTLE LONGER',textColor:'white',frameBorder:'thin'},
  postcard:{...DEFAULT_STYLE,background:'solid',color:'#e4d9f5',title:'Wish you were here.',textSize:60,fontFamily:'serif',textAlign:'center',frameBorder:'bold'},
  vivid:{...DEFAULT_STYLE,look:'vivid',title:'Make it a moment.',subtitle:'LIVE IN FULL COLOR',fontFamily:'sans',textColor:'accent'}
});
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
const fonts=Object.freeze({sans:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',serif:'Georgia, "Times New Roman", serif',mono:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'});
export function sanitizeStyle(input={}){
  return {
    ...DEFAULT_STYLE,
    look:Object.hasOwn(LOOKS,input.look)?input.look:'original',
    brightness:clamp(input.brightness,50,150,100),
    contrast:clamp(input.contrast,50,150,100),
    saturation:clamp(input.saturation,0,200,100),
    warmth:clamp(input.warmth,0,100,0),grain:clamp(input.grain,0,100,0),vignette:clamp(input.vignette,0,100,0),
    background:['blur','solid','gradient'].includes(input.background)?input.background:'blur',
    color:/^#[\da-f]{6}$/i.test(input.color)?input.color:DEFAULT_STYLE.color,
    title:String(input.title??'').slice(0,100),subtitle:String(input.subtitle??'').slice(0,100),watermark:String(input.watermark??'').slice(0,40),
    textPosition:['top','center','bottom'].includes(input.textPosition)?input.textPosition:'bottom',
    textSize:clamp(input.textSize,36,110,72),
    fontFamily:Object.hasOwn(fonts,input.fontFamily)?input.fontFamily:'sans',
    textAlign:['left','center','right'].includes(input.textAlign)?input.textAlign:'left',
    textColor:['white','accent'].includes(input.textColor)?input.textColor:'white',
    watermarkPosition:['top-right','bottom-left','bottom-right'].includes(input.watermarkPosition)?input.watermarkPosition:'bottom-right',
    frameBorder:['none','thin','bold'].includes(input.frameBorder)?input.frameBorder:'none'
  };
}
export function buildFilter(input){const s=sanitizeStyle(input);return `${LOOKS[s.look]==='none'?'':LOOKS[s.look]+' '}brightness(${s.brightness/100}) contrast(${s.contrast/100}) saturate(${s.saturation/100}) sepia(${(s.warmth*.0035).toFixed(3)})`;}
function wrapText(ctx,text,width){const lines=[];let line='';for(const char of text){if(char==='\n'){lines.push(line);line='';continue;}if(ctx.measureText(line+char).width>width&&line){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);return lines.slice(0,4);}
export function drawOverlay(ctx,w,h,input){
  const s=sanitizeStyle(input);
  if(!s.title&&!s.subtitle&&!s.watermark&&s.frameBorder==='none')return;
  ctx.save();ctx.filter='none';
  const scale=w/1080,padding=74*scale,font=s.textSize*scale,maxWidth=w-2*padding;
  const accent=s.color;
  if(s.title||s.subtitle){
    ctx.font=`600 ${font}px ${fonts[s.fontFamily]}`;
    const lines=wrapText(ctx,s.title,maxWidth);
    const height=lines.length*font*1.13+(s.subtitle?40*scale:0);
    let y=s.textPosition==='top'?h*.18:s.textPosition==='center'?(h-height)/2:h*.78-height;
    const shade=ctx.createLinearGradient(0,y-80*scale,0,y+height+90*scale);
    shade.addColorStop(0,'#00000000');shade.addColorStop(.5,'#00000075');shade.addColorStop(1,'#00000000');
    ctx.fillStyle=shade;ctx.fillRect(0,y-80*scale,w,height+170*scale);
    ctx.fillStyle=s.textColor==='accent'?accent:'#fff';ctx.textBaseline='top';ctx.textAlign=s.textAlign;
    ctx.shadowColor='#0008';ctx.shadowBlur=14*scale;
    const x=s.textAlign==='left'?padding:s.textAlign==='center'?w/2:w-padding;
    let textY=y;for(const line of lines){ctx.fillText(line,x,textY);textY+=font*1.13;}
    if(s.subtitle){ctx.font=`500 ${24*scale}px ${fonts[s.fontFamily]}`;ctx.fillText(s.subtitle,x,textY+16*scale,maxWidth);}
  }
  if(s.watermark){
    ctx.font=`600 ${25*scale}px ${fonts[s.fontFamily]}`;ctx.fillStyle=s.textColor==='accent'?accent:'#fff';ctx.shadowColor='#0008';ctx.shadowBlur=10*scale;ctx.textBaseline='top';
    const left=s.watermarkPosition==='bottom-left',top=s.watermarkPosition==='top-right';
    ctx.textAlign=left?'left':'right';
    ctx.fillText(s.watermark,left?padding:w-padding,top?h*.08:h*.86,maxWidth);
  }
  if(s.frameBorder!=='none'){
    const inset=(s.frameBorder==='bold'?26:12)*scale;
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.strokeStyle=accent;ctx.lineWidth=(s.frameBorder==='bold'?10:3)*scale;
    ctx.strokeRect(inset,inset,w-inset*2,h-inset*2);
  }
  ctx.restore();
}
export function decodePresets(raw){try{const data=JSON.parse(raw);if(!Array.isArray(data))return [];return data.slice(0,8).filter(p=>p&&typeof p.name==='string').map(p=>({name:p.name.slice(0,32),style:sanitizeStyle(p.style)}));}catch{return [];}}

// Finishing is applied to the exact output canvas, for both preview and export.
// Keep the grain tile stable between frames to avoid expensive per-frame noise allocation.
let grainTile=null;
function makeGrainTile(){
  if(grainTile||typeof document==='undefined')return grainTile;
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const context=canvas.getContext('2d');if(!context)return null;
  const image=context.createImageData(96,96);
  let seed=91481;
  for(let i=0;i<image.data.length;i+=4){
    seed=(1664525*seed+1013904223)>>>0;
    const gray=seed>>>24;
    image.data[i]=gray;image.data[i+1]=gray;image.data[i+2]=gray;image.data[i+3]=255;
  }
  context.putImageData(image,0,0);grainTile=canvas;return grainTile;
}
export function drawFinishing(ctx,w,h,input){
  const style=sanitizeStyle(input);
  if(!style.vignette&&!style.grain)return;
  ctx.save();ctx.filter='none';
  if(style.vignette&&typeof ctx.createRadialGradient==='function'){
    const radius=Math.hypot(w,h)*.68;
    const fade=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.12,w/2,h/2,radius);
    fade.addColorStop(0,'#00000000');fade.addColorStop(.47,'#00000000');
    fade.addColorStop(1,`rgba(6,5,12,${Math.min(.8,style.vignette*.0072).toFixed(3)})`);
    ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
  }
  if(style.grain&&typeof ctx.createPattern==='function'){
    const tile=makeGrainTile();if(tile){
      ctx.globalAlpha=Math.min(.18,style.grain*.0018);
      ctx.globalCompositeOperation='soft-light';
      ctx.fillStyle=ctx.createPattern(tile,'repeat');ctx.fillRect(0,0,w,h);
    }
  }
  ctx.restore();
}
