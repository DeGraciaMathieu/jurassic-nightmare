# PRD — Escouade de raptors au secteur 3

## Objectif

Remplacer les trois rexes du secteur 3 par une meute de trois raptors aux rôles complémentaires — un rabatteur qui poursuit de front, un flanqueur qui prend le joueur à revers, un feinteur qui fixe à distance puis charge après des feintes — plus rapides en pointe mais individuellement moins puissants qu'un rex.

## Existant technique

| Zone | État actuel |
|---|---|
| IA prédateurs | `src/rex.js` `updateRexes` et `src/dilo.js` `updateDilos` : perception commune (`cfg.sight`, `losBlocked`, `HIDE_SIGHT=54` dans l'herbe), priorités de but strictes `chasing > lureTimer > alert > errance`, déplacement par `bfsNext` (`src/grid.js`) cellule à cellule, capture au contact pré-mouvement (`RR+PR−3` rex, `DILO_R+PR−3` dilo) |
| Secteur 3 | `LEVELS[2]` (`src/config.js`) : `rex:3, dilo:0, cards:5, braid:0.05, vision:118, sight:180, patrol:98, chase:188, doors:10` |
| Portes | `src/doors.js` : `doorBlocksRex` (bloque si `open<0.75`), `doorSolid` (`open<0.6`) ; le rex chasseur les défonce (`DOOR_HP=4`, `door:hit`/`door:broken`), le dilo est toujours bloqué |
| Bruit | `noise()` (`src/player.js`) alerte `[...state.rexes, ...state.dilos]` (sprint `SPRINT_HEAR=220`, craquement `CRUNCH_HEAR=260`) ; `attractRexes` (`src/lures.js`) couvre rexes et dilos (`LURE_HEAR=320`) |
| Placement | `loadLevel` (`src/level.js`) : spawn des rexes via `shuffle(rng, openCells)` avec `cellDist(start)>6` ; l'**ordre des tirages rng** définit le niveau |
| Rendu | `render/draw.js` (sprites, yeux luisants via `gfx.eyeGlowAlpha`), `render/main.js` (bus → SFX), `dangerLevel` (`src/rex.js`) pilote le heartbeat |
| Tests | `test/rex.test.js` (vision, LOS, herbe, flares, bruit, contact), `test/level.test.js` (effectifs par secteur), helpers `arena()`/`addRex()` |
| Vitesses de référence | joueur : marche 138, sprint 210 ; rex secteur 3 : patrol 98, chase 188 |

## Comportement

### Meute et rôles

- `LEVELS[2]` passe à `rex:0, raptor:3` ; les secteurs 1–2 sont inchangés.
- Trois rôles fixes assignés au spawn, dans l'ordre : `driver` (rabatteur), `flanker` (flanqueur), `feinter` (feinteur).
- **Perception partagée** : quand un raptor voit le joueur (mêmes règles de vue que le rex : `cfg.sight`, LOS, `HIDE_SIGHT` dans l'herbe), toute la meute reçoit `seenC/seenR` et `alert=max(alert, 2.2)` à chaque frame de contact visuel. Premier engagement de meute → `bus.emit('raptor:bark')` (cooldown 2.5 s, comme le rugissement).
- Hors engagement (`alert=0` partout) : errance individuelle identique aux rexes (voisin ouvert aléatoire via `state.rng`, sans demi-tour).
- Leurres : mêmes règles que les rexes (`attractRexes` étendu à `state.raptors`), priorité `chasing > lure > alert`.
- Bruit (sprint, craquement de débris) : `noise()` inclut les raptors.

### Vitesses (constantes globales, comme `DILO_*`)

- `RAPTOR_PATROL = 110`, `RAPTOR_CHASE = 175` (rattrapable : < chase rex 188, > marche 138), `RAPTOR_LUNGE = 230` (> sprint 210, uniquement sur la vraie charge du feinteur).
- Rayon `RAPTOR_R = 13` ; capture au contact pré-mouvement < `RAPTOR_R + PR − 3` (21 px).

### Rabatteur (`driver`)

- Comportement de chasse du rex à l'identique, à `RAPTOR_CHASE` : but = `seenC/seenR`, investigation leurres/bruit, errance sinon. C'est la pression frontale qui pousse le joueur vers les deux autres.

### Flanqueur (`flanker`)

- Engagé, son but n'est **pas** la cellule du joueur mais une **cellule de revers** : la première cellule ouverte à 3, puis 2, puis 1 case(s) derrière le joueur (opposé de `player.fx/fy`) ; si aucune n'est ouverte ou atteignable, repli sur la cellule du joueur (dégénère en chasse).
- La cellule de revers est réévaluée à chaque snap de centre de cellule (même cadence que la réévaluation de but existante).
- À moins de `RAPTOR_ENGAGE_DIST = 60` px du joueur avec LOS, il abandonne le revers et charge directement à `RAPTOR_CHASE`.

### Feinteur (`feinter`)

- Engagé et à vue : il tient position à `RAPTOR_HOLD_DIST = 140` px (recule si le joueur approche), puis enchaîne son cycle :
  1. **Feinte** : charge vers le joueur à `RAPTOR_CHASE`, avorte à `RAPTOR_ABORT_DIST = 60` px, recule vers 140 px. Durée d'une feinte ≈ 1–1.5 s.
  2. Après `RAPTOR_FEINTS = 2` feintes, **vraie charge** à `RAPTOR_LUNGE = 230` jusqu'au contact.
- Le cycle total (~2–3 s) laisse au joueur une fenêtre de lecture : compter les feintes, puis flare, herbe ou porte.
- Vue perdue plus d'une seconde pendant le cycle → retour au comportement standard (alerte décroissante, but = dernière cellule vue) et **compteur de feintes remis à zéro**.

### Portes (secteur 3)

- Les raptors ne défoncent **jamais** une porte (aucun `door:hit` émis, `hp` intact).
- Ils se **faufilent** : une porte ne les bloque que si `open < RAPTOR_DOOR_SLIP = 0.4` (contre 0.75 pour un rex patrouilleur, toujours pour un dilo). Une porte que le joueur vient de franchir est encore assez ouverte pour laisser passer un poursuivant proche.
- En compensation : `LEVELS[2].doors` passe de **10 à 6** — les portes restent utiles (fermée = mur pour un raptor) mais moins omniprésentes.

### Labyrinthe

- La prise à revers exige des boucles : `LEVELS[2].braid` passe de **0.05 à 0.12** (entre les secteurs 1 et 2). Sans cela le labyrinthe est un quasi-arbre et la cellule de revers est presque toujours inaccessible autrement que par le chemin du joueur.

### Cas limites

- `status='scare'` : `update()` retourne avant les updates IA — inchangé.
- Chargement de niveau : rôles réassignés dans l'ordre du spawn ; `state.raptors` remis à zéro (`createApp` + `loadLevel`).
- Joueur épuisé : la vraie charge (230) rattrape même un sprint (210) — l'échappatoire est la lecture des feintes, pas la course.
- Joueur caché (herbe) pendant le cycle de feintes : vue réduite à `HIDE_SIGHT` → perte de vue → reset du cycle.
- Effectif `raptor:0` sur les secteurs 1–2 : `updateRaptors` boucle sur un tableau vide, zéro impact.

## Hors-scope

- Aucun changement de comportement des rexes ni des dilos (secteurs 1–2 intacts).
- Pas de rôles dynamiques (pas de réattribution si un raptor est distrait par un flare).
- Pas de nouveau secteur, pas de changement des mécaniques joueur (sprint, flares, herbe, cartes).
- Pas d'évitement « intelligent » des flares : les raptors y répondent comme les rexes.
- Pas de vocalisations multiples : un seul cri de meute (`raptor:bark`).

## Impacts par couche

| Couche | Changements |
|---|---|
| `src/config.js` | `LEVELS[2]` : `rex:0, raptor:3, braid:0.12, doors:6` ; constantes `RAPTOR_R`, `RAPTOR_PATROL`, `RAPTOR_CHASE`, `RAPTOR_LUNGE`, `RAPTOR_HOLD_DIST`, `RAPTOR_ABORT_DIST`, `RAPTOR_ENGAGE_DIST`, `RAPTOR_FEINTS`, `RAPTOR_DOOR_SLIP` |
| `src/raptor.js` (nouveau) | `updateRaptors(state, dt)` : perception partagée, trois rôles, cycle de feintes, faufilement ; retourne `true` à la capture |
| `src/app.js` | `raptors:[]` dans `createApp` ; appel dans `update()` : `… → updateRexes → updateDilos → updateRaptors → updateVenoms` |
| `src/level.js` | spawn `cfg.raptor` raptors (mêmes contraintes que les rexes, `cellDist(start)>6`), rôles dans l'ordre |
| `src/rex.js` | `dangerLevel` inclut `state.raptors` (heartbeat) |
| `src/player.js` | `noise()` inclut les raptors |
| `src/lures.js` | `attractRexes` inclut les raptors |
| `src/doors.js` | prédicat de blocage paramétrable ou helper `doorBlocksRaptor` (seuil 0.4) |
| Bus | nouvel événement `raptor:bark` (— , `src/raptor.js`) |
| `render/draw.js` | sprite raptor (plus fin qu'un rex), yeux ambrés dans le noir, intégration à l'ordre des couches |
| `render/audio.js` + `render/main.js` | `SFX.bark()` câblé sur `raptor:bark` |
| Doc vivante | overlay `index.html` (mention de la meute au dernier secteur), CLAUDE.md (terminologie *raptor*, rôles), skills `predator-ai`, `architecture`, `level-generation`, `rendering` |

## Critères d'acceptation

- Le secteur 3 spawne 3 raptors (rôles rabatteur/flanqueur/feinteur) et 0 rex ; secteurs 1–2 inchangés.
- Quand un seul raptor voit le joueur, les deux autres reçoivent `alert>0` et la position vue.
- Le rabatteur en chasse se déplace vers la dernière cellule vue à 175 px/s.
- Le flanqueur engagé cible une cellule derrière le facing du joueur, pas la cellule du joueur, tant qu'il est à plus de 60 px.
- Le feinteur avorte ses 2 premières charges à ~60 px sans jamais tuer pendant une feinte, puis sa vraie charge part à 230 px/s et peut tuer.
- Perdre le feinteur de vue > 1 s remet son compteur de feintes à zéro.
- Une porte à `open ≥ 0.4` laisse passer un raptor ; une porte fermée le bloque et il n'émet jamais `door:hit`.
- `LEVELS[2].doors = 6` et `braid = 0.12`.
- Sprint, craquements de débris et flares affectent les raptors comme les autres prédateurs.
- Le heartbeat réagit à un raptor proche.
- `npm test` vert, overlay d'`index.html` à jour.

## Tests

Nouveau `test/raptor.test.js` (pattern `arena()` + `addRaptor(state, c, r, role)`) :

- « le rabatteur poursuit comme un rex » — à vue, `chasing=true`, distance au joueur décroît.
- « la meute partage la détection » — un raptor voit, les deux autres (hors de vue) gagnent `alert>0` et `seenC/seenR`.
- « le flanqueur vise le dos du joueur » — joueur facing droite, flanqueur engagé : sa cible est une cellule à gauche du joueur.
- « le feinteur avorte ses charges » — pendant les 2 feintes, la distance oscille sans jamais passer sous ~60 px, le joueur reste vivant.
- « après deux feintes, la vraie charge tue » — laisser le cycle se terminer → `status='scare'`.
- « perdre la vue remet les feintes à zéro » — couper la LOS 1 s en plein cycle, re-contact : le compteur repart.
- « un raptor se faufile par une porte entrouverte » — `open=0.5` : il traverse ; `open=0` : il contourne, `door.hp` intact, zéro `door:hit`.
- `test/level.test.js` — le secteur 3 place `cfg.raptor` raptors avec les 3 rôles, 0 rex, `doors ≤ 6`.
- `test/player.test.js` / `rex.test.js` — le bruit (sprint/craquement) et `attractRexes` touchent aussi les raptors.

## Risques & questions ouvertes

- **Équilibrage global** : meute coordonnée + charge 230 + faufilement peut rendre le secteur 3 brutal malgré les 6 portes. Valeurs `RAPTOR_FEINTS`, `RAPTOR_CHASE` et `braid` à ajuster en playtest ; prévoir la marge dans les constantes, pas en dur.
- **Braid 0.12** : valeur proposée, non validée — trop de boucles facilite aussi la fuite du joueur. À caler en jouant.
- **Flanqueur dans les culs-de-sac** : même avec braid 0.12, le revers peut être inatteignable ; le repli « chasse directe » doit éviter que deux raptors fassent exactement la même chose en permanence.
- **Lisibilité** : le joueur doit distinguer les rôles (silhouette/animation du feinteur qui piaffe ?) — à trancher côté rendu à l'implémentation.
- **Rythme des feintes** : 1–1.5 s par feinte est une estimation ; si le cycle est trop lent, le feinteur ne tue jamais (le joueur est déjà loin), trop rapide et il est illisible.
