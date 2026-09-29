# Données : modèle, formules, déclencheurs, API

## Le modèle dans le kit

`schema/modele.js` décrit chaque table : `{ id, colonnes: [{ id, type, label, formule?, declencheur?, options?, description? }] }`.
- Colonne **calculée** : `formule` sans `declencheur` (recalculée en permanence).
- Colonne **à déclencheur** : `formule` + `declencheur` : `'ajout'` (à la création), `'modif'` (à chaque
  modification de la ligne) ou une liste de colonnes. Sert à tracer (`user.Email`, `NOW()`) et à normaliser.
- Types : `Text`, `Int`, `Numeric`, `Bool`, `Date`, `DateTime:Europe/Paris`, `Choice`, `ChoiceList`,
  `Ref:Table`, `RefList:Table`, `Attachments`.
- Garder le socle (Parametres, Entites, Annuaire, Connexions, Guides) ; remplacer Reponses par le modèle du projet.

Construction (`outils/construire.js`, quelques secondes) : passe 1 tables et colonnes de données, données
de base, guides ; passe 2 formules ; passe 3 déclencheurs, descriptions, libellés découplés ; page du
widget ; règles ; partage. Le document est **jetable** : on le reconstruit plutôt que de le réparer.

## Pièges de l'API (vérifiés)

- `AddTable` ignore `description` et `untieColIdFromLabel` : les poser ensuite par `ModifyColumn`.
- `recalcDeps` se passe en **liste simple** d'identifiants de colonnes à `ModifyColumn` (`['L', …]` provoque une erreur).
- L'API REST renvoie les listes encodées `['L', …]` : décoder avant de comparer.
- `PATCH …/records` exige **les mêmes champs** sur toutes les lignes : grouper par jeu de colonnes.
- Une valeur posée explicitement **l'emporte sur un déclencheur** (utile pour des données de démonstration vraisemblables).
- Une ligne ajoutée sans valeur dans une colonne entière reçoit **0** : poser `null` explicitement.
- Adresse fixe : `PATCH /api/docs/<id>` avec `{ urlId }` ; le document s'ouvre à `/o/<org>/doc/<urlId>` (sans `/doc/` : 404).
- Colonne qui lit les formules d'une autre table encore absente : l'ajouter après (option `tard` du kit).
- Un déclencheur peut lire sa propre valeur (`value`) : normalisation à la saisie.

## Données de démonstration

Un script à part (voir LAPI `outils/jeu-demo.js`) : fictives, vraisemblables (auteurs, dates étalées),
jamais touchées par les tests (qui ne remettent à zéro que leurs entités).
