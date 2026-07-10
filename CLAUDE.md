# Jurassic Nightmare

Jeu d'infiltration/survie en canvas 2D. ES modules natifs (ES2022), sans build ni
bundler, sans dépendance.

## Règle d'or

Si un changement décide « **ce qui se passe** », il va dans `src/` et se teste.
S'il décide « **comment ça s'affiche** », il va dans `render/`.

## Architecture en deux couches

- **`src/` — logique métier pure.** Aucun accès au DOM, à `window`, au canvas ni
  à l'audio. Les fonctions reçoivent l'objet `state` en argument et le modifient ;
  elles ne rendent rien. C'est la couche testée.
- **`render/` — rendu & interactions.** Importe `src/`, lit l'état chaque frame,
  s'abonne au bus pour les effets ponctuels. Aucune logique métier.

La dépendance est unidirectionnelle : `render/` importe `src/`, jamais l'inverse.

## L'état

`createApp({ rng })` (`src/app.js`) crée et renvoie l'objet `state` complet
(données du domaine + `bus` + `rng`). Aucun état global de module — tout vit dans
cet objet, ce qui rend chaque test indépendant.

## Modules

### `src/`

| Module | Rôle |
|---|---|
| `config.js` | Constantes (grille, niveaux, vitesses, endurance, portes, leurres) — ne dépend de rien |
| `events.js` | `createBus()` : `on`/`emit` |
| `rng.js` | `mulberry32` (PRNG seedable), `shuffle(rng, arr)` |
| `grid.js` | Raisonnement en cases : `genMaze`, `isWall`, `cellCenter`, `openCells`, `cellDist`, `bfsNext` |
| `physics.js` | Raisonnement en pixels : `circleHitsWalls`, `losBlocked`, `movePlayerAxis` |
| `level.js` | `loadLevel(state, i)` : génération + placement cartes/rexes/herbes/portes ; `cardsLeft` |
| `player.js` | Déplacement, sprint/endurance, dissimulation, `throwLure`, ramassage de cartes |
| `lures.js` | Vol et atterrissage des flares, `attractRexes` |
| `doors.js` | Ouverture/fermeture des portes, `doorSolid`, `doorBlocksRex` |
| `rex.js` | IA complète : vision, poursuite, leurre, errance, battage de portes, capture |
| `app.js` | `createApp`, `update(state, dt)` (orchestration), machine à états (`startGame`, `nextLevel`, `die`) |

### `render/`

| Module | Rôle |
|---|---|
| `main.js` | Bootstrap : `createApp`, câblage bus→audio/effets, boucle `requestAnimationFrame` |
| `draw.js` | Tout le dessin canvas (monde, rexes, obscurité, jumpscare, endurance) |
| `gfx.js` | **PUR** : calculs graphiques (flicker, rayons de lumière, alphas, couleurs, mapping tactile) |
| `html.js` | **PUR** : fragments HTML des écrans d'overlay |
| `hud.js` | Mise à jour DOM du HUD (chaque frame, depuis l'état) + overlay |
| `audio.js` | Moteur SFX synthétisé (WebAudio), déclenché par le bus |
| `input.js` | Clavier, tactile, d-pad, boutons ; écrit `state.keys` et appelle les actions de `src/` |

## Bus d'événements (src → render)

La logique n'appelle jamais le rendu : elle émet, le rendu s'abonne (`main.js`).

| Événement | Payload | Effets côté rendu |
|---|---|---|
| `rex:roar` | — | rugissement + screen shake |
| `door:hit` | — | son d'impact |
| `card:picked` | — | son de ramassage |
| `lure:thrown` | — | son de lancer |
| `heartbeat` | intensité 0..1 | battement de cœur |
| `player:died` | `{x, y}` | cri, arrêt d'ambiance, shake, éclaboussures |
| `game:over` | `{level, score}` | overlay de défaite |
| `level:cleared` | `{level, time, bonus, score}` | carillon + overlay de transition |
| `game:won` | `{score}` | carillon + overlay de victoire |

Le screen shake et les éclaboussures de sang vivent côté `render/` (objet `fx`
dans `main.js`) : purement visuels, ils sont pilotés par ces événements.

## Aléa

Jamais `Math.random()` dans `src/` — tout aléa passe par `state.rng`, injecté à
la création, pour des tests déterministes. Le reseed d'une partie se fait via
`startGame(state, seed)` ; le seed est fourni par `render/` au clic.

## Tests

- `npm test` — `node --test`, fichiers dans `test/*.test.js`, zéro dépendance.
- Tests **macro** sur les comportements fonctionnels de `src/` (le rex chasse,
  la porte cède, le sprint épuise…), pas sur les détails d'implémentation.
- Pas de fichier utilitaire dans `test/` : Node y traiterait tout `.js` comme un
  fichier de test ; les helpers (`arena`, `step`…) restent locaux à chaque fichier.

## Lancer le jeu

- `npm run dev` (`npx serve .`) puis ouvrir l'URL affichée — les ES modules ne se
  chargent pas en `file://`.
