export const TILE = 40, COLS = 19, ROWS = 13; // 760x520
export const W = COLS * TILE, H = ROWS * TILE;

// ---- per-level tuning ----
export const LEVELS = [
  { name:"Secteur 1 — L'accueil",     rex:1, cards:3, braid:0.14, vision:165, sight:145, patrol:78,  chase:150, doors:6 },
  { name:"Secteur 2 — La volière",    rex:2, cards:4, braid:0.09, vision:140, sight:160, patrol:88,  chase:165, doors:8 },
  { name:"Secteur 3 — Le paddock",    rex:3, cards:5, braid:0.05, vision:118, sight:180, patrol:98,  chase:188, doors:10 },
];

export const LURE_HEAR = 320, LURE_LIFE = 5, HIDE_SIGHT = 54;
export const DOOR_HP = 4, DOOR_SENSE = 52, DOOR_SPEED = 7, DOOR_HIT_CD = 0.7;
export const PR = 11, RR = 15, CR = 9;
export const PLAYER_SPEED = 138, SPRINT_SPEED = 210; // sprint outruns the fastest rex (188)
export const STAMINA_MAX = 2.6, STAMINA_REGEN = 0.5;
