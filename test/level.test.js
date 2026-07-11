import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, TILE, LEVELS } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createApp } from '../src/app.js';
import { loadLevel, cardsLeft } from '../src/level.js';
import { cellDist } from '../src/grid.js';

function freshLevel(i,seed=1){
  const state = createApp({ rng: mulberry32(seed) });
  loadLevel(state,i);
  return state;
}

test('chaque niveau place les effectifs prévus par sa configuration', () => {
  LEVELS.forEach((cfg,i) => {
    const state = freshLevel(i);
    assert.equal(state.cards.length, cfg.cards);
    assert.equal(state.rexes.length, cfg.rex);
    assert.equal(state.dilos.length, cfg.dilo);
    assert.ok(state.doors.length <= cfg.doors);
    assert.ok(state.grassSet.size > 0);
    assert.equal(state.doorMap.size, state.doors.length);
  });
});

test('le joueur démarre en haut à gauche, la sortie est en bas à droite', () => {
  const state = freshLevel(0);
  assert.equal(state.player.x, 1.5*TILE);
  assert.equal(state.player.y, 1.5*TILE);
  assert.equal(state.exit.c, COLS-2);
  assert.equal(state.exit.r, ROWS-2);
});

test('cartes et rexes ne spawnent pas sur le joueur', () => {
  for(const seed of [1,2,3]){
    const state = freshLevel(2,seed); // le niveau le plus dense
    const start = {c:1,r:1};
    for(const cd of state.cards)
      assert.ok(cellDist({c:Math.floor(cd.x/TILE),r:Math.floor(cd.y/TILE)},start) > 3);
    for(const rx of state.rexes)
      assert.ok(cellDist({c:rx.c,r:rx.r},start) > 6);
    const volier = freshLevel(1,seed);
    for(const dl of volier.dilos)
      assert.ok(cellDist({c:dl.c,r:dl.r},start) > 6);
  }
});

test('toutes les cartes sont à ramasser au départ', () => {
  const state = freshLevel(1);
  assert.equal(cardsLeft(state), state.cards.length);
});
