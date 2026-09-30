---
name: grist-builder
description: Use when a consultant scopes, estimates, builds, reworks or delivers a form, survey or business tool on Grist (formulaire, enquête, questionnaire en ligne, collecte de données, dossiers et évaluation, commission) — client needs, day estimates, custom widget, per-role access rules, public forms, attachments, migrating an existing Grist document, Grist MCP or API, .grist delivery.
---

# grist-builder

Mener, avec un consultant, un projet de formulaire, d'enquête ou d'outil métier sur Grist : du besoin du
client à la livraison du document. **Claude fabrique ; le consultant pilote le client.** Le consultant n'est
pas développeur : ne lui demander que des décisions et des vérifications, jamais de technique.

Les fichiers cités sont relatifs au dossier de ce skill (`references/`, `kit/`).

## Toujours commencer par le diagnostic

Avant tout chiffre, classer l'entrée du client (`references/cadrage.md`) :
**mûre** (questionnaire complet + finalité écrite + publics et volumes connus), **partielle**, **floue**.
L'estimation dépend de ce niveau ; une entrée floue n'a pas de chiffre ferme.
**Document Grist existant** à refondre ou à migrer : le cloner et l'étudier d'abord (`reprise.md`).

## Les phases

| Phase | Claude demande au consultant | Claude fait | Lire |
|---|---|---|---|
| 0. Diagnostic | Les documents du client (et l'accès au document existant) | Classe l'entrée, liste ce qui manque ; clone et profile l'existant | `cadrage.md`, `reprise.md` |
| 1. Cadrage (si partielle ou floue) | De mener l'échange avec le client (questions fournies) | Écrit la finalité et le catalogue des questions | `cadrage.md` |
| 2. Estimation | Validation du chiffrage | Calcule brique par brique, présente le calcul | `estimation.md` |
| 3. Arbitrages | Les décisions du client | Applique les valeurs par défaut, tient la liste | `arbitrages.md` |
| 4. Construction | Rien (sauf question bloquante) | Copie le kit, modèle, règles, formulaire public, module, écrans, reprise des données | `donnees.md`, `permissions.md`, `widget.md`, `mcp-grist.md`, `reprise.md` |
| 5. Tests | Rien | Droits rôle par rôle, parcours dans Chrome par défaut, captures relues, fluidité, accessibilité | `livraison.md` |
| 6. Documentation | Relecture des guides | Guides dans l'onglet Aide, support d'atelier | `livraison.md` |
| 7. Livraison | L'import chez le client | `.grist` vérifié par réimport, passation | `livraison.md` |

Lire la référence **au moment où la phase commence**, pas avant.

## Le kit (phase 4)

Socle testé : Grist local et chargeur local du widget, construction du document d'après un schéma (formulaire
public compris), identité et règles d'accès, squelette du module (veille, pastilles d'onglets, bouton retour du
navigateur), déploiement, tests (droits, parcours, accessibilité, zoom), partage, guides (notice de
confidentialité comprise), jeu d'essai, livraison. Il ne contient pas d'écrans métier : ils s'écrivent par projet (`kit/module/src/vue-exemple.js`
montre le motif).

1. Copier `kit/` dans le dossier du projet ; y renommer `name:` dans `grist-local/docker-compose.yml`.
2. Adapter `projet.config.js` (nom, adresse fixe, rôles, onglets, dépendances entre tables, comptes de test) et
   `schema/` (modèle, entités, règles d'accès, `formulaire.js` s'il faut un formulaire public).
3. `npm ci` puis `npm run grist:demarrer` (Docker ; `GRIST_PORT` si le port 8484 est pris).
4. `npm run construire`, puis `npm run deployer` ; ouvrir `http://localhost:8484/o/docs/doc/<urlId>`
   (connexion de test : `/test/login?username=<adresse>`).
5. `npm test`, `npm run test:acces`, `npm run test:parcours`, `npm run test:rgaa`, `npm run test:zoom` ;
   `npm run guides` ; `npm run partager` ; `npm run livrer`.
6. Essai sur une instance réelle : nom et `--adresse` distincts de la production, `outils/jeu-essai.js`,
   appels comptés (`livraison.md`).

Prérequis : Node 18 ou plus (22.5 ou plus pour lire un `.grist` avec `node:sqlite`), Docker, Google Chrome.
Vérifier et, s'il en manque, le dire au consultant.

## Signaux d'alerte

| Pensée | Réalité |
|---|---|
| « 45 questions, 3 rôles : 5 à 7 jours » | Avec le kit et une entrée mûre, environ 1,3 j marge comprise : calculer avec la grille |
| « Je donne un chiffre tout de suite » | Diagnostic d'abord ; entrée floue = cadrage chiffré, pas de chiffre ferme |
| « Le code du widget doit être hébergé à une URL » | Il se stocke dans le document (`_html`, `_js`), lancé par le chargeur public ; en local, par la copie servie par Grist |
| « Les règles d'accès suffisent, le widget n'a pas besoin de l'identité » | L'interface a besoin du rôle : ligne de connexion + déclencheur `user.Email` |
| « Les lecteurs peuvent être « Lecteur » dans Grist » | Tout le monde « Éditeur » ; les règles limitent |
| « Je teste avec mon compte » | Un test par rôle (Grist local, connexion de test) ; le propriétaire passe outre les règles |
| « Je corrige le document à la main » | Le document se reconstruit par script ; corriger le schéma |
| « Cette date par défaut convient » | Toute valeur par défaut non validée est affichée « à fixer » |
| « Erreur CORS sur les pièces jointes : on ouvre la table » | Presque toujours un 403 légitime, des cookies envoyés, ou la protection « réseau local » en local : diagnostiquer (`widget.md`), ne jamais ouvrir |
| « Les tests passent » (lancés avec des options de Chrome) | Chrome par défaut, sinon le blocage « réseau local » est masqué |
| « J'enregistre les CGU dans l'annuaire » | Toute écriture dans l'annuaire recharge le document de tous : table dédiée |
| « Après chaque écriture, je relis tout et je redessine » | Relire les tables concernées, ne pas redessiner une saisie déjà affichée |
| « Formulaire anonyme : j'ouvre la création aux inconnus » | `user.ShareRef` → `+C` sur la table ; publication par script (`donnees.md`) |
| « Je télécharge les pièces une par une » (getgrist.com) | Quota de 3 000 appels par mois : `.grist` + `attachments/archive` (`reprise.md`) |
| « Je lance les tests sur le document ouvert » | Document d'essais séparé ; jamais sur une instance distante |
| « Les captures sont faites, c'est bon » | Les regarder toutes : cohérence, couleurs, colonnes, libellés |
| « Je règle les questions du formulaire sur ses champs » | Sur la colonne ; sinon l'éditeur affiche « Aucun choix configuré » (`donnees.md`, `corriger-formulaire.js`) |
| « Je construis l'essai sur l'instance du client avec le nom habituel » | `construire.js` supprime d'abord tout document de même nom : nom, `--adresse` et `DOC_COURANT` à part |
| « J'envoie l'adresse de l'espace d'équipe » | Accueil refusé aux invités : toujours le lien direct du document |
| « Le document est dans l'espace de l'équipe, personne d'autre ne le voit » | Il hérite des droits de l'espace : tous les membres l'ouvrent (écran d'accès s'ils sont hors annuaire) |
| « Les tests passent : pas de `not ok` » | Node 24 n'écrit plus en TAP : lire `ℹ pass` / `ℹ fail` |
| « `page.goBack()` teste le bouton retour » | Il attend un chargement qui n'arrive pas : `history.back()` dans la page |
| « Le retour du navigateur n'a pas à marcher dans un widget » | Historique poussé sur le cadre du chargeur, fenêtre fermée d'abord (`widget.md`) |
| « Il suffit de recharger pour voir le nouveau » | Veille ciblée par rôle, pastilles d'onglets, compte accepté sans recharger (`widget.md`) |
| « axe-core ne signale rien : c'est accessible » | Aussi : zoom à 200 % (`test:zoom`), liens « nouvelle fenêtre », `th scope`, clavier, lecteur d'écran |
| « La confidentialité, c'est le client qui s'en occupe » | Notice livrée (gabarit du kit, « à fixer »), mention dans le formulaire public (`livraison.md`) |

## Contribuer au plugin

Un défaut corrigé dans le kit ou dans une référence, ou une idée réutilisable d'un projet à l'autre, sert aux
autres consultants. Dépôt d'origine : https://github.com/amazonmerlin-beep/grist-builder-plugin. Licence MIT : une contribution est publiée sous cette licence.

- **Proposer une fois**, en fin de session ou juste après la découverte : « Voulez-vous en faire une issue (ou
  une pull request) sur le dépôt du plugin ? ». Ne pas insister. **Jamais d'envoi sans accord explicite.**
- **Généraliser** : décrire le motif et le code du kit, jamais les données, noms, adresses, identifiants de
  document ou clés du client. Le consultant **relit le texte avant l'envoi**.
- **Chercher d'abord** une issue existante (`gh issue list --repo amazonmerlin-beep/grist-builder-plugin
  --search "…"`) ; la compléter plutôt qu'en ouvrir une autre.
- **Pull request** : la correction est rejouée sur une copie fraîche du kit et testée (construction, tests
  de droits, parcours) ; le résultat des tests figure dans la description.
- **Sans `gh`** (ou sans compte GitHub) : donner le texte prêt à coller (titre, constat, correction proposée,
  vérification) et l'adresse https://github.com/amazonmerlin-beep/grist-builder-plugin/issues/new.
