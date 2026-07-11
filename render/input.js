import { startGame, retryLevel, nextLevel } from '../src/app.js';
import { throwLure } from '../src/player.js';
import { canvasPos } from './gfx.js';

export function attachInput({ state, canvas, els, sfx, hud, fx }){
  const keys=state.keys;

  document.addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true;
    if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    if(e.key===' ') throwLure(state); });
  document.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });

  const cpos=(cx,cy)=>canvasPos(cx,cy,canvas.getBoundingClientRect(),canvas.width,canvas.height);
  canvas.addEventListener('touchstart',e=>{const t=e.touches[0];state.touchTarget=cpos(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  canvas.addEventListener('touchmove',e=>{const t=e.touches[0];state.touchTarget=cpos(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  canvas.addEventListener('touchend',()=>state.touchTarget=null);

  els.mute.addEventListener('click',()=>{ els.mute.textContent=sfx.toggleMute()?'🔇':'🔊'; });
  els.throwbtn.addEventListener('click',()=>throwLure(state));
  document.getElementById('padtoggle').addEventListener('click',()=>{
    document.getElementById('touchpad').classList.toggle('forced');
  });

  // on-screen D-pad (mobile)
  function bindDir(id,key){
    const b=document.getElementById(id); if(!b) return;
    const on=e=>{ e.preventDefault(); keys[key]=true; };
    const off=()=>{ keys[key]=false; };
    b.addEventListener('pointerdown',on);
    b.addEventListener('pointerup',off);
    b.addEventListener('pointercancel',off);
    b.addEventListener('pointerleave',off);
  }
  bindDir('dup','arrowup'); bindDir('ddown','arrowdown');
  bindDir('dleft','arrowleft'); bindDir('dright','arrowright');
  const flareBtn=document.getElementById('flareBtn');
  if(flareBtn) flareBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); sfx.init(); throwLure(state); });
  const sprintBtn=document.getElementById('sprintBtn');
  if(sprintBtn){
    const on=e=>{ e.preventDefault(); keys['sprint']=true; };
    const off=()=>{ keys['sprint']=false; };
    sprintBtn.addEventListener('pointerdown',on);
    sprintBtn.addEventListener('pointerup',off);
    sprintBtn.addEventListener('pointercancel',off);
    sprintBtn.addEventListener('pointerleave',off);
  }
  // safety: release all directions if a pointer is lifted anywhere
  window.addEventListener('pointerup',()=>{ keys['arrowup']=keys['arrowdown']=keys['arrowleft']=keys['arrowright']=keys['sprint']=false; });

  els.btn.addEventListener('click',()=>{
    sfx.init();
    if(state.status==='menu'||state.status==='dead'||state.status==='win'){
      startGame(state,(Math.random()*1e9)|0);
    } else if(state.status==='lifelost'){
      retryLevel(state);
    } else if(state.status==='levelclear'){
      nextLevel(state);
    } else return;
    fx.shake=0; fx.splats.length=0;
    hud.hideOverlay();
    sfx.startAmbient();
  });
}
