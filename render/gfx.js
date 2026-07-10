// pure graphics math — no DOM, no canvas, testable without a browser

// torch flicker: damped random walk clamped to [-1,1]; rand is a 0..1 draw
export function nextFlicker(flick,rand){ return Math.max(-1,Math.min(1,(flick+(rand-0.5)*0.4)*0.9)); }
export function torchRadius(visionR,flick,dip){ return visionR*(0.94+flick*0.05)*dip; }

// light hole a flare punches in the darkness (t in seconds)
export function flareLightRadius(L,t){
  const f=0.84+0.16*Math.sin(t*26+L.x);
  return (L.flying?38:100*Math.min(1,L.life/0.9))*f;
}

// glowing rex eyes fade in just beyond the torch light
export function eyeGlowAlpha(d,vR,chasing){
  const edge=vR*2.1;
  if(d>=edge||d<=vR*0.4) return 0;
  return Math.min(1,(edge-d)/(edge-vR*0.4))*(chasing?1:0.8);
}

// red vignette pulsing with the nearest threat (t in seconds)
export function heartbeatAlpha(danger,t){
  const rate=6+danger*10;
  const pulse=0.5+0.5*Math.sin(t*rate);
  return danger*(0.18+0.32*pulse);
}

export function staminaColor(p,exhausted,blinkOn){
  return exhausted ? (blinkOn?'#8a2015':'#5a150d')
       : p>0.5 ? '#7fae4e' : p>0.25 ? '#c9a13a' : '#c05a2e';
}

// client coordinates -> canvas coordinates
export function canvasPos(clientX,clientY,rect,W,H){
  return { x:(clientX-rect.left)*(W/rect.width), y:(clientY-rect.top)*(H/rect.height) };
}
