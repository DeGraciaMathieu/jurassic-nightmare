import { cardsLeft } from '../src/level.js';

export function createHud(els){
  return {
    update(state){
      els.lvl.textContent=state.levelIdx+1;
      els.cards.textContent=(state.cards.length-cardsLeft(state))+'/'+state.cards.length;
      els.time.textContent=state.levelTime.toFixed(1);
      els.score.textContent=state.score;
      els.lures.textContent=state.lureCount;
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
