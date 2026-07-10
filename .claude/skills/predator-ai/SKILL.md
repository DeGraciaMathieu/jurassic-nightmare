---
name: predator-ai
description: Use when il faut modifier le comportement des rexes (vision, poursuite, leurres, errance) ou les portes de sécurité.
auto_invoke: true
---

# IA des prédateurs & portes de sécurité

Toute l'IA vit dans `src/rex.js` `updateRexes(state, dt)` — retourne `true` quand un rex capture le joueur ; `src/app.js` appelle alors `die(state)` et interrompt la frame.

## Perception

| Concept | Implémentation |
|---|---|
| Portée de vue | `cfg.sight` (145/160/180 selon le secteur) ; réduite à `HIDE_SIGHT = 54` si `player.hidden` (herbe) |
| Ligne de vue | `losBlocked` (`src/physics.js`) : échantillonnage tous les 8 px ; murs **et portes solides** bloquent |
| Détection | `sees` ⇒ `chasing=true`, `alert=2.2`, `seenC/seenR` = cellule du joueur, `lureTimer=0` |
| Rugissement | passage en chasse avec `roarCD ≤ 0` → `bus.emit('rex:roar')` + `roarCD=2.5` |
| Perte de vue | `alert` décroît de `dt` ; à 0, `chasing=false` |

## Priorités de but (ordre STRICT dans `updateRexes`)

1. `chasing` → dernière cellule vue (`seenC/seenR`), vitesse `cfg.chase`
2. `lureTimer > 0` → cellule du flare (*investigating*, vitesse `cfg.patrol × 1.4`)
3. `alert > 0` → dernière cellule vue
4. sinon **errance** : voisin ouvert aléatoire via `state.rng`, en évitant le demi-tour (`prevC/prevR`)

## Déplacement

Cellule cible `(tc, tr)` ; snap au centre à < 2 px puis choix du pas suivant par `bfsNext` (`src/grid.js`). Le facing `dir` (±1) suit le déplacement horizontal.

## Portes (`src/doors.js`)

| Règle | Implémentation |
|---|---|
| S'ouvre pour le joueur | `updateDoors` : distance < `DOOR_SENSE=52`, glissement `DOOR_SPEED=7`/s |
| Coincée par un rex | `wedged` si un rex occupe **ou cible** la cellule de la porte |
| Bloque un patrouilleur | `doorBlocksRex` (`open < 0.75`) exclu du bfs (prédicat) et de l'errance |
| Solide (collisions, LOS) | `doorSolid` (`open < 0.6`) — un rex peut se glisser pendant la fermeture (0.6–0.75) |
| Défonçage en chasse | le bfs d'un chasseur ignore les portes ; bloqué au contact, il frappe si `open < 0.25`, cadence `DOOR_HIT_CD=0.7`, `bus.emit('door:hit')`, `hp` de `DOOR_HP=4` → `broken` |
| Engagement | pendant le battage, `alert = max(alert, 0.5)` : le rex reste engagé même prey hors de vue |
| Capture | distance **pré-mouvement** < `RR + PR − 3` (23 px) |

## Modifier ou ajouter un comportement

1. Constantes → `src/config.js` (globales) ou `LEVELS` (par secteur).
2. Champs persistants du rex → le spawn dans `src/level.js` **et** le helper `addRex` de `test/rex.test.js` / `test/doors.test.js`.
3. Logique → `updateRexes`, en respectant l'ordre des priorités de but ci-dessus.
4. Effet audio/visuel → `bus.emit` dans `src/rex.js` + abonnement dans `render/main.js`.
5. Test macro → `test/rex.test.js` ou `test/doors.test.js` : `arena()` + `addRex`/`addDoor`, forcer l'état (`chasing`, `seenC/seenR`) à la main pour isoler le comportement.
