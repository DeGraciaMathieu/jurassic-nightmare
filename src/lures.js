import { TILE, W, H, LURE_HEAR } from './config.js';
import { circleHitsWalls } from './physics.js';

export function attractRexes(state,L){
  // the noise pulls rexes and dilos alike off your trail
  for(const beast of [...state.rexes, ...state.dilos]){
    if(Math.hypot(beast.x-L.x, beast.y-L.y) < LURE_HEAR){
      beast.lureX=L.x; beast.lureY=L.y; beast.lureTimer=L.life;
      beast.chasing=false; beast.alert=0;
    }
  }
}

export function updateLures(state,dt){
  for(const L of state.lures){
    if(L.flying){
      const nx=L.x+L.vx*dt, ny=L.y+L.vy*dt;
      L.dist+=Math.hypot(L.vx,L.vy)*dt;
      if(circleHitsWalls(state,nx,ny,4) || L.dist>4.2*TILE){
        L.flying=false;
        L.x=Math.max(8,Math.min(W-8,L.x)); L.y=Math.max(8,Math.min(H-8,L.y));
        attractRexes(state,L);
      } else { L.x=nx; L.y=ny; }
    } else { L.life-=dt; }
  }
  state.lures=state.lures.filter(L=>L.flying||L.life>0);
}
