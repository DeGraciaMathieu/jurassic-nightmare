---
name: player-mechanics
description: Use when il faut modifier le joueur — déplacement, sprint/endurance, dissimulation, flares, ramassage de cartes.
auto_invoke: true
---

# Mécaniques du joueur

## Concepts → implémentation

| Concept | Où | Détail |
|---|---|---|
| Entrées | `state.keys` + `state.touchTarget` | écrites par `render/input.js` (clavier `w/a/s/d`, flèches, `shift`, `sprint` d-pad ; tactile = cible sur le canvas), lues par `src/player.js` |
| Déplacement | `updatePlayer` → `movePlayerAxis` (`src/physics.js`) | axe par axe ; arrondi de coins : glissement perpendiculaire jusqu'à `PR` px quand seul un coin bloque |
| Vitesses | `PLAYER_SPEED=138`, `SPRINT_SPEED=210` | sprint > chase max (188), marche < chase min (150) — l'avertissement de l'overlay (« vous ne courez pas plus vite que lui ») repose sur la marche |
| Endurance | `stamina` (`STAMINA_MAX=2.6` s), régén `STAMINA_REGEN=0.5`/s | à 0 → `exhausted` ; fin d'épuisement au seuil 35 % de `STAMINA_MAX` |
| Dissimulation | `player.hidden = grassSet.has("c,r")` | recalculé chaque frame ; réduit la vue des rexes à `HIDE_SIGHT=54` |
| Flare : lancer | `throwLure` (`src/player.js`) | exige `status='play'`, `lureCount>0`, `throwCD=0` (cooldown 0.5 s) ; direction = facing `(fx, fy)` ; `bus.emit('lure:thrown')` |
| Flare : vol | `updateLures` (`src/lures.js`) | 280 px/s ; s'arrête au mur (rayon 4) ou après 4.2 tuiles ; à l'atterrissage → `attractRexes` (portée d'ouïe `LURE_HEAR=320`) |
| Flare : vie au sol | `life = LURE_LIFE = 5` s | filtré à expiration ; côté rendu il perce l'obscurité |
| Cartes | `pickupCards` | rayon `PR+CR`, +50 points, `bus.emit('card:picked')` |
| Poison (venin de dilo) | `state.poisonT`, décrémenté dans `updatePlayer` | pendant `POISON_DURATION=3` s : torche ×`POISON_VISION=0.5` (lerp de `visionR`) et vitesse ×`POISON_SLOW=0.6` |
| Facing | `player.fx/fy` | dernière direction de déplacement (défaut `(1, 0)`) ; sert au flare et au biais lumineux de la torche |

## Ajouter une capacité joueur

1. Constantes → `src/config.js` ; compteurs → champ par défaut dans `createApp` (`src/app.js`) **et** reset dans `loadLevel` (`src/level.js`).
2. Logique → `src/player.js`, appelée depuis `update()` de `src/app.js` (ordre : `player → doors → lures → pickup → rexes → dilos → venins`).
3. Entrée → `render/input.js` (touche dans `state.keys` ou appel d'action `src/`) ; mettre à jour la **légende des touches** dans l'overlay d'`index.html`.
4. Effet audio/visuel → `bus.emit` + abonnement `render/main.js` ; jauge éventuelle → `render/draw.js` (modèle `drawStamina` + couleur pure dans `render/gfx.js`).
5. Tests macro → `test/player.test.js` (`arena` + `step`, comparaison avec/sans la capacité).
