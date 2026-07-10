import test from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { genMaze, openCells, bfsNext, cellDist } from '../src/grid.js';

test('le labyrinthe est fermé par des murs sur tout son pourtour', () => {
  const g = genMaze(mulberry32(1), 0.1);
  for(let c=0;c<COLS;c++){ assert.equal(g[0][c],1); assert.equal(g[ROWS-1][c],1); }
  for(let r=0;r<ROWS;r++){ assert.equal(g[r][0],1); assert.equal(g[r][COLS-1],1); }
});

test('toutes les cellules ouvertes sont accessibles depuis le départ', () => {
  for(const seed of [1,2,3,42]){
    const g = genMaze(mulberry32(seed), 0.14);
    const seen = new Set(['1,1']);
    const q = [{c:1,r:1}];
    while(q.length){
      const {c,r} = q.pop();
      for(const [dc,dr] of [[0,-1],[0,1],[-1,0],[1,0]]){
        const nc=c+dc, nr=r+dr, k=nc+','+nr;
        if(nc>=0&&nr>=0&&nc<COLS&&nr<ROWS&&g[nr][nc]===0&&!seen.has(k)){ seen.add(k); q.push({c:nc,r:nr}); }
      }
    }
    assert.equal(seen.size, openCells(g).length);
  }
});

test('même seed, même labyrinthe', () => {
  assert.deepEqual(genMaze(mulberry32(7),0.09), genMaze(mulberry32(7),0.09));
});

test("bfsNext mène pas à pas jusqu'à la cible", () => {
  const g = genMaze(mulberry32(5), 0);
  let c=1, r=1, guard=0;
  while(!(c===COLS-2&&r===ROWS-2)){
    const n = bfsNext(g,c,r,COLS-2,ROWS-2,null);
    assert.ok(n, 'un chemin doit exister');
    assert.equal(cellDist({c,r},n), 1, 'chaque pas est une cellule adjacente');
    c=n.c; r=n.r;
    assert.ok(++guard<500, 'le chemin doit aboutir');
  }
});
