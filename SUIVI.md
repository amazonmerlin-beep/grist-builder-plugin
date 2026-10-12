# Suivi — grist-builder (plugin Claude Code)

> **Consigne permanente : Claude met à jour CE fichier à la fin de chaque session** (avancement, cases
> cochées, prochaines actions), et avant tout /clear ou compaction. Il tient lieu de plan de réalisation.
> Spécification : `docs/specs/2026-09-29-grist-builder-design.md`. Dépôt distant :
> https://github.com/amazonmerlin-beep/grist-builder-plugin (l'utilisateur autorise les push sans demander).

## Avancement global : **95 %**

| Étape | Avancement |
|---|---|
| 1. Dépôt, marketplace, plugin, README | 100 % |
| 2. Scénarios de référence sans skill (RED) | 100 % (`docs/tests/reference.md`) |
| 3. Kit : infrastructure (Grist local, client API, configuration) | 100 % |
| 4. Kit : modèle, règles d'accès, construction | 100 % (6 tests de droits verts) |
| 5. Kit : squelette du module, déploiement, tests de parcours | 100 % (3 parcours verts) |
| 6. Kit : guides dans le document, livraison `.grist` | 100 % (réimport vérifié) |
| 7. Références « projet » : cadrage, estimation, arbitrages | 100 % |
| 8. Références « technique » : MCP, widget, permissions, données, livraison | 100 % |
| 9. SKILL.md | 100 % |
| 10. Vérification avec le skill (GREEN), corrections | 100 % |
| 11. Validation du plugin, installation, push | 90 % (validé, poussé ; installation par les collègues à essayer) |

## a) Plan de réalisation

Source du kit : LAPI, `C:\Users\Merlin\Documents\A - Missions en cours\0012 - Chiffrage Grist DF\4-produit`.
Kit : `plugins/grist-builder/skills/grist-builder/kit/` (gabarit copié dans chaque projet). Espace de nom du
module : `Formulaire` (au lieu de `Lapi`). Entité qui répond : colonne `Entite` (au lieu de `Departement`).
Rôles du kit : `repondant` (rattaché à une entité), `pilote` (lit tout), `admin` (comptes, paramètres).

1. **Dépôt** : `.claude-plugin/marketplace.json` (marketplace `grist-builder`, source `./plugins/grist-builder`),
   `plugins/grist-builder/.claude-plugin/plugin.json`, `README.md` (installation), `.gitignore` (`essai/`).
   Contrôle : `claude plugin validate .` sort en 0.
2. **RED** : 4 scénarios (entrée mûre à chiffrer ; entrée floue ; identité et droits dans un widget ;
   construction par le MCP). Un sous-agent sans skill par scénario, réponse en 150 mots au plus.
   Consigner dans `docs/tests/reference.md`.
3. **Kit, infrastructure** : `projet.config.js` (nom, urlId, espace, titre, contact, rôles, onglets,
   tables du module, comptes de test), `package.json` + `package-lock.json` (Playwright 1.63.0 exact),
   `.npmrc` (`ignore-scripts`, `save-exact`), `grist-local/docker-compose.yml` (`name:` par projet, port
   `GRIST_PORT`, propriétaire `proprietaire@projet.test`), `custom.css`, `outils/lib/grist.js`, `cles.js`,
   `partage.js` (copiés de LAPI, `cles.js` adapté : port, propriétaire, `urlId`).
4. **Kit, modèle et construction** : `schema/modele.js` (socle : Parametres, Entites, Annuaire,
   Connexions, Guides ; exemple : Reponses avec deux questions), `schema/entites.json` (3 entités),
   `schema/acces.js` (règles du socle + `appliquerRegles` de LAPI), `outils/construire.js` (générique,
   lit la configuration). Contrôle : `tests-e2e/acces.test.js` vert ; deux constructions de suite.
5. **Kit, module** : `module/build.js` (injecte `Formulaire.CONFIG`), `src/core.js` (identité par
   Connexions, chargement, écriture, pièces jointes, fenêtres), `app.js` (onglets par rôle, écran
   « compte non reconnu »), `markdown.js`, `vue-aide.js`, `vue-exemple.js` (réponse de l'entité, suivi),
   `ui.css` ; `outils/deployer-module.js` ; `tests-e2e/navigateur.js`, `parcours.test.js`,
   `module/test/markdown.test.js`. Contrôle : parcours verts (inconnu, répondant, pilote).
6. **Kit, guides et livraison** : `outils/lib/guides.js`, `charger-guides.js`, `guides/00-acces.md`,
   `10-repondant.md`, `outils/livrer.js` (réimport vérifié). Contrôle : `.grist` produit et réimporté.
7. **Références projet** : `cadrage.md` (diagnostic mûre / partielle / floue, questions, finalité),
   `estimation.md` (grille de la spec § 6, exemples), `arbitrages.md` (décisions types, défauts).
8. **Références techniques** : `mcp-grist.md`, `widget.md`, `permissions.md`, `donnees.md`, `livraison.md`
   (règles vérifiées sur LAPI, spec § 8).
9. **SKILL.md** : description « Use when… », phases, quand lire quelle référence, comment utiliser le kit.
10. **GREEN** : mêmes scénarios avec le skill ; consigner dans `docs/tests/verification.md` ; corriger.
11. **Livraison** : validation, installation locale (`claude plugin marketplace add`, `install`), commit, push.

## c) Liste de contrôle
- [x] Spécification validée par l'utilisateur
- [x] Étapes 1 à 10
- [x] Validation (`claude plugin validate .` sans avertissement), push sur GitHub
- [ ] Installation réelle par un collègue depuis GitHub (README)

## Version 0.2.0 (30/09/2026)
Retours de la mission DITND : `references/reprise.md` (nouveau), compléments dans widget, permissions, données
(formulaire public), livraison, estimation, MCP ; kit : chargeur local, relecture ciblée, `lirePiece`, fenêtres
accessibles, formulaire public par script, `partager`, `cloner`, lecteur tar, `rgaa.js`, garde-fou des tests.
Vérification : `docs/tests/verification.md` (S5 à S8, avant et après).

## Version 0.3.0 (01/10/2026)
Retours de la mission DITND (30/09 au soir). Kit : bouton retour du navigateur (historique du cadre du
chargeur), veille par rôle, pastilles d'onglets, compte accepté sans recharger (`moiDepuis`), réglages du
formulaire public sur les colonnes (`lib/formulaire.js`, `corriger-formulaire.js`, `formulaire.exemple.js`),
`signalerNouvellesFenetres`, `th scope`, CSS zoom 200 % (`.sr-only`, `.fenetre-large` corrigée), `zoom.js`,
aide (`guidesEnFin`, `{{cle}}`, `voir-guide`), gabarit `guides/confidentialite.md`, `jeu-essai.js`, `lib/pdf.js`,
`lib/xlsx.js`, `lib/compteur-appels.js`, `construire.js --adresse` (adresse notée dans doc-courant.json et
suivie par les tests). Références : donnees, widget, livraison, reprise, permissions, cadrage ; SKILL.md :
10 signaux d'alerte, section « Contribuer au plugin ». Vérification : `docs/tests/verification.md`.

## Version 0.4.0 (01/10/2026)
Retours de la mission DITND (recette des écrans avec le client). Kit : `ongletDe()` et `onglet` des vues,
`core.trier` / `core.enteteTri` et action `trier`, styles du tri, suivi d'exemple triable avec titre masqué,
`corriger-formulaire.js` qui retire les questions retirées du schéma, `module/test/tri.test.js`. Références :
widget (écrans : onglets, titres, états, listes ; collisions CSS), donnees (« Ne demander que ce qui sert »),
cadrage, permissions (partage nominatif) ; SKILL.md : 4 signaux d'alerte. Vérification :
`docs/tests/verification.md`.

## Version 0.5.0 (01/10/2026)
Revue design d'un projet client (constats vérifiés, portage générique). Kit : redessin après un choix
(`natureFocus`, `redessinPermis`), focus rendu après redessin, `<details>` retrouvés par id, `memoriser()`
(aussi dans `trier`), `argRetour()` et `argClicOnglet`, hauteur d'en-tête à 0 quand il ne colle pas,
`core.signalerEnregistre`, CSS (bordure des champs, en-tête et onglets au zoom, en-têtes de tableau collants,
focus des onglets, `.champ-enregistre`, `aria-invalid`, champ fichier, accordéon, ligne ajoutée,
`.btn.lien.danger`), `retouche-*.css` chargés en dernier, sommaire d'aide repliable, exemple (filtre,
« n sur N », liste vide, erreur sous le champ, `data-etat`), `captures-guides.js`,
`aligner-libelles-parametres.js`, `module/test/app.test.js`. Références : widget (motifs d'une revue design),
livraison (méthode de revue, captures), donnees (descriptions invisibles dans le formulaire public), permissions
(impartialité) ; SKILL.md : 5 signaux d'alerte. Vérification : `docs/tests/verification.md` (sans Chrome).

Second lot (même jour) : relecture des règles d'accès d'un projet client, failles prouvées par l'API sur un
document d'essais. Kit : `reservee()` dans `schema/modele.js` (statut des réponses), règles (nom de connexion,
statut borné, principes en tête), `schema/acces.test.js` (6 contrôles sans Grist), 4 cas ajoutés à
`tests-e2e/acces.test.js`, `outils/appliquer-regles.js` (`npm run regles`), `partager.js` en simulation sans
`--oui`, `formulaire.exemple.js` sans statut, notice (pièces jointes). Références : permissions (création,
appartenance, statut, doublons, références, formules, pièces, partage nominatif revu, limites de « public,
éditeur », vérifié sain, méthode), donnees, livraison, arbitrages ; SKILL.md : 5 signaux d'alerte.

## Version 0.6.0 (12/10/2026)
Revue d'interface de la DITND avec impeccable (critiques 25/40 puis 27/40). `widget.md` : saisir en lisant une pièce
(la pièce dans la page), échec d'écriture visible ; messages d'erreur persistants (`core.js`) ; outil de relevé des
styles (`outils/styles/`). Vérification S9 à S11. Construite d'abord par erreur sur un clone resté en 0.2.0 :
toujours `git fetch` avant de travailler.

## Version 0.7.0 (12/10/2026)
Phase « séance et parcours » de la DITND : `widget.md` (écrans de décision et de pilotage : acte lourd, accueil d'un
rôle, réunion projetée ; connexion depuis le widget, `next` relatif), signaux d'alerte de `SKILL.md`. Vérification
S12 à S16 (`docs/tests/verification.md`).

## e) Prochaines actions
1. Faire installer le plugin par un collègue (README) et recueillir ses retours.
2. Ajouter au kit, si les projets le demandent : outil des comptes en masse, jeu de démonstration (voir LAPI).
3. Rejouer sur une copie fraîche du kit les contrôles Chrome de la 0.5.0 (parcours, axe-core, zoom, `npm run captures`), non lancés faute de mémoire ; et les tests de droits (`npm run test:acces`, avec `schema/formulaire.js` copié de l'exemple pour les deux cas du formulaire), `npm run regles -- --simulation` puis sans, sur ce document.
4. Essayer la section « Contribuer au plugin » sur un vrai projet (première issue proposée par le skill).
5. ~~Reporter dans le kit les leçons de la revue d'interface DITND~~ : **fait en 0.6.0** (pièce lue à côté de la saisie, échec d'écriture visible, erreurs persistantes, outil de relevé des styles ; les autres leçons passaient déjà sans consigne, `docs/tests/verification.md`). Liste d'origine,
   **leçons de la revue d'interface DITND (12/10/2026)**, faite avec
   impeccable sur `007 - DITND/grist-migration` (dépôt git local, commits `c26db68` à `ac11fca`, critique
   25/40 dans `document-cible/.impeccable/critique/`) :
   - acte lourd (décision, refus) : préparer, vérifier, récapitulatif, puis une seule écriture ; jamais au clic
     d'un bouton radio (`widget.md`, motif dans `vue-exemple.js`) ;
   - document lu à côté de la saisie, dans la page (colonne élargie), pas dans une fenêtre modale ;
   - groupes de boutons : un seul arrêt de tabulation (tabindex mobile, flèches) ; raccourcis limités à la
     zone qui a le focus et désactivables (WCAG 2.1.4) ; pas d'`aria-live` sur un grand bloc ; défilement doux
     seulement sans `prefers-reduced-motion` (`widget.md`, accessibilité) ;
   - une couleur de statut = un sens ; jetons de couleur dans une seule feuille de thème (`ui.css` du kit) ;
   - outil de non-régression CSS à ajouter au kit : relevé des styles calculés écran par écran, avant/après
     (`document-cible/outils/styles/releve.js` et `comparer.js` de la DITND ; 6 095 éléments comparés) ;
   - `g.lignes()` renvoie les listes encodées `['L', …]` : le décodage est à faire côté outils aussi
     (bogue trouvé dans `jeu-demo.js` de la DITND) ;
   - DESIGN.md + PRODUCT.md par projet : la phase de cadrage peut produire le PRODUCT.md (proposition n° 2).
6. ~~Candidats au kit, phase séance et parcours~~ : **fait en 0.7.0** (acte lourd, accueil d'un rôle, réunion projetée, connexion ;
   l'étape finale figée passait déjà). Liste d'origine, **phase séance et parcours de la DITND (12/10/2026)**, à tester
   (avant / après) comme en 0.6.0 avant d'écrire quoi que ce soit :
   - repère de parcours par rôle (frise, `commun.frise()`) et « une seule action principale » par écran ;
   - « Prochaine action » de l'administration, calculée par urgence ;
   - synthèse pour une réunion projetée : « À discuter » d'abord, décision fixe à droite, précédent / suivant,
     mode « Projeter » (plein écran, texte agrandi, actions d'administration masquées) ;
   - changement de rôle confirmé (les flèches modifient un `<select>` fermé) ; étape finale figée en lecture ;
   - un test qui mesure un élément replié passe toujours : déplier avant de mesurer.

## Notes
- Essais du kit dans `essai/` (ignoré par git), Grist local sur le port 8485 pour ne pas gêner LAPI.
- Contexte limité : fichiers copiés de LAPI puis modifiés par petites éditions.
- Impeccable (12/10/2026) : outil de travail du dépôt, **pas une dépendance du plugin**. `PRODUCT.md` (racine,
  « sobre » confirmé), surface du module en mode Operate (`.impeccable/surfaces/`), hook du détecteur qui
  ignore `**/outils/**`, `**/schema/**`, `**/tests-e2e/**` (`.impeccable/config.json`).
