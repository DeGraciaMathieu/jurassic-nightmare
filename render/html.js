// pure HTML fragment builders for the overlay screens

export function deathOverlay(level,score){
  return {
    html:`<span class="big lose">🦖 IL VOUS A TROUVÉ</span>Le noir s'est refermé sur vous au secteur ${level}.<br>Score final : <b>${score}</b>`,
    label:'RECOMMENCER',
  };
}

export function winOverlay(score){
  return {
    html:`<span class="big win">🏆 VOUS AVEZ SURVÉCU</span>Vous avez fui le parc dans la nuit. Personne ne vous croira.<br>Score final : <b>${score}</b>`,
    label:'REVIVRE LE CAUCHEMAR',
  };
}

export function levelClearOverlay(level,time,bonus,score){
  return {
    html:`<span class="big win">✅ Secteur ${level} franchi</span>Temps : ${time.toFixed(1)}s · Bonus : +${bonus}<br>Score : <b>${score}</b><br><br><span style="color:#c0472e">Ça se rapproche. Les couloirs suivants sont plus sombres.</span>`,
    label:"S'ENFONCER PLUS LOIN",
  };
}
