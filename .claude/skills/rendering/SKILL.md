---
name: rendering
description: Use when il faut modifier l'affichage canvas, l'obscurité et les lumières, les sons, le HUD, les overlays ou les entrées utilisateur.
auto_invoke: true
---

# Rendu, audio & interactions

`render/` lit l'état chaque frame et réagit aux événements du bus. **Aucune logique métier ici** — si un changement décide « ce qui se passe », il va dans `src/`.

## Pipeline d'une frame (`render/main.js`)

1. décroissance `fx.shake` (`dt × 40`)
2. `update(state, dt)` — logique `src/`
3. `render()` (`draw.js`) : reset transform → translate shake → si `'scare'` : jumpscare seul → sinon `drawWorld` ; obscurité + vignette danger si `play/dead/levelclear/win` ; nom du secteur + jauge d'endurance si `play`
4. `hud.update(state)` — DOM rafraîchi chaque frame depuis l'état (pas d'événement HUD)

## Ordre des couches de `drawWorld`

sol → grime → décor → herbes → murs → portes → sortie (verrou tant que `cardsLeft(state) > 0`) → cartes → flares → venin → sang (`fx.splats`) → rexes → dilos → raptors → joueur → marqueur « CACHÉ »

Décor des couloirs (`buildDecor`/`drawDecor` dans `draw.js`) : types et positions viennent de `state.decor` (placé par `loadLevel` ; les caisses et squelettes craquent sous les pas — gameplay dans `src/player.js`). Seul le jitter visuel (offset, rotation, échelle) est généré côté rendu avec un `mulberry32` seedé par un hash de la grille (jamais le rng du jeu), reconstruit quand `state.grid` change de référence. Palette sourde pour ne pas concurrencer les éléments de gameplay.

Après l'obscurité : `drawPoison()` (vignette verte pulsée tant que `state.poisonT > 0`) puis `drawHeartbeat()`. Les yeux qui luisent dans le noir couvrent rexes (rouges), dilos (verts) et raptors (ambrés). Chaque rôle de raptor a sa robe (`RAPTOR_COLORS` dans `draw.js`, synchronisée avec l'overlay) : rabatteur roux, flanqueur gris-bleu, feinteur ocre.

## Obscurité (`drawDarkness`)

Calque offscreen `darkCanvas` : gradient radial centré joueur (biais de 22 px vers le facing), flicker via `gfx.nextFlicker`/`torchRadius` ; les flares **percent des trous** en `destination-out` (`gfx.flareLightRadius`) ; yeux rouges des rexes en bordure de lumière (`gfx.eyeGlowAlpha`) ; teinte chaude au-dessus de chaque flare au sol.

## Câblage du bus (`render/main.js`)

| Événement | Effets rendu |
|---|---|
| `lure:thrown` | `SFX.lureThrow()` |
| `card:picked` | `SFX.pickup()` |
| `decor:crunch` | `SFX.crunch()` (caisse/squelette qui cède sous les pas) |
| `door:hit` | `SFX.doorHit()` |
| `door:broken` | `SFX.doorBreak()` (fracas + résonance métallique) |
| `heartbeat` (intensité) | `SFX.heartbeat(intensité)` + `fx.pulse` (halo rouge de page `#dangerGlow`, décroissance `dt × 0.8` dans la boucle) |
| `rex:roar` | `fx.shake ≥ 14` + `SFX.roar(false)` |
| `dilo:hiss` | `SFX.hiss()` |
| `raptor:bark` | `SFX.bark()` (cri de meute à l'engagement) |
| `dilo:spit` | `SFX.spit()` (la collerette du sprite s'ouvre via `dilo.spitT`) |
| `player:poisoned` | `SFX.poisoned()` (la vignette verte et la torche réduite lisent `state.poisonT`/`visionR`) |
| `player:died` `{x,y}` | `fx.shake = 26` + 10 éclaboussures + `SFX.raptorScream()` + `stopAmbient()` |
| `life:lost` `{lives}` | overlay vie perdue (`html.lifeLostOverlay`) — le bouton relance le secteur via `retryLevel` (`render/input.js`) |
| `game:over` `{level,score}` | overlay défaite (`html.deathOverlay`) |
| `level:cleared` `{level,time,bonus,score}` | `stopAmbient()` + `chime(false)` + overlay |
| `game:won` `{score}` | `stopAmbient()` + `chime(true)` + overlay |

## Effets côté rendu (objet `fx` de `main.js`)

`shake` (secousse écran), `splats` (sang) et `pulse` (halo rouge de page suivant le rythme cardiaque) sont **purement visuels : jamais dans `state`**. Ici, `Math.random()` est permis (contrairement à `src/`). Remis à zéro au clic de (re)lancement (`render/input.js`).

## Audio (`render/audio.js`)

SFX 100 % synthétisés WebAudio, aucun fichier. `SFX.init()` exige un geste utilisateur (autoplay policy) — déjà appelé au clic du bouton principal et du bouton flare. Ambiance : `startAmbient`/`stopAmbient`. Catalogue : `heartbeat`, `roar`, `raptorScream`, `hiss`, `bark`, `spit`, `poisoned`, `footstep`, `crunch`, `lureThrow`, `doorHit`, `pickup`, `chime`, `toggleMute`.

Les pas de sprint ne passent pas par le bus : la boucle de `main.js` cadence `SFX.footstep()` (toutes les 0.26 s) tant que `state.player.noisy` est vrai — le pendant sonore des anneaux de bruit.

## Ajouter un effet visuel/sonore déclenché par la logique

1. `src/` : `state.bus.emit('mon:event', payload)` — payload minimal en données brutes, jamais d'objet DOM ni de référence rendue.
2. `render/main.js` : `state.bus.on(...)` → SFX et/ou mutation de `fx`.
3. Son → `render/audio.js` (modèle des SFX existants) ; dessin persistant → `draw.js` en lisant `state`/`fx`.
4. Tout calcul pur (rayon, alpha, couleur) → `render/gfx.js`, importé par `draw.js`.
5. L'événement reste testable côté `src/` : compter les émissions dans les tests macro.

## Mode debug (`?debug` dans l'URL)

Panneau `#debug` d'`index.html` (masqué par défaut, révélé par `render/main.js` si `location.search` contient `debug`, `z-index` au-dessus de l'overlay) : un `<select>` saute vers n'importe quel secteur (`loadLevel` + `status='play'` + même rituel que le bouton de démarrage — reset `fx`, `hideOverlay`, ambiance) et une case coupe l'obscurité via `fx.dark`, lu par `render()` avant `drawDarkness()`. Aucun impact sur `src/` : pas de test macro requis.

## Overlays & HUD

Fragments → `render/html.js` (pur, retourne `{html, label}`) ; affichage → `render/hud.js` `showOverlay`/`hideOverlay`. Le texte statique du menu vit dans `index.html` : c'est la **doc vivante** des règles du jeu — la garder synchrone avec les mécaniques (règles + légende des touches).

Canvas décoratifs dessinés une fois au boot (`render/main.js`), dimensionnés au viewport :
- `#heroMaze` (`drawMenuMaze`, `render/draw.js`) : fond du menu (`z-index:-2` dans `#overlay`) — un labyrinthe issu du vrai `genMaze` (seed fixe 777), corridors en réseau lumineux, centre effacé en `destination-out` pour la lisibilité du texte. Masqué par `showOverlay` sur les écrans de fin comme le `h1` et les `.menu-only`.
- `#hero` (`drawMenuHero`) : la tête du jumpscare (`drawRexHead` partagé) en miroir, tapie à moitié hors cadre dans le coin bas-droit (`z-index:-1`, mask-gradient, échelle proportionnelle à `canvas.width`).
- `#bgMaze` : le même `drawMenuMaze` en fond de page (`position:fixed`, opacité 0.12) — texture « plan du complexe » visible autour du cadre pendant la partie ; le `body` porte un dégradé radial chaud au lieu du noir pur.

Habillage moniteur global (hors `#overlay`, enfants de `body`) : scanlines `.scan` et coins de visée `.vf` en `position:fixed` (`z-index:7`, `pointer-events:none`) — visibles au menu, en jeu et sur les écrans de fin.

Attention : le sélecteur global `canvas` de `styles.css` s'applique à tout nouveau canvas (fond noir, bordure, `width:100%`) — prévoir les overrides.
