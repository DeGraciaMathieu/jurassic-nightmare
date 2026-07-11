import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, TILE } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createApp, update } from '../src/app.js';
import { loadLevel } from '../src/level.js';
import { throwLure } from '../src/player.js';
import { attractRexes } from '../src/lures.js';

function arena(seed=1){
  const state = createApp({ rng: mulberry32(seed) });
  loadLevel(state,0);
  state.status='play';
  state.grid = Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>(r===0||c===0||r===ROWS-1||c===COLS-1)?1:0));
  state.rexes=[]; state.cards=[]; state.doors=[]; state.doorMap=new Map(); state.grassSet=new Set(); state.decor=[];
  state.player.x=(COLS/2)*TILE; state.player.y=(ROWS/2)*TILE; // cellule (9,6)
  return state;
}
function step(state,secs,dt=1/60){ for(let t=0;t<secs-1e-9;t+=dt) update(state,dt); }
function addRex(state,c,r){
  const rex={ x:(c+0.5)*TILE, y:(r+0.5)*TILE, c, r, tc:c, tr:r,
              dir:1, chasing:false, alert:0, seenC:c, seenR:r, prevC:c, prevR:r,
              roarCD:0, lureTimer:0, lureX:null, lureY:null, hitCD:0 };
  state.rexes.push(rex);
  return rex;
}

test('un rex qui voit le joueur rugit et le prend en chasse', () => {
  const state = arena();
  let roars=0; state.bus.on('rex:roar',()=>roars++);
  const rex = addRex(state,11,6); // à 80 px, ligne de vue dégagée
  step(state,1/60);
  assert.equal(rex.chasing, true);
  assert.equal(roars, 1);
});

test('un mur coupe la ligne de vue', () => {
  const state = arena();
  const rex = addRex(state,11,6);
  state.grid[6][10]=1; // mur entre le rex et le joueur
  step(state,1/60);
  assert.equal(rex.chasing, false);
});

test("caché dans l'herbe, le joueur devient quasi invisible", () => {
  const state = arena();
  state.grassSet.add('9,6'); // la cellule du joueur
  const rex = addRex(state,11,6); // à 80 px > HIDE_SIGHT (54)
  step(state,1/60);
  assert.equal(rex.chasing, false);
});

test('un flare qui atterrit détourne un rex en chasse', () => {
  const state = arena();
  const rex = addRex(state,11,6);
  step(state,1/60);
  assert.equal(rex.chasing, true);
  attractRexes(state,{x:300,y:260,life:5}); // atterri à portée d'ouïe
  assert.equal(rex.chasing, false);
  assert.equal(rex.lureTimer, 5);
  assert.equal(rex.lureX, 300);
  assert.equal(rex.lureY, 260);
});

test('un rex hors de vue investigue un flare tombé à proximité', () => {
  const state = arena();
  const rex = addRex(state,15,11); // loin du joueur, hors de portée de vue
  state.player.fx=0; state.player.fy=1;
  throwLure(state); // part vers le bas et retombe à mi-chemin du rex
  step(state,1);
  assert.equal(state.lures.length, 1);
  assert.equal(state.lures[0].flying, false);
  assert.ok(rex.lureTimer > 0, 'il a entendu le flare');
  const L = state.lures[0];
  const d0 = Math.hypot(rex.x-L.x, rex.y-L.y);
  step(state,1);
  const d1 = Math.hypot(rex.x-L.x, rex.y-L.y);
  assert.ok(d1 < d0, 'il marche vers le flare');
});

test("sprinter s'entend : un rex hors de vue vient enquêter", () => {
  const state = arena();
  const rex = addRex(state,14,6); // à 200 px : hors de portée de vue (145), à portée d'ouïe (220)
  state.keys['a']=true; state.keys['shift']=true; // sprint vers la gauche, dos au rex
  step(state,0.3);
  assert.equal(rex.chasing, false, 'il ne chasse pas, il enquête');
  assert.ok(rex.alert > 0, 'il a entendu les pas');
  assert.ok(rex.seenC <= 9, 'il vise la position du bruit');
});

test('marcher reste silencieux', () => {
  const state = arena();
  const rex = addRex(state,14,6);
  state.keys['a']=true; // marche, sans sprint
  step(state,0.3);
  assert.equal(rex.alert, 0);
});

test('marcher sur une caisse craque : un rex hors de vue vient enquêter', () => {
  const state = arena();
  state.decor.push({ type:'crate', c:8, r:6, x:8.5*TILE, y:6.5*TILE });
  const rex = addRex(state,14,6); // hors de portée de vue (145), à portée du craquement (260)
  let crunches=0; state.bus.on('decor:crunch',()=>crunches++);
  state.keys['a']=true; // marche (sans sprint) vers la caisse
  step(state,0.3);
  assert.equal(crunches, 1);
  assert.equal(rex.chasing, false, 'il ne chasse pas, il enquête');
  assert.ok(rex.alert > 0, 'il a entendu le craquement');
  assert.equal(rex.seenC, 8, 'il vise la caisse');
});

test('un craquement trop lointain reste inaudible', () => {
  const state = arena();
  state.decor.push({ type:'bones', c:8, r:6, x:8.5*TILE, y:6.5*TILE });
  const rex = addRex(state,17,6); // à ~340 px du craquement, hors de portée d'ouïe (260)
  let crunches=0; state.bus.on('decor:crunch',()=>crunches++);
  state.keys['a']=true;
  step(state,0.3);
  assert.equal(crunches, 1, 'le craquement a bien eu lieu');
  assert.equal(rex.alert, 0);
});

test('un rex au contact tue le joueur', () => {
  const state = arena();
  let died=false, lost=null;
  state.bus.on('player:died',()=>died=true);
  state.bus.on('life:lost',p=>lost=p);
  addRex(state,9,6); // sur la cellule du joueur
  step(state,1/60);
  assert.equal(state.status, 'scare');
  assert.equal(died, true);
  step(state,1); // le jumpscare se termine : une vie est consommée
  assert.equal(state.status, 'lifelost');
  assert.equal(lost.lives, 2);
});
