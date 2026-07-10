import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, TILE, DOOR_HP } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createApp, update } from '../src/app.js';
import { loadLevel } from '../src/level.js';
import { doorBlocksRex, doorSolid } from '../src/doors.js';

function arena(seed=1){
  const state = createApp({ rng: mulberry32(seed) });
  loadLevel(state,0);
  state.status='play';
  state.grid = Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>(r===0||c===0||r===ROWS-1||c===COLS-1)?1:0));
  state.rexes=[]; state.cards=[]; state.doors=[]; state.doorMap=new Map(); state.grassSet=new Set();
  state.player.x=(COLS/2)*TILE; state.player.y=(ROWS/2)*TILE; // cellule (9,6)
  return state;
}
function step(state,secs,dt=1/60){ for(let t=0;t<secs-1e-9;t+=dt) update(state,dt); }
function addDoor(state,c,r,horiz=true){
  const D={ c, r, x:(c+0.5)*TILE, y:(r+0.5)*TILE, horiz, open:0, hp:DOOR_HP, broken:false, hitT:0 };
  state.doors.push(D); state.doorMap.set(c+','+r,D);
  return D;
}
function addRex(state,c,r){
  const rex={ x:(c+0.5)*TILE, y:(r+0.5)*TILE, c, r, tc:c, tr:r,
              dir:1, chasing:false, alert:0, seenC:c, seenR:r, prevC:c, prevR:r,
              roarCD:0, lureTimer:0, lureX:null, lureY:null, hitCD:0 };
  state.rexes.push(rex);
  return rex;
}

test("la porte s'ouvre à l'approche du joueur et se referme derrière lui", () => {
  const state = arena();
  const D = addDoor(state,10,6); // à 40 px du joueur
  step(state,0.5);
  assert.equal(D.open, 1);
  state.player.x=100; state.player.y=100; // parti ailleurs
  step(state,0.5);
  assert.equal(D.open, 0);
});

test('une porte fermée est solide, puis laisse passer le joueur en s\'ouvrant', () => {
  const state = arena();
  const D = addDoor(state,12,6); // hors de portée du capteur (120 px)
  assert.equal(doorSolid(state,12,6), true);
  assert.equal(doorBlocksRex(state,12,6), true);
  state.keys['d']=true; // il marche vers la porte, qui s'ouvre devant lui
  step(state,2);
  assert.ok(state.player.x > 13*TILE, 'il a traversé la cellule porte');
  assert.equal(D.broken, false);
});

test('un rex en patrouille ne franchit jamais une porte fermée', () => {
  const state = arena();
  // couloir en cul-de-sac coupé par une porte
  for(let r=1;r<ROWS-1;r++)for(let c=1;c<COLS-1;c++) state.grid[r][c]=(r===6&&c>=12&&c<=16)?0:1;
  state.grid[1][1]=0; // recoin pour le joueur, loin du couloir
  state.player.x=1.5*TILE; state.player.y=1.5*TILE;
  addDoor(state,14,6);
  const rex = addRex(state,12,6);
  step(state,5);
  assert.ok(rex.c < 14 && rex.tc < 14, 'il est resté du même côté');
});

test('un rex en chasse défonce une porte fermée en quatre coups', () => {
  const state = arena();
  for(let r=1;r<ROWS-1;r++)for(let c=1;c<COLS-1;c++) state.grid[r][c]=(r===6)?0:1; // couloir
  state.player.x=16.5*TILE; state.player.y=6.5*TILE; // au fond du couloir
  const D = addDoor(state,9,6);
  const rex = addRex(state,5,6);
  rex.chasing=true; rex.alert=2.2; rex.seenC=16; rex.seenR=6;
  let hits=0; state.bus.on('door:hit',()=>hits++);
  step(state,5);
  assert.equal(D.broken, true);
  assert.equal(hits, 4);
  assert.ok(rex.x > D.x, 'il est passé au travers');
});
