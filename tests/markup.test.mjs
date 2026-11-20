import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../dist/studio.html',import.meta.url),'utf8');
const app=await readFile(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('editor controls and SVG symbols have unique IDs',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate IDs can redirect actions to SVG symbols');
});
test('all editor element references resolve',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),`Missing ${m[1]}`);
});
