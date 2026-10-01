# Permissions : rôles, annuaire, règles d'accès

## Deux niveaux, à ne pas confondre

| Niveau | Où | Décide |
|---|---|---|
| Partage Grist | Menu Partager, Gérer les utilisateurs | Qui peut **ouvrir** le document |
| Annuaire + règles d'accès | Table Annuaire, règles du document | Ce que chacun **voit et modifie** une fois dedans |

Modes de partage : **lien** (accès public, éditeur ; l'annuaire filtre tout ; ajouter quelqu'un = une ligne
d'annuaire) ou **invitations** (chacun invité nommément, comme Éditeur ; lourd au-delà de quelques dizaines).
**Toute personne partagée nominativement lit les adresses de tous les comptes partagés nominativement**
(`/api/docs/<doc>/access`, menu « Partager »), quelles que soient les règles de l'annuaire : avec le lien et un
annuaire confidentiel, pas de partage nominatif ; avec des invitations, le dire dans la notice de confidentialité.

## Le modèle du kit (`schema/acces.js`)

- Attribut utilisateur sur la table par défaut : `user.Moi` = la ligne de l'Annuaire dont `Email` vaut
  `user.Email`.
- `Role_effectif` = le rôle si le compte est actif, sinon vide : un compte désactivé est un inconnu.
- Défaut : propriétaires tout, tous les autres **rien** (`-CRUDS`) ; chaque table ouvre ensuite ce qu'il
  faut. Pour chaque permission, **la première règle qui s'applique décide** : l'ordre compte.
- Règles de colonnes pour protéger les colonnes système (entité, auteur, dates).
- **Les règles de colonne ne décident que R et U ; la création se décide à la règle de table.** Toute règle qui
  ouvre `+C` hors administration contraint donc `newRec` : statut initial, auteur = `user.Moi.id`,
  adresse = `user.Email`, nom = `user.Name`, champs de traitement vides. Sinon on crée une demande déjà
  « acceptée », une évaluation déjà « transmise », une connexion sous le nom d'un autre (le déclencheur à l'ajout
  garde la valeur fournie). Une date posée par déclencheur reste falsifiable à la création : ne pas s'y fier
  pour un délai.
- **Écrire = être l'auteur ET encore autorisé** : une règle de modification qui vérifie seulement l'auteur
  (`rec.Evaluateur == user.Moi.id`) laisse un membre retiré (conflit d'intérêts, case décochée) continuer et
  transmettre. Ajouter l'appartenance (`user.Moi.id in rec.Membres_autorises`) aux règles de création **et** de
  modification ; il garde la relecture de ce qu'il a écrit. Côté module, ne pas compter une contribution dont
  l'auteur n'est plus autorisé (compteurs « n transmises sur N », synthèse).
- **Statut borné** : `[ROLE and newRec.Statut not in ["Brouillon", "Transmis"], '-U']` avant la règle qui ouvre
  la modification ; une colonne à choix accepte toute valeur par l'API.
- **Gardes d'intégrité avant l'administration** : `[ADMIN, '+CRUD']` placé en premier court-circuite les
  gardes qui suivent (doublons) ; insérer `[ADMIN and newRec.Doublon, '-C']` avant, si l'administration crée
  elle aussi ces lignes (administrateur qui évalue).
- **Référence invalide** (élément de référentiel inexistant ou désactivé, ligne d'un autre ensemble) : une
  colonne d'aide booléenne (`bool($Element.Actif)`, vraie si la référence existe et est active) testée dans la
  règle de création (`newRec.Element_actif`).
- Relecture automatique sans Grist : `schema/acces.test.js` (`npm test`) vérifie la forme des règles, `newRec`
  hors lecture, `+C` contraint, statut borné, garde de doublon, colonnes réservées. La compilation reste
  contrôlée par `appliquerRegles` (`aclFormulaParsed`).
- Condition sur une colonne à choix multiples : `user.Moi.Role_effectif in rec.Public` fonctionne.
- Contrôle après application : `aclFormulaParsed` non vide pour chaque règle (sinon formule non compilée).
- **Cumul de rôles sans deuxième rôle** (un administrateur qui évalue aussi) : garder un seul rôle par
  compte. L'administrateur a déjà tous les droits ; il suffit qu'il puisse être **membre** de l'objet évalué
  (séance, campagne) : liste des membres possibles = évaluateurs + administrateurs, ces derniers **jamais cochés
  d'office**. Côté module : l'onglet d'évaluation n'apparaît à l'administrateur que lorsqu'il est membre
  (`visible()` sur la vue), et la synthèse lui **masque les avis des autres** tant qu'il n'a pas transmis le sien
  (garde-fou d'écran, avec « Afficher quand même » : les règles le laissent tout lire). Un second rôle ou une
  colonne « évalue aussi » compliquerait toutes les règles pour rien.

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
- **Le dépôt par la clé de partage du formulaire passe outre les règles du document** (prouvé par l'API : même
  `user.ShareRef → -C` placé avant, et des règles de colonne `-C`, `-U`, `-RU`, laissent créer, n'importe quelle
  colonne, même absente du formulaire). Les colonnes réservées à l'administration (statut de contrôle, notes
  internes, publication, rattachement à une référence, origine, identifiant de reprise, pièces reprises) se
  protègent **dans le modèle** : `reservee()` de `schema/modele.js`, déclencheur sur la colonne elle-même,
  `None if user.ShareRef else value` (ou `"Défaut" if user.ShareRef else (value or "Défaut")`). Les autres
  écritures (administration, reprise, module) sont gardées. Une date fournie au dépôt reste falsifiable. Sur un
  document existant : `npm run regles` aligne ces déclencheurs.
- **Règles de création** : `newRec` voit les valeurs posées par les déclencheurs (`user.Email`) et les
  formules. Exemple : `newRec.Evaluateur == user.Moi.id and user.Moi.id in newRec.Membres_autorises` → `+C`.
  **Unicité** : une colonne calculée `Doublon` (`len(T.lookupRecords(A=$A, B=$B)) > 1`), et `not newRec.Doublon`
  dans la règle.
- **Suivre une référence** (`rec.Examen.Seance.Statut`) n'est pas possible dans une règle : poser une colonne
  calculée (`Seance_statut = $Examen.Seance.Statut`) et la tester.
- **Cellule masquée** : une règle de colonne **sans condition** fait disparaître la colonne ; une règle qui
  **dépend de la ligne** la renvoie censurée, `['C']`, par l'API REST comme par `fetchTable`.
- **Garde-fous d'impartialité : affichage seulement, ou règle d'accès ?** Masquer dans le module (ne pas afficher
  à un pair qui s'est retiré pour conflit d'intérêts, ni les avis des autres avant la mise en commun) n'est qu'un confort :
  la donnée reste lisible par l'API et les données brutes. Pour chaque garde-fou, décider et noter : **affichage
  seulement** quand l'information n'est pas sensible (et le dire dans la liste des arbitrages), **règle de colonne
  ou de ligne** dès qu'un pair ne doit pas pouvoir la lire. Signe d'un oubli : l'écran d'un rôle affiche
  « Compte n° 12 » (la référence vers une table qu'il ne lit pas) ; masquer la ligne entière pour ce rôle, et
  fermer la colonne si la donnée révèle quelque chose (qui s'est déclaré en conflit). Tester les deux côtés
  (`acces.test.js`) : le rôle ne la lit pas par l'API, l'administration la lit.
- **Indépendance des avis** : chacun lit les siens, et ceux des autres seulement quand un statut le permet
  (séance « En séance ») : règle sur une colonne calculée `Seance_statut`.
- **Document partagé par lien** (`everyone@getgrist.com` éditeur) : il n'apparaît **pas** dans la liste de
  documents des personnes ; envoyer le lien direct. Avec le lien public, le partage nominatif **n'est pas
  nécessaire pour travailler** (il ne sert qu'à la liste de documents et au courriel d'invitation de l'instance)
  et il **révèle l'annuaire** : chaque compte partagé nominativement lit, par `/api/docs/<doc>/access`, les
  adresses de tous les autres. Donc, avec le lien et un annuaire confidentiel, **pas de partage nominatif**
  (révision de la 0.4.0, qui le proposait pour la liste de documents). S'il devient la seule porte (instance
  qui refuse le lien public), il doit être « Éditeur » (un « Lecteur » ne peut rien écrire, et les règles ne
  donnent jamais plus que le partage) et la notice de confidentialité le dit. `npm run partager` ne fait
  qu'une simulation sans `--oui`. Le widget ne peut pas modifier le partage (ajouter à l'annuaire n'invite pas
  dans Grist).
- **Fuites par les formules** : une colonne calculée d'une table lisible (statut du dossier, décision recopiée
  d'une autre table, date de référence, échéance, export) révèle ce qu'une règle masque ailleurs. Masquer aussi
  ces colonnes au rôle concerné (`-R` sur la liste des colonnes dérivées), et tester leur valeur censurée.
- **Pièces sensibles** (CV, pièces reprises) : relire la notice de confidentialité contre les règles des colonnes
  de pièces jointes, rôle par rôle (un lecteur ne lit pas les CV si la notice le promet). Le téléchargement
  `/attachments/<id>/download` suit les règles de la cellule : le tester avec le compte du rôle.
- **Espace d'équipe** (getgrist.com) : le document **hérite des droits de l'espace**, et tous les membres de
  l'équipe l'ouvrent ; sans ligne d'annuaire, ils ne voient que l'écran d'accès. À l'inverse, un **invité** qui
  ouvre l'accueil de l'équipe voit « Accès refusé » : lui donner le lien direct du document (`livraison.md`).

## Limites de « public, éditeur » (non corrigeables par les règles)

À écrire dans la liste des arbitrages et, si besoin, dans la passation :

- tout éditeur peut **forcer le rechargement** du document (`force-reload`), ce qui coupe les sessions ouvertes ;
- tout éditeur peut **téléverser des pièces jointes** non référencées (place occupée jusqu'au nettoyage des
  pièces orphelines ; personne d'autre ne les lit) ;
- modifier les **choix d'une colonne** (liste d'un statut, d'un critère) exige le droit de structure :
  propriétaires seulement. L'administration du module ne peut pas le faire : prévoir une table de référence si
  la liste doit vivre.

Vérifié sain pour un non-propriétaire (règle par défaut `-CRUDS`) : `/download` du `.grist`, `/sql`, `/copy`,
`/compare`, `/attachments/archive`, instantanés, webhooks, ajout d'une colonne à formule, modification des
sections (code du widget) et des règles d'accès sont refusés ; les exports CSV et XLSX par table respectent
les règles ; une connexion à l'adresse d'un autre est refusée.

## Relecture des droits (avant la recette)

- **Un agent sceptique, qui prouve** : chaque faille supposée est démontrée par l'API, avec **un client par compte
  de test** (clé de chaque rôle, anonyme par la clé du formulaire), sur un **document d'essais uniquement**.
  Une faille non prouvée reste une hypothèse ; une faille prouvée devient un correctif **et** un test
  (`tests-e2e/acces.test.js`), rejoué avant et après.
- Pistes à essayer à chaque fois : création avec des valeurs de traitement (statut, auteur, nom, date) ; statut
  hors liste ; écriture après retrait (désactivé, conflit, membre décoché) ; référence inexistante ou inactive ;
  doublon par l'administration ; dépôt anonyme dans les colonnes réservées ; colonnes calculées qui recopient
  une donnée masquée ; pièces jointes par rôle ; partage et `/access` ; points d'accès de la liste « vérifié
  sain ».
- Les **garde-fous d'écran** (masquer les avis des autres avant transmission, onglet caché) se documentent
  comme tels dans les arbitrages : ils ne protègent rien contre l'API.
- Correctifs sur un document existant (essai, recette, livré) sans le reconstruire :
  `npm run regles -- --doc <id> --simulation`, puis sans `--simulation` (colonnes d'aide ajoutées, déclencheurs
  alignés, règles remplacées et contrôlées).

## Tester (`tests-e2e/acces.test.js`)

Sur le Grist local, la connexion de test donne une clé d'API par adresse : chaque rôle est testé par l'API,
avec ses propres droits. **Jamais sur une instance distante, jamais sur un document que quelqu'un consulte** :
les tests écrivent des données fictives (garde-fou du kit, et `DOC_COURANT` pour viser un document d'essais).
Pièces jointes : un compte autorisé reçoit 200 sur `/attachments/<id>/download`, un compte non autorisé 403.
Formulaire public : `POST /api/s/<clé>/tables/<T>/records` sans authentification crée la ligne ; la lecture
par la même clé renvoie une liste vide. Couvrir au moins : inconnu, désactivé (lecture **et** écriture), usurpation d'adresse et de nom, chaque rôle
(lire, modifier, ce qui est refusé), statut hors liste, cloisonnement entre entités, gel après transmission,
colonnes réservées d'un dépôt anonyme. Calculer les attentes
d'après les données (jamais de liste figée) et ne remettre à zéro que les entités de test.
