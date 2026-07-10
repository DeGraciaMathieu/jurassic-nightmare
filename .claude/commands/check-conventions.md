---
description: Vérification allégée du diff — conventions CLAUDE.md, cohérence tests/doc, run des tests
---

# Vérification des conventions

1. Lis `CLAUDE.md` (racine).

2. Récupère le périmètre : `git diff`, `git diff --cached`, `git status`, `git log --oneline -5`. **S'il n'y a aucun changement**, réponds « Rien à examiner » et arrête-toi là.

3. Vérifie point par point, en citant `fichier:ligne` :
   - Règle d'or : logique dans `src/`, affichage dans `render/` ; aucun import de `render/` dans `src/`.
   - Pas de DOM/`window`/`performance`/WebAudio dans `src/` ; pas de `Math.random()` dans `src/` (uniquement `state.rng`).
   - Pas d'état global de module ; effets audio/visuels via `state.bus.emit` ; constantes dans `src/config.js`.
   - Nouveaux champs d'état : défaut dans `createApp` + reset dans `loadLevel`.
   - Langues : code/commentaires en anglais, doc/tests en français.
   - **Cohérence tests/doc** : un changement de comportement de `src/` a son test macro ; l'overlay d'`index.html` (règles, légende des touches), CLAUDE.md et les tables des skills restent exacts.

4. Lance `npm test` et rapporte le résultat exact.

5. Rapport : un statut par item — **OK** / **VIOLATION** (citation + correction) / **N/A** — et un verdict global (**CONFORME** / **À CORRIGER**).
