# Tests, documentation, livraison

## Tests (phase 5)

- `npm test` : fonctions pures du module. `npm run test:acces` : droits rôle par rôle.
  `npm run test:parcours` : parcours dans Chrome (inconnu, chaque rôle, action principale de chacun).
- Rejouables : remise à zéro des seules entités de test, attentes calculées, jamais de données de
  démonstration effacées.
- Captures en série de tous les écrans (Playwright) : elles servent aux guides et à l'atelier, et révèlent
  les défauts d'affichage (textes coupés, fenêtres qui débordent, libellés incohérents). **Les regarder**,
  écran par écran, avant de montrer quoi que ce soit : colonnes qui ne vont pas jusqu'en bas, styles écrasés,
  couleurs trop fortes, boutons de tailles différentes.
- **Chrome par défaut** : aucune option qui lève la protection « réseau local » (`widget.md`). Un test qui
  passe avec ces options échoue chez l'utilisateur.
- **Où tester** : sur le Grist local, sur un **document d'essais** dès que quelqu'un consulte le document de
  travail (`DOC_COURANT=grist-local/doc-essais.json`). Les tests refusent une instance distante. Chaque
  reconstruction ou écriture recharge la page de la personne qui regarde.
- **Mesurer la fluidité** : compter les relectures (`fetchTable`) et les redessins, au repos et après un clic.
  Au repos : zéro. Après une saisie : la ou les tables concernées, sans redessin.
- **Accessibilité sommaire** : `node tests-e2e/rgaa.js` (axe-core sur les onglets de chaque rôle). Viser zéro
  violation. Consigner les points qu'un outil automatique ne voit pas (lecteur d'écran, zoom à 200 %).

## Documentation dans le document (phase 6)

- Guides en Markdown (`guides/*.md`, en-tête `titre`, `public`, `ordre`, `resume`), chargés dans la table
  **Guides** (`npm run guides`), affichés dans l'onglet **Aide** ; chaque rôle ne lit que les guides de son
  public (règle d'accès). Les captures sont des pièces jointes du guide.
- Guides types : obtenir un accès (inconnu) ; l'essentiel en une page (par public) ; guide du répondant ;
  guide du pilotage ; administration (comptes, paramètres, droits) ; guide technique.
- Support d'atelier : parcours du répondant (temps de réponse par profil, durée totale, frictions, FAQ),
  puis les arbitrages avec la valeur appliquée et les options, et un relevé de décisions à remplir.

## Livraison (phase 7)

1. `npm run livrer` : construit un document **sans démonstration**, y déploie le module, télécharge le
   `.grist`, le **réimporte** pour vérification (tables, guides, règles, module), puis nettoie.
2. Chez le client : importer le `.grist` ; renseigner les paramètres (contact, lien du document, dates, adresse
   du formulaire public, qui change à l'import) ; ajouter les administrateurs dans l'annuaire (un propriétaire
   absent de l'annuaire voit l'écran « compte non reconnu ») ; importer les comptes ; régler le partage (lien
   ou invitations, tout le monde « Éditeur ») ; partage nominatif pour que chacun trouve le document dans sa
   liste (`npm run partager`) ; propriétaires. Le `.grist` livré utilise le chargeur public.
3. Essai avec un compte de test par rôle, puis pilote avec deux ou trois entités avant l'ouverture.
4. Passation : où est quoi, comment reconstruire, les décisions prises, les points ouverts.

## Sécurité à rappeler

Aucune clé d'API dans le fonctionnement livré ; aucun paquet npm dans le `.grist` ; bibliothèques externes
sous empreinte SRI ; le chargeur public du widget est une dépendance tierce. Il suffit sur une instance
publique ; sa copie (`grist-local/chargeur/`) peut être hébergée sur l'instance si l'hébergeur ou le client
refuse cette dépendance.
