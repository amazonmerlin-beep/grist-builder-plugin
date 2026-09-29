# grist-builder : spécification

Rédigée le 29/09/2026, à partir de la mission 0012 (enquête LAPI de Départements de France). Conception
validée en conversation le même jour.

## 1. Objet

Un **plugin Claude Code** que des consultants installent pour mener, avec Claude, un projet de formulaire
ou d'enquête sur Grist : de la collecte du besoin chez le client jusqu'à la livraison du document. Claude
fabrique ; le consultant pilote le client (besoin, arbitrages, recette).

Le plugin transmet un **savoir-faire** : une méthode en phases, une grille d'estimation, des règles de bonne
construction et un socle technique minimal. Il ne livre pas un produit tout fait.

## 2. Utilisateurs et critères de réussite

- **Utilisateurs** : consultants, non développeurs. Claude fait toute la technique (Node, Docker, API, tests).
  Le skill vérifie les prérequis et n'explique au consultant que ce qu'il doit décider ou vérifier.
- **Réussite** :
  1. dès le premier échange, le consultant sait **combien de jours** prend le projet, avec une estimation
     justifiée brique par brique ;
  2. Claude ne retombe pas dans les pièges connus (identité dans un widget, règles d'accès, API, MCP) ;
  3. le formulaire livré est testé rôle par rôle, documenté dans le document et livrable en `.grist`.

## 3. Étalon

LAPI : 100 questions, 5 rôles, parcours conditionnels, trois niveaux (département, système, lecteur),
suivi, relances, synthèse, carte, pièces jointes, exports, comptes en masse, guides dans le document.
**2 jours de production**, à partir d'une **entrée mûre** : questionnaire bien fourni, besoin précis,
finalité déclarée. Les réunions et l'attente des arbitrages du client ne sont pas comptées.

## 4. Structure du dépôt

```
012 - grist-builder/                 dépôt git : marketplace + plugin
  .claude-plugin/marketplace.json    déclare la marketplace et le plugin
  plugins/grist-builder/
    .claude-plugin/plugin.json
    skills/grist-builder/
      SKILL.md                       point d'entrée : phases, quand lire quelle référence
      references/
        cadrage.md                   diagnostic de maturité, questions à poser, finalité
        estimation.md                grille de jours, exemples chiffrés
        arbitrages.md                décisions types et valeurs par défaut
        mcp-grist.md                 le MCP Grist : capacités, limites, recettes
        widget.md                    widget personnalisé : chargement, identité, accès, pièces jointes
        permissions.md               rôles, annuaire, règles d'accès, pièges, tests
        donnees.md                   modèle, formules, déclencheurs, pièges de l'API REST
        livraison.md                 tests, guides dans le document, .grist, passation
      kit/                           socle minimal (voir § 7)
  docs/specs/                        cette spécification
  README.md                          installation pour les collègues
```

Le format exact (fichiers de plugin et de marketplace) est vérifié dans la documentation de Claude Code
au moment de l'écrire.

## 5. Le parcours (SKILL.md)

| Phase | Sortie | Référence |
|---|---|---|
| 0. Diagnostic de l'entrée | Niveau de maturité : **mûre**, **partielle**, **floue** | `cadrage.md` |
| 1. Cadrage (entrée partielle ou floue) | Finalité écrite, questionnaire complet, publics et volumes | `cadrage.md` |
| 2. Estimation | Jours de production par brique, jours de cadrage, pilotage client, marge | `estimation.md` |
| 3. Arbitrages | Liste des décisions avec valeur par défaut appliquée | `arbitrages.md` |
| 4. Construction | Document Grist : socle, puis briques propres au projet | `donnees.md`, `permissions.md`, `widget.md`, `mcp-grist.md` |
| 5. Tests | Droits rôle par rôle, parcours, captures | `livraison.md` |
| 6. Documentation | Guides dans le document, support d'atelier | `livraison.md` |
| 7. Livraison | `.grist` vérifié par réimport, passation | `livraison.md` |

Chaque phase dit ce que Claude demande au consultant et ce qu'il fait seul. Le SKILL.md reste court :
le détail est dans les références, lues au moment où la phase commence.

## 6. La grille d'estimation

Production, entrée mûre. Poids issus de LAPI (total 2 j), à rapporter à la taille du projet :

| Brique | LAPI | Règle d'échelle |
|---|---|---|
| Questionnaire : catalogue, parcours conditionnels, contrôles, complétude | 0,5 j (100 questions) | ≈ 0,1 j par tranche de 20 questions ; +0,1 j si plusieurs parcours |
| Rôles et droits | 0,25 j (5 rôles) | 0,1 j pour 2 rôles, +0,05 j par rôle |
| Pilotage : suivi, fiche, relances, exports, comptes | 0,35 j | 0,2 j sans relances ni comptes en masse |
| Synthèse métier | 0,2 j | 0 si les exports suffisent |
| Carte, SIG | 0,2 j | 0 sans données géographiques |
| Niveaux multiples | 0,15 j | 0 pour une réponse par répondant |
| Guides dans le document | 0,15 j | 0,1 j pour 2 rôles |
| Tests, captures | 0,1 j | fixe |
| Livraison, atelier | 0,1 j | fixe |

S'ajoutent, comptés à part :
- **cadrage** : +0,5 à 1 j si l'entrée est partielle, +1 à 2 j si elle est floue ;
- **pilotage client** : réunions, ateliers, recette, au nombre de séances ;
- **marge** : 20 % sur la production.

Exemple : formulaire simple, 30 questions, 2 rôles, pas de carte ni de synthèse → environ 0,75 à 1 j.

## 7. Le kit (socle minimal)

Extrait de LAPI, sans rien de propre à LAPI :

| Élément | Rôle |
|---|---|
| Grist local (Docker Compose, connexion de test, feuille de style) | Construire et tester hors de l'instance du client |
| Client de l'API REST et clés des comptes de test | Toutes les opérations scriptées |
| Construction d'après un schéma (tables, colonnes, formules, déclencheurs) | Document reproductible, reconstruit en quelques secondes |
| Règles d'accès générées (annuaire + table de connexions) | Identité fiable dans le widget, droits par rôle |
| Squelette du module : identification, chargement, onglets par rôle, rendu | Point de départ du widget personnalisé |
| Déploiement du widget | Code du module stocké dans le document |
| Gabarits de tests : droits (Node), parcours (Playwright avec le Chrome installé) | Vérifier chaque rôle |
| Livraison `.grist` avec vérification par réimport | Fichier à importer chez le client |

Le kit n'inclut pas de moteur de questionnaire ni d'écrans métier : ils sont écrits par projet, avec les
règles des références. LAPI (mission 0012) sert d'exemple complet quand il est disponible.

## 8. Contenu des références (sources)

Les règles viennent de ce qui a été vérifié sur LAPI : `4-produit/PLAN.md` (journal), `SUIVI.md` (pièges),
`4-produit/SPEC.md` (décisions), `4-produit/ARBITRAGES.md`, `1-cadrage/recherche/modele-permissions-grist.md`,
`PASSATION.md` (POC par MCP), le guide technique et le guide d'administration de LAPI. Exemples :
- **Widget** : le widget ne connaît pas l'utilisateur ; l'identité passe par une ligne de connexion
  (déclencheur `user.Email`) ; accès « complet » requis ; en-tête `X-Requested-With` pour les pièces jointes ;
  jeton d'accès (`getAccessToken`) pour les lire ; bibliothèques externes à version figée et empreinte SRI ;
  chargeur public de Grist Labs à signaler.
- **Permissions** : règles par table et par colonne ; tout le monde « Éditeur » dans Grist, sinon la
  connexion ne s'écrit pas ; `in` sur une colonne à choix multiples ; une table fermée renvoie 403 ;
  les formules de l'annuaire ne dépendent jamais de la table des connexions.
- **Données et API** : `AddTable` ignore certaines options (les poser par `ModifyColumn`) ; `recalcDeps` en
  liste simple ; listes encodées `['L', …]` ; un envoi `PATCH` exige les mêmes champs sur toutes les lignes ;
  une valeur posée explicitement l'emporte sur un déclencheur.
- **MCP** : ce qu'il construit vite (tables, pages, widgets, règles via `_grist_ACLRules`), ce qu'il ne sait
  pas faire (renommer un document, créer un graphique natif…), quand préférer les scripts.
- **Livraison** : tests rejouables (ne jamais vider la démonstration), attentes calculées, captures en série,
  guides dans une table filtrée par rôle, `.grist` réimporté pour vérification.

## 9. Méthode de réalisation et de test du skill

Le skill est testé comme du code (méthode « writing-skills ») :
1. **Référence sans skill** : des sous-agents reçoivent des scénarios réalistes (entrée mûre, entrée floue,
   demande d'estimation, construction des droits) ; on note leurs estimations et leurs erreurs.
2. **Écriture** du skill pour corriger ce qui a été observé.
3. **Vérification avec le skill** sur les mêmes scénarios ; on comble les écarts.
4. Le kit est vérifié en construisant un **petit formulaire d'essai** (une dizaine de questions, deux rôles)
   de bout en bout sur le Grist local.

## 10. Hors périmètre

- Moteur de questionnaire générique, écrans métier réutilisables.
- Publication sur une marketplace publique : le dépôt est local ; l'utilisateur le pousse où il veut.
- Hébergement de Grist (instance du client, getgrist.com ou ANCT, au choix du projet).
