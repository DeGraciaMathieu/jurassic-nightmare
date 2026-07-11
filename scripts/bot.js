import { TILE } from '../src/config.js';
import { cellCenter, bfsNext } from '../src/grid.js';
import { throwLure } from '../src/player.js';

const DANGER_R = 65;     // px: cells this close to a beast are routed around
const SPRINT_DIST = 210; // px: sprint as soon as a chasing beast is this close
const LURE_DIST = 170;   // px: throw a flare at the closest chaser

function beasts(state){ return [...state.rexes, ...state.dilos, ...state.raptors]; }

function nearestCard(state){
  let best=null, bd=Infinity;
  for(const c of state.cards) if(!c.taken){
    const d=Math.hypot(c.x-state.player.x,c.y-state.player.y);
    if(d<bd){ bd=d; best=c; }
  }
  return best;
}

// drive the player one tick: route to the nearest card (then the exit),
// detour around beasts, sprint from chasers and flare the closest one
export function botAct(state){
  if(state.status!=='play') return;
  const { player } = state;
  const pc=Math.floor(player.x/TILE), pr=Math.floor(player.y/TILE);

  const target = nearestCard(state) ?? state.exit;
  const tc=Math.floor(target.x/TILE), tr=Math.floor(target.y/TILE);

  // route around beasts when possible, straight through otherwise
  const all=beasts(state);
  const danger=(c,r)=>{
    const p=cellCenter(c,r);
    return all.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<DANGER_R);
  };
  let next=null;
  if(!(pc===tc&&pr===tr))
    next = bfsNext(state.grid,pc,pr,tc,tr,danger) ?? bfsNext(state.grid,pc,pr,tc,tr,null);
  state.touchTarget = next ? cellCenter(next.c,next.r) : { x:target.x, y:target.y };

  // chasers: sprint away, and drop a flare on the closest one to break the chase
  let chaser=null, cd=Infinity;
  for(const b of all) if(b.chasing){
    const d=Math.hypot(b.x-player.x,b.y-player.y);
    if(d<cd){ cd=d; chaser=b; }
  }
  state.keys['shift'] = !!chaser && cd<SPRINT_DIST;
  if(chaser && cd<LURE_DIST && state.lures.length===0){
    player.fx=(chaser.x-player.x)/cd; player.fy=(chaser.y-player.y)/cd;
    throwLure(state);
  }
}
