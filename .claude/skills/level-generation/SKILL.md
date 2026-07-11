---
name: level-generation
description: Use when il faut modifier le labyrinthe, la difficulté des secteurs ou le placement des entités (cartes, rexes, herbes, portes) au chargement d'un niveau.
auto_invoke: true
---

# Génération de niveau

## Concepts → implémentation

| Concept | Où | Détail |
|---|---|---|
| Grille | `src/config.js` | `TILE=40`, `COLS=19`, `ROWS=13` (canvas 760×520) ; `grid[r][c]`, `0` = ouvert, `1` = mur |
| Labyrinthe | `src/grid.js` `genMaze(rng, braidP)` | backtracker récursif sur les cases impaires |
| Braiding | `genMaze` | probabilité `braidP` d'ouvrir un mur intérieur entre deux couloirs → boucles d'évasion |
| Départ / sortie | `src/level.js` `loadLevel` | start `(1,1)`, goal `(COLS-2, ROWS-2)`, forcés ouverts |
| Difficulté par secteur | `src/config.js` `LEVELS` | `rex`, `dilo`, `raptor`, `cards`, `braid`, `vision` (torche), `sight` (vue), `patrol`/`chase` (vitesses), `doors` |
| Placement cartes | `loadLevel` | `shuffle(openCells)`, `cellDist(start) > 3` et `cellDist(goal) > 1` |
| Placement rexes | `loadLevel` | `cellDist(start) > 6` ; le spawn est l'objet rex complet (`c,r,tc,tr,chasing,alert,seen*,prev*,roarCD,lureTimer,lure*,hitCD`) |
| Placement dilos | `loadLevel` | `cfg.dilo` par secteur, mêmes contraintes que les rexes ; champs propres : `hissCD,spitCD,spitT` |
| Placement raptors | `loadLevel` | `cfg.raptor` (secteur 3), mêmes contraintes que les rexes ; rôles fixes dans l'ordre `feinter`/`flanker`/`feinter` ; champs propres : `role,barkCD,feints,feintT,mode,lostT,flankC,flankR` ; le braid du secteur 3 (0.12) garantit des boucles pour les itinéraires d'interception du flanqueur |
| Herbes | `loadLevel` → `state.grassSet` | `Set` de clés `"c,r"`, 18 max, jamais sur départ/sortie |
| Portes | `loadLevel` → `state.doors` + `state.doorMap` | seulement sur des goulets de couloir (horizontal ou vertical), jamais sur herbe/carte/rex, espacement `cellDist ≥ 4`, plafond `cfg.doors` |
| Décors | `loadLevel` → `state.decor` | 15 max (20 % des cases éligibles), 5 types (`blood/bones/crate/rubble/crack`), jamais sur départ/sortie/herbe/porte/carte ; caisses et squelettes craquent sous les pas (`src/player.js`) |
| Déterminisme | `src/rng.js` | l'**ordre des tirages** rng dans `loadLevel` définit le niveau : ne pas réordonner les phases de placement sans raison |

## Ajouter un nouveau secteur

1. `src/config.js` : ajouter une entrée à `LEVELS` (`name`, `rex`, `cards`, `braid`, `vision`, `sight`, `patrol`, `chase`, `doors`). La condition de victoire utilise `LEVELS.length` : rien d'autre à toucher côté logique.
2. `npm test` : `test/level.test.js` itère sur `LEVELS` et couvre le nouveau secteur automatiquement. Vérifier que les contraintes de placement restent satisfiables (grille 19×13 : trop d'entités = pool épuisé silencieusement).

## Ajouter un nouveau type d'entité placée au niveau

1. `src/config.js` : constantes (effectif, rayons, vitesses).
2. `src/app.js` `createApp` : champ par défaut dans `state`.
3. `src/level.js` `loadLevel` : placement via `shuffle(state.rng, openCells(grid))` + filtres de distance (modèles : cartes, herbes, portes) ; **réinitialiser le champ** à chaque chargement.
4. Logique : module `src/` dédié, appelé dans `update()` (`src/app.js`) en respectant l'ordre `player → doors → lures → pickup → rexes → dilos → venins`.
5. `render/draw.js` `drawWorld` : dessin, en respectant l'ordre des couches (sol → herbe → murs → portes → sortie → cartes → flares → sang → rexes → joueur).
6. Tests : effectifs/contraintes dans `test/level.test.js`, comportement dans le fichier du domaine.
