import { TILE, PR, CR, PLAYER_SPEED, SPRINT_SPEED, STAMINA_MAX, STAMINA_REGEN, LURE_LIFE, POISON_VISION, POISON_SLOW, SPRINT_HEAR, SPRINT_ALERT, CRUNCH_HEAR, CRUNCH_ALERT } from './config.js';
import { movePlayerAxis } from './physics.js';

export function updatePlayer(state,dt){
  const { keys, player } = state;
  // dilo venom wearing off: dimmed torch and slowed legs while poisoned
  state.poisonT=Math.max(0,state.poisonT-dt);
  const poisoned=state.poisonT>0;
  state.visionR+=(state.cfg.vision*(poisoned?POISON_VISION:1)-state.visionR)*Math.min(1,dt*3);
  let vx=0,vy=0;
  if(keys['w']||keys['arrowup'])vy--; if(keys['s']||keys['arrowdown'])vy++;
  if(keys['a']||keys['arrowleft'])vx--; if(keys['d']||keys['arrowright'])vx++;
  if(state.touchTarget){ const dx=state.touchTarget.x-player.x,dy=state.touchTarget.y-player.y,d=Math.hypot(dx,dy); if(d>4){vx=dx/d;vy=dy/d;} }
  const l=Math.hypot(vx,vy);
  // sprint: speed burst that drains stamina; once emptied you must recover before sprinting again
  const sprinting = (keys['shift']||keys['sprint']) && l>0 && !state.exhausted && state.stamina>0;
  if(sprinting) state.stamina=Math.max(0,state.stamina-dt);
  else state.stamina=Math.min(STAMINA_MAX,state.stamina+STAMINA_REGEN*dt);
  if(state.stamina<=0) state.exhausted=true;
  else if(state.exhausted && state.stamina>=STAMINA_MAX*0.35) state.exhausted=false;
  if(l>0){ vx/=l; vy/=l; player.fx=vx; player.fy=vy;
    const spd=(sprinting?SPRINT_SPEED:PLAYER_SPEED)*(poisoned?POISON_SLOW:1);
    const mx=vx*spd*dt, my=vy*spd*dt;
    if(mx!==0) movePlayerAxis(state,mx,0);
    if(my!==0) movePlayerAxis(state,0,my);
  }

  const pc=Math.floor(player.x/TILE), pr=Math.floor(player.y/TILE);
  // sprint footsteps carry: nearby predators come to investigate the noise
  // (an active flare stays louder — lure investigation keeps goal priority)
  player.noisy = sprinting;
  if(sprinting) noise(state,pc,pr,SPRINT_HEAR,SPRINT_ALERT);

  // stepping onto a crate or skeleton cracks it: the noise draws predators in
  const tileKey=pc+','+pr;
  if(tileKey!==player.tileKey){
    player.tileKey=tileKey;
    const it=state.decor.find(d=>d.c===pc && d.r===pr);
    if(it && (it.type==='crate'||it.type==='bones')){
      state.bus.emit('decor:crunch');
      noise(state,pc,pr,CRUNCH_HEAR,CRUNCH_ALERT);
    }
  }

  state.throwCD=Math.max(0,state.throwCD-dt);
  // hidden while standing in tall grass
  player.hidden = state.grassSet.has(tileKey);
}

// beasts in earshot head for the noise without switching to a chase
function noise(state,pc,pr,range,alert){
  const { player } = state;
  for(const beast of [...state.rexes, ...state.dilos, ...state.raptors]){
    if(Math.hypot(beast.x-player.x,beast.y-player.y)<range){
      beast.alert=Math.max(beast.alert,alert);
      beast.seenC=pc; beast.seenR=pr;
    }
  }
}

export function throwLure(state){
  if(state.status!=='play' || state.lureCount<=0 || state.throwCD>0) return;
  const { player } = state;
  let fx=player.fx, fy=player.fy;
  if(fx===0&&fy===0) fx=1;
  state.lureCount--; state.throwCD=0.5;
  state.lures.push({ x:player.x, y:player.y, vx:fx*280, vy:fy*280, dist:0, flying:true, life:LURE_LIFE });
  state.bus.emit('lure:thrown');
}

export function pickupCards(state){
  const { player } = state;
  for(const c of state.cards) if(!c.taken && Math.hypot(c.x-player.x,c.y-player.y)<PR+CR){
    c.taken=true; state.score+=50; state.bus.emit('card:picked');
  }
}
