export const TILE = 40, COLS = 19, ROWS = 13; // 760x520
export const W = COLS * TILE, H = ROWS * TILE;

// ---- per-level tuning ----
export const LEVELS = [
  { name:"Secteur 1 — L'accueil",     rex:1, dilo:0, raptor:0, cards:3, braid:0.14, vision:165, sight:145, patrol:78,  chase:150, doors:6 },
  { name:"Secteur 2 — La volière",    rex:1, dilo:1, raptor:0, cards:4, braid:0.09, vision:140, sight:160, patrol:88,  chase:165, doors:8 },
  // higher braid: the raptor pack needs maze loops for flanking routes
  { name:"Secteur 3 — Le paddock",    rex:0, dilo:0, raptor:3, cards:5, braid:0.12, vision:118, sight:180, patrol:98,  chase:188, doors:6 },
];

export const LURE_HEAR = 320, LURE_LIFE = 5, HIDE_SIGHT = 54;
export const SPRINT_HEAR = 220, SPRINT_ALERT = 1.5; // sprint footsteps carry, quieter than a flare
export const CRUNCH_HEAR = 260, CRUNCH_ALERT = 1.8; // crates/skeletons crack underfoot: sharper than footsteps, quieter than a flare
export const DOOR_HP = 4, DOOR_SENSE = 52, DOOR_SPEED = 7, DOOR_HIT_CD = 0.7;
export const PR = 11, RR = 15, CR = 9;
export const DILO_R = 12, DILO_SPIT_RANGE = 140, DILO_SPIT_CD = 1.6, VENOM_SPEED = 240;
export const POISON_DURATION = 3, POISON_VISION = 0.5, POISON_SLOW = 0.6; // blind + slow while poisoned
export const PLAYER_SPEED = 138, SPRINT_SPEED = 210; // sprint outruns the fastest rex (188)
export const STAMINA_MAX = 2.6, STAMINA_REGEN = 0.5;

// ---- raptor pack (sector 3) ----
export const RAPTOR_R = 13;
export const RAPTOR_PATROL = 110, RAPTOR_CHASE = 175, RAPTOR_LUNGE = 230; // only the real lunge outruns the sprint (210)
export const RAPTOR_HOLD_DIST = 140, RAPTOR_ABORT_DIST = 60, RAPTOR_ENGAGE_DIST = 60;
export const RAPTOR_FEINTS = 2, RAPTOR_FEINT_WINDUP = 0.5, RAPTOR_LOST_SIGHT = 1;
export const RAPTOR_DOOR_SLIP = 0.4; // raptors never smash doors but slip through while open >= this
export const FLANK_AHEAD = 4; // how many tiles ahead of the player's heading the flanker aims to cut off
