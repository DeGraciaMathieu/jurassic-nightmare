// ============ AUDIO ENGINE (synthesised, no files) ============
export const SFX = {
  ctx:null, master:null, ambGain:null, ambNodes:[], muted:false,
  init(){
    if(this.ctx) { if(this.ctx.state==='suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted?0:0.9;
    this.master.connect(this.ctx.destination);
  },
  noiseBuffer(dur){
    const n=Math.floor(this.ctx.sampleRate*dur);
    const b=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    return b;
  },
  // ---- low tension drone that loops during play ----
  startAmbient(){
    if(!this.ctx) return;
    this.stopAmbient();
    const t=this.ctx.currentTime;
    const g=this.ctx.createGain(); g.gain.value=0; g.connect(this.master);
    g.gain.setTargetAtTime(0.16, t, 2);
    // two detuned low oscillators
    [41.2, 55, 61.7].forEach((f,i)=>{
      const o=this.ctx.createOscillator();
      o.type = i===2?'sawtooth':'sine';
      o.frequency.value=f;
      const og=this.ctx.createGain(); og.gain.value = i===2?0.06:0.5;
      // slow wobble
      const lfo=this.ctx.createOscillator(); lfo.frequency.value=0.07+i*0.05;
      const lg=this.ctx.createGain(); lg.gain.value=2.5;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t);
      o.connect(og); og.connect(g); o.start(t);
      this.ambNodes.push(o,lfo);
    });
    // faint airy noise wind
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(4); src.loop=true;
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=380; bp.Q.value=0.6;
    const ng=this.ctx.createGain(); ng.gain.value=0.04;
    src.connect(bp); bp.connect(ng); ng.connect(g); src.start(t);
    this.ambNodes.push(src);
    this.ambGain=g;
  },
  stopAmbient(){
    if(this.ambGain){ try{ this.ambGain.gain.setTargetAtTime(0,this.ctx.currentTime,0.3); }catch(e){} }
    const nodes=this.ambNodes; this.ambNodes=[];
    setTimeout(()=>{ nodes.forEach(n=>{ try{n.stop();}catch(e){} }); }, 500);
  },
  // ---- heartbeat: two thumps ----
  heartbeat(intensity){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    const thump=(when,vol)=>{
      const o=this.ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(90,when); o.frequency.exponentialRampToValueAtTime(38,when+0.14);
      const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,when);
      g.gain.exponentialRampToValueAtTime(vol,when+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,when+0.18);
      o.connect(g); g.connect(this.master); o.start(when); o.stop(when+0.2);
    };
    const v=0.25+intensity*0.55;
    thump(t,v); thump(t+0.17,v*0.7);
  },
  // ---- T-Rex roar (chase trigger) ----
  roar(big){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, dur=big?1.5:0.9;
    // growl: detuned saws swept down through a lowpass, plus noise growl
    const g=this.ctx.createGain(); g.gain.value=0; g.connect(this.master);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(big?1.0:0.55,t+0.08);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    const lp=this.ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(big?900:650,t);
    lp.frequency.exponentialRampToValueAtTime(180,t+dur);
    lp.connect(g);
    // distortion for grit
    const ws=this.ctx.createWaveShaper();
    const cv=new Float32Array(256); for(let i=0;i<256;i++){const x=i/128-1; cv[i]=Math.tanh(x*3);}
    ws.curve=cv; ws.connect(lp);
    [70,84,110].forEach((f,i)=>{
      const o=this.ctx.createOscillator(); o.type=i===2?'square':'sawtooth';
      o.frequency.setValueAtTime(f*(big?1.4:1),t);
      o.frequency.exponentialRampToValueAtTime(f*0.5,t+dur);
      // vibrato snarl
      const lfo=this.ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=22;
      const lg=this.ctx.createGain(); lg.gain.value=14; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t+dur);
      o.connect(ws); o.start(t); o.stop(t+dur);
    });
    // breathy noise
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(dur);
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=700; bp.Q.value=0.8;
    const ng=this.ctx.createGain(); ng.gain.setValueAtTime(big?0.4:0.2,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(bp); bp.connect(ng); ng.connect(this.master); src.start(t); src.stop(t+dur);
  },
  // ---- raptor scream (death) : shrill, raspy screech ----
  raptorScream(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, dur=1.35;
    const out=this.ctx.createGain(); out.gain.value=0; out.connect(this.master);
    out.gain.setValueAtTime(0.0001,t);
    out.gain.exponentialRampToValueAtTime(1.0,t+0.05);
    out.gain.setValueAtTime(1.0,t+0.7);
    out.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    // harsh distortion
    const ws=this.ctx.createWaveShaper();
    const cv=new Float32Array(256); for(let i=0;i<256;i++){const x=i/128-1; cv[i]=Math.tanh(x*5);}
    ws.curve=cv;
    // sweeping bandpass to give the screech its bite
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=2.2;
    bp.frequency.setValueAtTime(1600,t);
    bp.frequency.exponentialRampToValueAtTime(2600,t+0.18);
    bp.frequency.exponentialRampToValueAtTime(900,t+dur);
    ws.connect(bp); bp.connect(out);
    // high screech oscillators with pitch envelope + fast raspy tremolo
    [1,1.5,2.02].forEach((mult,i)=>{
      const o=this.ctx.createOscillator(); o.type='sawtooth';
      const base=900*mult;
      o.frequency.setValueAtTime(base*0.7,t);
      o.frequency.exponentialRampToValueAtTime(base*1.25,t+0.12); // sharp rise
      o.frequency.exponentialRampToValueAtTime(base*0.9,t+0.5);
      o.frequency.exponentialRampToValueAtTime(base*0.45,t+dur); // falling wail
      // raspy vibrato
      const lfo=this.ctx.createOscillator(); lfo.type='sawtooth'; lfo.frequency.value=34+i*9;
      const lg=this.ctx.createGain(); lg.gain.value=base*0.18;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t+dur);
      const og=this.ctx.createGain(); og.gain.value=i===2?0.25:0.5;
      o.connect(og); og.connect(ws); o.start(t); o.stop(t+dur);
    });
    // airy screech noise on top
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(dur);
    const nb=this.ctx.createBiquadFilter(); nb.type='bandpass'; nb.Q.value=1.4;
    nb.frequency.setValueAtTime(3000,t); nb.frequency.exponentialRampToValueAtTime(1500,t+dur);
    const ng=this.ctx.createGain(); ng.gain.setValueAtTime(0.5,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    // tremolo on the noise for the "raa-a-a-ah" texture
    const trem=this.ctx.createOscillator(); trem.type='sine'; trem.frequency.value=18;
    const tg=this.ctx.createGain(); tg.gain.value=0.35; trem.connect(tg); tg.connect(ng.gain); trem.start(t); trem.stop(t+dur);
    src.connect(nb); nb.connect(ng); ng.connect(out); src.start(t); src.stop(t+dur);
    // low guttural thump underneath for body
    const lo=this.ctx.createOscillator(); lo.type='square';
    lo.frequency.setValueAtTime(140,t); lo.frequency.exponentialRampToValueAtTime(55,t+0.5);
    const log=this.ctx.createGain(); log.gain.setValueAtTime(0.4,t); log.gain.exponentialRampToValueAtTime(0.0001,t+0.6);
    lo.connect(log); log.connect(this.master); lo.start(t); lo.stop(t+0.6);
  },
  // ---- lure throw (whoosh + marker beep) ----
  lureThrow(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(0.3);
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=0.7;
    bp.frequency.setValueAtTime(500,t); bp.frequency.exponentialRampToValueAtTime(1800,t+0.25);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.3);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t+0.3);
    const o=this.ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(1200,t+0.05);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(0.0001,t+0.05);
    og.gain.exponentialRampToValueAtTime(0.16,t+0.07); og.gain.exponentialRampToValueAtTime(0.0001,t+0.26);
    o.connect(og); og.connect(this.master); o.start(t+0.05); o.stop(t+0.28);
  },
  // ---- rex battering a door (deep double thump + muffled clang + rumbling tail) ----
  doorHit(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    // punch + sub-bass body
    const o=this.ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(80,t); o.frequency.exponentialRampToValueAtTime(30,t+0.5);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(1.5,t); og.gain.exponentialRampToValueAtTime(0.0001,t+0.55);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t+0.55);
    const sub=this.ctx.createOscillator(); sub.type='triangle';
    sub.frequency.setValueAtTime(45,t); sub.frequency.exponentialRampToValueAtTime(20,t+0.7);
    const sg=this.ctx.createGain(); sg.gain.setValueAtTime(1.1,t); sg.gain.exponentialRampToValueAtTime(0.0001,t+0.7);
    sub.connect(sg); sg.connect(this.master); sub.start(t); sub.stop(t+0.7);
    // muffled clang
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(0.3);
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=3.5;
    bp.frequency.setValueAtTime(520,t); bp.frequency.exponentialRampToValueAtTime(240,t+0.3);
    const ng=this.ctx.createGain(); ng.gain.setValueAtTime(0.7,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.3);
    src.connect(bp); bp.connect(ng); ng.connect(this.master); src.start(t); src.stop(t+0.3);
    // heavy structure rumble fading out
    const src2=this.ctx.createBufferSource(); src2.buffer=this.noiseBuffer(0.6);
    const lp=this.ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(220,t); lp.frequency.exponentialRampToValueAtTime(90,t+0.6);
    const rg=this.ctx.createGain(); rg.gain.setValueAtTime(1.0,t); rg.gain.exponentialRampToValueAtTime(0.0001,t+0.6);
    src2.connect(lp); lp.connect(rg); rg.connect(this.master); src2.start(t); src2.stop(t+0.6);
  },
  // ---- sprint footstep: soft rapid thud on the concrete ----
  footstep(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    const f=55+Math.random()*10; // slight variation so steps don't sound stamped
    const o=this.ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(f*2,t); o.frequency.exponentialRampToValueAtTime(f,t+0.07);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.25,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+0.1);
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(0.05);
    const lp=this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
    const ng=this.ctx.createGain(); ng.gain.setValueAtTime(0.12,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
    src.connect(lp); lp.connect(ng); ng.connect(this.master); src.start(t); src.stop(t+0.05);
  },
  // ---- debris crunch: dry wood/bone snap underfoot ----
  crunch(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    // two quick snaps, the second duller
    [0,0.05].forEach((off,i)=>{
      const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(0.07);
      const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.2;
      bp.frequency.setValueAtTime(i?850:1600,t+off);
      const g=this.ctx.createGain(); g.gain.setValueAtTime(i?0.26:0.38,t+off);
      g.gain.exponentialRampToValueAtTime(0.0001,t+off+0.07);
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t+off); src.stop(t+off+0.07);
    });
    // low body of the thing giving way
    const o=this.ctx.createOscillator(); o.type='triangle';
    o.frequency.setValueAtTime(170,t); o.frequency.exponentialRampToValueAtTime(60,t+0.12);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(0.3,t); og.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t+0.15);
  },
  // ---- raptor bark: short harsh yip when the pack engages ----
  bark(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, dur=0.28;
    const ws=this.ctx.createWaveShaper();
    const cv=new Float32Array(256); for(let i=0;i<256;i++){const x=i/128-1; cv[i]=Math.tanh(x*4);}
    ws.curve=cv;
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.8;
    bp.frequency.setValueAtTime(1300,t); bp.frequency.exponentialRampToValueAtTime(700,t+dur);
    const out=this.ctx.createGain(); out.gain.setValueAtTime(0.0001,t);
    out.gain.exponentialRampToValueAtTime(0.5,t+0.03);
    out.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    ws.connect(bp); bp.connect(out); out.connect(this.master);
    [520,780].forEach((f,i)=>{
      const o=this.ctx.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(f*1.3,t); o.frequency.exponentialRampToValueAtTime(f*0.7,t+dur);
      const og=this.ctx.createGain(); og.gain.value=i?0.3:0.5;
      o.connect(og); og.connect(ws); o.start(t); o.stop(t+dur);
    });
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(dur);
    const nb=this.ctx.createBiquadFilter(); nb.type='bandpass'; nb.Q.value=1.1; nb.frequency.value=2200;
    const ng=this.ctx.createGain(); ng.gain.setValueAtTime(0.25,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(nb); nb.connect(ng); ng.connect(this.master); src.start(t); src.stop(t+dur);
  },
  // ---- dilo hiss (detection): airy rattling threat ----
  hiss(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, dur=0.7;
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(dur);
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.2;
    bp.frequency.setValueAtTime(2400,t); bp.frequency.exponentialRampToValueAtTime(1100,t+dur);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.4,t+0.06); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    // rattle
    const trem=this.ctx.createOscillator(); trem.type='square'; trem.frequency.value=16;
    const tg=this.ctx.createGain(); tg.gain.value=0.18; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t+dur);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t+dur);
  },
  // ---- venom spit: short wet burst ----
  spit(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(0.18);
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.5;
    bp.frequency.setValueAtTime(2800,t); bp.frequency.exponentialRampToValueAtTime(600,t+0.16);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t+0.18);
  },
  // ---- venom hitting the player: dull squelch + sizzle ----
  poisoned(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime, dur=0.6;
    const o=this.ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(300,t); o.frequency.exponentialRampToValueAtTime(70,t+0.4);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(0.45,t); og.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t+0.45);
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(dur);
    const hp=this.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3000;
    const ng=this.ctx.createGain(); ng.gain.setValueAtTime(0.3,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(hp); hp.connect(ng); ng.connect(this.master); src.start(t); src.stop(t+dur);
  },
  // ---- door giving way: one massive muffled crash, all low end ----
  doorBreak(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    // deep impact body
    const o=this.ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(60,t); o.frequency.exponentialRampToValueAtTime(18,t+1.6);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(2.4,t); og.gain.exponentialRampToValueAtTime(0.0001,t+1.6);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t+1.6);
    // sub-bass weight
    const sub=this.ctx.createOscillator(); sub.type='triangle';
    sub.frequency.setValueAtTime(38,t); sub.frequency.exponentialRampToValueAtTime(12,t+2.0);
    const sg=this.ctx.createGain(); sg.gain.setValueAtTime(1.9,t); sg.gain.exponentialRampToValueAtTime(0.0001,t+2.0);
    sub.connect(sg); sg.connect(this.master); sub.start(t); sub.stop(t+2.0);
    // faint muffled clang, just enough to say metal
    [150,222].forEach((f,i)=>{
      const m=this.ctx.createOscillator(); m.type='sine'; m.frequency.value=f;
      const mg=this.ctx.createGain(); mg.gain.setValueAtTime(0.2/(i+1),t);
      mg.gain.exponentialRampToValueAtTime(0.0001,t+0.6);
      m.connect(mg); mg.connect(this.master); m.start(t); m.stop(t+0.6);
    });
    // heavy rumble of debris settling, trailing off slowly
    const src=this.ctx.createBufferSource(); src.buffer=this.noiseBuffer(2.2);
    const lp=this.ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(280,t); lp.frequency.exponentialRampToValueAtTime(50,t+2.2);
    const ng2=this.ctx.createGain(); ng2.gain.setValueAtTime(1.8,t); ng2.gain.exponentialRampToValueAtTime(0.0001,t+2.2);
    src.connect(lp); lp.connect(ng2); ng2.connect(this.master); src.start(t); src.stop(t+2.2);
  },
  // ---- card pickup ----
  pickup(){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    [880,1320].forEach((f,i)=>{
      const o=this.ctx.createOscillator(); o.type='triangle'; o.frequency.value=f;
      const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,t+i*0.07);
      g.gain.exponentialRampToValueAtTime(0.25,t+i*0.07+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.07+0.18);
      o.connect(g); g.connect(this.master); o.start(t+i*0.07); o.stop(t+i*0.07+0.2);
    });
  },
  // ---- win / level clear ----
  chime(win){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime;
    (win?[523,659,784,1046]:[523,784]).forEach((f,i)=>{
      const o=this.ctx.createOscillator(); o.type='triangle'; o.frequency.value=f;
      const s=t+i*0.13;
      const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,s);
      g.gain.exponentialRampToValueAtTime(0.22,s+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,s+0.4);
      o.connect(g); g.connect(this.master); o.start(s); o.stop(s+0.42);
    });
  },
  toggleMute(){
    this.muted=!this.muted;
    if(this.master) this.master.gain.setTargetAtTime(this.muted?0:0.9,this.ctx.currentTime,0.05);
    return this.muted;
  }
};
