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
- **Deux déclencheurs en chaîne** : une colonne à déclencheur qui dépend d'une autre colonne à déclencheur
  (organisme cherché d'après le SIRET, lui-même normalisé) est recalculée à la création et **écrase la valeur
  posée**. Garder une donnée simple, et une colonne calculée « suggestion » à côté.
- Colonne calculée de type `RefList` : renvoyer une liste d'identifiants (`sorted(ids)`) ; `$Ref.RefList.id` donne
  la liste des identifiants.

## Formulaire natif publié (par script)

Un formulaire Grist est une section `form` sur la table cible. Il se publie sans l'interface, en trois étapes.

1. **Créer la section** : `['CreateViewSection', <tableRef>, 0, 'form', null, null]` → `{ viewRef, sectionRef }`.
   Supprimer les champs créés d'office, puis ajouter les siens :
   - `BulkAddRecord _grist_Views_section_field` avec `parentId`, `colRef`, `parentPos` et `widgetOptions` ;
   - options d'un champ :
     - `question` : libellé (sinon celui de la colonne) ;
     - `formRequired` ;
     - `formTextFormat: 'multiline'` et `formTextLineCount` ;
     - `formSelectFormat: 'radio'` ;
   - la description d'une colonne sert d'aide sous la question.
2. **Mise en page** (`layoutSpec`, en JSON) :
   `{type:'Layout', children:[{type:'Paragraph', text:'# Titre'}, {type:'Section', children:[{type:'Field', leaf:<id du champ>}, …]}, {type:'Submit'}]}`.
   Les paragraphes sont en Markdown.
3. **Publier** :
   - `AddRecord _grist_Shares {linkId: <uuid>, options: '{"publish":true}'}` ;
   - sur la page, `_grist_Pages.shareRef = <id>` ;
   - sur la section, `shareOptions = '{"publish":true,"form":true}'`.

L'adresse publique est `/forms/<clé>/<sectionRef>`. La clé n'est connue que de la base de l'instance : en
local, elle se lit dans `home.sqlite3`, table `shares` ; sur une instance distante, dans « Partager » du
formulaire. La noter dans `Parametres`. Elle change à chaque import.

**Règle d'accès** : `user.ShareRef` → `+C-RUD` sur la table cible (`permissions.md`).
**En local**, `GRIST_FORCE_LOGIN` impose une connexion même pour ouvrir le formulaire ; sur l'instance, il est
public. Le formulaire n'a pas de questions conditionnelles : parcours linéaire, explications dans le texte.

**Collecter en une fois** : si les informations servent plus tard (publication sur un site, fiche), les
demander dès le formulaire de dépôt, dans une partie dédiée, plutôt que dans un second formulaire. Un second
formulaire qui doit retrouver le dossier obligerait à exposer la liste des dossiers.

## Données de démonstration

Un script à part (voir LAPI `outils/jeu-demo.js`) : fictives, vraisemblables (auteurs, dates étalées),
jamais touchées par les tests (qui ne remettent à zéro que leurs entités).
