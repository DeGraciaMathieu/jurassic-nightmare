import { TILE, PR } from './config.js';
import { isWall } from './grid.js';
import { doorSolid } from './doors.js';

export function circleHitsWalls(state,cx,cy,r){
  const c0=Math.floor((cx-r)/TILE), c1=Math.floor((cx+r)/TILE);
  const r0=Math.floor((cy-r)/TILE), r1=Math.floor((cy+r)/TILE);
  for(let rr=r0;rr<=r1;rr++)for(let cc=c0;cc<=c1;cc++){
    if(isWall(state.grid,cc,rr) || doorSolid(state,cc,rr)){
      const nx=Math.max(cc*TILE,Math.min(cx,cc*TILE+TILE));
      const ny=Math.max(rr*TILE,Math.min(cy,rr*TILE+TILE));
      const dx=cx-nx, dy=cy-ny;
      if(dx*dx+dy*dy<r*r) return true;
    }
  }
  return false;
}

// axis move with corner rounding: if the move is blocked only by a tile
// corner, slide the player along the perpendicular axis to round it off
export function movePlayerAxis(state,dx,dy){
  const p=state.player;
  if(!circleHitsWalls(state,p.x+dx,p.y+dy,PR)){ p.x+=dx; p.y+=dy; return; }
  const amt=Math.abs(dx||dy);
  for(let n=1;n<=PR;n++){
    if(dx!==0){
      if(!circleHitsWalls(state,p.x+dx,p.y-n,PR)){ p.y-=Math.min(n,amt); return; }
      if(!circleHitsWalls(state,p.x+dx,p.y+n,PR)){ p.y+=Math.min(n,amt); return; }
    } else {
      if(!circleHitsWalls(state,p.x-n,p.y+dy,PR)){ p.x-=Math.min(n,amt); return; }
      if(!circleHitsWalls(state,p.x+n,p.y+dy,PR)){ p.x+=Math.min(n,amt); return; }
    }
  }
}

export function losBlocked(state,x1,y1,x2,y2){
  const steps=Math.ceil(Math.hypot(x2-x1,y2-y1)/8);
  for(let s=1;s<steps;s++){
    const t=s/steps, px=x1+(x2-x1)*t, py=y1+(y2-y1)*t;
    const c=Math.floor(px/TILE), r=Math.floor(py/TILE);
    if(isWall(state.grid,c,r) || doorSolid(state,c,r)) return true;
  }
  return false;
}
