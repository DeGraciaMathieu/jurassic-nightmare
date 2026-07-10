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
      els.overlay.querySelector('h1').style.display='none';
      els.overlay.querySelector('.keys').style.display='none';
      const ps=els.overlay.querySelectorAll('p');
      for(let i=1;i<ps.length;i++) ps[i].style.display='none';
      els.overlay.classList.remove('hidden');
    },
    hideOverlay(){ els.overlay.classList.add('hidden'); },
  };
}
