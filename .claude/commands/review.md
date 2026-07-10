---
description: Revue complète du diff courant — conventions, tests, maintenabilité, cohérence système
---

# Revue du diff courant

1. Lis `CLAUDE.md` (racine).

2. Récupère le périmètre : `git diff`, `git diff --cached`, `git status`, `git log --oneline -5`. **S'il n'y a aucun changement** (diffs vides, working tree propre), réponds « Rien à examiner » et arrête-toi là.

3. Vérifie point par point, en citant `fichier:ligne` pour chaque constat :

   **Conventions (CLAUDE.md)**
   - Règle d'or respectée : logique dans `src/`, affichage dans `render/` ; aucun import de `render/` dans `src/` ; pas de DOM/`window`/`performance`/WebAudio dans `src/`.
   - Aucun `Math.random()` dans `src/` (uniquement `state.rng`) ; pas d'état global de module ; effets audio/visuels via `state.bus.emit` uniquement.
   - Constantes dans `src/config.js`, pas de valeur magique dupliquée ; nouveaux champs d'état dans `createApp` + reset dans `loadLevel`.
   - Langues : code/commentaires en anglais, doc/tests en français.

   **Couverture de tests**
   - Tout changement de comportement de `src/` a un test macro correspondant.
   - Les tests assertent du comportement observable (état final, événements émis), pas des détails d'implémentation.
   - Pas de fichier helper partagé ajouté sous `test/`.

   **Maintenabilité**
   - Couplage entre modules, responsabilité unique, duplication, complexité/longueur de fonction, nommage, magic values.

   **Cohérence système**
   - Intégration avec l'existant : réutilise `grid`/`physics`/le bus plutôt que réinventer.
   - Forme de l'état et des données conforme (`state`, clés `"c,r"`, positions px vs cases).
   - Patterns respectés : ordre des updates (`player → doors → lures → pickup → rexes`), priorités de but de l'IA, ordre des couches de dessin.
   - Doc vivante synchrone : overlay d'`index.html` (règles, touches), CLAUDE.md, tables des skills.

4. Lance `npm test` et rapporte le résultat exact.

5. Rapport structuré : un statut par item — **OK** / **VIOLATION** (citation + correction proposée) / **N/A** — puis un verdict global (**APPROUVÉ** / **À CORRIGER**) avec la liste priorisée des corrections.
