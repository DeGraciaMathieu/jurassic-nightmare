import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, TILE, PR, STAMINA_MAX } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createApp, update } from '../src/app.js';
import { loadLevel } from '../src/level.js';
import { throwLure } from '../src/player.js';

// niveau réel puis terrain dégagé (intérieur ouvert, sans rex ni porte)
// pour piloter des scénarios déterministes
function arena(seed=1){
  const state = createApp({ rng: mulberry32(seed) });
  loadLevel(state,0);
  state.status='play';
  state.grid = Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>(r===0||c===0||r===ROWS-1||c===COLS-1)?1:0));
  state.rexes=[]; state.cards=[]; state.doors=[]; state.doorMap=new Map(); state.grassSet=new Set(); state.decor=[];
  state.player.x=(COLS/2)*TILE; state.player.y=(ROWS/2)*TILE;
  return state;
}
function step(state,secs,dt=1/60){ for(let t=0;t<secs-1e-9;t+=dt) update(state,dt); }

test('le joueur se déplace avec les touches et reste bloqué par les murs', () => {
  const state = arena();
  const x0 = state.player.x;
  state.keys['d']=true;
  step(state,0.5);
  assert.ok(state.player.x > x0, 'il avance vers la droite');
  step(state,10); // fonce dans le mur de droite
  assert.ok(state.player.x <= (COLS-1)*TILE-PR, 'le mur le retient');
  assert.ok(state.player.x > (COLS-1)*TILE-PR-5, 'il est collé au mur');
});

test('le sprint est plus rapide que la marche', () => {
  const a = arena(), b = arena();
  a.keys['d']=true;
  b.keys['d']=true; b.keys['shift']=true;
  step(a,0.8); step(b,0.8);
  assert.ok(b.player.x > a.player.x);
});

test("le sprint épuise l'endurance, qui se régénère ensuite", () => {
  const state = arena();
  state.keys['d']=true; state.keys['shift']=true;
  step(state,3);
  assert.equal(state.exhausted, true);
  assert.ok(state.stamina < STAMINA_MAX*0.35);
  state.keys['shift']=false;
  step(state,1);
  assert.equal(state.exhausted, true, 'pas encore assez récupéré');
  step(state,1.5);
  assert.equal(state.exhausted, false);
});

test('le joueur est caché uniquement dans les hautes herbes', () => {
  const state = arena();
  step(state,1/60);
  assert.equal(state.player.hidden, false);
  state.grassSet.add(Math.floor(state.player.x/TILE)+','+Math.floor(state.player.y/TILE));
  step(state,1/60);
  assert.equal(state.player.hidden, true);
});

test('une caisse craque à chaque entrée sur sa case, pas en continu', () => {
  const state = arena();
  state.decor.push({ type:'crate', c:8, r:6, x:8.5*TILE, y:6.5*TILE });
  let crunches=0; state.bus.on('decor:crunch',()=>crunches++);
  state.keys['a']=true; // entre sur la caisse...
  step(state,0.3);
  assert.equal(crunches, 1);
  state.keys['a']=false; // ...et reste dessus
  step(state,0.5);
  assert.equal(crunches, 1, 'rester dessus ne craque plus');
  state.keys['d']=true; // repart puis revient
  step(state,0.4);
  state.keys['d']=false; state.keys['a']=true;
  step(state,0.4);
  assert.equal(crunches, 2, 'revenir dessus craque à nouveau');
});

test('le sang, les gravats et les fissures ne craquent pas', () => {
  const state = arena();
  state.decor.push({ type:'blood', c:8, r:6, x:8.5*TILE, y:6.5*TILE });
  state.decor.push({ type:'rubble', c:7, r:6, x:7.5*TILE, y:6.5*TILE });
  let crunches=0; state.bus.on('decor:crunch',()=>crunches++);
  state.keys['a']=true;
  step(state,0.6); // traverse les deux cases décorées
  assert.equal(crunches, 0);
});

test('lancer un flare consomme un leurre, avec temps de recharge', () => {
  const state = arena();
  let thrown=0; state.bus.on('lure:thrown',()=>thrown++);
  throwLure(state);
  assert.equal(state.lureCount, 2);
  assert.equal(state.lures.length, 1);
  assert.equal(state.lures[0].flying, true);
  throwLure(state); // bloqué par le cooldown
  assert.equal(state.lureCount, 2);
  step(state,0.6);
  throwLure(state);
  assert.equal(state.lureCount, 1);
  assert.equal(thrown, 2);
});

test('pas de flare hors partie', () => {
  const state = arena();
  state.status='menu';
  throwLure(state);
  assert.equal(state.lureCount, 3);
});

test('ramasser une carte rapporte 50 points', () => {
  const state = arena();
  let picked=0; state.bus.on('card:picked',()=>picked++);
  state.cards=[{x:state.player.x+15, y:state.player.y, taken:false}];
  step(state,1/60);
  assert.equal(state.cards[0].taken, true);
  assert.equal(state.score, 50);
  assert.equal(picked, 1);
});
