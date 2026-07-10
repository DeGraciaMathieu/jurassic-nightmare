import { TILE, COLS, ROWS } from './config.js';
import { shuffle } from './rng.js';

export function cellCenter(c,r){ return { x:(c+0.5)*TILE, y:(r+0.5)*TILE }; }
export function isWall(grid,c,r){ return c<0||r<0||c>=COLS||r>=ROWS||grid[r][c]===1; }
export function openCells(grid){ const o=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(grid[r][c]===0)o.push({c,r}); return o; }
export function cellDist(a,b){ return Math.abs(a.c-b.c)+Math.abs(a.r-b.r); }

// ---- maze generation (recursive backtracker + braiding) ----
export function genMaze(rng,braidP){
  const g = Array.from({length:ROWS},()=>Array(COLS).fill(1)); // 1=wall
  function carve(cx,cy){
    g[cy][cx]=0;
    for(const [dx,dy] of shuffle(rng,[[0,-2],[0,2],[-2,0],[2,0]])){
      const nx=cx+dx, ny=cy+dy;
      if(nx>0&&nx<COLS-1&&ny>0&&ny<ROWS-1&&g[ny][nx]===1){
        g[cy+dy/2][cx+dx/2]=0; carve(nx,ny);
      }
    }
  }
  carve(1,1);
  // braid: open some interior walls to create loops (escape routes)
  for(let y=1;y<ROWS-1;y++) for(let x=1;x<COLS-1;x++){
    if(g[y][x]===1 && rng()<braidP){
      const h = g[y][x-1]===0 && g[y][x+1]===0;
      const v = g[y-1][x]===0 && g[y+1][x]===0;
      if(h||v) g[y][x]=0;
    }
  }
  return g;
}

// ---- BFS next-step for chasing ----
// isBlocked: optional extra obstacle predicate (e.g. intact doors for a
// patrolling rex); walls always block
export function bfsNext(grid,sc,sr,gc,gr,isBlocked){
  if(sc===gc&&sr===gr) return null;
  const prev=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const seen=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  const q=[[sc,sr]]; seen[sr][sc]=true;
  const N=[[0,-1],[0,1],[-1,0],[1,0]];
  while(q.length){
    const [c,r]=q.shift();
    if(c===gc&&r===gr){
      let cur=[c,r];
      while(prev[cur[1]][cur[0]] && !(prev[cur[1]][cur[0]][0]===sc&&prev[cur[1]][cur[0]][1]===sr)){
        cur=prev[cur[1]][cur[0]];
      }
      return {c:cur[0],r:cur[1]};
    }
    for(const [dx,dy] of N){
      const nc=c+dx, nr=r+dy;
      if(nc>=0&&nr>=0&&nc<COLS&&nr<ROWS&&!seen[nr][nc]&&grid[nr][nc]===0&&!(isBlocked&&isBlocked(nc,nr))){
        seen[nr][nc]=true; prev[nr][nc]=[c,r]; q.push([nc,nr]);
      }
    }
  }
  return null;
}
