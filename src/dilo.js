import { TILE, PR, DILO_R, HIDE_SIGHT, DILO_SPIT_RANGE, DILO_SPIT_CD, VENOM_SPEED, POISON_DURATION } from './config.js';
import { cellCenter, isWall, bfsNext } from './grid.js';
import { losBlocked, circleHitsWalls } from './physics.js';
import { doorBlocksRex } from './doors.js';

// the dilophosaurus stalks like a rex but is a ranged hunter: in range with a
// clear shot it holds its ground and spits venom instead of closing in, and
// closed doors always block it (it never batters them).
// returns true when it catches the player — touching it is lethal
export function updateDilos(state,dt){
  const { player, cfg, rng } = state;
  const pc=Math.floor(player.x/TILE), pr=Math.floor(player.y/TILE);
  for(const d of state.dilos){
    d.hissCD=Math.max(0,d.hissCD-dt);
    d.spitCD=Math.max(0,d.spitCD-dt);
    if(d.spitT>0) d.spitT-=dt;
    if(d.lureTimer>0) d.lureTimer-=dt;
    const dist=Math.hypot(player.x-d.x,player.y-d.y);
    const sightRange = player.hidden ? HIDE_SIGHT : cfg.sight;
    const sees = dist<sightRange && !losBlocked(state,d.x,d.y,player.x,player.y);
    if(sees){
      if(!d.chasing && d.hissCD<=0){ state.bus.emit('dilo:hiss'); d.hissCD=2.5; }
      d.chasing=true; d.alert=2.2; d.seenC=pc; d.seenR=pr; d.lureTimer=0;
    } else if(d.alert>0){ d.alert-=dt; if(d.alert<=0) d.chasing=false; }

    if(d.chasing && sees && dist<DILO_SPIT_RANGE){
      // in range: face the prey and spit on cooldown
      if(Math.abs(player.x-d.x)>0.5) d.dir=player.x>d.x?1:-1;
      if(d.spitCD<=0){
        d.spitCD=DILO_SPIT_CD; d.spitT=0.35;
        const a=Math.atan2(player.y-d.y,player.x-d.x);
        state.venoms.push({ x:d.x, y:d.y, vx:Math.cos(a)*VENOM_SPEED, vy:Math.sin(a)*VENOM_SPEED, life:2 });
        state.bus.emit('dilo:spit');
      }
    } else {
      // same goal priorities as the rex: chase > lure > last seen > wander
      let goalC=null, goalR=null, investigating=false;
      if(d.chasing){ goalC=d.seenC; goalR=d.seenR; }
      else if(d.lureTimer>0 && d.lureX!=null){ investigating=true; goalC=Math.floor(d.lureX/TILE); goalR=Math.floor(d.lureY/TILE); }
      else if(d.alert>0){ goalC=d.seenC; goalR=d.seenR; }

      const tCtr=cellCenter(d.tc,d.tr);
      if(Math.hypot(tCtr.x-d.x,tCtr.y-d.y)<2){
        d.x=tCtr.x; d.y=tCtr.y; d.c=d.tc; d.r=d.tr;
        let nxt=null;
        if(goalC!=null && !(goalC===d.c&&goalR===d.r))
          nxt=bfsNext(state.grid,d.c,d.r,goalC,goalR,(c,r)=>doorBlocksRex(state,c,r));
        if(!nxt){ // wander: random open neighbour, avoid reversing
          const opts=[[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>({c:d.c+dx,r:d.r+dy}))
            .filter(o=>!isWall(state.grid,o.c,o.r)&&!doorBlocksRex(state,o.c,o.r));
          const fwd=opts.filter(o=>!(o.c===d.prevC&&o.r===d.prevR));
          const pick=(fwd.length?fwd:opts); nxt=pick[Math.floor(rng()*pick.length)];
        }
        if(nxt){ d.prevC=d.c; d.prevR=d.r; d.tc=nxt.c; d.tr=nxt.r; }
      }
      const tc2=cellCenter(d.tc,d.tr);
      const dx=tc2.x-d.x, dy=tc2.y-d.y, dd=Math.hypot(dx,dy)||1;
      const base = d.chasing?cfg.chase : (investigating?cfg.patrol*1.4:cfg.patrol);
      const spd=base*dt;
      d.x+=dx/dd*Math.min(spd,dd); d.y+=dy/dd*Math.min(spd,dd);
      if(Math.abs(dx)>0.5) d.dir=dx>0?1:-1;
    }

    if(dist<DILO_R+PR-3) return true;
  }
  return false;
}

// venom globs fly straight, splat on walls and closed doors, and poison the
// player on contact (blind + slow, see POISON_* in config)
export function updateVenoms(state,dt){
  const { player } = state;
  for(const v of state.venoms){
    v.life-=dt;
    const nx=v.x+v.vx*dt, ny=v.y+v.vy*dt;
    if(circleHitsWalls(state,nx,ny,4)){ v.life=0; continue; }
    v.x=nx; v.y=ny;
    if(Math.hypot(v.x-player.x,v.y-player.y)<PR+5){
      v.life=0; state.poisonT=POISON_DURATION;
      state.bus.emit('player:poisoned');
    }
  }
  state.venoms=state.venoms.filter(v=>v.life>0);
}
