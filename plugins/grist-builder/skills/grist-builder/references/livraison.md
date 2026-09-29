# Tests, documentation, livraison

## Tests (phase 5)

- `npm test` : fonctions pures du module. `npm run test:acces` : droits rôle par rôle.
  `npm run test:parcours` : parcours dans Chrome (inconnu, chaque rôle, action principale de chacun).
- Rejouables : remise à zéro des seules entités de test, attentes calculées, jamais de données de
  démonstration effacées.
- Captures en série de tous les écrans (Playwright) : elles servent aux guides et à l'atelier, et révèlent
  les défauts d'affichage (textes coupés, fenêtres qui débordent, libellés incohérents).

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
2. Chez le client : importer le `.grist` ; renseigner les paramètres (contact, lien du document, dates) ;
   importer les comptes ; régler le partage (lien ou invitations, tout le monde « Éditeur ») ; propriétaires.
3. Essai avec un compte de test par rôle, puis pilote avec deux ou trois entités avant l'ouverture.
4. Passation : où est quoi, comment reconstruire, les décisions prises, les points ouverts.

## Sécurité à rappeler

Aucune clé d'API dans le fonctionnement livré ; aucun paquet npm dans le `.grist` ; bibliothèques externes
sous empreinte SRI ; le chargeur public du widget est une dépendance tierce (à héberger sur l'instance si
l'hébergeur le propose).
