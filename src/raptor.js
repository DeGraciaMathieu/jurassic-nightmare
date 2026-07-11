import { TILE, PR, HIDE_SIGHT, RAPTOR_R, RAPTOR_PATROL, RAPTOR_CHASE, RAPTOR_LUNGE,
         RAPTOR_HOLD_DIST, RAPTOR_ABORT_DIST, RAPTOR_ENGAGE_DIST, RAPTOR_FEINTS,
         RAPTOR_FEINT_WINDUP, RAPTOR_LOST_SIGHT, FLANK_AHEAD } from './config.js';
import { cellCenter, isWall, bfsNext } from './grid.js';
import { losBlocked } from './physics.js';
import { doorBlocksRaptor } from './doors.js';

// the flanker cuts the prey off: it aims for the first open cell ahead of
// the player's heading, scanning from FLANK_AHEAD tiles down to 2 so it
// posts on the escape route instead of the player's back
function flankGoal(state,pc,pr){
  let fx=state.player.fx, fy=state.player.fy;
  if(fx===0&&fy===0) fx=1;
  const ax = Math.abs(fx)>=Math.abs(fy) ? Math.sign(fx) : 0;
  const ay = ax===0 ? Math.sign(fy) : 0;
  for(let k=FLANK_AHEAD;k>=2;k--){
    const c=pc+ax*k, r=pr+ay*k;
    if(!isWall(state.grid,c,r)) return {c,r};
  }
  return null;
}

function openNeighbours(state,c,r){
  return [[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>({c:c+dx,r:r+dy}))
    .filter(o=>!isWall(state.grid,o.c,o.r)&&!doorBlocksRaptor(state,o.c,o.r));
}

// returns true when a raptor has caught the player
export function updateRaptors(state,dt){
  const { player, cfg, rng } = state;
  const pc=Math.floor(player.x/TILE), pr=Math.floor(player.y/TILE);
  const sightRange = player.hidden ? HIDE_SIGHT : cfg.sight;

  // pack perception: one raptor spotting the player alerts the whole squad
  let packSees=false;
  for(const rap of state.raptors){
    rap.barkCD=Math.max(0,rap.barkCD-dt);
    if(rap.lureTimer>0) rap.lureTimer-=dt;
    rap.dist=Math.hypot(player.x-rap.x,player.y-rap.y);
    rap.sees = rap.dist<sightRange && !losBlocked(state,rap.x,rap.y,player.x,player.y);
    if(rap.sees) packSees=true;
  }

  for(const rap of state.raptors){
    if(rap.sees){
      if(!rap.chasing && rap.barkCD<=0){ state.bus.emit('raptor:bark'); rap.barkCD=2.5; }
      rap.chasing=true; rap.lureTimer=0;
    }
    if(packSees){ rap.alert=2.2; rap.seenC=pc; rap.seenR=pr; }
    else { if(rap.alert>0) rap.alert-=dt; if(rap.alert<=0){ rap.chasing=false; rap.flankC=null; rap.flankR=null; } }

    // feinter loses its nerve when sight breaks too long: the cycle restarts
    if(rap.role==='feinter'){
      if(rap.sees) rap.lostT=0;
      else { rap.lostT+=dt; if(rap.lostT>RAPTOR_LOST_SIGHT){ rap.feints=0; rap.mode='hold'; } }
    }

    // decide goal: pack engagement drives the role, then lure > last seen > wander
    let goalC=null, goalR=null, speed=RAPTOR_PATROL, holding=false, flanking=false;
    if(packSees && rap.role==='flanker' && rap.dist>RAPTOR_ENGAGE_DIST){
      const g=flankGoal(state,pc,pr);
      rap.flankC=g?g.c:null; rap.flankR=g?g.r:null;
      if(g){ goalC=g.c; goalR=g.r; speed=RAPTOR_CHASE; flanking=true; }
      else { goalC=rap.seenC; goalR=rap.seenR; speed=RAPTOR_CHASE; }
    } else if(packSees && rap.role==='feinter' && rap.sees){
      if(rap.mode==='lunge'){ goalC=pc; goalR=pr; speed=RAPTOR_LUNGE; }
      else if(rap.mode==='feint'){
        goalC=pc; goalR=pr; speed=RAPTOR_CHASE;
        if(rap.dist<=RAPTOR_ABORT_DIST){
          // aborted charge: swerve back along the edge it came in on
          rap.feints++; rap.mode='hold'; rap.feintT=RAPTOR_FEINT_WINDUP;
          rap.tc=rap.c; rap.tr=rap.r;
        }
      } else { // hold: keep the stand-off distance while winding up the next charge
        holding=true;
        if(rap.dist>=RAPTOR_HOLD_DIST){
          rap.feintT-=dt;
          if(rap.feintT<=0) rap.mode = rap.feints>=RAPTOR_FEINTS ? 'lunge' : 'feint';
        }
      }
    } else if(packSees){ goalC=rap.seenC; goalR=rap.seenR; speed=RAPTOR_CHASE; }
    else if(rap.lureTimer>0 && rap.lureX!=null){ goalC=Math.floor(rap.lureX/TILE); goalR=Math.floor(rap.lureY/TILE); speed=RAPTOR_PATROL*1.4; }
    else if(rap.alert>0 && rap.role==='flanker' && rap.flankC!=null){
      // committed cut-off: sight always breaks inside a parallel corridor,
      // so the flanker holds its course for the whole alert window
      goalC=rap.flankC; goalR=rap.flankR; speed=RAPTOR_CHASE; flanking=true;
    }
    else if(rap.alert>0){ goalC=rap.seenC; goalR=rap.seenR; }

    // choose next cell when arrived at target center; raptors never smash
    // doors — closed ones are routed around, ajar ones are slipped through
    const tCtr=cellCenter(rap.tc,rap.tr);
    if(Math.hypot(tCtr.x-rap.x,tCtr.y-rap.y)<2){
      rap.x=tCtr.x; rap.y=tCtr.y; rap.c=rap.tc; rap.r=rap.tr;
      let nxt=null;
      if(holding){
        // back away only while the player crowds the stand-off distance
        if(rap.dist<RAPTOR_HOLD_DIST){
          let bd=rap.dist;
          for(const o of openNeighbours(state,rap.c,rap.r)){
            const oc=cellCenter(o.c,o.r);
            const d=Math.hypot(oc.x-player.x,oc.y-player.y);
            if(d>bd){ bd=d; nxt=o; }
          }
        }
      } else {
        const arrived = goalC!=null && goalC===rap.c && goalR===rap.r; // e.g. flanker posted on its cut-off cell
        if(goalC!=null && !arrived){
          // a flanker routes around the prey's (last seen) cell so it takes a
          // maze loop; with no loop it falls back to driving straight in
          nxt = flanking
            ? bfsNext(state.grid,rap.c,rap.r,goalC,goalR,(c,r)=>doorBlocksRaptor(state,c,r)||(c===rap.seenC&&r===rap.seenR))
            : bfsNext(state.grid,rap.c,rap.r,goalC,goalR,(c,r)=>doorBlocksRaptor(state,c,r));
          if(!nxt && flanking)
            nxt=bfsNext(state.grid,rap.c,rap.r,rap.seenC,rap.seenR,(c,r)=>doorBlocksRaptor(state,c,r));
        }
        if(!nxt && !arrived){ // wander: random open neighbour, avoid reversing
          const opts=openNeighbours(state,rap.c,rap.r);
          const fwd=opts.filter(o=>!(o.c===rap.prevC&&o.r===rap.prevR));
          const pick=(fwd.length?fwd:opts); nxt=pick[Math.floor(rng()*pick.length)];
        }
      }
      if(nxt){ rap.prevC=rap.c; rap.prevR=rap.r; rap.tc=nxt.c; rap.tr=nxt.r; }
    }

    // move toward target center
    const tc2=cellCenter(rap.tc,rap.tr);
    const dx=tc2.x-rap.x, dy=tc2.y-rap.y, dd=Math.hypot(dx,dy)||1;
    const spd=speed*dt;
    rap.x+=dx/dd*Math.min(spd,dd); rap.y+=dy/dd*Math.min(spd,dd);
    if(Math.abs(dx)>0.5) rap.dir=dx>0?1:-1;
    if(holding) rap.dir=player.x>rap.x?1:-1; // a feinter squares up to its prey

    if(rap.dist<RAPTOR_R+PR-3) return true;
  }
  return false;
}
