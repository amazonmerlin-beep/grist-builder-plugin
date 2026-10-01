# grist-builder

Plugin Claude Code pour mener un projet de **formulaire, d'enquête ou d'outil métier sur Grist**, du besoin du
client à la livraison du document : diagnostic de l'entrée, reprise d'un document existant, estimation en jours,
arbitrages, construction, tests, guides, livraison `.grist`. Claude fabrique ; le consultant pilote le client.

## Installer

Dans Claude Code :

```
/plugin marketplace add amazonmerlin-beep/grist-builder-plugin
/plugin install grist-builder@grist-builder
```

Ou en ligne de commande :

```
claude plugin marketplace add amazonmerlin-beep/grist-builder-plugin
claude plugin install grist-builder@grist-builder
```

Mettre à jour : `claude plugin marketplace update grist-builder`, puis `claude plugin update grist-builder@grist-builder`.

## Utiliser

Décrire le projet à Claude (« le client veut faire remplir un questionnaire de 45 questions à ses 40
antennes… », avec ses documents) : le skill se charge, pose le diagnostic, estime, puis guide les phases.

Pour la construction, il faut sur le poste : **Node 18+**, **Docker** et **Google Chrome** (tests). Claude
vérifie et le signale s'il en manque.

## Contenu

| Où | Quoi |
|---|---|
| `plugins/grist-builder/skills/grist-builder/SKILL.md` | Point d'entrée : phases, signaux d'alerte |
| `…/references/` | Cadrage, estimation, arbitrages, MCP Grist, widget, permissions, données (dont formulaire public par script), reprise d'un document existant, livraison |
| `…/kit/` | Socle testé : Grist local et chargeur local du widget, construction scriptée (formulaire public compris), identité et règles d'accès, squelette du module (relecture ciblée, veille et pastilles, bouton retour, pièces jointes, fenêtres accessibles), tests par rôle dans Chrome par défaut, contrôles RGAA et zoom, captures des écrans, partage nominatif, guides et notice de confidentialité, jeu d'essai, livraison |
| `docs/specs/` | Spécification |
| `docs/tests/` | Scénarios de vérification du skill, sans et avec |

Étalon des estimations : une enquête de 100 questions, 5 rôles, suivi, relances, synthèse, carte et guides
(mission LAPI) = 2 jours de production à partir d'une entrée mûre.

## Contribuer

Issues et pull requests bienvenues : https://github.com/amazonmerlin-beep/grist-builder-plugin/issues. Le skill
propose lui-même, une fois et avec votre accord, d'en ouvrir une après un défaut corrigé ou une idée
réutilisable (section « Contribuer au plugin » de `SKILL.md`). Contenu généralisé : jamais de données, noms,
adresses ou identifiants d'un client. Licence MIT.

## Nouveautés 0.5.0 (revue design d'un projet client, 01/10/2026)

- **Écran à jour après un choix** : une case, un bouton radio, une liste ou un champ fichier redessine l'écran
  après sa propre écriture (Chrome et Edge leur donnent le focus) ; un champ texte en saisie le bloque toujours.
  **Focus rendu** à l'élément actif après le redessin, sinon au titre de sa section (RGAA 12.8) ; `<details>`
  ouverts retrouvés par leur `id`. Règles testées sans navigateur (`module/test/app.test.js`).
- **Filtres et retour** : `memoriser()` (état noté dans l'historique sans nouvelle entrée, aussi après un tri) ;
  `argRetour()` d'une vue de liste, pour y revenir par l'onglet parent avec ses filtres.
- **Enregistrement signalé** : `core.signalerEnregistre(el)` (marque verte, annonce « Modification
  enregistrée. »).
- **CSS** : bordure des champs à 3:1 (`--c-bordure-champ`), en-tête qui ne colle plus et onglets à la ligne au
  zoom à 200 %, en-têtes de tableau collés sous l'en-tête, focus des onglets visible, champ fichier accessible,
  accordéons, ligne ajoutée surlignée, erreur `aria-invalid` ; `retouche-*.css` chargés en dernier
  (`build.js`). Sommaire « Dans ce guide » repliable ; plus de texte de développeur dans l'onglet Aide.
- **Exemple** (`vue-exemple.js`) : filtre sur place, « n sur N », liste vide avec « Effacer les filtres »,
  erreur sous le champ, libellés de statut distincts des valeurs (`data-etat`).
- **Outils** : `npm run captures` (captures des guides et d'une revue, contenu seul, noms réels masqués, lecture
  seule) ; `npm run parametres` (libellés de `Parametres` alignés sur le modèle).
- **Références** : motifs d'écran d'une revue design (hiérarchie des boutons, listes en dossiers repliés,
  cartes avec action à faire, textes de développeur, saisie assistée avec création à la volée…) ; méthode de
  revue multi-agents (`livraison.md`) ; formulaire public : les descriptions de colonnes ne s'affichent pas
  (`donnees.md`) ; garde-fous d'impartialité, affichage ou règle d'accès (`permissions.md`) ; 5 signaux d'alerte.

## Nouveautés 0.4.0 (retours de la mission DITND, 01/10/2026 : recette des écrans avec le client)

- **Onglet du parent surligné** pour une fiche ouverte depuis une liste (`onglet` de la vue, `ongletDe()`) ;
  titre d'un écran d'onglet masqué (`sr-only`) ; pas de fil d'Ariane à un niveau.
- **Tableaux triables** : `core.trier` et `core.enteteTri`, action `trier` (`aria-sort`, focus gardé, cases vides
  en fin de liste) ; exemple dans le suivi de `vue-exemple.js` ; tests unitaires (`tri.test.js`).
- **Motifs d'écran** (`references/widget.md`) : compteurs groupés selon qui doit agir, frise d'états séparée de
  l'action « Passer à … », sélection en masse dans les longues listes de cases, collisions de classes CSS.
- **Formulaire** : « Ne demander que ce qui sert » (usage et source de chaque question, questions fermées au
  client, `references/donnees.md`) ; `corriger-formulaire.js` retire du formulaire publié les questions
  retirées du schéma, sans reconstruire.
- **Partage** : avec le lien public, le partage nominatif n'est pas nécessaire pour travailler ; sinon
  « Éditeur » ; le widget ne peut pas partager (`references/permissions.md`).
- **Administrateur qui évalue aussi**, sans second rôle : membre possible d'une séance (jamais coché d'office),
  onglet d'évaluation affiché seulement s'il est membre (`visible()` d'une vue, dans `app.js`), avis des autres
  masqués dans la synthèse jusqu'à sa transmission (`references/permissions.md`).
- **SKILL.md** : 4 nouveaux signaux d'alerte, dont la cible explicite d'un déploiement local en mode auto.

## Nouveautés 0.3.0 (retours de la mission DITND, 30/09/2026 au soir)

- **Bouton « retour » du navigateur** : il revient à l'écran précédent du module (historique poussé sur le cadre
  du chargeur) et ferme d'abord une fenêtre ouverte.
- **Voir le nouveau sans recharger** : veille ciblée par rôle (`veille` dans `projet.config.js`), pastilles
  d'onglets avec annonce, compte accepté qui passe à ses onglets sans recharger la page.
- **Formulaire public** : réglages des questions posés sur la colonne. Sinon l'éditeur de Grist affiche
  « Aucun choix configuré ». `corriger-formulaire.js` répare un document existant ; modèle
  `schema/formulaire.exemple.js`.
- **Accessibilité** : liens « nouvelle fenêtre » annoncés, `th scope="col"`, tableaux au zoom à 200 %,
  contrôle `npm run test:zoom`, motifs (cellule codée, bouton icône) dans `references/widget.md`.
- **Aide** : rubrique « Informations » en fin de liste (`guidesEnFin`), `{{cle}}` remplacé par le paramètre,
  guide ouvert en fenêtre depuis l'écran d'accès, gabarit de **notice de confidentialité** (livrable).
- **Outils** : `jeu-essai.js` (jeu fictif pour une instance réelle, PDF générés, `--retirer`), `lib/pdf.js`,
  `lib/xlsx.js`, `lib/compteur-appels.js` (appels comptés, quota de getgrist.com), `construire.js --adresse`.
- **Références** : essai sur une instance réelle (document de même nom supprimé, espace d'équipe et invités),
  Node 24 sans TAP, `history.back()` dans Playwright, nouveaux signaux d'alerte, section « Contribuer au
  plugin » (issue ou pull request, avec accord, contenu généralisé).

## Nouveautés 0.2.0 (retours de la mission DITND, 30/09/2026)

- **Reprise d'un document existant** (`references/reprise.md`) : clonage en deux appels, quota de getgrist.com,
  étude hors ligne du `.grist`, stockage externe des pièces jointes, reprise des données rejouable.
- **Formulaire public construit et publié par script** (`schema/formulaire.js`, règle `user.ShareRef`).
- **Pièces jointes dans le widget** : méthode sûre (jeton en lecture seule, sans cookies, statut vérifié) et
  tableau de diagnostic des fausses erreurs « CORS ».
- **Chargeur local du widget** : le Grist local sert sa copie, les tests tournent dans un Chrome par défaut.
  La protection « réseau local » de Chrome n'est plus masquée.
- **Fluidité** : relecture des seules tables concernées (`dependances`), pas de redessin des saisies, redessin
  seulement si les données ont changé. Jamais d'écriture dans l'annuaire pour une action courante.
- **Accessibilité** : langue et titre de page, fenêtres modales avec gestion du focus, contrôle axe-core
  (`npm run test:rgaa`).
- **Outils** : `npm run partager` (partage nominatif aligné sur l'annuaire), garde-fou des tests (Grist local
  seulement, `DOC_COURANT` pour un document d'essais).
