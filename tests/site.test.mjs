import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);
const pages=['index.html','studio.html'];
for(const page of pages){
  const html=await readFile(new URL(page,root),'utf8');
  test(`${page}: unique element IDs and reachable local assets`,async()=>{
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,'Duplicate DOM IDs');
    for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
      const ref=m[1];if(/^(?:https?:|data:|blob:)/.test(ref))continue;
      if(ref.startsWith('#')){assert.ok(ids.includes(ref.slice(1)),`Missing anchor ${ref}`);continue;}
      const path=ref.split('#')[0];await access(new URL(path==='./'?'index.html':path,root));
    }
  });
}
test('landing page points visitors to the functional studio',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.ok((html.match(/href="studio.html"/g)||[]).length>=4);
  assert.match(html,/script type="module" src="landing.mjs"/);
  assert.match(html,/Simulasi komposisi bingkai/);
});
test('landing script references real elements and respects reduced motion',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8'),script=await readFile(new URL('landing.mjs',root),'utf8');
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of script.matchAll(/getElementById\('([^']+)'\)/g))assert.ok(ids.has(m[1]),`Missing ${m[1]}`);
  for(const m of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),`Missing ${m[1]}`);
  assert.match(script,/prefers-reduced-motion/);
});
test('CSS asset references resolve without external dependencies',async()=>{
  for(const file of ['landing.css','style.css','studio-premium.css']){
    const css=await readFile(new URL(file,root),'utf8');
    for(const m of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))await access(new URL(m[1],root));
  }
});
test('landing auto-scroll control is opt-in and stacked above back-to-top',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.match(html,/id="autoScrollToggle"[^>]*aria-pressed="false"/);
  assert.ok(html.indexOf('id="autoScrollToggle"')<html.indexOf('id="backToTop"'));
  assert.match(html,/class="scroll-progress-ring"/);
});
test('studio exposes the added premium typography and frame controls',async()=>{
  const html=await readFile(new URL('studio.html',root),'utf8');
  for(const id of ['fontFamily','textAlign','textColor','watermarkPosition','frameBorder'])assert.match(html,new RegExp(`id="${id}"`));
});
test('landing includes procedural 3D scenes with a graceful non-WebGL fallback',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8'),script=await readFile(new URL('landing.mjs',root),'utf8'),css=await readFile(new URL('landing.css',root),'utf8');
  assert.match(html,/id="heroWebGL"/);assert.match(html,/id="playgroundWebGL"/);
  assert.match(script,/sceneSDF/);assert.match(script,/createLiquidScene/);assert.match(script,/IntersectionObserver/);
  assert.match(css,/\.scene-canvas\.scene-fallback/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('landing exposes working look, rotation, auto-scroll, and mobile-menu controls',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8'),script=await readFile(new URL('landing.mjs',root),'utf8');
  for(const id of ['rotateScene','autoScrollToggle','scrollSpeed','menuToggle','mobileMenu','backToTop'])assert.match(html,new RegExp(`id="${id}"`));
  for(const look of ['clean','cinema','sunset','editorial'])assert.match(html,new RegExp(`data-look="${look}"`));
  assert.match(script,/stopAuto\('Auto-scroll dijeda/);assert.match(script,/aria-pressed/);
});
