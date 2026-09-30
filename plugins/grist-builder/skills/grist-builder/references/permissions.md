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
- **Ne jamais écrire dans l'annuaire depuis le module pour une action courante** (CGU, préférences) : chaque
  modification recharge la page de tous. Utiliser une table dédiée, écrite à sa propre adresse
  (`newRec.Email == user.Email` → `+C`).
- **Formulaire public** (déposants anonymes) sur une table fermée : la règle `user.ShareRef` → `+C-RUD` sur
  cette table. L'envoi passe par le lien de partage du formulaire, qui crée des lignes sans rien pouvoir lire.
  Ne pas écrire `not user.Moi.Role_effectif` → `+C` : tout compte connecté pourrait alors créer des lignes par
  l'API. La publication se fait par script : voir `donnees.md`.
- **Règles de création** : `newRec` voit les valeurs posées par les déclencheurs (`user.Email`) et les
  formules. Exemple : `newRec.Evaluateur == user.Moi.id and user.Moi.id in newRec.Membres_autorises` → `+C`.
  **Unicité** : une colonne calculée `Doublon` (`len(T.lookupRecords(A=$A, B=$B)) > 1`), et `not newRec.Doublon`
  dans la règle.
- **Suivre une référence** (`rec.Examen.Seance.Statut`) n'est pas possible dans une règle : poser une colonne
  calculée (`Seance_statut = $Examen.Seance.Statut`) et la tester.
- **Cellule masquée** : une règle de colonne **sans condition** fait disparaître la colonne ; une règle qui
  **dépend de la ligne** la renvoie censurée, `['C']`, par l'API REST comme par `fetchTable`.
- **Indépendance des avis** : chacun lit les siens, et ceux des autres seulement quand un statut le permet
  (séance « En séance ») : règle sur une colonne calculée `Seance_statut`.
- **Document partagé par lien** (`everyone@getgrist.com` éditeur) : il n'apparaît **pas** dans la liste de
  documents des personnes. Partage nominatif aligné sur l'annuaire (`npm run partager`), ou envoi du lien.
- **Espace d'équipe** (getgrist.com) : le document **hérite des droits de l'espace**, et tous les membres de
  l'équipe l'ouvrent ; sans ligne d'annuaire, ils ne voient que l'écran d'accès. À l'inverse, un **invité** qui
  ouvre l'accueil de l'équipe voit « Accès refusé » : lui donner le lien direct du document (`livraison.md`).

## Tester (`tests-e2e/acces.test.js`)

Sur le Grist local, la connexion de test donne une clé d'API par adresse : chaque rôle est testé par l'API,
avec ses propres droits. **Jamais sur une instance distante, jamais sur un document que quelqu'un consulte** :
les tests écrivent des données fictives (garde-fou du kit, et `DOC_COURANT` pour viser un document d'essais).
Pièces jointes : un compte autorisé reçoit 200 sur `/attachments/<id>/download`, un compte non autorisé 403.
Formulaire public : `POST /api/s/<clé>/tables/<T>/records` sans authentification crée la ligne ; la lecture
par la même clé renvoie une liste vide. Couvrir au moins : inconnu, désactivé, usurpation d'adresse, chaque rôle (lire,
modifier, ce qui est refusé), cloisonnement entre entités, gel après transmission. Calculer les attentes
d'après les données (jamais de liste figée) et ne remettre à zéro que les entités de test.
