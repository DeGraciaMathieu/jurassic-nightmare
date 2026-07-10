---
description: Analyse la couverture de tests du diff, propose les tests macro manquants, attend validation avant de les écrire
---

# Vérification de la couverture de tests

1. Lis `CLAUDE.md` (racine) et le skill **testing** (philosophie macro, mapping fichier → périmètre, pièges).

2. Récupère le périmètre : `git diff`, `git diff --cached`, `git status`, `git log --oneline -5`. **S'il n'y a aucun changement**, réponds « Rien à examiner » et arrête-toi là.

3. Analyse la couverture :
   - Pour chaque changement de comportement dans `src/`, identifie le test existant qui le couvre (fichier + nom du test) ou constate le trou.
   - Vérifie que les tests touchés restent des tests **macro** (comportement observable, pas détail d'implémentation).
   - Signale les cas limites non couverts : interactions avec `'scare'`, chargement de niveau, épuisement, leurres, portes.

4. Rapport : un statut par changement — **OK** (test cité) / **VIOLATION** (comportement non couvert) / **N/A** (changement pur rendu) — puis la **liste des tests manquants proposés** : pour chacun, fichier cible, nom du test, scénario (`arena` + chirurgie d'état) et assertion.

5. **Attends la validation explicite de l'utilisateur** avant d'écrire quoi que ce soit. Une fois validé : écris les tests retenus, puis relance `npm test` et rapporte le résultat complet.
