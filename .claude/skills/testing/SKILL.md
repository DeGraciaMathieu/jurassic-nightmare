---
name: testing
description: Use when il faut écrire ou modifier des tests, trouver quel test couvre quoi, ou vérifier un comportement de jeu.
auto_invoke: true
---

# Tests

## Commande

`npm test` → `node --test` (runner intégré, Node ≥ 18, zéro dépendance). Fichiers : `test/*.test.js`.

## Philosophie

Tests **macro** : on vérifie des comportements fonctionnels observables (« le rex défonce la porte en quatre coups », « le sprint épuise puis se régénère »), jamais des détails d'implémentation. Déterminisme total via `mulberry32(seed)`. La manipulation directe de `state` (remplacer la grille, vider `rexes`, téléporter le joueur) **est** l'API de test voulue.

## Mapping fichier de test → périmètre couvert

| Fichier | Couvre |
|---|---|
| `test/maze.test.js` | pourtour muré, connexité des cellules ouvertes, déterminisme à seed égal, `bfsNext` pas à pas |
| `test/level.test.js` | effectifs conformes à `LEVELS`, positions départ/sortie, contraintes de distance au spawn |
| `test/player.test.js` | déplacement/blocage mur, sprint plus rapide, endurance/épuisement/récupération, dissimulation, flare (consommation, cooldown, hors partie), ramassage de carte |
| `test/rex.test.js` | détection + rugissement, LOS coupée par un mur, herbe (quasi-invisible), détournement par flare, investigation hors de vue, sprint entendu vs marche silencieuse, capture → scare → dead |
| `test/dilo.test.js` | effectifs secteur 2, sifflement + traque, arrêt-et-crachat à portée, venin → poison (aveugle + ralentit) puis récupération, venin bloqué par un mur, contact mortel, flare/herbe, portes infranchissables |
| `test/doors.test.js` | ouverture/fermeture à l'approche, solidité, blocage d'un patrouilleur, défonçage en chasse (4 coups) |
| `test/game.test.js` | `startGame` (reset), déterminisme de partie, `levelclear` + bonus, victoire, mort → game over, test de fumée 10 s |

## Patterns des tests existants

- `arena(seed)` : `createApp` + `loadLevel(0)` + `status='play'` + grille remplacée (intérieur ouvert, murs au bord) + entités retirées + joueur au centre (cellule `(9,6)`, soit `(380, 260)` px).
- `step(state, secs, dt=1/60)` : boucle d'`update`.
- `addRex(state, c, r)` / `addDoor(state, c, r)` : spawns manuels — **mêmes champs que dans `src/level.js`** (si un champ est ajouté au spawn, mettre à jour ces helpers).
- Événements : compter via `state.bus.on('...', ...)` avant de dérouler le scénario.

## Pièges connus

- Node traite **tout `.js` sous `test/`** comme un fichier de test → pas de `helpers.js` partagé ; les helpers sont dupliqués dans chaque fichier, c'est voulu.
- La capture du rex utilise la distance **pré-mouvement** de la frame.
- `cards=[]` ⇒ `cardsLeft()===0` : un joueur proche de la sortie déclenche `levelclear`.
- Endurance : dès que `stamina` touche 0, la régénération reprend à la frame suivante (`exhausted` reste vrai jusqu'à 35 %) — ne jamais asserter `stamina === 0` après coup.
- Un rex qui investigue un flare peut légitimement re-voir le joueur en route et reprendre la chasse — placer les scénarios de leurre hors de portée de vue (145 px au secteur 1).

## Où placer un nouveau test

1. Choisis le fichier par domaine (table ci-dessus) ; nouveau sous-système → `test/<domaine>.test.js`.
2. Construis le scénario avec `arena(seed)` + chirurgie d'état, seed fixe.
3. Asserte le comportement observable : état final, événements émis — pas les étapes internes.
4. `npm test` doit rester vert **en entier** avant de conclure.

## Vérification visuelle (optionnelle, jamais un substitut aux tests)

Chrome headless a déjà servi sur ce projet : servir le jeu en HTTP (`npm run dev`) puis
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=/tmp/shot.png --window-size=820,980 "http://localhost:3000"`.
Depuis le passage aux ES modules, `file://` ne fonctionne plus — toujours passer par HTTP.
