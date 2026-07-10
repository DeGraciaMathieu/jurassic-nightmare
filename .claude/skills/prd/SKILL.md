---
name: prd
description: Use when il faut spécifier une fonctionnalité (PRD) avant de l'implémenter — exploration technique puis décisions produit, sans écrire de code.
user_invocable: true
---

# Rédaction de PRD

Sujet : $ARGUMENTS

**N'implémente rien** : le livrable est un document de spécification.

## 1. Existant technique (exploration — aucune question ici)

Lis les modules `src/`/`render/` concernés (skill **architecture** pour t'orienter) et établis toi-même :
- les mécaniques en place qui touchent le sujet, avec fichiers et fonctions ;
- les constantes actuelles pertinentes (`src/config.js`, `LEVELS`) ;
- les événements du bus disponibles ou à créer ;
- les tests qui couvrent déjà la zone (`test/*.test.js`).

Ne demande jamais à l'utilisateur ce que cette exploration peut établir.

## 2. Décisions produit (questions cliquables)

Pose **uniquement** les décisions que le code ne tranche pas, via AskUserQuestion — 2 à 4 options concrètes, chiffrées quand c'est pertinent (s'appuyer sur les ordres de grandeur existants : vitesses 78–210 px/s, portées 52–320 px, durées 0.5–5 s) : comportement voulu, valeurs, interactions avec les mécaniques existantes, priorités si le périmètre doit être coupé.

## 3. Rédiger le PRD

Écris `docs/prd/<slug>.md` au format **fixe** :

- **Objectif** — une phrase.
- **Existant technique** — l'état des lieux de l'étape 1 (fichiers, fonctions, constantes, événements).
- **Comportement** — règles précises et chiffrées, cas nominaux et cas limites (interaction avec `'scare'`, chargement de niveau, épuisement, leurres…).
- **Hors-scope** — ce que la feature ne fait explicitement pas.
- **Impacts par couche** — `src/` (modules, champs de `state`, événements bus), `render/` (dessin, SFX, HUD, entrées), `src/config.js`, doc vivante (overlay d'`index.html`, CLAUDE.md, skills).
- **Critères d'acceptation** — liste vérifiable, un critère par ligne.
- **Tests** — les tests macro à écrire : fichier cible + comportement asserté.
- **Risques & questions ouvertes** — ce qui reste à trancher.

## 4. Conclure

Pointe le fichier créé et propose `/feature <sujet>` pour l'implémentation.
