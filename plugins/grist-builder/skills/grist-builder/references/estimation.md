# Estimation

## Principe

Production en jours, **avec Claude et le kit**, entrée mûre. Étalon : LAPI (100 questions, 5 rôles, trois
niveaux, suivi, relances, synthèse, carte, pièces jointes, exports, comptes en masse, guides) = **2 j**.
Toujours présenter le calcul brique par brique : le client voit d'où vient le chiffre.

## Grille (production)

| Brique | LAPI | Règle d'échelle |
|---|---|---|
| Questionnaire : catalogue, parcours conditionnels, contrôles, complétude | 0,5 j | 0,1 j par tranche de 20 questions ; +0,1 j s'il y a plusieurs parcours |
| Rôles et droits | 0,25 j | 0,1 j pour 2 rôles, +0,05 j par rôle en plus |
| Pilotage : suivi, fiche, relances, exports, comptes | 0,35 j | 0,2 j sans relances ni comptes en masse |
| Synthèse métier | 0,2 j | 0 si les exports suffisent |
| Carte, SIG | 0,2 j | 0 sans données géographiques |
| Niveaux multiples (plusieurs lignes par entité) | 0,15 j | 0 pour une réponse par entité |
| Guides dans le document | 0,15 j | 0,1 j pour 2 ou 3 rôles |
| Tests, captures | 0,1 j | fixe |
| Livraison, atelier | 0,1 j | fixe |

## Ce qui s'ajoute, à part

| Poste | Valeur |
|---|---|
| Cadrage | +0,5 à 1 j si l'entrée est partielle ; +1 à 2 j si elle est floue (`cadrage.md`) |
| Marge | 20 % de la production |
| Pilotage client | Réunions, ateliers, recette : au nombre de séances (souvent 0,25 j par séance, préparation comprise) |
| Document existant | Clonage, étude, reproduction des défauts signalés : 0,25 à 0,5 j ; reprise des données et des pièces jointes : 0,5 j (`reprise.md`) |
| Outil métier au-delà d'un formulaire | Circuit à statuts, séances, grille de notation, synthèse : compter les écrans métier à part, et prévoir une passe de relecture visuelle avec le client (0,25 à 0,5 j) |

Le temps d'attente des décisions du client n'est pas du travail : le dire, le signaler dans le calendrier.

## Exemples

**45 questions, 3 rôles (entité, siège, admin), suivi, relances, exports, petite documentation, entrée mûre** :
questionnaire 0,25 (2,25 tranches) + droits 0,15 + pilotage 0,35 + guides 0,1 + tests 0,1 + livraison 0,1
= **1,05 j**, marge comprise **1,3 j**, plus les séances avec le client.

**30 questions, 2 rôles, pas de carte ni de synthèse, entrée mûre** : 0,15 + 0,1 + 0,2 + 0,1 + 0,1 + 0,1
= **0,75 j**, marge comprise **0,9 j**.

**Entrée floue** (« un formulaire pour suivre nos partenaires ») : pas de chiffre ferme. Proposer le cadrage
(1 à 2 j), puis une estimation ferme sur la base du questionnaire qui en sort.

## Pièges

- Estimer comme un développement classique (pages natives, écrans faits à la main) : ×4 à ×6 trop haut.
- Oublier le cadrage quand l'entrée n'est pas mûre : le dépassement viendra de là.
- Confondre production et durée calendaire (validations internes du client, relances).
