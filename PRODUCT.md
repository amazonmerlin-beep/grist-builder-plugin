# Product

<!-- impeccable:product-schema 1 -->

Contexte de travail d'impeccable dans ce dépôt. Il ne fait pas partie du plugin livré
(`plugins/grist-builder/`) : il sert à améliorer l'interface du kit, en particulier le module
`plugins/grist-builder/skills/grist-builder/kit/module/src/`.

## Platform

web

## Users

- **Répondants** : agents d'une entité cliente (collectivité, service, association), rattachés à une entité.
  Ils remplissent une réponse ou un dossier, souvent une fois, sans formation, puis la transmettent.
- **Pilotes** : l'équipe du client qui suit les réponses de toutes les entités, relance, consulte et exporte.
- **Administrateurs** : gèrent les comptes (annuaire) et les paramètres.
- Indirectement, les **consultants** qui livrent l'outil : non développeurs, ils montrent les écrans au
  client en atelier et rédigent les guides à partir des captures.

## Product Purpose

Le kit est le gabarit de l'interface de chaque projet grist-builder : un widget personnalisé Grist qui
porte toute l'application dans une page (onglets par rôle, écrans métier, aide). Chaque projet copie le
kit et y écrit ses écrans métier en suivant le motif de `vue-exemple.js`. La réussite : un répondant
remplit et transmet sans aide, un pilote voit d'un coup d'œil où en sont les réponses, et les écrans
écrits projet par projet restent cohérents avec le socle.

## Operating Context

- L'interface vit dans un cadre (iframe) à l'intérieur de la page Grist, à côté de l'interface native de
  Grist ; sa largeur suit celle du widget.
- Instances publiques (getgrist.com, instances d'État) ou Grist local pour les tests ; réseaux de
  collectivités qui filtrent parfois les CDN.
- Grilles de notation et tableaux de suivi pouvant compter plusieurs milliers de lignes.
- Captures d'écran en série (Playwright) réutilisées dans les guides et les ateliers.

## Capabilities and Constraints

- HTML, CSS et JavaScript sans framework, assemblés par `module/build.js` et stockés dans le document
  (`_html`, `_js`). Espace de noms `Formulaire` ; la racine du module porte la classe `.formulaire`.
- Le widget lit et écrit avec les droits de la personne connectée ; une table fermée par les règles
  d'accès doit être traitée comme vide, et une cellule masquée vaut `['C']`.
- Après une écriture, ne pas redessiner une saisie déjà affichée ; garder la position et les `<details>`
  ouverts lors d'un redessin.
- Bibliothèques externes : version figée avec empreinte SRI ; fonctionnement dégradé si le CDN est filtré.
- Tout texte venant du document est échappé avant insertion.

## Brand Commitments

- **Sobre et classique** (choix confirmé) : polices système, gris, une couleur d'action, aucun ornement.
  C'est un outil métier ; l'interface doit s'effacer devant la tâche. Pas d'effets, pas d'animations
  décoratives, pas d'écrans d'accueil spectaculaires.
- Identité visuelle par défaut : sans logo et sans charte d'État. Un client de l'État peut imposer le
  DSFR (Marianne) : c'est alors une contrainte qui prime.
- Interface et textes en français, vouvoiement.

## Evidence on Hand

- Écrans d'exemple seulement (`vue-exemple.js` : une réponse à deux questions et un tableau de suivi) ;
  aucun écran métier réel n'est dans le kit. Ne pas inventer de données présentées comme réelles.
- Référence d'origine : l'enquête LAPI (Départements de France), hors dépôt.

## Product Principles

1. L'outil disparaît dans la tâche : familiarité, densité utile, aucune surprise.
2. Le même composant a la même apparence sur tous les écrans de tous les projets.
3. Chaque état est prévu : chargement, vide, erreur, refus d'accès, lecture seule, transmis.
4. Une saisie n'est jamais perdue ni rattachée à la mauvaise fiche.
5. Le socle doit être facile à reprendre par Claude dans un nouveau projet.

## Accessibility & Inclusion

RGAA 4.1 (WCAG 2.1 A et AA). Contrôle automatique par `kit/tests-e2e/rgaa.js` (axe-core), complété par
une vérification au lecteur d'écran et au zoom à 200 %. Fenêtres modales accessibles, messages en
`role="status"`, focus sur le titre à chaque changement d'écran.
