import { cardsLeft } from '../src/level.js';
import { LEVELS, LIVES, LURE_COUNT } from '../src/config.js';

export function createHud(els){
  const pipMemo={};
  // filled/empty pip rows, rebuilt only when the count changes
  function setPips(el,key,on,total){
    const sig=on+'/'+total;
    if(pipMemo[key]===sig) return;
    pipMemo[key]=sig;
    el.innerHTML='';
    for(let i=0;i<total;i++) el.appendChild(Object.assign(document.createElement('i'),{className:i<on?'on':''}));
  }
  return {
    update(state){
      els.lvl.textContent=(state.levelIdx+1)+'/'+LEVELS.length;
      els.time.textContent=state.levelTime.toFixed(1)+'s';
      els.score.textContent=String(state.score).padStart(4,'0');
      setPips(els.cards,'cards',state.cards.length-cardsLeft(state),state.cards.length);
      setPips(els.lives,'lives',state.lives,LIVES);
      setPips(els.lures,'lures',state.lureCount,LURE_COUNT);
      if(els.flareCount) els.flareCount.textContent=state.lureCount;
    },
    showOverlay({html,label}){
      els.ovtext.innerHTML=html;
      els.btn.textContent=label;
      els.overlay.classList.add('end');
      const menu=els.overlay.querySelectorAll('#heroMaze, #hero, h1, .menu-only');
      for(const el of menu) el.style.display='none';
      els.overlay.classList.remove('hidden');
    },
    hideOverlay(){ els.overlay.classList.add('hidden'); },
  };
}
