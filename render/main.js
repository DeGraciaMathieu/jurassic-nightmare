import { mulberry32 } from '../src/rng.js';
import { createApp, update } from '../src/app.js';
import { loadLevel } from '../src/level.js';
import { createHud } from './hud.js';
import { createRenderer, drawMenuHero, drawMenuMaze } from './draw.js';
import { SFX } from './audio.js';
import { attachInput } from './input.js';
import { lifeLostOverlay, deathOverlay, winOverlay, levelClearOverlay } from './html.js';

const canvas = document.getElementById('game');
const els = {
  lvl: document.getElementById('lvl'),
  cards: document.getElementById('cards'),
  time: document.getElementById('time'),
  score: document.getElementById('score'),
  lives: document.getElementById('lives'),
  overlay: document.getElementById('overlay'),
  ovtext: document.getElementById('ovtext'),
  btn: document.getElementById('btn'),
  mute: document.getElementById('mute'),
  lures: document.getElementById('lures'),
  throwbtn: document.getElementById('throwbtn'),
  flareCount: document.getElementById('flareCount'),
};

const state = createApp({ rng: mulberry32(12345) });
const fx = { shake:0, splats:[], pulse:0, dark:true }; // render-side effects (screen shake, blood, page danger halo) + debug darkness flag
const dangerGlow = document.getElementById('dangerGlow');
const hud = createHud(els);
const render = createRenderer(canvas, state, fx);

// the logic emits events; sounds and visual effects hook onto them here
state.bus.on('lure:thrown', ()=>SFX.lureThrow());
state.bus.on('card:picked', ()=>SFX.pickup());
state.bus.on('decor:crunch', ()=>SFX.crunch());
state.bus.on('door:hit', ()=>SFX.doorHit());
state.bus.on('door:broken', ()=>SFX.doorBreak());
state.bus.on('heartbeat', intensity=>{ SFX.heartbeat(intensity); fx.pulse=Math.max(fx.pulse,intensity); });
state.bus.on('rex:roar', ()=>{ fx.shake=Math.max(fx.shake,14); SFX.roar(false); });
state.bus.on('dilo:hiss', ()=>SFX.hiss());
state.bus.on('raptor:bark', ()=>SFX.bark());
state.bus.on('dilo:spit', ()=>SFX.spit());
state.bus.on('player:poisoned', ()=>SFX.poisoned());
state.bus.on('player:died', ({x,y})=>{
  fx.shake=26;
  for(let i=0;i<10;i++) fx.splats.push({x:x+(Math.random()*40-20), y:y+(Math.random()*40-20), r:6+Math.random()*14});
  SFX.raptorScream(); SFX.stopAmbient();
});
state.bus.on('life:lost', ({lives})=>hud.showOverlay(lifeLostOverlay(lives)));
state.bus.on('game:over', ({level,score})=>hud.showOverlay(deathOverlay(level,score)));
state.bus.on('level:cleared', ({level,time,bonus,score})=>{
  SFX.stopAmbient(); SFX.chime(false);
  hud.showOverlay(levelClearOverlay(level,time,bonus,score));
});
state.bus.on('game:won', ({score})=>{
  SFX.stopAmbient(); SFX.chime(true);
  hud.showOverlay(winOverlay(score));
});

attachInput({ state, canvas, els, sfx:SFX, hud, fx });

// ---- debug mode (?debug in the URL): jump to any sector, toggle darkness ----
if(new URLSearchParams(location.search).has('debug')){
  document.getElementById('debug').hidden=false;
  document.getElementById('dbgSector').addEventListener('change',e=>{
    SFX.init();
    state.levelIdx=+e.target.value;
    loadLevel(state,state.levelIdx);
    state.status='play';
    fx.shake=0; fx.splats.length=0;
    hud.hideOverlay();
    SFX.startAmbient();
  });
  document.getElementById('dbgDark').addEventListener('change',e=>{ fx.dark=e.target.checked; });
}

loadLevel(state,0); // maze shown behind the menu overlay
// menu backdrop + dim page backdrop behind the game, both viewport-sized
for(const id of ['heroMaze','bgMaze']){
  const cv=document.getElementById(id);
  cv.width=innerWidth; cv.height=innerHeight;
  drawMenuMaze(cv);
}
drawMenuHero(document.getElementById('hero'));
hud.update(state);

// ---- loop ----
let last=performance.now();
let stepT=0; // sprint footsteps cadence, driven by state.player.noisy
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  if(fx.shake>0) fx.shake=Math.max(0,fx.shake-dt*40);
  if(fx.pulse>0) fx.pulse=Math.max(0,fx.pulse-dt*0.8); // fades between two heartbeats
  dangerGlow.style.opacity=fx.pulse.toFixed(3);
  update(state,dt);
  if(state.status==='play' && state.player.noisy){
    stepT-=dt;
    if(stepT<=0){ SFX.footstep(); stepT=0.26; }
  } else stepT=0;
  render();
  hud.update(state);
  requestAnimationFrame(loop);
}
render();
requestAnimationFrame(loop);
