import { DOOR_SENSE, DOOR_SPEED } from './config.js';

// intact doors block rexes while closed — but a rex can slip through the
// doorway while it is still open, before it slides shut
export function doorBlocksRex(state,c,r){ const D=state.doorMap.get(c+','+r); return !!D && !D.broken && D.open<0.75; }
export function doorSolid(state,c,r){ const D=state.doorMap.get(c+','+r); return !!D && !D.broken && D.open<0.6; }

// doors slide open for the player and shut behind them;
// a rex in (or committed to) the doorway wedges the door open
export function updateDoors(state,dt){
  const { player, rexes } = state;
  for(const D of state.doors){
    if(D.hitT>0) D.hitT-=dt;
    if(D.broken) continue;
    const near=Math.hypot(player.x-D.x,player.y-D.y)<DOOR_SENSE;
    const wedged=rexes.some(rx=>(rx.c===D.c&&rx.r===D.r)||(rx.tc===D.c&&rx.tr===D.r));
    D.open=Math.max(0,Math.min(1, D.open+((near||wedged)?1:-1)*DOOR_SPEED*dt));
  }
}
