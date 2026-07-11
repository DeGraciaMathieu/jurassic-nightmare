import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, TILE, DOOR_HP, RAPTOR_FEINTS } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createApp, update } from '../src/app.js';
import { loadLevel } from '../src/level.js';
import { attractRexes } from '../src/lures.js';

// secteur 3 réel (sight 180) puis terrain dégagé pour des scénarios déterministes
function arena(seed=1){
  const state = createApp({ rng: mulberry32(seed) });
  loadLevel(state,2);
  state.status='play';
  state.grid = Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>(r===0||c===0||r===ROWS-1||c===COLS-1)?1:0));
  state.rexes=[]; state.dilos=[]; state.raptors=[]; state.cards=[]; state.doors=[]; state.doorMap=new Map(); state.grassSet=new Set(); state.decor=[];
  state.player.x=(COLS/2)*TILE; state.player.y=(ROWS/2)*TILE; // cellule (9,6)
  return state;
}
function step(state,secs,dt=1/60){ for(let t=0;t<secs-1e-9;t+=dt) update(state,dt); }
function addRaptor(state,c,r,role){
  const rap={ x:(c+0.5)*TILE, y:(r+0.5)*TILE, c, r, tc:c, tr:r,
              dir:1, role, chasing:false, alert:0,
              seenC:c, seenR:r, prevC:c, prevR:r,
              barkCD:0, lureTimer:0, lureX:null, lureY:null, flankC:null, flankR:null,
              feints:0, feintT:0, mode:'hold', lostT:0, sees:false, dist:1e9 };
  state.raptors.push(rap);
  return rap;
}
function addDoor(state,c,r,open=0){
  const D={ c, r, x:(c+0.5)*TILE, y:(r+0.5)*TILE, horiz:true, open, hp:DOOR_HP, broken:false, hitT:0 };
  state.doors.push(D); state.doorMap.set(c+','+r,D);
  return D;
}
const distToPlayer = (state,rap) => Math.hypot(rap.x-state.player.x, rap.y-state.player.y);

test('le rabatteur aboie et fond sur le joueur', () => {
  const state = arena();
  let barks=0; state.bus.on('raptor:bark',()=>barks++);
  const rap = addRaptor(state,13,6,'driver'); // à 160 px, à portée de vue (180)
  const d0 = distToPlayer(state,rap);
  step(state,0.5);
  assert.equal(rap.chasing, true);
  assert.equal(barks, 1);
  assert.ok(distToPlayer(state,rap) < d0, 'il se rapproche');
});

test('la meute partage la détection', () => {
  const state = arena();
  const driver = addRaptor(state,13,6,'driver'); // voit le joueur
  const flanker = addRaptor(state,9,11,'flanker'); // à 200 px : hors de portée de vue
  step(state,1/60);
  assert.equal(driver.chasing, true);
  assert.equal(flanker.chasing, false, "il n'a pas vu lui-même");
  assert.ok(flanker.alert > 0, "mais la meute l'a prévenu");
  assert.equal(flanker.seenC, 9);
  assert.equal(flanker.seenR, 6);
});

test('le flanqueur coupe la route devant le joueur, sans le traverser', () => {
  const state = arena();
  const flanker = addRaptor(state,11,8,'flanker'); // à 113 px, il voit le joueur
  let crossed=false;
  for(let t=0;t<2;t+=1/60){ update(state,1/60); if(flanker.c===9&&flanker.r===6) crossed=true; }
  // joueur face à droite (fx=1) : l'interception vise 4 cases devant lui, la cellule (13,6)
  assert.ok(Math.hypot(flanker.x-13.5*TILE, flanker.y-6.5*TILE) < 3, 'posté sur la route de fuite');
  assert.equal(crossed, false, 'il ne traverse jamais la case du joueur');
  assert.equal(state.status, 'play', 'il ne fonce pas au contact');
});

test('le flanqueur emprunte la boucle et tient son cap hors de vue', () => {
  const state = arena();
  for(let c=1;c<COLS-1;c++){ state.grid[5][c]=1; state.grid[7][c]=1; } // le joueur vit dans le couloir de la rangée 6
  state.grid[5][7]=0; state.grid[5][11]=0; // deux passages vers la zone parallèle du haut
  const flanker = addRaptor(state,7,6,'flanker'); // derrière le joueur, dans son couloir
  let crossed=false;
  for(let t=0;t<4;t+=1/60){ update(state,1/60); if(flanker.c===9&&flanker.r===6) crossed=true; }
  assert.ok(Math.hypot(flanker.x-13.5*TILE, flanker.y-6.5*TILE) < 3, 'posté devant la fuite via la boucle');
  assert.equal(crossed, false, 'jamais par la case du joueur');
  assert.equal(state.status, 'play');
});

test('sans boucle, le flanqueur se rabat en chasse directe', () => {
  const state = arena();
  for(let c=1;c<COLS-1;c++){ state.grid[5][c]=1; state.grid[7][c]=1; } // couloir sans échappatoire
  addRaptor(state,5,6,'flanker'); // derrière le joueur, à portée de vue
  step(state,2.5);
  assert.notEqual(state.status, 'play', 'il a foncé au contact');
});

test('le feinteur avorte ses premières charges sans atteindre le contact', () => {
  const state = arena();
  const rap = addRaptor(state,13,6,'feinter'); // à 160 px : il voit, le cycle démarre
  let minD=1e9;
  for(let t=0;t<2.2;t+=1/60){ update(state,1/60); minD=Math.min(minD, distToPlayer(state,rap)); }
  assert.ok(rap.feints >= 1, 'au moins une feinte est partie');
  assert.ok(minD > 40, `la charge avorte avant le contact (min ${Math.round(minD)}px)`);
  assert.equal(state.status, 'play');
});

test('après ses feintes, la vraie charge tue', () => {
  const state = arena();
  const rap = addRaptor(state,13,6,'feinter');
  step(state,8);
  assert.equal(rap.feints, RAPTOR_FEINTS);
  assert.notEqual(state.status, 'play', 'la charge finale a porté');
});

test('perdre le feinteur de vue remet ses feintes à zéro', () => {
  const state = arena();
  const rap = addRaptor(state,13,6,'feinter');
  step(state,1);
  assert.ok(rap.feints >= 1, 'une feinte est déjà partie');
  state.player.x=2.5*TILE; state.player.y=2.5*TILE; // le joueur s'évanouit dans le noir
  step(state,1.5);
  assert.equal(rap.feints, 0, 'le cycle est reparti de zéro');
});

test('un raptor se faufile par une porte entrouverte, sans la frapper', () => {
  const state = arena();
  let hits=0; state.bus.on('door:hit',()=>hits++);
  const D = addDoor(state,11,6,0.6);
  const rap = addRaptor(state,12,6,'driver');
  rap.alert=2; rap.seenC=9; rap.seenR=6; // il sait où chercher, sans ligne de vue
  step(state,0.6);
  assert.ok(rap.x < 11*TILE, 'il est passé au travers');
  assert.equal(hits, 0);
  assert.equal(D.hp, DOOR_HP);
});

test('porte close : le raptor contourne, il ne défonce jamais', () => {
  const state = arena();
  let hits=0; state.bus.on('door:hit',()=>hits++);
  const D = addDoor(state,11,6,0);
  const rap = addRaptor(state,12,6,'driver');
  rap.alert=2; rap.seenC=9; rap.seenR=6;
  const d0 = distToPlayer(state,rap);
  step(state,1.2);
  assert.equal(hits, 0);
  assert.equal(D.hp, DOOR_HP);
  assert.equal(D.open, 0, 'la porte est restée fermée');
  assert.ok(distToPlayer(state,rap) < d0, 'il a progressé par un autre chemin');
});

test('les craquements de débris alertent aussi la meute', () => {
  const state = arena();
  state.decor.push({ type:'crate', c:8, r:6, x:8.5*TILE, y:6.5*TILE });
  const rap = addRaptor(state,14,6,'driver'); // hors de vue, à portée du craquement (260)
  state.keys['a']=true; // marche vers la caisse, dos au raptor
  step(state,0.3);
  assert.ok(rap.alert > 0, 'il a entendu le craquement');
  assert.equal(rap.chasing, false);
});

test('un flare détourne un raptor en chasse', () => {
  const state = arena();
  const rap = addRaptor(state,13,6,'driver');
  step(state,1/60);
  assert.equal(rap.chasing, true);
  attractRexes(state,{x:300,y:260,life:5});
  assert.equal(rap.chasing, false);
  assert.equal(rap.lureTimer, 5);
});
