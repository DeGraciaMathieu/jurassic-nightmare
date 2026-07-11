import { mulberry32 } from '../src/rng.js';
import { createApp, update, startGame } from '../src/app.js';
import { LEVELS } from '../src/config.js';
import { botAct } from './bot.js';

const DT = 1/60, MAX_TIME = 120; // simulated seconds before a run counts as lost

// play one sector headless with the bot; true when the level is cleared
export function playLevel(levelIdx, seed){
  const state = createApp({ rng: mulberry32(seed) });
  state.levelIdx = levelIdx;
  startGame(state, seed);
  for(let t=0; t<MAX_TIME; t+=DT){
    botAct(state);
    update(state, DT);
    if(state.status==='levelclear' || state.status==='win') return true;
    if(state.status==='dead') return false;
  }
  return false;
}

const runs = Number(process.argv[2] ?? 100);
const baseSeed = Number(process.argv[3] ?? 1000);

console.log(`${runs} parties par secteur (seeds ${baseSeed}..${baseSeed+runs-1}, limite ${MAX_TIME} s)\n`);
for(let i=0; i<LEVELS.length; i++){
  let wins = 0;
  for(let k=0; k<runs; k++) if(playLevel(i, baseSeed+k)) wins++;
  const pct = Math.round(100*wins/runs);
  console.log(`${LEVELS[i].name.padEnd(26)} : ${String(pct).padStart(3)} % (${wins}/${runs})`);
}
