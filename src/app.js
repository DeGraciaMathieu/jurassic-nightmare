import { PR, LEVELS, STAMINA_MAX } from './config.js';
import { createBus } from './events.js';
import { mulberry32 } from './rng.js';
import { loadLevel, cardsLeft } from './level.js';
import { updatePlayer, pickupCards } from './player.js';
import { updateLures } from './lures.js';
import { updateDoors } from './doors.js';
import { updateRexes, dangerLevel } from './rex.js';
import { updateDilos, updateVenoms } from './dilo.js';
import { updateRaptors } from './raptor.js';

export function createApp({ rng }){
  return {
    status:'menu', // menu | play | scare | dead | levelclear | win
    levelIdx:0, score:0, levelTime:0,
    grid:null, player:null, exit:null, cards:[], rexes:[], dilos:[], raptors:[], cfg:null,
    visionR:160, scareT:0, hbTimer:0, venoms:[], poisonT:0,
    lures:[], lureCount:3, grassSet:new Set(), throwCD:0, decor:[],
    doors:[], doorMap:new Map(),
    stamina:STAMINA_MAX, exhausted:false,
    keys:{}, touchTarget:null,
    bus:createBus(), rng,
  };
}

export function startGame(state,seed){
  if(state.status==='dead'||state.status==='win'){ state.score=0; state.levelIdx=0; }
  state.rng=mulberry32(seed);
  loadLevel(state,state.levelIdx);
  state.status='play';
}

export function nextLevel(state){
  state.levelIdx++;
  loadLevel(state,state.levelIdx);
  state.status='play';
}

export function die(state){
  state.status='scare'; state.scareT=0.95;
  state.bus.emit('player:died',{x:state.player.x,y:state.player.y});
}

export function update(state,dt){
  if(state.status==='scare'){ state.scareT-=dt; if(state.scareT<=0){ state.status='dead';
    state.bus.emit('game:over',{level:state.levelIdx+1,score:state.score}); }
    return; }
  if(state.status!=='play') return;
  state.levelTime+=dt;

  updatePlayer(state,dt);
  updateDoors(state,dt);
  updateLures(state,dt);
  pickupCards(state);
  if(updateRexes(state,dt)){ die(state); return; }
  if(updateDilos(state,dt)){ die(state); return; }
  if(updateRaptors(state,dt)){ die(state); return; }
  updateVenoms(state,dt);

  // heartbeat driven by nearest threat
  const danger=dangerLevel(state);
  state.hbTimer-=dt;
  if(danger>0.06 && state.hbTimer<=0){ state.bus.emit('heartbeat',danger); state.hbTimer=1.05-danger*0.68; }

  if(cardsLeft(state)===0 && Math.hypot(state.exit.x-state.player.x,state.exit.y-state.player.y)<PR+16){
    const bonus=Math.max(0,Math.round(300-state.levelTime*4));
    state.score+=100+bonus;
    if(state.levelIdx+1>=LEVELS.length){
      state.status='win';
      state.bus.emit('game:won',{score:state.score});
    } else {
      state.status='levelclear';
      state.bus.emit('level:cleared',{level:state.levelIdx+1,time:state.levelTime,bonus,score:state.score});
    }
  }
}
