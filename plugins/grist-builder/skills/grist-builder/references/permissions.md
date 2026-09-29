# Permissions : rôles, annuaire, règles d'accès

## Deux niveaux, à ne pas confondre

| Niveau | Où | Décide |
|---|---|---|
| Partage Grist | Menu Partager, Gérer les utilisateurs | Qui peut **ouvrir** le document |
| Annuaire + règles d'accès | Table Annuaire, règles du document | Ce que chacun **voit et modifie** une fois dedans |

Modes de partage : **lien** (accès public, éditeur ; l'annuaire filtre tout ; ajouter quelqu'un = une ligne
d'annuaire) ou **invitations** (chacun invité nommément, comme Éditeur ; lourd au-delà de quelques dizaines).

## Le modèle du kit (`schema/acces.js`)

- Attribut utilisateur sur la table par défaut : `user.Moi` = la ligne de l'Annuaire dont `Email` vaut
  `user.Email`.
- `Role_effectif` = le rôle si le compte est actif, sinon vide : un compte désactivé est un inconnu.
- Défaut : propriétaires tout, tous les autres **rien** (`-CRUDS`) ; chaque table ouvre ensuite ce qu'il
  faut. Pour chaque permission, **la première règle qui s'applique décide** : l'ordre compte.
- Règles de colonnes pour protéger les colonnes système (entité, auteur, dates).
- Condition sur une colonne à choix multiples : `user.Moi.Role_effectif in rec.Public` fonctionne.
- Contrôle après application : `aclFormulaParsed` non vide pour chaque règle (sinon formule non compilée).

## Pièges vérifiés

- **Tout le monde « Éditeur »** dans Grist, lecteurs compris : le module écrit une ligne de connexion à
  chaque ouverture ; en « Lecteur », elle est refusée et la personne n'est pas reconnue.
- **Adresses en minuscules** : Grist compare `user.Email` en minuscules. Le kit normalise à la saisie
  (déclencheur `value.strip().lower()` sur `Annuaire.Email`).
- **Aucune formule de l'annuaire ne dépend de Connexions** (ni d'une table souvent modifiée) : l'annuaire
  porte l'attribut des règles ; s'il change à chaque ouverture, Grist recharge la page de tout le monde.
- Une table **entièrement fermée** renvoie 403 (pas une liste vide) : le module et les tests doivent le gérer.
- Les **propriétaires** passent outre toutes les règles : deux ou trois au plus.
- Les pièces jointes suivent les règles de la cellule qui les référence : une capture d'un guide réservé
  n'est pas téléchargeable par les autres.
- Un lecteur extérieur (partenaire, administration) : règles par ligne (réponses transmises, publication
  nominative) **et** par colonne (pas de données personnelles, pas de coordonnées exactes).

## Tester (`tests-e2e/acces.test.js`)

Sur le Grist local, la connexion de test donne une clé d'API par adresse : chaque rôle est testé par l'API,
avec ses propres droits. Couvrir au moins : inconnu, désactivé, usurpation d'adresse, chaque rôle (lire,
modifier, ce qui est refusé), cloisonnement entre entités, gel après transmission. Calculer les attentes
d'après les données (jamais de liste figée) et ne remettre à zéro que les entités de test.
