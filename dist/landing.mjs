const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const prefersFine=matchMedia('(hover:hover) and (pointer:fine)');

const motionToggle=$('motionToggle');
let userMotionOff=false;
try{userMotionOff=localStorage.getItem('storysiap.landing.motion')==='off';}catch{}
function motionEnabled(){return !reduced.matches&&!userMotionOff;}
function updateMotionSetting(){
  const on=motionEnabled();
  document.documentElement.classList.toggle('motion-off',!on);
  if(motionToggle){motionToggle.setAttribute('aria-pressed',String(on));motionToggle.setAttribute('aria-label',on?'Kurangi animasi dekoratif':'Aktifkan animasi dekoratif');}
  if($('motionLabel'))$('motionLabel').textContent=on?'MOTION ON':'MOTION OFF';
}
updateMotionSetting();


// ---------------------------------------------------------------------------
// Procedural WebGL art direction: a ray-marched, reflective liquid sculpture.
// No external library, image request, or third-party runtime is required.
// ---------------------------------------------------------------------------
const vertexShader=`
attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
const fragmentShader=`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uScroll;
uniform float uLook;
uniform float uMode;
uniform float uTurn;

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdEllipsoid(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.0)/max(k1,.0001);}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float sceneSDF(vec3 p){
  float t=uTime*.38;
  p.xz=rot(.34*sin(t*.7)+uTurn*.8+uPointer.x*.16)*p.xz;
  p.xy=rot(.2*cos(t*.55)+uPointer.y*.1)*p.xy;
  vec3 a=p-vec3(.12*sin(t),.04*cos(t*1.3),.0);
  vec3 b=p-vec3(-.42*cos(t*.8),.45*sin(t*.9),.05);
  vec3 c=p-vec3(.38*sin(t*.65),-.55*cos(t*.72),-.12);
  float d1=sdEllipsoid(a,vec3(.73,.92,.57));
  float d2=sdEllipsoid(b,vec3(.52,.57,.49));
  float d3=sdEllipsoid(c,vec3(.47,.49,.48));
  float d=smin(smin(d1,d2,.34),d3,.29);
  float ripple=sin(p.x*4.0+t)*sin(p.y*3.2-t*.7)*sin(p.z*3.8+t*.4)*.026;
  d+=ripple;
  float tor=sdTorus(p-vec3(.0,.02,.0),vec2(.93,.035));
  return smin(d,tor,.13);
}
vec3 getNormal(vec3 p){vec2 e=vec2(.0018,0.0);return normalize(vec3(sceneSDF(p+e.xyy)-sceneSDF(p-e.xyy),sceneSDF(p+e.yxy)-sceneSDF(p-e.yxy),sceneSDF(p+e.yyx)-sceneSDF(p-e.yyx)));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 palette(float n){
  vec3 violet=vec3(.55,.40,.82),rose=vec3(.93,.67,.65),gold=vec3(.91,.68,.39),teal=vec3(.40,.75,.72),ice=vec3(.65,.78,.94);
  vec3 c=mix(violet,gold,step(.5,uLook));
  c=mix(c,teal,step(1.5,uLook)*.88);
  c=mix(c,vec3(.72,.75,.79),step(2.5,uLook));
  return mix(c,rose,.18+.14*sin(n*6.283));
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
  float aspect=uResolution.x/uResolution.y;
  vec2 pointer=(uPointer-.5)*vec2(.48,.3);
  vec3 ro=vec3(pointer.x*.55,pointer.y*.45,4.25);
  vec3 rd=normalize(vec3(uv.x,uv.y,-1.72));
  float scrollShift=clamp(uScroll,0.0,1.0);
  ro.x+=sin(scrollShift*3.1415)*.25;
  ro.y-=scrollShift*.24;
  vec3 color=vec3(0.0);
  float alpha=0.0;
  float t=0.0;float d=0.0;vec3 p;
  for(int i=0;i<88;i++){
    p=ro+rd*t;d=sceneSDF(p);
    if(d<.0018||t>8.0)break;
    t+=d*.78;
  }
  vec2 centered=uv-vec2(.0,.0);
  float glow=exp(-dot(centered,centered)*2.2)*.14;
  if(t<8.0){
    vec3 n=getNormal(p);
    vec3 lightA=normalize(vec3(-.65,.8,1.0));
    vec3 lightB=normalize(vec3(.9,-.4,.65));
    vec3 viewDir=normalize(ro-p);
    float diffuse=max(dot(n,lightA),0.0);
    float fill=max(dot(n,lightB),0.0);
    float fres=pow(1.0-max(dot(n,viewDir),0.0),3.2);
    vec3 halfV=normalize(lightA+viewDir);
    float spec=pow(max(dot(n,halfV),0.0),52.0);
    float band=.5+.5*sin(p.y*3.5+p.x*2.2+uTime*.8);
    vec3 base=palette(band);
    vec3 reflected=mix(vec3(.09,.08,.15),vec3(.93,.84,.98),clamp(.35+diffuse*.48+fres*.42,0.0,1.0));
    color=base*(.22+diffuse*.48+fill*.13)+reflected*(.22+fres*.8)+vec3(1.0,.91,.79)*spec*.95;
    color+=palette(1.0-band)*fres*.34;
    color+=vec3(.36,.26,.62)*pow(1.0-max(dot(n,viewDir),0.0),2.0)*.24;
    float fog=exp(-t*.09);
    color=mix(vec3(.08,.075,.12),color,fog);
    alpha=clamp(.76+fres*.22,0.0,1.0);
  }
  float vignette=1.0-smoothstep(.15,1.5,length(uv));
  float grain=(noise(gl_FragCoord.xy*.7+uTime*.2)-.5)*.035;
  if(uMode<.5){
    vec3 bg=mix(vec3(.065,.06,.09),vec3(.13,.105,.17),vignette*.75);
    bg+=vec3(.13,.1,.18)*glow;
    if(alpha<.01){color=bg;alpha=1.0;}else{color=mix(bg,color,alpha);alpha=1.0;}
  }else{
    if(alpha<.01){color=vec3(.0);alpha=0.0;}else{color*=.96;alpha*=.92;}
    color+=vec3(.28,.19,.42)*glow*.55;
  }
  color+=grain*alpha;
  gl_FragColor=vec4(color,alpha);
}`;

function compileShader(gl,type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message||'Shader compilation failed');}
  return shader;
}
function createLiquidScene(canvas,mode){
  if(!canvas)return null;
  const gl=canvas.getContext('webgl',{alpha:mode===1,antialias:false,powerPreference:'high-performance',premultipliedAlpha:false});
  if(!gl){canvas.classList.add('scene-fallback');return null;}
  try{
    const program=gl.createProgram();
    gl.attachShader(program,compileShader(gl,gl.VERTEX_SHADER,vertexShader));
    gl.attachShader(program,compileShader(gl,gl.FRAGMENT_SHADER,fragmentShader));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program link failed');
    gl.useProgram(program);
    const vertices=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms={};for(const name of ['uResolution','uPointer','uTime','uScroll','uLook','uMode','uTurn'])uniforms[name]=gl.getUniformLocation(program,name);
    gl.uniform1f(uniforms.uMode,mode);
    gl.uniform1f(uniforms.uLook,0);
    const scene={canvas,gl,program,uniforms,mode,pointer:[.5,.5],look:0,scroll:0,turn:0,active:mode===0,visible:true,resize(){
      const rect=canvas.getBoundingClientRect();const ratio=Math.min(devicePixelRatio||1,1.3)*(rect.width>700?.88:1);
      const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
      gl.uniform2f(uniforms.uResolution,width,height);
    },render(time){
      this.resize();gl.useProgram(program);
      gl.uniform2f(uniforms.uPointer,this.pointer[0],this.pointer[1]);
      gl.uniform1f(uniforms.uTime,time);
      gl.uniform1f(uniforms.uScroll,this.scroll);
      gl.uniform1f(uniforms.uLook,this.look);
      gl.uniform1f(uniforms.uTurn,this.turn);
      if(mode===0)gl.clearColor(.055,.05,.075,1);else gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
    }};
    scene.resize();return scene;
  }catch(error){console.warn('StorySiap WebGL fallback:',error);canvas.classList.add('scene-fallback');return null;}
}
const liquidScenes=[createLiquidScene($('heroWebGL'),0),createLiquidScene($('playgroundWebGL'),1)].filter(Boolean);
let sceneFrame=0,sceneClock=0,lastSceneTime=0,lastSceneDraw=0;
const sceneVisibility='IntersectionObserver'in window?new IntersectionObserver(entries=>{
  for(const entry of entries){const scene=liquidScenes.find(item=>item.canvas===entry.target);if(scene)scene.visible=entry.isIntersecting;}
},{rootMargin:'120px'}):null;
if(sceneVisibility)liquidScenes.forEach(scene=>sceneVisibility.observe(scene.canvas));else liquidScenes.forEach(scene=>scene.visible=true);
function renderScenes(now){
  sceneFrame=0;
  if(document.hidden)return;
  if(motionEnabled()&&now-lastSceneDraw<1000/45){sceneFrame=requestAnimationFrame(renderScenes);return;}
  const elapsed=lastSceneTime?Math.min((now-lastSceneTime)/1000,.05):0;lastSceneTime=now;lastSceneDraw=now;
  if(motionEnabled())sceneClock+=elapsed;
  let needsNext=false;
  for(const scene of liquidScenes){
    if(scene.visible&&motionEnabled()){scene.render(sceneClock);needsNext=true;}
  }
  if(needsNext)sceneFrame=requestAnimationFrame(renderScenes);
}
function wakeScenes(){if(!motionEnabled()){cancelAnimationFrame(sceneFrame);sceneFrame=0;return;}if(!sceneFrame)sceneFrame=requestAnimationFrame(renderScenes);}
wakeScenes();
addEventListener('resize',()=>{for(const scene of liquidScenes)scene.resize();wakeScenes()},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(sceneFrame);sceneFrame=0;lastSceneTime=0;}else wakeScenes();});

// Hero pointer = camera movement + physical tilt + local light response.
const stage=$('deviceStage'),heroScene=$('heroScene'),cursor=$('cursorAura');
let pointerX=.5,pointerY=.5;
if(heroScene&&stage){
  heroScene.addEventListener('pointermove',event=>{
    const rect=heroScene.getBoundingClientRect();pointerX=clamp((event.clientX-rect.left)/rect.width,0,1);pointerY=clamp((event.clientY-rect.top)/rect.height,0,1);
    const scene=liquidScenes.find(item=>item.mode===0);if(scene){scene.pointer=[pointerX,pointerY];wakeScenes();}
    if(motionEnabled()){stage.style.setProperty('--pointer-y',`${(pointerX-.5)*20}deg`);stage.style.setProperty('--pointer-x',`${(.5-pointerY)*12}deg`);}
    heroScene.style.setProperty('--spot-x',`${pointerX*100}%`);heroScene.style.setProperty('--spot-y',`${pointerY*100}%`);
  },{passive:true});
  heroScene.addEventListener('pointerleave',()=>{stage.style.removeProperty('--pointer-y');stage.style.removeProperty('--pointer-x');const scene=liquidScenes.find(item=>item.mode===0);if(scene)scene.pointer=[.5,.5];});
}
$('rotateScene')?.addEventListener('click',()=>{
  const button=$('rotateScene'),on=button.getAttribute('aria-pressed')!=='true';
  stage?.classList.toggle('turned',on);button.setAttribute('aria-pressed',String(on));
  const scene=liquidScenes.find(item=>item.mode===0);if(scene){scene.turn=on?1:0;wakeScenes();}
});

// A restrained custom cursor only appears on fine pointers.
if(cursor&&prefersFine.matches&&!reduced.matches){
  let cx=innerWidth/2,cy=innerHeight/2,tx=cx,ty=cy,cursorFrame=0;
  addEventListener('pointermove',event=>{tx=event.clientX;ty=event.clientY;cursor.classList.add('is-active');},{passive:true});
  function moveCursor(){cx+=(tx-cx)*.22;cy+=(ty-cy)*.22;cursor.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;cursorFrame=requestAnimationFrame(moveCursor);}
  moveCursor();
  document.querySelectorAll('a,button,summary,.collection-item').forEach(el=>{el.addEventListener('pointerenter',()=>cursor.classList.add('is-hover'));el.addEventListener('pointerleave',()=>cursor.classList.remove('is-hover'));});
  addEventListener('blur',()=>{cancelAnimationFrame(cursorFrame);cursor.classList.remove('is-active');});
}

// Interactive look switcher updates both the image treatment and shader palette.
const looks={
  clean:{filter:'none',description:'Warna alami. Momenmu, apa adanya.',shader:0},
  cinema:{filter:'contrast(1.15) saturate(.72) sepia(.14)',description:'Sedikit dramatis. Untuk momen yang terasa seperti film.',shader:1},
  sunset:{filter:'sepia(.28) saturate(1.2) contrast(1.06)',description:'Hangat, lembut, dan sedikit lebih dekat dengan senja.',shader:1},
  editorial:{filter:'grayscale(1) contrast(1.18)',description:'Hitam putih. Fokus pada hal yang paling berarti.',shader:3}
};
document.querySelectorAll('[data-look]').forEach((button,index)=>button.addEventListener('click',()=>{
  const key=button.dataset.look,look=looks[key];
  document.querySelectorAll('[data-look]').forEach(item=>{const active=item===button;item.setAttribute('aria-pressed',String(active));item.classList.toggle('active',active);});
  $('sceneBackdrop').style.filter=look.filter;$('lookDescription').textContent=look.description;$('tryPreset').href=`studio.html?preset=${key}`;$('lookIndex').textContent=`0${index+1}`;
  liquidScenes.filter(item=>item.mode===1).forEach(item=>item.look=look.shader);wakeScenes();
}));

// Mobile navigation closes on selection, escape, or manual scroll.
const menu=$('mobileMenu'),menuToggle=$('menuToggle');
function closeMenu(){if(!menu||!menuToggle)return;menu.hidden=true;menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Buka menu');menuToggle.classList.remove('is-open');}
menuToggle?.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Tutup menu':'Buka menu');menuToggle.classList.toggle('is-open',open);if(open)stopAuto('Auto-scroll dijeda karena menu dibuka.');});
menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));

// Staggered section reveals; content is never hidden when motion is reduced.
const revealSelectors=[
  '.manifesto .section-kicker','.manifesto-main > *','.manifesto-orbit','.manifesto-footer',
  '.playground-top','.playground-content > *','.playground-controls',
  '.collection .section-kicker','.section-title-row > *','.collection-item','.collection-footer > *',
  '.premium .section-kicker','.premium-intro > *','.feature-aside > *','.feature-row','.premium-bottom > *',
  '.how .section-kicker','.how-heading > *','.steps article',
  '.faq-heading > *','.faq-list details',
  '.final-cta .section-kicker','.final-cta > .eyebrow','.giant-cta','.final-meta > *'
];
const revealTargets=[...new Set(revealSelectors.flatMap(selector=>[...document.querySelectorAll(selector)]))];
let revealObserver;
function setupReveal(){
  revealObserver?.disconnect();const active=motionEnabled()&&'IntersectionObserver'in window;
  document.documentElement.classList.toggle('motion-ready',active);
  revealTargets.forEach(element=>{
    element.dataset.reveal='';const siblings=[...element.parentElement.children].filter(node=>revealTargets.includes(node));
    element.style.setProperty('--reveal-delay',`${Math.min(Math.max(0,siblings.indexOf(element)),5)*75}ms`);element.classList.toggle('is-visible',!active);
  });
  if(!active)return;
  revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}),{threshold:.1,rootMargin:'0px 0px -8% 0px'});
  revealTargets.forEach(element=>revealObserver.observe(element));
}
setupReveal();
reduced.addEventListener?.('change',setupReveal);
motionToggle?.addEventListener('click',()=>{
  if(reduced.matches){toast('Perangkat memilih Reduce Motion; animasi tetap diminimalkan.');return;}
  userMotionOff=!userMotionOff;
  try{localStorage.setItem('storysiap.landing.motion',userMotionOff?'off':'on');}catch{}
  updateMotionSetting();setupReveal();wakeScenes();
  toast(userMotionOff?'Animasi dekoratif dinonaktifkan.':'Animasi sinematik diaktifkan.');
});
reduced.addEventListener?.('change',()=>{updateMotionSetting();wakeScenes();});


// Magnetic controls and tactile card tilt.
const magneticTargets=[...document.querySelectorAll('.nav-cta,.pill,.giant-cta')];
magneticTargets.forEach(element=>{
  element.addEventListener('pointermove',event=>{if(!motionEnabled()||event.pointerType!=='mouse')return;const r=element.getBoundingClientRect();element.style.setProperty('--mag-x',`${((event.clientX-r.left)/r.width-.5)*9}px`);element.style.setProperty('--mag-y',`${((event.clientY-r.top)/r.height-.5)*7}px`);},{passive:true});
  element.addEventListener('pointerleave',()=>{element.style.removeProperty('--mag-x');element.style.removeProperty('--mag-y');});
});
document.querySelectorAll('.collection-item').forEach(card=>{
  card.addEventListener('pointermove',event=>{if(!motionEnabled()||event.pointerType!=='mouse')return;const r=card.getBoundingClientRect();card.style.setProperty('--tilt-x',`${((event.clientY-r.top)/r.height-.5)*-4}deg`);card.style.setProperty('--tilt-y',`${((event.clientX-r.left)/r.width-.5)*5}deg`);},{passive:true});
  card.addEventListener('pointerleave',()=>{card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');});
});

// Floating auto-scroll: play/pause one level above back-to-top; no autoplay.
// The optional chapter tour pauses at each landmark and continues automatically.
let auto=false,raf=0,last=0,position=0,toastTimer,nextStop=Infinity,holdUntil=0;
const scrollButton=$('autoScrollToggle'),speedSelect=$('scrollSpeed'),modeSelect=$('scrollMode');
const safePref=(key)=>{try{return localStorage.getItem(key);}catch{return null;}};
const savePref=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const savedSpeed=safePref('storysiap.landing.speed');
if(speedSelect&&['28','55','90'].includes(savedSpeed))speedSelect.value=savedSpeed;
const savedMode=safePref('storysiap.landing.mode');
if(modeSelect&&['flow','chapter'].includes(savedMode))modeSelect.value=savedMode;
function toast(message){const status=$('scrollStatus');if(!status)return;status.textContent=message;status.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>status.classList.remove('visible'),2600);}
function updateAuto(){if(!scrollButton)return;scrollButton.setAttribute('aria-pressed',String(auto));scrollButton.setAttribute('aria-label',auto?'Jeda auto-scroll':'Aktifkan auto-scroll');scrollButton.title=auto?'Jeda auto-scroll':'Aktifkan auto-scroll';document.documentElement.classList.toggle('auto-scrolling',auto);}
function stopAuto(message){if(!auto)return;auto=false;cancelAnimationFrame(raf);last=0;holdUntil=0;updateAuto();if(message)toast(message);}
function nextChapter(after){
  const targets=[...document.querySelectorAll('main > section')].map(s=>s.offsetTop).filter(y=>y>after+80);
  return targets.length?Math.min(...targets):Infinity;
}
function autoTick(time){
  if(!auto)return;
  if(!last)last=time;
  const elapsed=Math.min((time-last)/1000,.1);last=time;
  const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const chapter=modeSelect?.value==='chapter';
  if(chapter){
    if(time<holdUntil){raf=requestAnimationFrame(autoTick);return;}
    if(position>=nextStop-1){nextStop=nextChapter(position);holdUntil=time+850;raf=requestAnimationFrame(autoTick);return;}
  }
  let rate=Number(speedSelect?.value||55);
  if(chapter&&Number.isFinite(nextStop)){
    const distance=nextStop-position;
    // Softer easing into every scene; no involuntary jump or scroll-snap.
    rate*=clamp(distance/200,.30,1);
  }
  position=Math.min(max,position+rate*elapsed,chapter?nextStop:Infinity);
  window.scrollTo(0,position);
  if(position>=max-1){stopAuto('Kamu sudah sampai di akhir.');return;}
  raf=requestAnimationFrame(autoTick);
}
scrollButton?.addEventListener('click',()=>{
  if(auto){stopAuto('Auto-scroll dijeda.');return;}
  const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  if(max<=0||scrollY>=max-2){toast('Kembali ke atas untuk mulai lagi.');return;}
  auto=true;position=scrollY;last=0;holdUntil=0;nextStop=nextChapter(position);
  updateAuto();toast(modeSelect?.value==='chapter'?'Tur bab aktif — berhenti sejenak pada setiap bagian.':'Auto-scroll aktif — klik ikon lagi untuk jeda.');
  raf=requestAnimationFrame(autoTick);
});
speedSelect?.addEventListener('change',()=>savePref('storysiap.landing.speed',speedSelect.value));
modeSelect?.addEventListener('change',()=>{savePref('storysiap.landing.mode',modeSelect.value);nextStop=nextChapter(scrollY);holdUntil=0;if(auto)toast(modeSelect.value==='chapter'?'Mode bab aktif.':'Mode alir aktif.');});
$('backToTop')?.addEventListener('click',()=>{stopAuto();window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});});
addEventListener('wheel',()=>stopAuto('Auto-scroll dijeda karena kamu menggulir manual.'),{passive:true});
addEventListener('touchstart',event=>{if(!(event.target instanceof Element)||!event.target.closest('.scroll-tools'))stopAuto('Auto-scroll dijeda.');},{passive:true});
addEventListener('pointerdown',event=>{if(!(event.target instanceof Element)||!event.target.closest('.scroll-tools'))stopAuto('Auto-scroll dijeda.');},{passive:true});
addEventListener('keydown',event=>{if(event.key==='Escape'){stopAuto('Auto-scroll dijeda.');closeMenu();return;}if(event.target instanceof Element&&event.target.closest('.scroll-tools'))return;if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))stopAuto('Auto-scroll dijeda.');});
document.querySelectorAll('a[href^="#"],details').forEach(element=>element.addEventListener('click',()=>stopAuto('Auto-scroll dijeda.')));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto('Auto-scroll dijeda saat tab tidak aktif.');});
addEventListener('pagehide',()=>stopAuto());

// Native keyboard-accessible before/after drag scrubber.
const compareRange=$('compareRange'),compareWorkspace=$('compareWorkspace');
function renderComparison(){
  if(!compareRange||!compareWorkspace)return;
  const value=clamp(Number(compareRange.value)||0,0,100);
  compareWorkspace.style.setProperty('--split',`${value}%`);
  compareRange.setAttribute('aria-valuetext',`${value} persen efek sinematik`);
  if($('comparePercent'))$('comparePercent').textContent=`${value} / ${100-value}`;
}
compareRange?.addEventListener('input',renderComparison);
renderComparison();

// Responsive animated playground: visuals react to input across the entire scene.
const playgroundArea=document.querySelector('.playground');
playgroundArea?.addEventListener('pointermove',event=>{
  if(!motionEnabled()||event.pointerType!=='mouse')return;
  const rect=playgroundArea.getBoundingClientRect();
  const x=clamp((event.clientX-rect.left)/rect.width,0,1),y=clamp((event.clientY-rect.top)/rect.height,0,1);
  for(const scene of liquidScenes){if(scene.mode===1)scene.pointer=[x,y];}
  playgroundArea.style.setProperty('--light-x',`${x*100}%`);
  wakeScenes();
},{passive:true});
playgroundArea?.addEventListener('pointerleave',()=>{for(const scene of liquidScenes)if(scene.mode===1)scene.pointer=[.5,.5];});

// Scroll choreography: nav state, progress, section tracking, parallax, shader camera.
const sections=[...document.querySelectorAll('main > section')];
const navLinks=[...document.querySelectorAll('.nav-links a')];
const chapterLinks=[...document.querySelectorAll('[data-chapter]')];
let lastMotionScroll=0;
let scrollPending=false;
function updateScrollEffects(){
  scrollPending=false;const max=Math.max(0,document.documentElement.scrollHeight-innerHeight),progress=max?clamp(scrollY/max,0,1):0;
  $('readingProgress')?.style.setProperty('transform',`scaleX(${progress})`);
  document.documentElement.style.setProperty('--scene-rhythm',progress.toFixed(4));
  const delta=clamp(scrollY-lastMotionScroll,-90,90);lastMotionScroll=scrollY;
  const ticker=$('kineticTrack');if(ticker){
    const width=Math.max(200,ticker.scrollWidth/2);
    const shift=((-scrollY*.32)%width+width)%width;
    ticker.style.setProperty('--ticker-x',`${-shift}px`);
  }
  document.documentElement.style.setProperty('--scroll-velocity',`${Math.abs(delta)/90}`);

  const ring=$('autoScrollToggle')?.querySelector('.scroll-progress-ring');if(ring){const circumference=2*Math.PI*21;ring.style.strokeDasharray=String(circumference);ring.style.strokeDashoffset=String(circumference*(1-progress));}
  $('globalNav')?.classList.toggle('is-scrolled',scrollY>28);
  for(const element of document.querySelectorAll('[data-depth]')){const rect=element.getBoundingClientRect(),depth=Number(element.dataset.depth||0),offset=(rect.top+rect.height*.5-innerHeight*.5)*depth;element.style.setProperty('--depth-y',`${clamp(-offset,-42,42)}px`);}
  let activeSection=null;
  for(const section of sections){const rect=section.getBoundingClientRect(),amount=clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);section.style.setProperty('--section-progress',amount.toFixed(3));if(rect.top<innerHeight*.48&&rect.bottom>innerHeight*.48)activeSection=section;}
  if(activeSection){const href=`#${activeSection.id||''}`;navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')===href));
    const index=sections.indexOf(activeSection);
    chapterLinks.forEach(link=>{const on=link.dataset.chapter===activeSection.id;link.classList.toggle('is-active',on);if(on)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    if($('chapterCounter'))$('chapterCounter').textContent=`${String(index+1).padStart(2,'0')} / ${String(sections.length).padStart(2,'0')}`;}
  for(const scene of liquidScenes){const rect=scene.canvas.getBoundingClientRect();scene.scroll=clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);}
  const playground=document.querySelector('.playground'),backdrop=$('sceneBackdrop');if(playground&&backdrop){const rect=playground.getBoundingClientRect(),amount=clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);backdrop.style.transform=`scale(${1.04+amount*.045}) translate3d(0,${(amount-.5)*-2.2}%,0)`;}
  wakeScenes();
}
function requestScrollEffects(){if(scrollPending)return;scrollPending=true;requestAnimationFrame(updateScrollEffects);}
addEventListener('scroll',requestScrollEffects,{passive:true});addEventListener('resize',requestScrollEffects,{passive:true});
requestScrollEffects();
