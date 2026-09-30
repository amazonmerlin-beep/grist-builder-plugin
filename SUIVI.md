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

## e) Prochaines actions
1. Faire installer le plugin par un collègue (README) et recueillir ses retours.
2. Ajouter au kit, si les projets le demandent : outil des comptes en masse, captures en série, jeu de démonstration (voir LAPI).
3. Essayer la section « Contribuer au plugin » sur un vrai projet (première issue proposée par le skill).

## Notes
- Essais du kit dans `essai/` (ignoré par git), Grist local sur le port 8485 pour ne pas gêner LAPI.
- Contexte limité : fichiers copiés de LAPI puis modifiés par petites éditions.
