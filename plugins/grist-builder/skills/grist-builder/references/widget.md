# Widget personnalisé : toute l'interface dans une page

## Architecture (celle du kit)

- **Une page, un widget.** Le code (HTML, CSS, JS) est **stocké dans le document**, dans les options du
  widget (`_html`, `_js`), et lancé par le *Custom widget builder* public de Grist Labs
  (`https://gristlabs.github.io/grist-widget/custom-widget-builder/index.html`). Rien à héberger : le code
  voyage dans le `.grist`. Le kit l'assemble (`module/build.js`) et le pousse (`outils/deployer-module.js`).
- **Accès complet** : `grist.ready({ requiredAccess: 'full' })`. Le widget lit et écrit avec les droits de
  la personne connectée ; ce sont les règles d'accès qui protègent, pas le JavaScript.
- **Rattacher le widget à une table lisible par tous** (Parametres dans le kit) : Grist n'affiche pas un
  widget dont la table est fermée à l'utilisateur, et un compte non reconnu verrait une page vide.

## Identité : le widget ne connaît pas l'utilisateur

L'API du widget ne donne ni adresse ni rôle. Procédé du kit :
1. à l'ouverture, le module ajoute une ligne à **Connexions** ;
2. le **déclencheur** `user.Email` (formule appliquée à la création) y inscrit l'adresse réelle ;
3. des formules y lisent le rôle et l'entité dans l'**annuaire** ;
4. la règle `rec.Email == user.Email` interdit d'écrire l'adresse d'un autre : pas d'usurpation.
Ne pas mémoriser l'identité dans le navigateur : en changeant de compte dans le même onglet, elle resterait
l'ancienne. Un compte en lecture seule ne peut pas écrire sa connexion : tout le monde doit être « Éditeur ».

## Lire, écrire, rafraîchir

- `grist.docApi.fetchTable(t)` renvoie des **colonnes** ; les listes arrivent encodées `['L', …]`, les
  erreurs `['E', …]` : décoder (`core.js`). Une table fermée par les règles lève une erreur : la traiter
  comme vide.
- Écrire par `grist.docApi.applyUserActions([...])`, puis **relire** : les formules ont changé.
- `grist.onRecords` ne signale que la table du widget : relire aussi périodiquement (60 à 90 s) pour voir
  les écritures des autres.
- Ne pas redessiner pendant une saisie ou une fenêtre ouverte (le curseur saute).

## Pièces jointes

- Déposer et lire avec le **jeton d'accès** du widget (`grist.docApi.getAccessToken`), vers
  `/attachments?auth=…` ; l'en-tête **`X-Requested-With: XMLHttpRequest`** est exigé (sinon 401, affiché
  « Failed to fetch »).
- Lire les métadonnées une par une (`/attachments/<id>`) : la liste globale est fermée par les règles.
- Les liens de téléchargement expirent en quelques minutes.

## Sécurité et qualité

- **Échapper tout texte** venant du document avant de l'insérer en HTML (réponses, guides).
- Bibliothèques externes : version figée **et empreinte SRI** (`integrity`) ; sinon le code chargé agit avec
  les droits de chaque utilisateur. Éviter les versions npm abandonnées (SheetJS : prendre `cdn.sheetjs.com`).
- Classes CSS préfixées ou vérifiées : une classe réutilisée (`.aide` pour deux usages) casse la mise en page.
- Tester dans un vrai navigateur (Playwright et Chrome installé : `tests-e2e/`), rôle par rôle.
- Les réseaux de collectivités filtrent parfois les CDN et les fonds de carte : prévoir un fonctionnement
  dégradé (le module marche sans carte).
