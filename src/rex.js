import { TILE, PR, RR, HIDE_SIGHT, DOOR_HIT_CD } from './config.js';
import { cellCenter, isWall, bfsNext } from './grid.js';
import { losBlocked } from './physics.js';
import { doorBlocksRex } from './doors.js';

// returns true when a rex has caught the player
export function updateRexes(state,dt){
  const { player, cfg, rng } = state;
  const pc=Math.floor(player.x/TILE), pr=Math.floor(player.y/TILE);
  for(const rex of state.rexes){
    rex.roarCD=Math.max(0,rex.roarCD-dt);
    if(rex.lureTimer>0) rex.lureTimer-=dt;
    const dist=Math.hypot(player.x-rex.x,player.y-rex.y);
    const sightRange = player.hidden ? HIDE_SIGHT : cfg.sight;
    const sees = dist<sightRange && !losBlocked(state,rex.x,rex.y,player.x,player.y);
    if(sees){
      if(!rex.chasing && rex.roarCD<=0){ state.bus.emit('rex:roar'); rex.roarCD=2.5; }
      rex.chasing=true; rex.alert=2.2; rex.seenC=pc; rex.seenR=pr; rex.lureTimer=0;
    } else if(rex.alert>0){ rex.alert-=dt; if(rex.alert<=0) rex.chasing=false; }

    // decide goal: chase > investigate lure > search last seen > wander
    let goalC=null, goalR=null, investigating=false;
    if(rex.chasing){ goalC=rex.seenC; goalR=rex.seenR; }
    else if(rex.lureTimer>0 && rex.lureX!=null){ investigating=true; goalC=Math.floor(rex.lureX/TILE); goalR=Math.floor(rex.lureY/TILE); }
    else if(rex.alert>0){ goalC=rex.seenC; goalR=rex.seenR; }

    // choose next cell when arrived at target center
    // patrolling rexes route around intact doors; a chasing rex paths through
    // them and smashes whatever door it runs into
    const tCtr=cellCenter(rex.tc,rex.tr);
    if(Math.hypot(tCtr.x-rex.x,tCtr.y-rex.y)<2){
      rex.x=tCtr.x; rex.y=tCtr.y; rex.c=rex.tc; rex.r=rex.tr;
      let nxt=null;
      if(goalC!=null && !(goalC===rex.c&&goalR===rex.r))
        nxt=bfsNext(state.grid,rex.c,rex.r,goalC,goalR, rex.chasing?null:(c,r)=>doorBlocksRex(state,c,r));
      if(!nxt){ // wander: random open neighbour, avoid reversing
        const opts=[[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>({c:rex.c+dx,r:rex.r+dy}))
          .filter(o=>!isWall(state.grid,o.c,o.r)&&!doorBlocksRex(state,o.c,o.r));
        const fwd=opts.filter(o=>!(o.c===rex.prevC&&o.r===rex.prevR));
        const pick=(fwd.length?fwd:opts); nxt=pick[Math.floor(rng()*pick.length)];
      }
      if(nxt){
        const D=state.doorMap.get(nxt.c+','+nxt.r);
        if(D && !D.broken && D.open<0.75){
          if(rex.chasing){
            // a chasing rex batters the closed door down — several blows
            // (it stays committed to the door even once the prey is out of sight)
            rex.alert=Math.max(rex.alert,0.5);
            if(nxt.c!==rex.c) rex.dir=nxt.c>rex.c?1:-1;
            rex.hitCD-=dt;
            // swing only at a (nearly) shut door, not one still sliding
            if(rex.hitCD<=0 && D.open<0.25){
              rex.hitCD=DOOR_HIT_CD; D.hp--; D.hitT=0.3;
              state.bus.emit('door:hit');
              if(D.hp<=0){ D.broken=true; state.bus.emit('door:broken'); }
            }
          }
          // not chasing: stand off — the path is recomputed against closed doors
        } else {
          rex.hitCD=DOOR_HIT_CD*0.5;
          rex.prevC=rex.c; rex.prevR=rex.r; rex.tc=nxt.c; rex.tr=nxt.r;
        }
      }
    }
    // move toward target center
    const tc2=cellCenter(rex.tc,rex.tr);
    const dx=tc2.x-rex.x, dy=tc2.y-rex.y, dd=Math.hypot(dx,dy)||1;
    const base = rex.chasing?cfg.chase : (investigating?cfg.patrol*1.4:cfg.patrol);
    const spd=base*dt;
    rex.x+=dx/dd*Math.min(spd,dd); rex.y+=dy/dd*Math.min(spd,dd);
    if(Math.abs(dx)>0.5) rex.dir=dx>0?1:-1;

    if(dist<RR+PR-3) return true;
  }
  return false;
}

export function dangerLevel(state){
  let nearest=Infinity;
  for(const b of [...state.rexes, ...state.dilos, ...state.raptors])
    nearest=Math.min(nearest,Math.hypot(b.x-state.player.x,b.y-state.player.y));
  return Math.max(0,Math.min(1,1-nearest/(state.visionR*2.4)));
}
