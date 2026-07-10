---
name: feature
description: Use when l'utilisateur demande d'implémenter une fonctionnalité ou une modification de gameplay de bout en bout.
user_invocable: true
---

# Workflow feature

Implémente la demande : $ARGUMENTS

## 1. Comprendre

- Reformule la demande en une phrase et découpe-la par couche : ce qui se passe (`src/`) vs comment ça s'affiche (`render/`).
- Invoque le skill **architecture** pour localiser les modules touchés (et **predator-ai** / **player-mechanics** / **level-generation** / **rendering** selon le domaine).
- Pose les questions de clarification **avant** de coder (AskUserQuestion pour les choix fermés) :
  - valeurs numériques exactes (vitesses, durées, portées, effectifs — comparer aux constantes existantes de `src/config.js`) ;
  - interactions avec l'existant : leurres, portes, herbe, sprint, machine à états ;
  - cas limites : que se passe-t-il pendant `'scare'` ? au chargement d'un niveau ? à effectif 0 ? en épuisement ?

## 2. Implémenter

- Respecte CLAUDE.md : règle d'or des couches, bus pour tout effet audio/visuel, `state.rng` pour l'aléa, constantes dans `src/config.js`, nouveaux champs dans `createApp` + reset dans `loadLevel`.
- Implémente **uniquement** ce qui est demandé — pas de métrique, visualisation ou option non demandée.

## 3. Tester

- Tests **macro** sur le comportement observable (skill **testing** : `arena`/`step`, seed fixe, compter les événements du bus).
- `npm test` jusqu'au vert complet — l'existant ne doit jamais régresser.
- Si une approche échoue après 2 tentatives, reprends le plan avant de continuer.

## 4. Synchroniser la doc

- Règles du jeu ou touches modifiées → texte de l'overlay et légende dans `index.html`.
- Architecture, conventions ou périmètre d'un skill modifiés → CLAUDE.md + le SKILL.md concerné (tables concepts → implémentation).

## 5. Résumer

Fichiers modifiés, tests ajoutés (et le comportement que chacun vérifie), résultat de `npm test`, points de vigilance restants.
