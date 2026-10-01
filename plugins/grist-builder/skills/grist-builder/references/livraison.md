# Tests, documentation, livraison

## Tests (phase 5)

- `npm test` : fonctions pures du module. `npm run test:acces` : droits rôle par rôle.
  `npm run test:parcours` : parcours dans Chrome (inconnu, chaque rôle, action principale de chacun).
- Rejouables : remise à zéro des seules entités de test, attentes calculées, jamais de données de
  démonstration effacées.
- Captures en série de tous les écrans (Playwright) : elles servent aux guides et à l'atelier, et révèlent
  les défauts d'affichage (textes coupés, fenêtres qui débordent, libellés incohérents). **Les regarder**,
  écran par écran, avant de montrer quoi que ce soit : colonnes qui ne vont pas jusqu'en bas, styles écrasés,
  couleurs trop fortes, boutons de tailles différentes. `npm run captures` (`tests-e2e/captures-guides.js`,
  lecture seule, Grist local) prend un écran par onglet de chaque rôle, plus les écrans déclarés dans `EN_PLUS`,
  ne capture que le contenu (sous l'en-tête : une image de guide ne se confond pas avec la vraie interface) et
  remplace à l'écran les noms et adresses réels par des noms fictifs. Après une nouvelle série : `npm run guides`,
  sinon le document garde les anciennes images (en local comme sur l'instance).
- **Chrome par défaut** : aucune option qui lève la protection « réseau local » (`widget.md`). Un test qui
  passe avec ces options échoue chez l'utilisateur.
- **Où tester** : sur le Grist local, sur un **document d'essais** dès que quelqu'un consulte le document de
  travail (`DOC_COURANT=grist-local/doc-essais.json`). Les tests refusent une instance distante. Chaque
  reconstruction ou écriture recharge la page de la personne qui regarde.
- **Mesurer la fluidité** : compter les relectures (`fetchTable`) et les redessins, au repos et après un clic.
  Au repos : zéro. Après une saisie : la ou les tables concernées, sans redessin.
- **Accessibilité sommaire** : `node tests-e2e/rgaa.js` (axe-core sur les onglets de chaque rôle) et
  `node tests-e2e/zoom.js` (zoom à 200 %, `widget.md`). Viser zéro violation et zéro débordement. Consigner les
  points qu'un outil automatique ne voit pas (lecteur d'écran, clavier seul).
- **Lire les résultats** : Node 24 n'écrit plus en TAP (`ok` / `not ok`) mais avec `✔` / `✖` et un bilan
  `ℹ tests`, `ℹ pass`, `ℹ fail` : filtrer sur ces lignes, pas sur `^ok`.
- **Bouton « retour »** : le tester avec `page.evaluate(() => history.back())` ; le `goBack()` de Playwright
  attend un chargement qui n'arrive pas (le module change d'écran sans charger de page).

## Revue design (avant une recette ou une livraison)

Une revue complète des écrans, menée par plusieurs agents, trouve en une session ce que des recettes successives
laissent passer (écran figé après un choix, focus perdu, boutons pleins en concurrence, textes de développeur,
champs illisibles au zoom). Méthode :
1. **Préparer d'abord les captures de tous les écrans sur un document de test** : jeu d'essai fictif couvrant
   chaque état (vide, en cours, terminé, erreur), `npm run captures -- --dossier tests-e2e/captures/revue
   --entier`, plus les écrans hors onglets (`EN_PLUS`), les fenêtres et une série à 640 px de large (zoom à
   200 %). Leçon : sans captures, les agents relisent le code et devinent l'écran ; un état non capturé (première
   connexion, liste vide, lecture seule) n'est pas revu du tout.
2. **Une zone par agent** (accueil et listes, fiches, parcours d'un rôle, socle : en-tête, champs, aide) : chacun
   lit ses captures et le code, et rend des constats `[gravité/effort] écran — constat — correctif proposé`
   (fichier, ligne, code), RGAA cité quand il s'applique.
3. **Un vérificateur adverse** relit chaque constat contre le code et contre **les décisions du client**
   (arbitrages notés, guides validés) : il confirme, corrige (le constat était faux sur un point, le correctif
   casserait autre chose), ou **écarte** ce qui contredit une décision (« pas de fil d'Ariane », « pas de
   règle métier inventée ») ou qui n'est que cosmétique. Les écartés sont gardés, avec leur raison.
4. **Synthèse** : une liste unique, triée par gravité, avec les dépendances entre correctifs (le champ fichier
   rendu focalisable exige d'abord le redessin après un choix) ; le consultant la valide avant tout correctif.
5. **Correctifs en parallèle sans conflit** : un fichier de retouche CSS par zone (`retouche-<zone>.css`, chargés
   en dernier, `widget.md`) ; le JavaScript partagé (`app.js`, `core.js`) par un seul agent. Puis tests,
   captures reprises et relues, guides rechargés.

## Essayer sur une instance réelle (getgrist.com, instance du client)

- `construire.js` **supprime d'abord tout document de même nom** dans l'espace. Sur une instance réelle :
  toujours un nom et une adresse distincts de la production (`--nom "… (essai)" --adresse <urlId>-essai`), un
  espace d'essai, et `DOC_COURANT=grist-local/doc-<instance>.json` pour que le Grist local reste branché sur
  son document.
- Données : `outils/jeu-essai.js` (fictives, rejouables, `--retirer` ; `donnees.md`).
- **Compter les appels** : `node -r ./outils/lib/compteur-appels.js outils/construire.js …` (et de même pour
  chaque outil) affiche le nombre d'appels et tient le journal `grist-local/appels.log`, avec le total du mois.
  Le plan gratuit de getgrist.com est limité à **3 000 appels par mois** ; une construction en coûte une
  cinquantaine, un jeu d'essai moins de dix.
- **Espace d'équipe de getgrist.com** :
  - un document y **hérite des droits de l'espace** : tous les membres de l'équipe l'ouvrent. Absents de
    l'annuaire, ils ne voient que l'écran d'accès ; le dire au client, ou retirer l'héritage (Gérer les
    utilisateurs) ;
  - **l'accueil de l'équipe est refusé aux invités** (« Accès refusé, vous n'avez pas accès aux documents de
    cette organisation ») : toujours donner le **lien direct du document**, dans le message d'invitation et
    dans le guide « obtenir un accès ».

## Documentation dans le document (phase 6)

**Notice de confidentialité : un livrable à ne pas oublier.** Dès qu'il y a des comptes ou un formulaire
public, il y a des données personnelles. Le kit en donne le gabarit (`guides/confidentialite.md` : responsable,
finalités, données, base légale, durées, droits, destinataires, sous-traitants ; valeurs « à fixer ») ; le
client (son délégué à la protection des données) la valide. Elle s'affiche dans la rubrique « Informations »
de l'onglet Aide (`guidesEnFin` : confidentialité, puis les CGU en dernier) et en lien sur l'écran d'accès
(`data-action="voir-guide"`). Le formulaire public porte une mention courte et l'adresse de la notice lisible
sans compte (`donnees.md`). Dans un guide, `{{contact_email}}` (toute clé de Parametres) est remplacé par sa
valeur, ou par « [contact_email à fixer] ».

- Guides en Markdown (`guides/*.md`, en-tête `titre`, `public`, `ordre`, `resume`), chargés dans la table
  **Guides** (`npm run guides`), affichés dans l'onglet **Aide** ; chaque rôle ne lit que les guides de son
  public (règle d'accès). Les captures sont des pièces jointes du guide.
- Guides types : obtenir un accès (inconnu) ; l'essentiel en une page (par public) ; guide du répondant ;
  guide du pilotage ; administration (comptes, paramètres, droits) ; guide technique. La façon de modifier les
  guides (table Guides, Markdown, captures en pièces jointes) va dans le guide technique, pas à l'écran de
  l'administration ; les guides des utilisateurs nomment les paramètres par leur libellé, jamais par leur clé.
- Support d'atelier : parcours du répondant (temps de réponse par profil, durée totale, frictions, FAQ),
  puis les arbitrages avec la valeur appliquée et les options, et un relevé de décisions à remplir.

## Livraison (phase 7)

1. `npm run livrer` : construit un document **sans démonstration**, y déploie le module, télécharge le
   `.grist`, le **réimporte** pour vérification (tables, guides, règles, module), puis nettoie.
2. Chez le client : importer le `.grist` ; renseigner les paramètres (contact, lien du document, dates, adresse
   du formulaire public, qui change à l'import) ; ajouter les administrateurs dans l'annuaire (un propriétaire
   absent de l'annuaire voit l'écran « compte non reconnu ») ; importer les comptes ; régler le partage (lien
   ou invitations, tout le monde « Éditeur ») ; avec le lien, pas de partage nominatif (chaque compte partagé
   lirait les adresses de tous les autres, `permissions.md`) : envoyer le lien direct ; propriétaires. Le `.grist` livré utilise le chargeur public. Messages
   d'invitation et guides donnent le lien direct du document, jamais l'accueil de l'espace.
3. Essai avec un compte de test par rôle, puis pilote avec deux ou trois entités avant l'ouverture.
4. Passation : où est quoi, comment reconstruire, les décisions prises, les points ouverts.

## Sécurité à rappeler

Aucune clé d'API dans le fonctionnement livré ; aucun paquet npm dans le `.grist` ; bibliothèques externes
sous empreinte SRI ; le chargeur public du widget est une dépendance tierce. Il suffit sur une instance
publique ; sa copie (`grist-local/chargeur/`) peut être hébergée sur l'instance si l'hébergeur ou le client
refuse cette dépendance.
