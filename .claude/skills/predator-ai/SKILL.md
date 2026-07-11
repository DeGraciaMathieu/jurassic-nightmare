---
name: predator-ai
description: Use when il faut modifier le comportement des rexes (vision, poursuite, leurres, errance) ou les portes de sécurité.
auto_invoke: true
---

# IA des prédateurs & portes de sécurité

Deux prédateurs : le **rex** (`src/rex.js` `updateRexes`) et le **dilophosaure** (`src/dilo.js` `updateDilos`, attaquant à distance). Chaque update retourne `true` quand la bête capture le joueur ; `src/app.js` appelle alors `die(state)` et interrompt la frame. Les deux partagent la même perception, les mêmes priorités de but et la même errance.

## Perception

| Concept | Implémentation |
|---|---|
| Portée de vue | `cfg.sight` (145/160/180 selon le secteur) ; réduite à `HIDE_SIGHT = 54` si `player.hidden` (herbe) |
| Ligne de vue | `losBlocked` (`src/physics.js`) : échantillonnage tous les 8 px ; murs **et portes solides** bloquent |
| Détection | `sees` ⇒ `chasing=true`, `alert=2.2`, `seenC/seenR` = cellule du joueur, `lureTimer=0` |
| Rugissement | passage en chasse avec `roarCD ≤ 0` → `bus.emit('rex:roar')` + `roarCD=2.5` |
| Perte de vue | `alert` décroît de `dt` ; à 0, `chasing=false` |
| Ouïe (sprint) | `src/player.js` : un joueur qui sprinte à moins de `SPRINT_HEAR=220` px alimente `alert`/`seenC/seenR` de rexes ET dilos — investigation à vitesse patrouille, sans passer en chasse |

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
| Défonçage en chasse | le bfs d'un chasseur ignore les portes ; bloqué au contact, il frappe si `open < 0.25`, cadence `DOOR_HIT_CD=0.7`, `bus.emit('door:hit')`, `hp` de `DOOR_HP=4` → `broken` + `bus.emit('door:broken')` |
| Engagement | pendant le battage, `alert = max(alert, 0.5)` : le rex reste engagé même prey hors de vue |
| Capture | distance **pré-mouvement** < `RR + PR − 3` (23 px) |

## Le dilophosaure (`src/dilo.js`)

| Règle | Implémentation |
|---|---|
| Où | secteur 2 uniquement (`LEVELS[1]` : `rex = 1`, `dilo = 1`) |
| Détection | comme le rex, mais émet `dilo:hiss` (cooldown `hissCD` 2.5) au lieu de rugir |
| Attaque à distance | en chasse, à vue et à moins de `DILO_SPIT_RANGE=140` : il **s'arrête**, fait face et crache (`DILO_SPIT_CD=1.6`, `bus 'dilo:spit'`, `spitT=0.35` pour la collerette côté rendu) |
| Venin | `state.venoms` : globs à `VENOM_SPEED=240` px/s, ligne droite visée au tir ; s'écrasent sur murs/portes fermées ; touchent à `PR+5` |
| Poison | `state.poisonT = POISON_DURATION=3` s : torche ×`POISON_VISION=0.5` et vitesse ×`POISON_SLOW=0.6` (lerp dans `updatePlayer`), `bus 'player:poisoned'` |
| Portes | le bloquent **toujours** (`doorBlocksRex` dans son bfs et son errance) — il ne les défonce jamais |
| Leurres / herbe | mêmes règles que le rex (`attractRexes` couvre les deux, `HIDE_SIGHT` aussi) |
| Contact | distance pré-mouvement < `DILO_R + PR − 3` (20 px) → mort |

## Modifier ou ajouter un comportement

1. Constantes → `src/config.js` (globales) ou `LEVELS` (par secteur).
2. Champs persistants de la bête → le spawn dans `src/level.js` **et** les helpers `addRex`/`addDilo` des tests concernés.
3. Logique → `updateRexes` / `updateDilos`, en respectant l'ordre des priorités de but ci-dessus.
4. Effet audio/visuel → `bus.emit` dans le module + abonnement dans `render/main.js`.
5. Test macro → `test/rex.test.js`, `test/dilo.test.js` ou `test/doors.test.js` : `arena()` + `addRex`/`addDilo`/`addDoor`, forcer l'état (`chasing`, `seenC/seenR`) à la main pour isoler le comportement.
