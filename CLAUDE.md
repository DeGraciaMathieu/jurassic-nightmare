# Jurassic Nightmare

Jeu d'infiltration/survie en canvas 2D : ramasser des cartes d'accès et fuir un labyrinthe plongé dans le noir sans se faire attraper par les rexes.

## Stack

- JavaScript vanilla **ES2022, ES modules natifs** — zéro dépendance, pas de build ni bundler.
- Canvas 2D + WebAudio (SFX synthétisés, aucun asset), HTML + `styles.css`.
- Node ≥ 18 pour l'outillage.

| Commande | Rôle |
|---|---|
| `npm test` | `node --test` — tests macro dans `test/*.test.js` |
| `npm run dev` | `npx serve .` — **obligatoire** : les ES modules ne se chargent pas en `file://` |
| `npm run harness` | `scripts/harness.js` — un bot joue chaque secteur en headless et affiche le taux de réussite (`npm run harness -- [parties] [seed]`) |

Pas de lint/format configuré (choix zéro-dépendance assumé) : suivre le style en place — indentation 2 espaces, code compact, une responsabilité par module.

Mode debug : ajouter `?debug` à l'URL — saut direct vers un secteur et obscurité on/off (purement `render/`, aucun impact sur `src/`).

## Conventions de code (non négociables)

**Règle d'or : si un changement décide « ce qui se passe », il va dans `src/` et se teste. S'il décide « comment ça s'affiche », il va dans `render/`.**

- Dépendance unidirectionnelle : `render/` importe `src/` — **jamais l'inverse**.
- **Jamais** de DOM, `window`, canvas, `performance` ou WebAudio dans `src/`.
- **Jamais** de `Math.random()` dans `src/` : tout aléa passe par `state.rng` (mulberry32 injecté) ; le reseed d'une partie se fait uniquement via `startGame(state, seed)`.
- **Jamais** d'état global de module : tout vit dans l'objet `state` créé par `createApp({rng})` (`src/app.js`).
- **Jamais** d'appel direct de la logique vers le rendu : `src/` émet sur `state.bus`, `render/main.js` s'abonne.
- Les effets purement visuels (screen shake, éclaboussures) vivent côté `render/` (objet `fx`), pas dans `state`.
- Constantes de gameplay dans `src/config.js` uniquement — pas de valeur magique dupliquée.
- Nouveau champ d'état : valeur par défaut dans `createApp` **et** reset dans `loadLevel`.
- Langues : code et commentaires en **anglais** ; doc, tests et textes du jeu en **français** ; messages de commit en **anglais**.

## Conventions de domaine

- Grille 19×13 de tuiles de 40 px (canvas 760×520) ; `grid[r][c]` avec `0` = ouvert, `1` = mur ; clés de `Set`/`Map` au format `"c,r"` ; positions d'entités en pixels (centres de cases).
- Terminologie : *rex* (prédateur de contact), *dilo* (dilophosaure, cracheur de venin du secteur 2), *raptor* (meute du secteur 3, rôles `driver`/`flanker`/`feinter`), *venom* (globs de venin), *lure*/*flare* (leurre), *grass* (herbes hautes), *decor* (débris de couloir ; les caisses et squelettes craquent sous les pas), secteur (niveau), `chasing`/`alert`/`investigating` (états IA), `status ∈ menu|play|scare|dead|levelclear|win`.
- La **doc vivante** du joueur est le texte statique de l'overlay d'`index.html` (règles du jeu + légende des touches) : toute mécanique modifiée doit y rester exacte.

## Comportement (process)

- Ne **jamais** déclarer une tâche terminée sans avoir lancé `npm test` et vérifié qu'ils passent.
- Si une approche échoue après **2 tentatives**, reprendre le plan avant de continuer — ne pas s'acharner sur la même piste.
- Tout changement de comportement de `src/` s'accompagne d'un test **macro** (comportement observable, jamais un détail d'implémentation).
- Si le périmètre change (règles du jeu, architecture, conventions) : synchroniser l'overlay d'`index.html`, ce CLAUDE.md et les skills concernés.

## Skills disponibles

| Skill | Périmètre |
|---|---|
| `architecture` | Carte module → rôle → dépendances, objet `state`, événements du bus, où placer du nouveau code |
| `testing` | `npm test`, philosophie macro, patterns `arena`/`step`, mapping test → périmètre, pièges |
| `level-generation` | Labyrinthe, difficulté des secteurs (`LEVELS`), placement des entités |
| `predator-ai` | IA des rexes (vision, poursuite, leurres, errance) et portes de sécurité |
| `player-mechanics` | Déplacement, sprint/endurance, dissimulation, flares, cartes |
| `rendering` | Canvas, obscurité/lumières, SFX, HUD/overlays, entrées, câblage du bus |
| `feature` | Workflow d'implémentation : comprendre → implémenter → tester → synchroniser → résumer |
| `prd` | Spécifier une feature (exploration technique + décisions produit) sans l'implémenter |

Commands : `/review` (revue complète du diff), `/check-conventions` (conventions + synchro doc), `/check-tests` (couverture + tests manquants avec validation).
