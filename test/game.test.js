import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/rng.js';
import { createApp, update, startGame, nextLevel, die } from '../src/app.js';

test('startGame réinitialise une partie perdue et relance au secteur 1', () => {
  const state = createApp({ rng: mulberry32(1) });
  state.status='dead'; state.score=730; state.levelIdx=2;
  startGame(state,42);
  assert.equal(state.status, 'play');
  assert.equal(state.score, 0);
  assert.equal(state.levelIdx, 0);
  assert.equal(state.cards.length, 3);
});

test('même seed, même partie', () => {
  const a = createApp({ rng: mulberry32(1) });
  const b = createApp({ rng: mulberry32(2) });
  startGame(a,7); startGame(b,7);
  assert.deepEqual(a.grid, b.grid);
  assert.deepEqual(a.cards, b.cards);
  assert.deepEqual(a.doors.map(D=>[D.c,D.r]), b.doors.map(D=>[D.c,D.r]));
});

test('cartes ramassées + sortie atteinte → secteur suivant, avec bonus de temps', () => {
  const state = createApp({ rng: mulberry32(1) });
  startGame(state,1);
  let cleared=null; state.bus.on('level:cleared',p=>cleared=p);
  state.rexes=[];
  for(const c of state.cards) c.taken=true;
  state.player.x=state.exit.x; state.player.y=state.exit.y;
  update(state,1/60);
  assert.equal(state.status, 'levelclear');
  assert.equal(cleared.level, 1);
  assert.ok(cleared.bonus > 0 && cleared.bonus <= 300);
  assert.equal(state.score, 100+cleared.bonus);
  nextLevel(state);
  assert.equal(state.levelIdx, 1);
  assert.equal(state.status, 'play');
  assert.equal(state.cards.length, 4);
});

test('dernier secteur franchi → victoire', () => {
  const state = createApp({ rng: mulberry32(1) });
  startGame(state,1); nextLevel(state); nextLevel(state);
  assert.equal(state.levelIdx, 2);
  let won=null; state.bus.on('game:won',p=>won=p);
  state.rexes=[]; state.raptors=[];
  for(const c of state.cards) c.taken=true;
  state.player.x=state.exit.x; state.player.y=state.exit.y;
  update(state,1/60);
  assert.equal(state.status, 'win');
  assert.equal(won.score, state.score);
});

test("la mort passe par le jumpscare puis l'écran de fin", () => {
  const state = createApp({ rng: mulberry32(1) });
  startGame(state,1);
  let over=null; state.bus.on('game:over',p=>over=p);
  die(state);
  assert.equal(state.status, 'scare');
  for(let t=0;t<1;t+=1/60) update(state,1/60);
  assert.equal(state.status, 'dead');
  assert.deepEqual(over, {level:1, score:0});
});

test('la partie tourne sans entrée utilisateur (fumée, 10 s simulées)', () => {
  const state = createApp({ rng: mulberry32(3) });
  startGame(state,3);
  for(let t=0;t<10;t+=1/60) update(state,1/60);
  assert.ok(['play','scare','dead'].includes(state.status));
  if(state.status==='play') assert.ok(Math.abs(state.levelTime-10)<0.1);
});
