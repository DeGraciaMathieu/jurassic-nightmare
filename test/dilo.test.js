import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, TILE, DOOR_HP, POISON_DURATION } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createApp, update } from '../src/app.js';
import { loadLevel } from '../src/level.js';
import { attractRexes } from '../src/lures.js';

function arena(seed=1){
  const state = createApp({ rng: mulberry32(seed) });
  loadLevel(state,0);
  state.status='play';
  state.grid = Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>(r===0||c===0||r===ROWS-1||c===COLS-1)?1:0));
  state.rexes=[]; state.dilos=[]; state.cards=[]; state.doors=[]; state.doorMap=new Map(); state.grassSet=new Set(); state.decor=[];
  state.player.x=(COLS/2)*TILE; state.player.y=(ROWS/2)*TILE; // cellule (9,6)
  return state;
}
function step(state,secs,dt=1/60){ for(let t=0;t<secs-1e-9;t+=dt) update(state,dt); }
function addDilo(state,c,r){
  const d={ x:(c+0.5)*TILE, y:(r+0.5)*TILE, c, r, tc:c, tr:r,
            dir:1, chasing:false, alert:0, seenC:c, seenR:r, prevC:c, prevR:r,
            hissCD:0, lureTimer:0, lureX:null, lureY:null, spitCD:0, spitT:0 };
  state.dilos.push(d);
  return d;
}
function addDoor(state,c,r){
  const D={ c, r, x:(c+0.5)*TILE, y:(r+0.5)*TILE, horiz:true, open:0, hp:DOOR_HP, broken:false, hitT:0 };
  state.doors.push(D); state.doorMap.set(c+','+r,D);
  return D;
}

test('le secteur 2 accueille un rex et un dilophosaure', () => {
  const state = createApp({ rng: mulberry32(1) });
  loadLevel(state,1);
  assert.equal(state.dilos.length, 1);
  assert.equal(state.rexes.length, 1);
});

test('le dilo siffle et traque le joueur à vue', () => {
  const state = arena();
  let hisses=0; state.bus.on('dilo:hiss',()=>hisses++);
  const d = addDilo(state,11,6); // à 80 px, ligne de vue dégagée
  step(state,1/60);
  assert.equal(d.chasing, true);
  assert.equal(hisses, 1);
});

test("à portée, il s'arrête et crache au lieu d'avancer", () => {
  const state = arena();
  let spits=0; state.bus.on('dilo:spit',()=>spits++);
  const d = addDilo(state,11,6); // 80 px < portée de crachat (140)
  const x0=d.x, y0=d.y;
  step(state,0.5);
  assert.equal(spits, 1, 'un seul crachat pendant le cooldown');
  assert.equal(d.x, x0);
  assert.equal(d.y, y0);
});

test('le venin empoisonne le joueur au contact', () => {
  const state = arena();
  let poisoned=0; state.bus.on('player:poisoned',()=>poisoned++);
  addDilo(state,11,6);
  step(state,0.6); // vol du glob : 80 px à 240 px/s
  assert.equal(poisoned, 1);
  assert.ok(state.poisonT > 0);
});

test('empoisonné : torche réduite et jambes ralenties, puis récupération', () => {
  const a = arena(), b = arena();
  a.poisonT=POISON_DURATION;
  a.keys['d']=true; b.keys['d']=true;
  step(a,0.5); step(b,0.5);
  assert.ok(a.player.x < b.player.x, 'le poison ralentit');
  step(a,0.7);
  assert.ok(a.visionR < a.cfg.vision*0.7, 'le poison aveugle');
  step(a,4); // le poison (3 s) expire puis la vue revient
  assert.equal(a.poisonT, 0);
  assert.ok(a.visionR > a.cfg.vision*0.9, 'la vue est revenue');
});

test('un mur arrête le venin sans empoisonner', () => {
  const state = arena();
  state.venoms.push({x:100, y:60, vx:0, vy:-240, life:2}); // droit vers le mur du haut
  step(state,0.5);
  assert.equal(state.venoms.length, 0);
  assert.equal(state.poisonT, 0);
});

test('toucher le dilo est mortel', () => {
  const state = arena();
  let died=false; state.bus.on('player:died',()=>died=true);
  addDilo(state,9,6); // sur la cellule du joueur
  step(state,1/60);
  assert.equal(state.status, 'scare');
  assert.equal(died, true);
});

test('un flare détourne aussi le dilo', () => {
  const state = arena();
  const d = addDilo(state,11,6);
  step(state,1/60);
  assert.equal(d.chasing, true);
  attractRexes(state,{x:300,y:260,life:5});
  assert.equal(d.chasing, false);
  assert.equal(d.lureTimer, 5);
});

test("le dilo entend aussi les sprints", () => {
  const state = arena();
  const d = addDilo(state,14,6); // hors de vue, à portée d'ouïe
  state.keys['a']=true; state.keys['shift']=true;
  step(state,0.3);
  assert.equal(d.chasing, false);
  assert.ok(d.alert > 0);
});

test("caché dans l'herbe, le joueur échappe au dilo", () => {
  const state = arena();
  state.grassSet.add('9,6'); // la cellule du joueur
  const d = addDilo(state,11,6); // à 80 px > HIDE_SIGHT (54)
  step(state,1/60);
  assert.equal(d.chasing, false);
});

test('une porte fermée bloque le dilo, même en chasse — il ne la défonce jamais', () => {
  const state = arena();
  for(let r=1;r<ROWS-1;r++)for(let c=1;c<COLS-1;c++) state.grid[r][c]=(r===6)?0:1; // couloir
  state.player.x=16.5*TILE; state.player.y=6.5*TILE; // au fond du couloir
  const D = addDoor(state,9,6);
  const d = addDilo(state,5,6);
  d.chasing=true; d.alert=2.2; d.seenC=16; d.seenR=6;
  step(state,5);
  assert.equal(D.broken, false);
  assert.equal(D.hp, DOOR_HP);
  assert.ok(d.c < 9 && d.tc < 9, 'il est resté du même côté');
});
