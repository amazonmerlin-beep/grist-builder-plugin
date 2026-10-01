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
Le kit le fait d'après `schema/formulaire.js` (modèle : `schema/formulaire.exemple.js`) :
`{ TABLE, TITRE, SECTIONS }`, la première liste de `SECTIONS` étant l'en-tête, chacune des suivantes une partie ;
un élément vaut `{ texte }` (Markdown) ou `{ col, requis?, question?, lignes? }`.

1. **Créer la section** : `['CreateViewSection', <tableRef>, 0, 'form', null, null]` → `{ viewRef, sectionRef }`.
   Supprimer les champs créés d'office, puis ajouter les siens :
   `BulkAddRecord _grist_Views_section_field` avec `parentId`, `colRef`, `parentPos` et `widgetOptions: ''`.
   **Les réglages des questions vont sur la colonne** (`widgetOptions` de `_grist_Tables_column`, avec ses
   `choices`), pas sur le champ :
   - `question` : libellé (sinon celui de la colonne) ;
   - `formRequired` ;
   - `formTextFormat: 'multiline'` et `formTextLineCount` ;
   - `formSelectFormat: 'radio'`.

   La description d'une colonne sert d'aide sous la question.
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

**Piège : « Aucun choix configuré » dans l'éditeur du formulaire.** Un champ de formulaire qui porte ses
propres réglages (`formRequired`, `question`…, même `{}`) cesse de lire ceux de sa colonne, liste de choix
comprise. Le formulaire publié s'affiche bien, mais l'éditeur de Grist montre « Aucun choix configuré » sur
chaque question à choix, et le client croit le formulaire cassé. D'où la règle ci-dessus, qui est aussi ce que
fait Grist quand on règle une question à la main ; un choix ajouté plus tard à la colonne apparaît alors dans
le formulaire. Le kit l'applique (`outils/lib/formulaire.js`) ; `node outils/corriger-formulaire.js` corrige
un document déjà construit, repris ou livré, sans le reconstruire.

**Mention de confidentialité** : le formulaire public collecte des données personnelles. Mettre en fin de
formulaire une mention courte (finalité, contact pour les droits) et l'adresse de la notice complète, lisible
sans compte (site du client) : le guide « confidentialite » du document n'est pas accessible aux déposants
anonymes (`livraison.md`).

**Ne demander que ce qui sert.** Chaque question a un **usage** (évaluation au regard du référentiel du
client, instruction : identification, conflit d'intérêts, contact ; publication) et une **source** traçable
(formulaire déjà validé par le client, référentiel, demande écrite). Les champs « réflexes du métier »
(numéro de déclaration d'activité, tarif, téléphone, fonction, sessions, site web) sans usage dans l'outil
n'ont rien à y faire : ils allongent le dépôt et collectent des données pour rien. Méthode : partir du
formulaire que le client a validé, puis lui poser des **questions fermées**, bloc par bloc (garder / retirer /
réduire à un champ, avec la raison de chaque option), et noter la décision et sa date en tête de
`schema/formulaire.js`. Retirer une question : `node outils/corriger-formulaire.js` l'enlève du formulaire
publié d'un document déjà construit ou livré ; la colonne et ses données restent. Adapter l'affichage du
module : une déclaration vide ne doit pas s'afficher en liste de « — ».

**Collecter en une fois** : si les informations servent plus tard (publication sur un site, fiche), les
demander dès le formulaire de dépôt, dans une partie dédiée, plutôt que dans un second formulaire. Un second
formulaire qui doit retrouver le dossier obligerait à exposer la liste des dossiers.

## Données de démonstration et d'essai

- **Démonstration** (Grist local, atelier) : un script à part (voir LAPI `outils/jeu-demo.js`) ; données
  fictives, vraisemblables (auteurs, dates étalées), jamais touchées par les tests (qui ne remettent à zéro que
  leurs entités).
- **Essai sur une instance réelle** (getgrist.com, instance du client), avec de vrais comptes :
  `node outils/jeu-essai.js [--admin <adresse>] [--repondant <adresse>]`. Entités et lignes « ESSAI »
  inventées, PDF générés marqués « document fictif » (`outils/lib/pdf.js`, sans dépendance) si la table a une
  colonne de pièces jointes ; moins de dix appels ; rejouable, `--retirer` pour tout enlever. À adapter au
  modèle du projet (table, clé, valeurs). Jamais de données réelles dans un document d'essai.
