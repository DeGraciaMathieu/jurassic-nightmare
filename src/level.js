import { TILE, COLS, ROWS, LEVELS, DOOR_HP, STAMINA_MAX } from './config.js';
import { shuffle } from './rng.js';
import { genMaze, cellCenter, openCells, cellDist, isWall } from './grid.js';

export function loadLevel(state,i){
  const cfg = state.cfg = LEVELS[i];
  const grid = state.grid = genMaze(state.rng,cfg.braid);
  const start={c:1,r:1}, goal={c:COLS-2,r:ROWS-2};
  grid[start.r][start.c]=0; grid[goal.r][goal.c]=0;
  const pc=cellCenter(start.c,start.r); state.player={x:pc.x,y:pc.y,fx:1,fy:0};
  const gc=cellCenter(goal.c,goal.r); state.exit={x:gc.x,y:gc.y,c:goal.c,r:goal.r};

  const pool = shuffle(state.rng,openCells(grid)).filter(o=>cellDist(o,start)>3 && cellDist(o,goal)>1);
  const cards = state.cards = [];
  for(let k=0;k<cfg.cards && pool.length;k++){
    const cell=pool.shift(); const p=cellCenter(cell.c,cell.r);
    cards.push({x:p.x,y:p.y,taken:false});
  }
  const rexes = state.rexes = [];
  const rexPool = shuffle(state.rng,openCells(grid)).filter(o=>cellDist(o,start)>6);
  for(let k=0;k<cfg.rex && rexPool.length;k++){
    const cell=rexPool.shift(); const p=cellCenter(cell.c,cell.r);
    rexes.push({ x:p.x,y:p.y, c:cell.c,r:cell.r, tc:cell.c,tr:cell.r,
                 dir:1, chasing:false, alert:0,
                 seenC:cell.c, seenR:cell.r, prevC:cell.c, prevR:cell.r,
                 roarCD:0, lureTimer:0, lureX:null, lureY:null, hitCD:0 });
  }
  // tall grass hiding patches
  const grassSet = state.grassSet = new Set();
  const gpool=shuffle(state.rng,openCells(grid)).filter(o=>!(o.c===start.c&&o.r===start.r)&&!(o.c===goal.c&&o.r===goal.r));
  for(let k=0;k<Math.min(18,gpool.length);k++) grassSet.add(gpool[k].c+','+gpool[k].r);

  // sliding security doors on corridor chokepoints
  const doors = state.doors = [];
  const doorMap = state.doorMap = new Map();
  const wall=(c,r)=>isWall(grid,c,r);
  const dpool=shuffle(state.rng,openCells(grid)).filter(o=>{
    if(cellDist(o,start)<3 || cellDist(o,goal)<2) return false;
    if(grassSet.has(o.c+','+o.r)) return false;
    if(cards.some(cd=>Math.floor(cd.x/TILE)===o.c && Math.floor(cd.y/TILE)===o.r)) return false;
    if(rexes.some(rx=>rx.c===o.c && rx.r===o.r)) return false;
    const h = !wall(o.c-1,o.r) && !wall(o.c+1,o.r) && wall(o.c,o.r-1) && wall(o.c,o.r+1);
    const v = !wall(o.c,o.r-1) && !wall(o.c,o.r+1) && wall(o.c-1,o.r) && wall(o.c+1,o.r);
    return h||v;
  });
  for(const o of dpool){
    if(doors.length>=cfg.doors) break;
    if(doors.some(D=>cellDist(D,o)<4)) continue;
    const p=cellCenter(o.c,o.r);
    const D={ c:o.c, r:o.r, x:p.x, y:p.y, horiz:!wall(o.c-1,o.r),
              open:0, hp:DOOR_HP, broken:false, hitT:0 };
    doors.push(D); doorMap.set(o.c+','+o.r,D);
  }

  state.lures=[]; state.lureCount=3; state.throwCD=0;
  state.stamina=STAMINA_MAX; state.exhausted=false;
  state.visionR=cfg.vision; state.levelTime=0;
}

export function cardsLeft(state){ return state.cards.filter(c=>!c.taken).length; }
