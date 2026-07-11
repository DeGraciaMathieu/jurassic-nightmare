import { TILE, COLS, ROWS, PR, RR, DILO_R, DOOR_HP, STAMINA_MAX, POISON_DURATION } from '../src/config.js';
import { genMaze, cellCenter } from '../src/grid.js';
import { mulberry32 } from '../src/rng.js';
import { cardsLeft } from '../src/level.js';
import { dangerLevel } from '../src/rex.js';
import { nextFlicker, torchRadius, flareLightRadius, eyeGlowAlpha, heartbeatAlpha, staminaColor } from './gfx.js';

export function createRenderer(canvas, state, fx){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  // offscreen darkness layer so light sources can punch real holes in it
  const darkCanvas = document.createElement('canvas');
  darkCanvas.width = W; darkCanvas.height = H;
  const dctx = darkCanvas.getContext('2d');
  let flick = 0;

  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  // ---- corridor set dressing (purely visual) ----
  // rebuilt whenever the level grid changes; seeded from the maze layout so a
  // given level always dresses the same, without touching the game rng
  let decorGrid=null, decorItems=[];
  function buildDecor(){
    const g=state.grid;
    let h=(state.levelIdx+1)*2654435761;
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) h=(h*31+g[r][c]+r*7+c)|0;
    const rng=mulberry32(h);
    const cells=[];
    for(let r=1;r<ROWS-1;r++)for(let c=1;c<COLS-1;c++){
      if(g[r][c]!==0) continue;
      if(c===1&&r===1) continue;
      if(c===state.exit.c&&r===state.exit.r) continue;
      if(state.grassSet.has(c+','+r)) continue;
      if(state.doorMap.has(c+','+r)) continue;
      if(state.cards.some(cd=>Math.floor(cd.x/TILE)===c&&Math.floor(cd.y/TILE)===r)) continue;
      cells.push({c,r});
    }
    const TYPES=['blood','bones','crate','rubble','crack'];
    const items=[];
    const count=Math.min(15,Math.floor(cells.length*0.2));
    for(let i=0;i<count&&cells.length;i++){
      const cell=cells.splice(Math.floor(rng()*cells.length),1)[0];
      items.push({ type:TYPES[Math.floor(rng()*TYPES.length)],
                   x:(cell.c+0.5)*TILE, y:(cell.r+0.5)*TILE,
                   ox:(rng()-0.5)*10, oy:(rng()-0.5)*10,
                   rot:rng()*Math.PI*2, s:0.8+rng()*0.5, v:rng() });
    }
    return items;
  }

  // small irregular pentagon, deterministic per seed — no per-frame randomness
  function stonePath(x,y,s,seed){
    ctx.beginPath();
    for(let k=0;k<5;k++){
      const a=k*1.256+Math.sin(seed*3.7+k*2.1)*0.4;
      const r=s*(0.75+0.35*Math.abs(Math.sin(seed*2.3+k*1.7)));
      const vx=x+Math.cos(a)*r, vy=y+Math.sin(a)*r;
      if(k) ctx.lineTo(vx,vy); else ctx.moveTo(vx,vy);
    }
    ctx.closePath();
  }

  function drawDecor(it){
    ctx.save(); ctx.translate(it.x+it.ox,it.y+it.oy); ctx.rotate(it.rot); ctx.scale(it.s,it.s);
    if(it.type==='blood'){
      // dried dark puddle with a drag smear
      ctx.fillStyle='rgba(66,13,8,0.5)';
      ctx.beginPath(); ctx.ellipse(0,0,9,6,0,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9,3,4,2.5,0.4,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(-8,4,2,0,7); ctx.fill();
      ctx.fillStyle='rgba(66,13,8,0.35)';
      ctx.beginPath(); ctx.ellipse(16,6,7,2,0.3,0,7); ctx.fill();
    } else if(it.type==='bones'){
      // picked-clean skeleton seen from above: spine, rib hoops, dino skull
      ctx.strokeStyle='rgba(210,200,175,0.65)'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(8,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(-21,2); ctx.stroke(); // tail tip
      for(let i=0;i<4;i++){ ctx.beginPath(); ctx.ellipse(2-i*5,0,1.8,6.5-i*0.8,0,0,7); ctx.stroke(); }
      ctx.fillStyle='rgba(210,200,175,0.75)';
      ctx.beginPath(); ctx.arc(12,0,4.5,0,7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(15,-2); ctx.lineTo(21,1); ctx.lineTo(15,3); ctx.closePath(); ctx.fill(); // snout
      ctx.fillStyle='rgba(15,15,12,0.85)';
      ctx.beginPath(); ctx.arc(12.5,-1.2,1.1,0,7); ctx.fill(); // eye socket
    } else if(it.type==='crate'){
      ctx.fillStyle='#3d3120'; ctx.fillRect(-11,-11,22,22);
      ctx.strokeStyle='rgba(20,14,6,0.8)'; ctx.lineWidth=1.5; ctx.strokeRect(-11,-11,22,22);
      ctx.beginPath(); ctx.moveTo(-11,-4); ctx.lineTo(11,-4); ctx.moveTo(-11,4); ctx.lineTo(11,4); ctx.stroke();
      ctx.fillStyle='rgba(120,100,60,0.25)'; ctx.fillRect(-11,-11,22,3);
      if(it.v>0.6){ ctx.fillStyle='#332818'; ctx.fillRect(4,-18,13,13); ctx.strokeRect(4,-18,13,13); }
    } else if(it.type==='rubble'){
      // chunks of broken concrete: angular stones over a dust stain
      ctx.fillStyle='rgba(18,20,14,0.35)';
      ctx.beginPath(); ctx.ellipse(0,1,12,8,0,0,7); ctx.fill();
      for(let i=0;i<7;i++){
        const a=i*1.9+it.v*7, d=2+(i*2.3)%9;
        const px=Math.cos(a)*d*1.5, py=Math.sin(a)*d;
        const s0=i===0?3.8:1.6+((i*1.7)%2.4);
        ctx.fillStyle='rgba(8,10,6,0.35)';
        stonePath(px+1,py+1.4,s0,i); ctx.fill();
        ctx.fillStyle=i%2?'rgba(104,98,80,0.75)':'rgba(84,80,64,0.75)';
        stonePath(px,py,s0,i); ctx.fill();
        ctx.fillStyle='rgba(150,145,120,0.28)';
        stonePath(px-0.5,py-0.7,s0*0.55,i+3); ctx.fill();
      }
    } else { // crack
      ctx.strokeStyle='rgba(8,10,6,0.5)'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-12,-3); ctx.lineTo(-4,0); ctx.lineTo(3,-2); ctx.lineTo(12,2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(-1,6); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorld(){
    const { grid, player } = state;
    // floor
    ctx.fillStyle='#0c110a'; ctx.fillRect(0,0,W,H);
    // floor grime pattern
    ctx.fillStyle='rgba(30,45,22,0.5)';
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(grid[r][c]===0 && (c+r)%2===0) ctx.fillRect(c*TILE,r*TILE,TILE,TILE);
    }
    // corridor set dressing, under everything that lives
    if(state.grid!==decorGrid){ decorGrid=state.grid; decorItems=buildDecor(); }
    for(const it of decorItems) drawDecor(it);
    // tall grass (hiding cover)
    const sway=Math.sin(performance.now()/500)*1.5;
    for(const key of state.grassSet){
      const [c,r]=key.split(',').map(Number); const x=c*TILE, y=r*TILE;
      ctx.fillStyle='rgba(30,58,24,0.55)'; rr(x+1,y+1,TILE-2,TILE-2,5); ctx.fill();
      ctx.strokeStyle='rgba(96,150,60,0.75)'; ctx.lineWidth=2;
      for(let i=0;i<7;i++){
        const bx=x+6+(i*137%(TILE-12)), by=y+TILE-3, h=10+(i*53%12);
        const off=sway*(0.5+(i%3)*0.3);
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+off,by-h*0.6,bx+off*1.6,by-h); ctx.stroke();
      }
    }
    // walls (dark overgrown hedges / concrete)
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(grid[r][c]!==1) continue;
      const x=c*TILE,y=r*TILE;
      ctx.fillStyle='#07110a'; ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle='rgba(22,40,18,0.9)';
      rr(x+2,y+2,TILE-4,TILE-4,4); ctx.fill();
      ctx.fillStyle='rgba(40,60,30,0.4)';
      for(let ix=x+7;ix<x+TILE-3;ix+=13)for(let iy=y+7;iy<y+TILE-3;iy+=13){ ctx.beginPath(); ctx.arc(ix,iy,3,0,7); ctx.fill(); }
    }

    // sliding security doors
    for(const D of state.doors){
      const x=D.c*TILE, y=D.r*TILE;
      // frame posts embedded in the walls
      ctx.fillStyle='#39412f';
      if(D.horiz){ ctx.fillRect(D.x-7,y-2,14,6); ctx.fillRect(D.x-7,y+TILE-4,14,6); }
      else { ctx.fillRect(x-2,D.y-7,6,14); ctx.fillRect(x+TILE-4,D.y-7,6,14); }
      if(D.broken){ // smashed through: twisted stubs and debris
        ctx.fillStyle='#4c4436';
        if(D.horiz){ ctx.fillRect(D.x-3,y+3,6,4); ctx.fillRect(D.x-3,y+TILE-7,6,4); }
        else { ctx.fillRect(x+3,D.y-3,4,6); ctx.fillRect(x+TILE-7,D.y-3,4,6); }
        ctx.fillStyle='rgba(80,70,52,0.8)';
        ctx.beginPath(); ctx.arc(D.x-6,D.y+5,2.4,0,7); ctx.fill();
        ctx.beginPath(); ctx.arc(D.x+5,D.y-4,2,0,7); ctx.fill();
        ctx.beginPath(); ctx.arc(D.x+2,D.y+9,1.5,0,7); ctx.fill();
        continue;
      }
      const sh=D.hitT>0?Math.sin(performance.now()/16)*2:0;
      const half=(TILE/2-1)*(1-D.open), dmg=1-D.hp/DOOR_HP;
      // two halves sliding into the walls, hazard-striped
      ctx.fillStyle=D.hitT>0?'#9a5f38':'#5c574a';
      if(D.horiz){
        ctx.fillRect(D.x-4+sh,y+1,8,half); ctx.fillRect(D.x-4+sh,y+TILE-1-half,8,half);
        ctx.fillStyle='rgba(212,166,48,0.7)';
        for(let i=3;i<half-3;i+=9){ ctx.fillRect(D.x-4+sh,y+i,8,3); ctx.fillRect(D.x-4+sh,y+TILE-i-3,8,3); }
      } else {
        ctx.fillRect(x+1,D.y-4+sh,half,8); ctx.fillRect(x+TILE-1-half,D.y-4+sh,half,8);
        ctx.fillStyle='rgba(212,166,48,0.7)';
        for(let i=3;i<half-3;i+=9){ ctx.fillRect(x+i,D.y-4+sh,3,8); ctx.fillRect(x+TILE-i-3,D.y-4+sh,3,8); }
      }
      if(dmg>0 && half>4){ // battering dents
        ctx.fillStyle=`rgba(15,12,8,${0.25+dmg*0.45})`;
        if(D.horiz){ ctx.fillRect(D.x-2+sh,y+2,4,half-2); ctx.fillRect(D.x-2+sh,y+TILE-half+1,4,half-2); }
        else { ctx.fillRect(x+2,D.y-2+sh,half-2,4); ctx.fillRect(x+TILE-half+1,D.y-2+sh,half-2,4); }
      }
    }

    // exit
    const locked=cardsLeft(state)>0;
    const exit=state.exit;
    ctx.save();
    if(!locked){ ctx.shadowColor='#7fd858'; ctx.shadowBlur=22; }
    ctx.fillStyle=locked?'#3a2418':'#20301a';
    rr(exit.x-17,exit.y-17,34,34,5); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=locked?'#22160e':'#0e1a0c'; rr(exit.x-12,exit.y-12,24,24,4); ctx.fill();
    ctx.font='19px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(locked?'🔒':'🚪',exit.x,exit.y);
    ctx.restore();

    // cards
    for(const c of state.cards){ if(c.taken) continue;
      const bob=Math.sin(performance.now()/300+c.x)*2;
      ctx.save(); ctx.shadowColor='#f2c14e'; ctx.shadowBlur=14; ctx.fillStyle='#f2c14e';
      rr(c.x-9,c.y-6+bob,18,12,3); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#8a5f10'; ctx.fillRect(c.x-9,c.y-2+bob,18,3);
      ctx.restore();
    }

    // flares
    for(const L of state.lures){
      ctx.save();
      if(L.flying){
        // red ember with a short smoke trail
        ctx.strokeStyle='rgba(255,60,30,0.35)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(L.x,L.y); ctx.lineTo(L.x-L.vx*0.04,L.y-L.vy*0.04); ctx.stroke();
        ctx.fillStyle='#ff3418'; ctx.shadowColor='#ff2000'; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.arc(L.x,L.y,4,0,7); ctx.fill();
      } else {
        const t=performance.now()/1000;
        const flick2=0.75+0.25*Math.sin(t*30)+0.1*Math.sin(t*13);
        // expanding red sound/light rings
        for(let k=0;k<2;k++){ const rr2=((t+k*0.5)%1)*40;
          ctx.strokeStyle=`rgba(255,50,30,${0.5*(1-rr2/40)})`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(L.x,L.y,6+rr2,0,7); ctx.stroke(); }
        // red halo on the ground
        ctx.fillStyle=`rgba(255,40,20,${0.28*flick2})`; ctx.shadowColor='#ff2000'; ctx.shadowBlur=24;
        ctx.beginPath(); ctx.arc(L.x,L.y,13,0,7); ctx.fill();
        // burning flare stick + white-hot core
        ctx.shadowBlur=18; ctx.shadowColor='#ff3010';
        ctx.fillStyle='#c81808'; ctx.beginPath(); ctx.ellipse(L.x,L.y,4,7*flick2,0,0,7); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle='#ffe6c0';
        ctx.beginPath(); ctx.ellipse(L.x,L.y-1,2,3.5*flick2,0,0,7); ctx.fill();
        // sparks
        for(let s=0;s<3;s++){ const a=t*6+s*2.1; const rad=8+((t*40+s*11)%10);
          ctx.fillStyle=`rgba(255,${120+((s*40)%100)},40,0.8)`;
          ctx.fillRect(L.x+Math.cos(a)*rad, L.y+Math.sin(a)*rad-6, 1.5,1.5); }
      }
      ctx.restore();
    }

    // venom globs
    for(const v of state.venoms){
      ctx.save();
      ctx.strokeStyle='rgba(150,230,40,0.35)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(v.x,v.y); ctx.lineTo(v.x-v.vx*0.05,v.y-v.vy*0.05); ctx.stroke();
      ctx.fillStyle='#9ee61e'; ctx.shadowColor='#aaff20'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(v.x,v.y,4.5,0,7); ctx.fill();
      ctx.restore();
    }

    // blood
    for(const b of fx.splats){ ctx.fillStyle='rgba(120,8,4,0.85)'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill(); }

    // rexes & dilos
    for(const rex of state.rexes) drawRex(rex);
    for(const d of state.dilos) drawDilo(d);
    // player
    drawPlayer();
    // sprint noise rings
    if(state.status==='play' && player.noisy){
      const t=performance.now()/1000;
      for(let k=0;k<2;k++){ const rr2=((t*1.6+k*0.5)%1)*34;
        ctx.strokeStyle=`rgba(210,200,170,${0.3*(1-rr2/34)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(player.x,player.y,PR+4+rr2,0,7); ctx.stroke(); }
    }
    // concealment overlay + label when hidden
    if(state.status==='play' && player.hidden){
      ctx.strokeStyle='rgba(96,150,60,0.9)'; ctx.lineWidth=2;
      for(let i=0;i<6;i++){ const bx=player.x-10+i*4, by=player.y+PR, h=14+(i%3)*4;
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+1,by-h*0.6,bx+2,by-h); ctx.stroke(); }
      ctx.fillStyle='rgba(150,220,120,0.85)'; ctx.font='bold 10px Trebuchet MS'; ctx.textAlign='center';
      ctx.fillText('CACHÉ',player.x,player.y-PR-8);
    }
  }

  function drawPlayer(){
    const {x,y}=state.player;
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x,y+PR,PR,4,0,0,7); ctx.fill();
    ctx.fillStyle='#c94a26'; ctx.beginPath(); ctx.arc(x,y,PR,0,7); ctx.fill();
    ctx.fillStyle='#e9c79a'; ctx.beginPath(); ctx.arc(x,y-4,5.5,0,7); ctx.fill();
    ctx.fillStyle='#4a3620'; ctx.beginPath(); ctx.ellipse(x,y-8,8,3,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(x,y-9,3.5,Math.PI,0); ctx.fill();
  }

  function drawRex(rex){
    const {x,y,dir,chasing}=rex;
    ctx.save(); ctx.translate(x,y); ctx.scale(dir,1);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0,RR-2,RR,5,0,0,7); ctx.fill();
    const body=chasing?'#5a1a10':'#243a1a', dark=chasing?'#3e120a':'#182a10';
    ctx.fillStyle=dark; ctx.beginPath(); ctx.moveTo(-5,2); ctx.quadraticCurveTo(-26,-2,-30,-12); ctx.quadraticCurveTo(-20,2,-5,9); ctx.fill();
    ctx.fillStyle=body; ctx.beginPath(); ctx.ellipse(0,0,RR*0.85,RR*0.68,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(RR*0.7,-RR*0.35,10,7,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(RR*0.85,-RR*0.5); ctx.lineTo(RR*1.4,-RR*0.32); ctx.lineTo(RR*0.85,-RR*0.12); ctx.fill();
    ctx.fillStyle='#e8e0d0'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(RR*(0.92+i*0.16),-RR*0.24); ctx.lineTo(RR*(0.97+i*0.16),-RR*0.1); ctx.lineTo(RR*(1.02+i*0.16),-RR*0.24); ctx.fill(); }
    ctx.fillStyle=chasing?'#ff2a1a':'#0a0a0a'; ctx.beginPath(); ctx.arc(RR*0.82,-RR*0.45,2.2,0,7); ctx.fill();
    if(chasing){ ctx.shadowColor='#ff2a1a'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(RR*0.82,-RR*0.45,2.2,0,7); ctx.fill(); ctx.shadowBlur=0; }
    ctx.fillStyle=body; ctx.fillRect(-3,RR*0.4,4,9); ctx.fillRect(5,RR*0.4,4,9);
    ctx.restore();
  }

  function drawDilo(d){
    const {x,y,dir,chasing}=d;
    const R=DILO_R;
    ctx.save(); ctx.translate(x,y); ctx.scale(dir,1);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0,R-2,R,4,0,0,7); ctx.fill();
    const body=chasing?'#7a8a22':'#55651c', dark=chasing?'#55651c':'#3a4614';
    // tail
    ctx.fillStyle=dark; ctx.beginPath(); ctx.moveTo(-4,1); ctx.quadraticCurveTo(-20,-1,-24,-9); ctx.quadraticCurveTo(-16,2,-4,7); ctx.fill();
    // frill, flaring wide when it spits
    const flare=d.spitT>0?1:(chasing?0.45:0.1);
    ctx.fillStyle=`rgba(200,60,30,${0.35+0.55*flare})`;
    ctx.beginPath(); ctx.ellipse(R*0.55,-R*0.55,5+7*flare,6+8*flare,-0.4,0,7); ctx.fill();
    // body & head
    ctx.fillStyle=body; ctx.beginPath(); ctx.ellipse(0,0,R*0.9,R*0.62,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R*0.72,-R*0.5,7,5,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R*0.9,-R*0.62); ctx.lineTo(R*1.35,-R*0.42); ctx.lineTo(R*0.9,-R*0.26); ctx.fill();
    // back stripes
    ctx.fillStyle=dark; ctx.fillRect(-R*0.5,-R*0.55,3,5); ctx.fillRect(-R*0.15,-R*0.62,3,5); ctx.fillRect(R*0.2,-R*0.6,3,5);
    // eye
    ctx.fillStyle=chasing?'#d8ff30':'#0a0a0a'; ctx.beginPath(); ctx.arc(R*0.72,-R*0.58,1.8,0,7); ctx.fill();
    if(chasing){ ctx.shadowColor='#c8f020'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(R*0.72,-R*0.58,1.8,0,7); ctx.fill(); ctx.shadowBlur=0; }
    // legs
    ctx.fillStyle=body; ctx.fillRect(-2,R*0.35,3.5,8); ctx.fillRect(4,R*0.35,3.5,8);
    ctx.restore();
  }

  function drawDarkness(){
    const player=state.player;
    // torch flicker
    flick=nextFlicker(flick,Math.random());
    const dip = Math.random()<0.04 ? 0.6 : 1;
    const vR = torchRadius(state.visionR,flick,dip);
    const px=player.x, py=player.y;
    // build the darkness on the offscreen layer so flares can punch holes in it
    dctx.clearRect(0,0,W,H);
    // directional bias: stretch light slightly toward facing
    const grad=dctx.createRadialGradient(px+player.fx*22,py+player.fy*22,vR*0.28, px,py,vR);
    grad.addColorStop(0,'rgba(0,0,0,0)');
    grad.addColorStop(0.55,'rgba(2,3,2,0.25)');
    grad.addColorStop(0.85,'rgba(1,2,1,0.8)');
    grad.addColorStop(1,'rgba(0,1,0,0.985)');
    dctx.fillStyle=grad; dctx.fillRect(0,0,W,H);
    // flares carve real light out of the darkness, revealing the map around them
    dctx.globalCompositeOperation='destination-out';
    for(const L of state.lures){
      const lr=flareLightRadius(L,performance.now()/1000);
      const hole=dctx.createRadialGradient(L.x,L.y,0,L.x,L.y,lr);
      hole.addColorStop(0,'rgba(0,0,0,1)');
      hole.addColorStop(0.55,'rgba(0,0,0,0.85)');
      hole.addColorStop(1,'rgba(0,0,0,0)');
      dctx.fillStyle=hole; dctx.beginPath(); dctx.arc(L.x,L.y,lr,0,7); dctx.fill();
    }
    dctx.globalCompositeOperation='source-over';
    ctx.drawImage(darkCanvas,0,0);

    // glowing red eyes of rexes lurking just beyond the light
    for(const rex of state.rexes){
      const d=Math.hypot(rex.x-px,rex.y-py);
      const a=eyeGlowAlpha(d,vR,rex.chasing);
      if(a>0){
        ctx.save(); ctx.globalCompositeOperation='lighter';
        ctx.fillStyle=`rgba(255,${rex.chasing?20:40},10,${a})`;
        ctx.shadowColor='#ff2010'; ctx.shadowBlur=12;
        const ex=rex.x+rex.dir*RR*0.75, ey=rex.y-RR*0.4;
        ctx.beginPath(); ctx.arc(ex,ey,2.4,0,7); ctx.fill();
        ctx.beginPath(); ctx.arc(ex-rex.dir*6,ey+1,2.4,0,7); ctx.fill();
        ctx.restore();
      }
    }

    // and the greenish eyes of dilos
    for(const d of state.dilos){
      const dd=Math.hypot(d.x-px,d.y-py);
      const a=eyeGlowAlpha(dd,vR,d.chasing);
      if(a>0){
        ctx.save(); ctx.globalCompositeOperation='lighter';
        ctx.fillStyle=`rgba(190,255,${d.chasing?30:80},${a})`;
        ctx.shadowColor='#b0ff20'; ctx.shadowBlur=12;
        const ex=d.x+d.dir*DILO_R*0.72, ey=d.y-DILO_R*0.58;
        ctx.beginPath(); ctx.arc(ex,ey,2,0,7); ctx.fill();
        ctx.beginPath(); ctx.arc(ex-d.dir*5,ey+1,2,0,7); ctx.fill();
        ctx.restore();
      }
    }

    // warm red tint over the area each flare reveals
    for(const L of state.lures){
      if(L.flying) continue;
      const t=performance.now()/1000, flick2=0.7+0.3*Math.sin(t*28);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      const rg=ctx.createRadialGradient(L.x,L.y,2,L.x,L.y,80*flick2);
      rg.addColorStop(0,'rgba(255,90,40,0.5)');
      rg.addColorStop(0.4,'rgba(220,30,10,0.22)');
      rg.addColorStop(1,'rgba(120,0,0,0)');
      ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(L.x,L.y,80*flick2,0,7); ctx.fill();
      ctx.restore();
    }
  }

  function drawPoison(){
    if(state.poisonT<=0) return;
    const k=Math.min(1,state.poisonT/POISON_DURATION);
    const t=performance.now()/1000;
    const a=k*(0.30+0.08*Math.sin(t*9));
    const g=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.75);
    g.addColorStop(0,'rgba(60,120,10,0)'); g.addColorStop(1,`rgba(90,160,20,${a})`);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }

  function drawHeartbeat(){
    const danger=dangerLevel(state);
    if(danger<=0.02) return;
    const a=heartbeatAlpha(danger,performance.now()/1000);
    const g=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.72);
    g.addColorStop(0,'rgba(120,0,0,0)'); g.addColorStop(1,`rgba(150,5,0,${a})`);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }

  function drawJumpscare(){
    const t=1-state.scareT/0.95; // 0..1
    ctx.fillStyle=`rgba(${20+t*80},0,0,${0.6+0.3*Math.sin(t*40)})`; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2, s=1+t*1.6;
    ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
    drawRexHead(ctx);
    ctx.restore();
  }

  function drawStamina(){
    const x=12, y=H-20, w=130, h=8, p=state.stamina/STAMINA_MAX;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(x-3,y-3,w+6,h+6);
    ctx.strokeStyle='rgba(150,160,140,0.35)'; ctx.lineWidth=1; ctx.strokeRect(x-1.5,y-1.5,w+3,h+3);
    ctx.fillStyle=staminaColor(p,state.exhausted,Math.sin(performance.now()/90)>0);
    ctx.fillRect(x,y,w*p,h);
    ctx.fillStyle='rgba(230,240,220,0.55)'; ctx.font='bold 9px Trebuchet MS'; ctx.textAlign='left';
    ctx.fillText('ENDURANCE',x,y-5);
  }

  return function render(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    const sx=fx.shake>0?(Math.random()*2-1)*fx.shake:0, sy=fx.shake>0?(Math.random()*2-1)*fx.shake:0;
    ctx.save(); ctx.translate(sx,sy);

    if(state.status==='scare'){ ctx.fillStyle='#000'; ctx.fillRect(-40,-40,W+80,H+80); drawJumpscare(); ctx.restore(); return; }

    drawWorld();
    if(state.status==='play'||state.status==='dead'||state.status==='levelclear'||state.status==='win'){ drawDarkness(); drawPoison(); drawHeartbeat(); }

    // level name (dim)
    if(state.status==='play'){ ctx.fillStyle='rgba(180,70,45,0.5)'; ctx.font='italic 12px Trebuchet MS'; ctx.textAlign='left'; ctx.fillText(state.cfg.name,12,20); drawStamina(); }
    ctx.restore();
  };
}

// the monster's head, drawn around the origin (spans x -150..200, y -130..130);
// shared by the jumpscare and the menu hero
function drawRexHead(c){
  // huge head
  c.fillStyle='#3a1008'; c.beginPath(); c.ellipse(0,-10,150,120,0,0,7); c.fill();
  c.fillStyle='#521208'; c.beginPath(); c.moveTo(-150,-10); c.lineTo(160,-70); c.lineTo(160,50); c.closePath(); c.fill();
  // jaws
  c.fillStyle='#1a0603'; c.beginPath(); c.moveTo(-120,20); c.quadraticCurveTo(60,60,200,30); c.quadraticCurveTo(60,130,-120,90); c.fill();
  // teeth
  c.fillStyle='#efe6d2';
  for(let i=0;i<10;i++){ const tx=-110+i*32; c.beginPath(); c.moveTo(tx,25); c.lineTo(tx+12,25); c.lineTo(tx+6,52); c.fill();
    c.beginPath(); c.moveTo(tx,92); c.lineTo(tx+12,92); c.lineTo(tx+6,66); c.fill(); }
  // eyes
  c.fillStyle='#ffdd22'; c.shadowColor='#ff3000'; c.shadowBlur=30;
  c.beginPath(); c.ellipse(-55,-45,16,22,0,0,7); c.fill();
  c.beginPath(); c.ellipse(60,-55,16,22,0,0,7); c.fill();
  c.fillStyle='#000'; c.shadowBlur=0;
  c.fillRect(-59,-52,8,26); c.fillRect(56,-62,8,26);
}

// decorative backdrop for the menu: the game's own maze generator, drawn as
// a faint glowing network of corridors, faded in the centre for readability
export function drawMenuMaze(canvas){
  const c=canvas.getContext('2d');
  const cw=canvas.width, ch=canvas.height;
  const g=genMaze(mulberry32(777),0.12);
  c.clearRect(0,0,cw,ch);
  c.save();
  c.scale(cw/(COLS*TILE), ch/(ROWS*TILE));
  c.strokeStyle='rgba(96,150,60,0.32)';
  c.lineWidth=13; c.lineCap='round'; c.lineJoin='round';
  c.shadowColor='rgba(127,216,88,0.5)'; c.shadowBlur=9;
  for(let r=0;r<ROWS;r++)for(let cc=0;cc<COLS;cc++){
    if(g[r][cc]!==0) continue;
    const a=cellCenter(cc,r);
    // each corridor segment once: right and down neighbours only
    for(const [dc,dr] of [[1,0],[0,1]]){
      const nc=cc+dc, nr=r+dr;
      if(nc<COLS&&nr<ROWS&&g[nr][nc]===0){
        const b=cellCenter(nc,nr);
        c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke();
      }
    }
  }
  // the exit, glowing at the far end of the maze
  const e=cellCenter(COLS-2,ROWS-2);
  c.shadowColor='#7fd858'; c.shadowBlur=16;
  c.fillStyle='rgba(127,216,88,0.55)';
  c.beginPath(); c.arc(e.x,e.y,8,0,7); c.fill();
  c.restore();
  // carve the centre out so the text stays readable
  c.globalCompositeOperation='destination-out';
  const fade=c.createRadialGradient(cw/2,ch*0.42,50, cw/2,ch*0.42,cw*0.58);
  fade.addColorStop(0,'rgba(0,0,0,0.94)');
  fade.addColorStop(0.55,'rgba(0,0,0,0.6)');
  fade.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=fade; c.fillRect(0,0,cw,ch);
  c.globalCompositeOperation='source-over';
}

// full monster head for the menu overlay hero, mirrored so it faces the
// text; CSS places it half-hidden in the overlay corner
export function drawMenuHero(canvas){
  const c=canvas.getContext('2d');
  const s=0.9;
  c.clearRect(0,0,canvas.width,canvas.height);
  c.save();
  c.translate(canvas.width/2+25*s, canvas.height/2); // 25 = head bounds x-offset, flipped by the mirror
  c.scale(-s,s);
  drawRexHead(c);
  c.restore();
}
