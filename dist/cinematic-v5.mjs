// StorySiap v5: frame-accurate scroll choreography + canvas atmosphere.
// Independent enhancement: baseline landing works without this file.
const root = document.documentElement;
const hero = document.querySelector('.hero');
const portal = document.querySelector('.cinema-portal');
const particles = document.getElementById('heroParticles');
const phase = document.getElementById('portalPhase');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
let pointer={x:.5,y:.5},sPointer={x:.5,y:.5};
let currentScroll=scrollY,frame=0,last=0,visible=true;
function enabled(){return !reduced.matches&&!root.classList.contains('motion-off');}
function refreshScroll(){currentScroll=scrollY;}
addEventListener('scroll',refreshScroll,{passive:true});
addEventListener('resize',refreshScroll,{passive:true});
addEventListener('pointermove',e=>{pointer.x=e.clientX/Math.max(1,innerWidth);pointer.y=e.clientY/Math.max(1,innerHeight);},{passive:true});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;});
let ctx=particles?.getContext('2d',{alpha:true}),stars=[];
function fit(){
 if(!particles||!ctx)return;
 const r=hero.getBoundingClientRect(),dpi=Math.min(devicePixelRatio||1,1.5);
 particles.width=Math.floor(Math.max(1,r.width)*dpi);
 particles.height=Math.floor(Math.max(1,r.height)*dpi);
 ctx.setTransform(dpi,0,0,dpi,0,0);
 const count=Math.min(92,Math.floor(r.width*r.height/14500));
 // Fixed seed preserves the star field geometry across sessions.
 let seed=71925;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 stars=Array.from({length:count},()=>({x:rnd(),y:rnd(),z:.3+rnd()*.7,r:.3+rnd()*1.2,phase:rnd()*6.28}));
}
fit();addEventListener('resize',fit,{passive:true});
function drawStars(time,scroll){
 if(!ctx||!particles)return;
 const w=particles.clientWidth,h=particles.clientHeight;
 ctx.clearRect(0,0,w,h);
 if(!enabled())return;
 const px=(sPointer.x-.5)*25,py=(sPointer.y-.5)*20;
 for(const s of stars){
  const x=(s.x*w+px*s.z-scroll*21*s.z+w)%w;
  const y=(s.y*h+py*s.z+scroll*32*s.z+h)%h;
  const a=(.12+.36*(.5+.5*Math.sin(time*.0007+s.phase)))*s.z;
  ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);
  ctx.fillStyle=`rgba(220,199,255,${a.toFixed(3)})`;ctx.fill();
 }
}
function between(x,a,b){return clamp((x-a)/(b-a),0,1);}
function smooth(x){return x*x*(3-2*x);}
function render(now){
 frame=requestAnimationFrame(render);
 if(!visible||now-last<1000/45)return;last=now;
 sPointer.x+=(pointer.x-sPointer.x)*.065;
 sPointer.y+=(pointer.y-sPointer.y)*.065;
 if(hero){
  const r=hero.getBoundingClientRect();
  const distance=Math.max(1,r.height);const fraction=clamp(-r.top/distance,0,1);
  hero.style.setProperty('--v5-scroll',enabled()?fraction.toFixed(4):'0');
  hero.style.setProperty('--v5-px',enabled()?((sPointer.x-.5)*2).toFixed(4):'0');
  hero.style.setProperty('--v5-py',enabled()?((sPointer.y-.5)*2).toFixed(4):'0');
  hero.style.setProperty('--v5-angle',enabled()?(now*.004%360).toFixed(3):'0');
  hero.style.setProperty('--v5-time',enabled()?(now*.001%360).toFixed(3):'0');
  if(r.bottom>0&&r.top<innerHeight)drawStars(now,fraction);
 }
 if(portal){
  const r=portal.getBoundingClientRect();
  const travel=Math.max(1,r.height-innerHeight);
  const t=enabled()?clamp(-r.top/travel,0,1):0;
  portal.style.setProperty('--act',t.toFixed(4));
  portal.style.setProperty('--spin',`${(t*265).toFixed(2)}deg`);
  const a=1-smooth(between(t,.06,.34));
  const b=smooth(between(t,.23,.41))*(1-smooth(between(t,.58,.77)));
  const c=smooth(between(t,.65,.88));
  portal.style.setProperty('--opacity-a',a.toFixed(4));
  portal.style.setProperty('--opacity-b',b.toFixed(4));
  portal.style.setProperty('--opacity-c',c.toFixed(4));
  // Compose transforms with JS numbers for broad browser compatibility;
  // all transforms are mathematically connected to the scroll position.
  const sphere=portal.querySelector('.portal-sphere');
  if(sphere){sphere.style.transform=`translate(-50%,-50%) rotate(${t*250}deg) scale(${1+t*.15})`;sphere.style.opacity=String(1-smooth(between(t,.13,.43))*.82);}
  const halo=portal.querySelector('.halo-outer');
  if(halo)halo.style.transform=`translate(-50%,-50%) rotate(${t*260}deg) rotateX(63deg)`;
  const photos=portal.querySelectorAll('.portal-photo');
  if(photos[0]){
    photos[0].style.opacity=String(smooth(between(t,.14,.32))*(1-smooth(between(t,.63,.88))));
    photos[0].style.transform=`translate(-50%,-50%) translate3d(${(0.52-t)*210}px,${(.5-t)*100}px,0) rotateY(${-30+t*65}deg) rotateZ(${-15+t*25}deg) scale(${.8+t*.27})`;
  }
  if(photos[1]){
    photos[1].style.opacity=String(smooth(between(t,.6,.82)));
    photos[1].style.transform=`translate(-50%,-50%) translate3d(${(t-.5)*270}px,${(t-.5)*-95}px,0) rotateY(${35-t*70}deg) rotateZ(${8-t*19}deg) scale(${.75+t*.22})`;
  }
  portal.querySelectorAll('.portal-line').forEach((el,i)=>{
    const amount=[a,b,c][i];
    const active=amount>.12;
    el.style.opacity=String(amount);
    if(i===0)el.style.transform=`translate3d(0,${t*-90}px,0) scale(${1-t*.15})`;
    if(i===1)el.style.transform=`translate3d(0,${(.5-t)*115}px,0) scale(${.92+t*.1})`;
    if(i===2)el.style.transform=`translate3d(0,${(.85-t)*90}px,0) scale(${.89+t*.11})`;
    if(el.getAttribute('aria-hidden')!==String(!active))el.setAttribute('aria-hidden',String(!active));
    el.style.pointerEvents=active?'auto':'none';
    const link=el.querySelector('a');if(link&&link.tabIndex!==(active?0:-1))link.tabIndex=active?0:-1;
  });
  if(phase)phase.textContent=t<.34?'01 — FEEL':t<.69?'02 — CREATE':'03 — SHARE';
 }
}
frame=requestAnimationFrame(render);
