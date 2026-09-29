---
name: grist-builder
description: Use when a consultant scopes, estimates, builds or delivers a form or survey on Grist (formulaire, enquête, questionnaire en ligne, collecte de données sur Grist) — client needs, day estimates, custom widget, per-role access rules, Grist MCP, .grist delivery.
---

# grist-builder

Mener, avec un consultant, un projet de formulaire ou d'enquête sur Grist : du besoin du client à la
livraison du document. **Claude fabrique ; le consultant pilote le client.** Le consultant n'est pas
développeur : ne lui demander que des décisions et des vérifications, jamais de technique.

Les fichiers cités sont relatifs au dossier de ce skill (`references/`, `kit/`).

## Toujours commencer par le diagnostic

Avant tout chiffre, classer l'entrée du client (`references/cadrage.md`) :
**mûre** (questionnaire complet + finalité écrite + publics et volumes connus), **partielle**, **floue**.
L'estimation dépend de ce niveau ; une entrée floue n'a pas de chiffre ferme.

## Les phases

| Phase | Claude demande au consultant | Claude fait | Lire |
|---|---|---|---|
| 0. Diagnostic | Les documents du client | Classe l'entrée, liste ce qui manque | `cadrage.md` |
| 1. Cadrage (si partielle ou floue) | De mener l'échange avec le client (questions fournies) | Écrit la finalité et le catalogue des questions | `cadrage.md` |
| 2. Estimation | Validation du chiffrage | Calcule brique par brique, présente le calcul | `estimation.md` |
| 3. Arbitrages | Les décisions du client | Applique les valeurs par défaut, tient la liste | `arbitrages.md` |
| 4. Construction | Rien (sauf question bloquante) | Copie le kit, modèle, règles, module, écrans du projet | `donnees.md`, `permissions.md`, `widget.md`, `mcp-grist.md` |
| 5. Tests | Rien | Droits rôle par rôle, parcours dans Chrome, captures | `livraison.md` |
| 6. Documentation | Relecture des guides | Guides dans l'onglet Aide, support d'atelier | `livraison.md` |
| 7. Livraison | L'import chez le client | `.grist` vérifié par réimport, passation | `livraison.md` |

Lire la référence **au moment où la phase commence**, pas avant.

## Le kit (phase 4)

Socle testé : Grist local, construction du document d'après un schéma, identité et règles d'accès, squelette
du module, déploiement, gabarits de tests, guides, livraison. Il ne contient pas d'écrans métier : ils
s'écrivent par projet (`kit/module/src/vue-exemple.js` montre le motif).

1. Copier `kit/` dans le dossier du projet ; y renommer `name:` dans `grist-local/docker-compose.yml`.
2. Adapter `projet.config.js` (nom, adresse fixe, rôles, onglets, comptes de test) et `schema/`
   (modèle, entités, règles d'accès).
3. `npm ci` puis `npm run grist:demarrer` (Docker ; `GRIST_PORT` si le port 8484 est pris).
4. `npm run construire`, puis `npm run deployer` ; ouvrir `http://localhost:8484/o/docs/doc/<urlId>`
   (connexion de test : `/test/login?username=<adresse>`).
5. `npm test`, `npm run test:acces`, `npm run test:parcours` ; `npm run guides` ; `npm run livrer`.

Prérequis : Node 18 ou plus, Docker, Google Chrome. Vérifier et, s'il en manque, le dire au consultant.

## Signaux d'alerte

| Pensée | Réalité |
|---|---|
| « 45 questions, 3 rôles : 5 à 7 jours » | Avec le kit et une entrée mûre, environ 1,3 j marge comprise : calculer avec la grille |
| « Je donne un chiffre tout de suite » | Diagnostic d'abord ; entrée floue = cadrage chiffré, pas de chiffre ferme |
| « Le code du widget doit être hébergé à une URL » | Il se stocke dans le document (`_html`, `_js`), lancé par le chargeur public |
| « Les règles d'accès suffisent, le widget n'a pas besoin de l'identité » | L'interface a besoin du rôle : ligne de connexion + déclencheur `user.Email` |
| « Les lecteurs peuvent être « Lecteur » dans Grist » | Tout le monde « Éditeur » ; les règles limitent |
| « Je teste avec mon compte » | Un test par rôle (Grist local, connexion de test) ; le propriétaire passe outre les règles |
| « Je corrige le document à la main » | Le document se reconstruit par script ; corriger le schéma |
| « Cette date par défaut convient » | Toute valeur par défaut non validée est affichée « à fixer » |
