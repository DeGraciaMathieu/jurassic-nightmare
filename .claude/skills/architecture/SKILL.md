---
name: architecture
description: Use when il faut localiser du code, comprendre les couches src/ vs render/, décider où placer un changement ou câbler un nouvel événement du bus.
auto_invoke: true
---

# Architecture — carte du projet

Deux couches ES modules, dépendance unidirectionnelle : `render/` importe `src/`, jamais l'inverse. `index.html` est un simple bootstrap qui charge `render/main.js`.

## Modules `src/` (logique pure, testée — aucun DOM)

| Module | Rôle | Dépend de |
|---|---|---|
| `src/config.js` | Constantes : grille, `LEVELS`, vitesses, endurance, portes, leurres, rayons | rien |
| `src/events.js` | `createBus()` : `on`/`emit` | rien |
| `src/rng.js` | `mulberry32` (PRNG seedable), `shuffle(rng, arr)` | rien |
| `src/grid.js` | Raisonnement en cases : `genMaze`, `isWall`, `cellCenter`, `openCells`, `cellDist`, `bfsNext` | config, rng |
| `src/doors.js` | `doorSolid`, `doorBlocksRex`, `updateDoors` | config |
| `src/physics.js` | Raisonnement en pixels : `circleHitsWalls`, `losBlocked`, `movePlayerAxis` | config, grid, doors |
| `src/level.js` | `loadLevel(state, i)` : génération + placement ; `cardsLeft` | config, rng, grid |
| `src/player.js` | `updatePlayer` (mouvement, sprint, dissimulation), `throwLure`, `pickupCards` | config, physics |
| `src/lures.js` | `updateLures` (vol/atterrissage), `attractRexes` | config, physics |
| `src/rex.js` | `updateRexes` (IA complète), `dangerLevel` (rexes + dilos) | config, grid, physics, doors |
| `src/dilo.js` | `updateDilos` (traque + crachat), `updateVenoms` (globs + poison) | config, grid, physics, doors |
| `src/raptor.js` | `updateRaptors` : meute du secteur 3 (rabatteur, flanqueur, feinteur), perception partagée | config, grid, physics, doors |
| `src/app.js` | `createApp`, `update(state, dt)`, `startGame`, `retryLevel`, `nextLevel`, `die` | tout `src/` |

## Modules `render/`

| Module | Rôle | Note |
|---|---|---|
| `render/main.js` | Bootstrap : `createApp`, câblage bus → SFX/fx/overlays, boucle rAF | point d'entrée |
| `render/draw.js` | `createRenderer(canvas, state, fx)` : tout le dessin canvas | lit l'état chaque frame |
| `render/gfx.js` | **PUR** : flicker, rayons de lumière, alphas, couleurs, mapping tactile | testable sans navigateur |
| `render/html.js` | **PUR** : fragments HTML des overlays de fin (`{html, label}`) | testable sans navigateur |
| `render/hud.js` | `createHud(els)` : HUD DOM chaque frame + overlay | |
| `render/audio.js` | `SFX` : moteur WebAudio synthétisé | `SFX.init()` exige un geste utilisateur |
| `render/input.js` | `attachInput` : clavier, tactile, d-pad, boutons | écrit `state.keys` / `state.touchTarget` |

## L'objet `state` (créé par `createApp({rng})` — aucun état global de module)

| Champ | Contenu |
|---|---|
| `status` | `'menu' \| 'play' \| 'scare' \| 'lifelost' \| 'dead' \| 'levelclear' \| 'win'` |
| `levelIdx`, `score`, `levelTime`, `lives` | progression (`lives` : 3 par partie ; perdre une vie rejoue le secteur via `retryLevel`, la dernière → `game:over`) |
| `grid` | matrice `ROWS×COLS`, `0` = ouvert, `1` = mur |
| `player` | `{x, y, fx, fy, hidden}` (fx/fy = facing) |
| `exit`, `cards`, `rexes`, `dilos`, `raptors`, `doors`, `doorMap`, `grassSet`, `lures`, `venoms`, `decor` | entités du niveau (reset par `loadLevel`) |
| `lureCount`, `throwCD`, `stamina`, `exhausted`, `visionR`, `poisonT`, `scareT`, `hbTimer` | compteurs de gameplay |
| `keys`, `touchTarget` | entrées, écrites par `render/input.js` |
| `bus`, `rng` | injectés à la création |

Ordre des updates dans `update(state, dt)` (`src/app.js`) — à respecter :
`updatePlayer → updateDoors → updateLures → pickupCards → updateRexes → updateDilos → updateRaptors → updateVenoms` puis heartbeat et test de sortie.

## Événements du bus (src → render, abonnements dans `render/main.js`)

| Événement | Payload | Émis par |
|---|---|---|
| `rex:roar` | — | `src/rex.js` |
| `door:hit` | — | `src/rex.js` |
| `door:broken` | — | `src/rex.js` |
| `dilo:hiss` | — | `src/dilo.js` |
| `raptor:bark` | — | `src/raptor.js` |
| `dilo:spit` | — | `src/dilo.js` |
| `player:poisoned` | — | `src/dilo.js` |
| `card:picked` | — | `src/player.js` |
| `lure:thrown` | — | `src/player.js` |
| `decor:crunch` | — | `src/player.js` |
| `heartbeat` | intensité 0..1 | `src/app.js` |
| `player:died` | `{x, y}` | `src/app.js` (`die`) |
| `life:lost` | `{lives}` | `src/app.js` |
| `game:over` | `{level, score}` | `src/app.js` |
| `level:cleared` | `{level, time, bonus, score}` | `src/app.js` |
| `game:won` | `{score}` | `src/app.js` |

## Où placer du nouveau code

| Type de changement | Fichiers à toucher |
|---|---|
| Nouvelle règle de gameplay | module `src/` du domaine + `src/config.js` (constantes) + test macro |
| Effet visuel/sonore sur un fait de jeu | `bus.emit` dans `src/` → abonnement `render/main.js` → `render/audio.js` et/ou `render/draw.js` |
| Calcul graphique (rayon, alpha, couleur) | `render/gfx.js` (pur), appelé par `draw.js` |
| Écran / overlay | fragment pur dans `render/html.js` + affichage `render/hud.js` |
| Entrée utilisateur | `render/input.js` (écrit `state.keys` ou appelle une action `src/`) + légende des touches dans `index.html` |
| Réglage de difficulté | `src/config.js` (`LEVELS`) |
| Entité placée au chargement du niveau | `src/level.js` + champ dans `createApp` + dessin `drawWorld` |
| Machine à états / boucle de jeu | `src/app.js` |
