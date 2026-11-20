/**
 * StorySiap v6 — unified scroll-film director.
 * IMPORTANT: visual poses are functions of document scroll, not autonomous timelines.
 * A single director owns the world, hero → portal handoff and remaining chapters.
 * Ambient shader in landing.mjs is optional and does not own the scroll narrative.
 */
const root = document.documentElement;
const sections = [...document.querySelectorAll('main > section')];
const hero = document.querySelector('.hero');
const portal = document.querySelector('.cinema-portal');
const world = document.getElementById('continuumStage');
const core = document.getElementById('continuumCore');
const chapter = document.getElementById('continuumChapter');
const chapterProgress = document.getElementById('continuumChapterProgress');
const particles = document.getElementById('heroParticles');
const phase = document.getElementById('portalPhase');
const photoA = portal?.querySelector('.portal-photo-a');
const photoB = portal?.querySelector('.portal-photo-b');
const sphere = portal?.querySelector('.portal-sphere');
const haloOuter = portal?.querySelector('.halo-outer');
const haloInner = portal?.querySelector('.halo-inner');
const lines = [...(portal?.querySelectorAll('.portal-line') ?? [])];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const cap=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{const v=cap(t);return v*v*(3-2*v)};
const range=(x,a,b)=>smooth((x-a)/(b-a));
const rgba=(rgb)=>rgb.map(x=>Math.round(x)).join(' ');
const palette=[
 {color:[162,123,231],x:77,y:52,scale:1.05,alpha:.62,spin:-14}, // Hero
 {color:[194,152,240],x:65,y:53,scale:1.3,alpha:.76,spin:110}, // Portal
 {color:[148,113,210],x:78,y:44,scale:.72,alpha:.38,spin:188}, // Manifesto
 {color:[102,149,201],x:78,y:56,scale:.95,alpha:.52,spin:290}, // Playground
 {color:[212,158,186],x:18,y:40,scale:.69,alpha:.30,spin:380}, // Collections
 {color:[163,143,222],x:82,y:57,scale:.8,alpha:.42,spin:460}, // Compare
 {color:[201,174,128],x:76,y:49,scale:.85,alpha:.44,spin:550}, // Premium
 {color:[156,139,213],x:19,y:48,scale:.72,alpha:.31,spin:638}, // How
 {color:[153,156,212],x:77,y:55,scale:.62,alpha:.26,spin:730}, // FAQ
 {color:[193,162,245],x:55,y:49,scale:1.17,alpha:.63,spin:895} // Final
];
let markers=[];
let targetY=scrollY;
let smoothPointer={x:.5,y:.5};
let pointer={x:.5,y:.5};
let previousTick=-1;
let dirty=true;
let raf=0;
let visible=!document.hidden;
const motionAllowed=()=>!reduce.matches&&!root.classList.contains('motion-off');
function measure(){
  markers=sections.map(section=>{
    const r=section.getBoundingClientRect();
    return {section,top:r.top+scrollY,height:r.height};
  });
  dirty=true;
}
function paletteAt(y){
  const centers=markers.map(m=>m.top+Math.min(m.height,innerHeight*1.6)*.5);
  let i=0;
  while(i<centers.length-2&&y>centers[i+1])i++;
  const a=palette[i]||palette[0], b=palette[i+1]||a;
  const span=Math.max(1,(centers[i+1]||centers[i])-centers[i]);
  const t=centers[i+1]?smooth((y-centers[i])/span):0;
  return {
    color:a.color.map((c,k)=>mix(c,b.color[k],t)),
    x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),
    scale:mix(a.scale,b.scale,t),alpha:mix(a.alpha,b.alpha,t),
    spin:mix(a.spin,b.spin,t)
  };
}
function portalMotion(t){
  if(!portal)return;
  const a=1-range(t,.05,.35);
  const b=range(t,.22,.42)*(1-range(t,.59,.78));
  const c=range(t,.64,.86);
  portal.style.setProperty('--act',t.toFixed(5));
  portal.style.setProperty('--spin',`${(t*310).toFixed(2)}deg`);
  portal.style.setProperty('--opacity-a',a.toFixed(5));
  portal.style.setProperty('--opacity-b',b.toFixed(5));
  portal.style.setProperty('--opacity-c',c.toFixed(5));
  portal.style.setProperty('--portal-camera',`${(t*65).toFixed(2)}deg`);
  // Same exact progress drives the 3D prop, photographs, typography and atmosphere.
  if(sphere){
    sphere.style.opacity=String(1-range(t,.17,.44)*.84);
    sphere.style.transform=`translate(-50%,-50%) translateZ(${(t*170).toFixed(1)}px) rotate(${t*290}deg) scale(${(1+t*.18).toFixed(4)})`;
  }
  if(haloOuter)haloOuter.style.transform=`translate(-50%,-50%) rotate(${t*340}deg) rotateX(${63+t*8}deg)`;
  if(haloInner)haloInner.style.transform=`translate(-50%,-50%) rotate(${-t*285}deg) rotateY(${58+t*14}deg)`;
  if(photoA){
    photoA.style.opacity=String(range(t,.13,.32)*(1-range(t,.63,.85)));
    photoA.style.transform=`translate(-50%,-50%) translate3d(${mix(150,-45,range(t,.1,.72))}px,${mix(85,-36,t)}px,${mix(-250,155,t)}px) rotateY(${mix(-45,19,t)}deg) rotateZ(${mix(-21,12,t)}deg) scale(${mix(.63,1.15,t)})`;
  }
  if(photoB){
    photoB.style.opacity=String(range(t,.57,.80));
    photoB.style.transform=`translate(-50%,-50%) translate3d(${mix(-175,125,t)}px,${mix(100,-80,t)}px,${mix(-250,215,t)}px) rotateY(${mix(35,-35,t)}deg) rotateZ(${mix(15,-13,t)}deg) scale(${mix(.72,1.1,t)})`;
  }
  lines.forEach((el,i)=>{
    const opacity=[a,b,c][i]||0;
    el.style.opacity=String(opacity);
    el.style.transform=`translate3d(0,${(i===0?-95*t:i===1?110*(.5-t):90*(.85-t)).toFixed(2)}px,0) scale(${(i===0?1-.16*t:i===1?.91+.12*t:.89+.12*t).toFixed(3)})`;
    const on=opacity>.15;
    if(el.getAttribute('aria-hidden')!==String(!on))el.setAttribute('aria-hidden',String(!on));
    el.style.pointerEvents=on?'auto':'none';
    const link=el.querySelector('a');if(link)link.tabIndex=on?0:-1;
  });
  if(phase)phase.textContent=t<.34?'01 — FEEL':t<.70?'02 — CREATE':'03 — SHARE';
}
function draw(){
  raf=0;
  if(!visible)return;
  const allow=motionAllowed();
  root.classList.toggle('director-reduced',!allow);
  smoothPointer.x=mix(smoothPointer.x,pointer.x,.095);
  smoothPointer.y=mix(smoothPointer.y,pointer.y,.095);
  const y=targetY,viewport=innerHeight;
  const total=Math.max(1,document.documentElement.scrollHeight-viewport);
  const journey=cap(y/total);
  const focused=y+viewport*.55;
  const pose=paletteAt(focused);
  const swayX=(smoothPointer.x-.5)*15;
  const swayY=(smoothPointer.y-.5)*12;
  root.style.setProperty('--director-journey',journey.toFixed(5));
  root.style.setProperty('--world-rgb',rgba(pose.color));
  root.style.setProperty('--world-x',`${pose.x.toFixed(2)}%`);
  root.style.setProperty('--world-y',`${pose.y.toFixed(2)}%`);
  root.style.setProperty('--world-turn',`${pose.spin.toFixed(2)}deg`);
  if(world){
    // Morphing glow is one persistent visual actor across all ten chapters.
    world.style.opacity=allow?String(pose.alpha):'0';
    world.style.setProperty('--world-px',`${swayX.toFixed(2)}px`);
    world.style.setProperty('--world-py',`${swayY.toFixed(2)}px`);
    world.style.setProperty('--world-scale',pose.scale.toFixed(4));
    world.style.setProperty('--world-orbit',`${(pose.spin*.63).toFixed(2)}deg`);
    world.style.setProperty('--world-glow',String(.7+.3*Math.sin(journey*Math.PI)));
  }
  if(core){
    core.style.transform=`translate3d(calc(-50% + ${swayX.toFixed(2)}px),calc(-50% + ${swayY.toFixed(2)}px),0) rotate(${pose.spin.toFixed(2)}deg) scale(${pose.scale.toFixed(3)})`;
  }
  const activeIndex=Math.max(0,markers.findIndex((m,i)=>focused>=m.top && (i===markers.length-1||focused<markers[i+1].top)));
  const active=markers[activeIndex];
  if(chapter)chapter.innerHTML=`${String(activeIndex+1).padStart(2,'0')} <i>/</i> ${String(sections.length).padStart(2,'0')}`;
  if(chapterProgress&&active)chapterProgress.style.transform=`scaleY(${cap((focused-active.top)/Math.max(1,active.height)).toFixed(5)})`;
  if(hero){
    const m=markers[0], progress=cap((y-m.top)/Math.max(1,m.height));
    const exit=range(progress,.28,.96);
    hero.style.setProperty('--v6-scroll',progress.toFixed(5));
    hero.style.setProperty('--v6-handoff',exit.toFixed(5));
    hero.style.setProperty('--v6-px',((smoothPointer.x-.5)*2).toFixed(5));
    hero.style.setProperty('--v6-py',((smoothPointer.y-.5)*2).toFixed(5));
  }
  if(portal){
    const m=markers[1], travel=Math.max(1,m.height-viewport);
    portalMotion(cap((y-m.top)/travel));
  }
  // Every later chapter has the same local motion grammar and one linked light field.
  for(let i=2;i<markers.length;i++){
    const m=markers[i];
    if(y+viewport<m.top-viewport || y>m.top+m.height+viewport)continue;
    const p=cap((y+viewport*.75-m.top)/(m.height+viewport*.5));
    const enter=range(p,0,.35),exit=range(p,.68,1);
    m.section.style.setProperty('--director-progress',p.toFixed(5));
    m.section.style.setProperty('--director-enter',enter.toFixed(5));
    m.section.style.setProperty('--director-exit',exit.toFixed(5));
    m.section.style.setProperty('--director-drift',`${mix(42,-42,p).toFixed(2)}px`);
    m.section.style.setProperty('--director-rotate',`${mix(-7,7,p).toFixed(2)}deg`);
  }
  if(allow&&Math.abs(smoothPointer.x-pointer.x)+Math.abs(smoothPointer.y-pointer.y)>.003)raf=requestAnimationFrame(draw);
}
function schedule(){if(!raf&&visible)raf=requestAnimationFrame(draw);}
function scroll(){targetY=window.scrollY;schedule();}
addEventListener('scroll',scroll,{passive:true});
addEventListener('resize',()=>{measure();scroll();},{passive:true});
addEventListener('pointermove',event=>{if(event.pointerType==='mouse'){pointer.x=event.clientX/Math.max(1,innerWidth);pointer.y=event.clientY/Math.max(1,innerHeight);schedule();}},{passive:true});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible){measure();scroll();}});
reduce.addEventListener?.('change',schedule);
new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
// Exposed for non-invasive browser QA of the scroll director.
window.__storySiapDirector=Object.freeze({get progress(){return cap(targetY/Math.max(1,document.documentElement.scrollHeight-innerHeight));},get chapters(){return markers.length;}});
measure();scroll();
