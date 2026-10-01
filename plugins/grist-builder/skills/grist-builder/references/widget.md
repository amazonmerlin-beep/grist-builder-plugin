# Widget personnalisé : toute l'interface dans une page

## Architecture (celle du kit)

- **Une page, un widget.** Le code (HTML, CSS, JS) est **stocké dans le document**, dans les options du
  widget (`_html`, `_js`). Il est lancé par un **chargeur** : le *Custom widget builder* de Grist Labs. Rien
  n'est à héberger : le code voyage dans le `.grist`. Le kit l'assemble (`module/build.js`) et le pousse
  (`outils/deployer-module.js`).
- **Accès complet** : `grist.ready({ requiredAccess: 'full' })`. Le widget lit et écrit avec les droits de
  la personne connectée ; ce sont les règles d'accès qui protègent, pas le JavaScript.
- **Rattacher le widget à une table lisible par tous** (Parametres dans le kit). Grist n'affiche pas un
  widget dont la table est fermée à l'utilisateur, et un compte non reconnu verrait une page vide.

## Le chargeur : public ou local

| Où | Chargeur | Pourquoi |
|---|---|---|
| Instance publique (getgrist.com, instance d'État) | Public `gristlabs.github.io/…/custom-widget-builder` (défaut du `.grist` livré) | Tout est public. `grist-plugin-api.js` ne parle qu'à la page Grist qui contient le widget : il marche avec n'importe quelle instance |
| Grist local (`localhost`) | **Copie servie par le Grist local** (`grist-local/chargeur/`, choisie par `construire.js`) | Chrome **bloque les appels d'une page publique vers localhost** (protection « réseau local »), sans même le proposer : `net::ERR_FAILED` sur les pièces jointes |
| Instance qui filtre github.io, ou chargeur tiers refusé | La même copie, hébergée sur l'instance ou par le client ; `construire.js --chargeur <url>` | Plan B seulement. Ne pas le proposer d'emblée |

Les tests se lancent dans un **Chrome par défaut, sans lever cette protection**. Ne pas utiliser
`--disable-features=LocalNetworkAccessChecks,…` : ces options masquent le problème que l'utilisateur
rencontrera.

## Identité : le widget ne connaît pas l'utilisateur

L'API du widget ne donne ni adresse ni rôle. Procédé du kit :
1. à l'ouverture, le module ajoute une ligne à **Connexions** ;
2. le **déclencheur** `user.Email` (formule appliquée à la création) y inscrit l'adresse réelle ;
3. des formules y lisent le rôle, l'entité et l'identifiant du compte (`Compte`) dans l'**annuaire** ;
4. la règle `rec.Email == user.Email` interdit d'écrire l'adresse d'un autre : pas d'usurpation.

Ne pas mémoriser l'identité dans le navigateur : en changeant de compte dans le même onglet, elle resterait
l'ancienne. Un compte en lecture seule ne peut pas écrire sa connexion : tout le monde doit être « Éditeur ».

**Ne jamais écrire dans l'annuaire pour une action courante.** L'annuaire porte les droits : toute
modification de cette table recharge le document chez tous les connectés. Acceptation des CGU,
préférences, dernière visite : chacune dans sa propre table, écrite par un déclencheur `user.Email`.

## Lire, écrire, rafraîchir

- `grist.docApi.fetchTable(t)` renvoie des **colonnes** ; les listes arrivent encodées `['L', …]`, les
  erreurs `['E', …]`, et une cellule masquée par une règle qui dépend de la ligne vaut `['C']`. Décoder
  (`core.js`). Une table fermée par les règles lève une erreur : la traiter comme vide.
- **Relire le moins possible.** Après une écriture, `appliquer()` ne relit que la table écrite et celles qui
  en dépendent (`dependances` dans `projet.config.js`). Relire toutes les tables à chaque clic (le comportement
  d'origine du kit) rend une grille de notation inutilisable : plusieurs milliers de lignes et une page
  redessinée à chaque clic.
- **Ne pas redessiner ce qui est déjà à l'écran.** Les saisies (texte, bouton basculé sur place) s'écrivent avec
  `{ rendre: false }` ; l'interface met à jour le DOM elle-même (compteurs, `aria-pressed`). Les boutons radio
  qui changent un statut affiché redessinent.
- **Signaler l'enregistrement sur place** : `C.maj(…, { rendre: false }).then(() => C.signalerEnregistre(el))`
  (marque verte 2 s, annonce « Modification enregistrée. » dans une zone `role="status"` hors de la racine
  redessinée). Une phrase « Les modifications sont enregistrées automatiquement. » en tête des écrans de
  réglages. Sans retour, une utilisatrice non technicienne ne sait pas si sa correction est prise.
- **Redessiner seulement si les données ont changé**, pour les relectures périodiques (60 à 90 s) et
  `grist.onRecords`, qui ne signale que la table du widget. Jamais pendant une saisie de texte ni une fenêtre
  ouverte. **Un choix** (liste, case, bouton radio, champ fichier) **redessine après sa propre écriture** : Chrome
  et Edge donnent le focus à la case cliquée, et l'ancien test « un champ a le focus » laissait l'écran périmé
  (badge, bouton, avertissement inchangés) ; l'écriture d'un autre ne redessine pas, pour ne pas refermer une
  liste ouverte (`natureFocus`, `redessinPermis` dans `app.js`, testés par `module/test/app.test.js`).
- Quand il faut redessiner le même écran, **garder la position, les `<details>` ouverts** (retrouvés par leur
  `id` : en donner un à ceux d'une liste filtrable, sinon c'est leur rang qui compte et il change) **et le
  focus** : `rendre()` le rend à l'élément actif (par son `id` ou ses `data-*`), sinon au titre de sa section,
  sinon au titre de l'écran (RGAA 12.8). Après « Passer à … », le bouton disparaît : le focus ne doit pas
  tomber sur le document.
- **Chaque écriture porte ses identifiants** dans l'élément qui la déclenche (`data-examen`,
  `data-critere`…). Ne jamais écrire, après un délai, dans « l'élément affiché », qui a pu changer
  entre-temps : c'est le bug classique du commentaire rattaché à la mauvaise fiche.
- Une seule création à la fois par clé : deux clics rapides ne font pas deux fiches. Attendre les écritures
  en cours avant une transmission.

## Voir le nouveau sans recharger : veille, pastilles, changement d'identité

`grist.onRecords` ne signale que la table du widget (Parametres) : les écritures des autres ne se voient qu'à
la relecture périodique (90 s). Pour ce qui doit apparaître vite, le kit a une **veille**
(`veille` dans `projet.config.js`) :
- toutes les N secondes (20 par défaut), relecture des **quelques petites tables du rôle** qui font apparaître du
  nouveau (demandes, dépôts, réponses transmises) ; redessin seulement si elles ont changé. Pas les grosses
  tables : chaque relecture coûte un appel par table ;
- **pastilles des onglets** : une vue déclare `A.pastilles[vue] = { compter, annonce }` (exemple dans
  `vue-exemple.js`). Le nombre s'affiche sur l'onglet (`.pastille-onglet`, doublé d'un texte masqué lu par les
  lecteurs d'écran), se met à jour sans redessiner l'écran, et une annonce (`role="status"`) signale une hausse ;
- **changement d'identité** : la ligne de `Connexions` suit l'annuaire par ses formules. Relue par la veille
  (rôles qui ne lisent que leur propre connexion, et inconnus), elle fait passer un compte accepté à ses
  onglets sans recharger la page (`identiteChangee` : tout relire d'abord, les règles ont changé), et un compte
  désactivé à l'écran d'accès.

## Bouton « retour » du navigateur

Chaque changement d'écran (`aller(vue, arg)`) pousse une entrée d'historique : le bouton ou le geste
« retour » revient à l'écran précédent du module, ferme d'abord une fenêtre modale ouverte, et ne sort de Grist
qu'une fois revenu au premier écran. L'entrée est poussée sur **le cadre du chargeur** (`window.parent`, même
origine ; repli sur `window`), avec `replaceState` au démarrage et l'écoute de `popstate` sur ce même cadre.
Pourquoi pas le cadre du module : le chargeur y écrit le module par `document.write`, et Chrome, au retour,
recharge ce cadre au lieu d'y revenir. `aller(vue, arg, { historique: false })` change d'écran sans entrée
(retour lui-même, changement d'identité). Test : `history.back()` sur la page (le `goBack()` de Playwright
attend un chargement qui n'arrive pas).

**Filtres, recherche et tri ne passent pas par `aller()`** : chaque choix pousserait une entrée d'historique
(le retour défait les filtres un à un) et enverrait le focus au titre (au clavier, chaque flèche d'une liste
déclenche un `change` et fait perdre la liste). Le motif : `etat.arg = { ...etat.arg, [clé]: valeur }`,
`A.memoriser()` (note l'état dans l'entrée courante, `replaceState`), `A.rendre()`, puis focus rendu au filtre
(exemple : `filtre-suivi` dans `vue-exemple.js`). L'action `trier` du kit fait de même ; sans `memoriser`, un
retour depuis une fiche restaure un tri périmé.

**Revenir à la liste par l'onglet parent** : depuis une fiche (vue avec `onglet: 'liste'`), un clic sur l'onglet
surligné rappelait `aller('liste', {})` et perdait filtres et tri : qui traite une à une les fiches d'une liste
filtrée devait refiltrer entre chacune. Une vue de liste déclare `argRetour: () => filtres` (notés à son dernier rendu) ;
`app.js` les reprend quand on vient d'une de ses sous-vues, et repart à zéro depuis un autre onglet.

## Écrans : onglets, titres, états, listes

Retours d'une recette avec le client : l'interface doit dire où l'on est sans le répéter.
- **Sous-vue sous l'onglet de sa liste** : une vue déclare `onglet: '<vue de la liste>'` (`ongletDe()` dans
  `app.js`) ; une fiche ouverte depuis la liste garde l'onglet surligné (`aria-current`) et le titre de la page.
  Sans cela, aucun onglet n'est surligné et l'utilisateur se croit perdu.
- **Pas de titre qui répète l'onglet** : sur un écran d'onglet, le `h2` est `class="sr-only"`. Il reste pour le
  focus au changement d'écran et la structure des titres (RGAA 9.1). Les titres visibles portent une
  information (nom de la fiche, de la séance).
- **Pas de fil d'Ariane à un niveau** : l'onglet surligné et le bouton retour suffisent. Plus bas, un seul lien
  « ← <parent> ».
- **Compteurs d'un tableau de bord** : grouper les statuts selon **qui doit agir** (« À traiter », « En
  cours », « Terminés »), une aide par statut (« à contrôler », « à publier »), le groupe « À traiter » mis en
  avant, les zéros estompés, « / total » sur les cases non nulles. Une rangée uniforme de chiffres ne se lit pas.
- **États et actions séparés** : un cycle (préparation, ouverte, clôturée…) s'affiche en **frise numérotée
  non cliquable** (`ol`, `aria-current="step"`, « (étape actuelle) » masqué), et à côté **une seule action
  principale**, « Passer à « … » », avec un lien d'aspect discret pour revenir en arrière. Dire ce que voient les
  personnes à l'étape actuelle et ce que changera la suivante (le même texte sert à la confirmation). Des
  pastilles d'état à côté de boutons de même forme se confondent.
- **Longues listes de cases** (membres, destinataires) : « Tout sélectionner », « Tout désélectionner » (avec
  confirmation), « Reprendre ceux de <la fiche précédente> » ; cases groupées par catégorie (structure), avec un
  compte « 2 / 4 » et une bascule par groupe ; **une seule écriture** par action. Une nouvelle fiche reprend
  d'office la sélection de la précédente. Afficher l'adresse à côté du nom : des comptes d'essai portent
  souvent le même nom.
- **Tableaux triables** : `core.trier(lignes, cols, etat.arg, defaut)` et `core.enteteTri(cols, etat.arg,
  defaut)`, action `trier` dans `app.js` (exemple : `vue-exemple.js`). Colonnes `[clé, libellé, valeur,
  sens par défaut]` ; bouton dans chaque en-tête, `aria-sort` sur la colonne triée, légende masquée (« les
  boutons d'en-tête trient la liste »). Le redessin se fait sur place (pas d'entrée d'historique) et rend le
  focus au bouton cliqué ; cases vides en fin de liste dans les deux sens ; un export suit l'ordre de l'écran.

## Écrans : retours d'une revue design

Motifs retenus après une revue design complète d'un outil de dépôt et d'évaluation (méthode : `livraison.md`).
- **Hiérarchie des boutons** : **un seul bouton plein par zone d'action** (l'action principale de l'écran, de la
  carte ou de la fenêtre) ; les actions répétées sur chaque ligne ou carte en `.btn.secondaire.petit` ; retour,
  annulation et suppression rare en lien (`.btn.lien`, `.btn.lien.danger`). Trois boutons pleins « Voir » sur
  des cartes font perdre l'action principale de l'écran ; une action d'écriture n'a pas sa place dans un en-tête
  de tableau de lecture (« Rouvrir » sous chaque nom de colonne : la mettre dans une ligne, avec un nom complet).
- **Listes longues en dossiers repliés** : au-delà de quelques fiches, une liste dépliée ne se lit plus (la
  première remplit l'écran). Un `<details class="accordeon" id="…">` par fiche, son **badge d'état** dans le
  résumé (« Prêt », « Il manque … », « Publié le … »), une ligne de synthèse au-dessus (« 30 : 12 prêts, 14
  incomplets, 4 publiés ») et un **filtre** sur ces états. Le badge dit ce qui distingue les fiches, pas ce
  qu'elles ont toutes en commun.
- **Cartes de suivi** : une **barre d'avancement** (`.avancement`, `n / total` lu « n sur total » :
  `<span aria-hidden="true"> / </span><span class="sr-only"> sur </span>`), et sur chaque carte **l'action à
  faire** pour la personne qui la lit : « Commencer », « Reprendre », « Consulter ». **Trier par urgence** (en
  cours, à faire, terminé), pas par date de création. Un bouton qui mène à un écran encore fermé (« Synthèse »
  avant l'ouverture) est une impasse : proposer à la place le geste utile du moment.
- **Aller à l'essentiel** : quand l'action attendue est loin en bas (décision après une longue grille), un état en
  tête d'écran (« Décision à prendre ») et un bouton « Aller à la décision » (`scrollIntoView` + focus sur le
  titre ; pas d'ancre `href="#…"`, qui ajouterait une entrée d'historique hors du mécanisme du module) ; une
  barre « Aller au prochain critère sans réponse » ; à la transmission, chaque manque marqué et le premier
  focalisé (section repliée rouverte d'abord).
- **Libellés d'affichage distincts des valeurs stockées** : une table `valeur → libellé` (« Brouillon » → « En
  cours », « Non commencée » → « À faire ») dans la fonction de badge, rien dans les données. **Ne jamais
  comparer le texte d'un badge** : poser `data-etat="<valeur stockée>"` et le tester. Deux statuts de sens
  différent ne partagent pas la même couleur sur un même écran.
- **Aucun texte de développeur devant un utilisateur métier** : clés techniques sous les libellés (en `title`
  au plus), commandes (`npm run …`), « table X des données brutes », noms de colonnes, mentions de chantier
  (« à fixer », « à confirmer », « posée à la construction ») dans des libellés validés, valeur brute d'un champ
  technique (« Formulaire le 01/10 » : écrire « déposé par le formulaire public le … »). Les libellés de
  `Parametres` se corrigent dans `schema/modele.js` puis sur les documents existants
  (`npm run parametres`) ; une question encore ouverte va dans la liste des arbitrages, pas dans le libellé.
- **Filtres** : sans `aller()` (voir « Bouton retour »), un compteur « 12 sur 80 » quand un filtre réduit la
  liste, et une **liste vide qui le dit** avec « Effacer les filtres » (le tri est gardé). Pas de `role="status"`
  sur un compteur recréé à chaque rendu : il n'est pas annoncé de façon fiable ; le focus rendu au filtre suffit.
- **Erreurs sous le champ, pas en toast** (RGAA 11.10, 11.11) : `<p class="erreur-champ" id="…-err">` sous le
  champ, `aria-invalid="true"` et `aria-describedby` posés seulement quand l'erreur s'affiche, focus sur le
  champ à la validation d'un bouton. Champs obligatoires et facultatifs marqués dans le libellé visible ; un
  `placeholder` n'est pas une étiquette (il disparaît à la saisie).
- **Champ fichier accessible** : jamais `display: none` sur l'`input type="file"` (inatteignable au clavier) ;
  `<label class="btn secondaire petit">Ajouter<span class="sr-only"> : <pièce></span><input type="file"
  class="sr-only" data-action-fichier="…"></label>`, contour par `label.btn:focus-within` (`ui.css`). Des
  boutons « Ajouter » répétés ont chacun leur nom complet.
- **Saisie assistée avec création à la volée** (structure, organisme, catégorie) : `<input list="…">` et un
  `<datalist>` du référentiel ; à l'enregistrement, la valeur est comparée sans accents ni casse au libellé et
  au code ; inconnue, l'élément est créé dans le référentiel puis rattaché (une seule création par libellé),
  et la ligne enregistrée est signalée. Placeholder court (« Choisir ou saisir ») : il est tronqué dans une
  colonne étroite. Une liste déroulante de 200 entrées, ou un référentiel à compléter d'abord dans un autre
  écran, ralentit tout.
- **Ajout dans une liste** : `.note.succes` qui dit ce qui vient d'être fait et la suite (« message
  d'invitation proposé »), ligne ajoutée surlignée (`tr.ligne-nouvelle`).
- **Lecture seule lisible** : pas d'`opacity` sur un choix fait (contraste), le choix gardé en couleurs et les
  autres estompés par des couleurs pleines ; boutons qui n'ont plus d'effet retirés (pas laissés actifs).
- **CSS de retouche en fichiers séparés** : pour paralléliser des correctifs par zone (plusieurs agents, sans
  conflit d'édition), chaque zone dépose `module/src/retouche-<zone>.css` ; `build.js` les charge **en dernier**
  (après `ui.css` et les feuilles du projet) : à spécificité égale, ils l'emportent. Chaque règle porte en
  commentaire le constat qu'elle corrige ; les fusionner dans les feuilles du projet une fois la recette passée.

## Pièces jointes

**Méthode** (`core.lirePiece`) :
- jeton du widget **en lecture seule** (`getAccessToken({ readOnly: true })`) ;
- `fetch(baseUrl + '/attachments/<id>/download?auth=…', { credentials: 'omit' })` ;
- **lire le statut** avant `blob()` ;
- aperçu dans la page par `URL.createObjectURL`.

Pour les métadonnées, lire `/attachments/<id>?auth=…` pièce par pièce, et garder les noms en cache.

**Ne jamais mettre le jeton dans un `href`.** Il donne accès en écriture, il reste dans l'historique du
navigateur et il expire au bout de quelques minutes.

Pour un envoi (`POST /attachments?auth=…`), l'en-tête `X-Requested-With: XMLHttpRequest` est exigé :
sans lui, Grist répond 401, que le navigateur affiche « Failed to fetch ».

**Diagnostic d'un aperçu qui échoue** (« CORS », « Failed to fetch », « le serveur ne répond pas ») :

| Symptôme | Cause | Remède |
|---|---|---|
| Tout marche en navigation normale, rien en navigation privée | La navigation normale est connectée en **propriétaire**, qui passe outre les règles | Tester sous le compte concerné, en local (connexion de test) |
| **403** `Cannot access attachment` (ou 404 `Cannot access cell` avec l'indication de cellule) | Refus légitime : la ligne n'est pas lisible par ce compte (rattachement manquant) | Corriger les données ou la règle. **Ne pas ouvrir la table** |
| Requête sans statut, « Failed to fetch », `net::ERR_FAILED`, **en local seulement** | Protection « réseau local » de Chrome : chargeur public et Grist sur localhost | Chargeur local (voir plus haut) |
| 403 `Credentials not supported for cross-origin requests` | Requête envoyée avec des cookies (`credentials: 'include'`) ou un en-tête `Authorization` | `credentials: 'omit'`, jeton en paramètre |
| 500 `Store '…' is not a valid and available store` | Document importé d'une instance à stockage externe | `reprise.md` |

Le stockage externe ne change rien en fonctionnement normal : Grist lit le fichier côté serveur et le renvoie,
sans redirection. Grist sert les fichiers avec `Content-Security-Policy: sandbox`, et Chrome refuse d'afficher
un PDF dans un cadre à cette adresse : passer par un blob.

## Sécurité et qualité

- **Échapper tout texte** venant du document avant de l'insérer en HTML : réponses, guides, et contenus saisis
  par des tiers dans un export (`html.escape` côté formule).
- Bibliothèques externes : version figée **et empreinte SRI** (`integrity`) ; sinon le code chargé agit avec
  les droits de chaque utilisateur. Éviter les versions npm abandonnées (SheetJS : prendre `cdn.sheetjs.com`).
- **CSS préfixé ou vérifié.** Une classe réutilisée casse la mise en page. La racine du module porte la classe
  `.formulaire` : aucune autre règle ne doit viser `.formulaire` ou `.formulaire label`. Même piège entre deux
  écrans du projet : une classe générique (`.etapes`) définie pour l'accueil en grille a déformé la frise
  d'une autre page. Chercher la classe dans tous les CSS avant de la réutiliser.
- Tester dans un vrai navigateur (Playwright, Chrome installé : `tests-e2e/`), rôle par rôle. Les outils
  attendent que le module soit **prêt** (`Formulaire.core.etat.vue`) : le HTML du widget s'affiche avant
  que son code ait fini de démarrer.
- Les réseaux de collectivités filtrent parfois les CDN et les fonds de carte : prévoir un fonctionnement
  dégradé (le module marche sans carte).

## Accessibilité (RGAA 4.1)

Ce que le kit fait déjà :
- langue `fr` et titre de page par écran (8.3, 8.5) ;
- focus sur le titre à chaque changement d'écran ;
- fenêtres modales : focus placé, maintenu, rendu à la fermeture, fond `inert` (7.1, 12.8) ;
- messages en `role="status"` (7.5) ;
- liens qui ouvrent une nouvelle fenêtre annoncés (13.2) : `core.signalerNouvellesFenetres(el)`, appelé après
  chaque rendu et dans `fenetre()`, ajoute à tout `a[target=_blank]` un texte masqué « (nouvelle fenêtre) » et la
  classe `nouvelle-fenetre` (pictogramme ↗ en CSS) ;
- en-têtes de colonne `th scope="col"` (5.7), guides Markdown compris ;
- en-têtes de tableau qui passent à la ligne sous 760 px, classe `.defil` pour un tableau large (10.4) ;
- focus rendu après un redessin du même écran (12.8) ; enregistrement annoncé (`signalerEnregistre`) ;
- en-tête qui **ne colle plus** en petite largeur ou petite hauteur (zoom à 200 %, `max-width: 760px` ou
  `max-height: 560px`) et `--h-entete` remis à 0 ; onglets qui **passent à la ligne** au lieu de défiler sans
  signe visible ; contour de focus des onglets dessiné à l'intérieur (pas rogné) ;
- en-têtes de tableau collés **sous** l'en-tête fixe (`top: var(--h-entete)`), statiques dans un `.defil` (le
  collage y est sans effet et le décalage descendrait la ligne d'en-tête dans le tableau) ;
- bordure des champs à au moins 3:1 (`--c-bordure-champ`, 3.3 ; `--c-bordure` reste aux cartes) : un thème qui
  redéfinit la règle des champs avec `--c-bordure` (souvent #DDD, 1,4:1) la casse, vérifier l'ordre des feuilles ;
  bordure d'erreur `aria-invalid` qui l'emporte ;
- champ fichier focalisable dans son `label.btn`, accordéons `details.accordeon`, sommaire « Dans ce guide »
  repliable (replié sous 860 px, sans `display: none` : 10.4).

À faire dans chaque écran :
- une étiquette pour chaque champ, `aria-label` dans les tableaux (11.1) ;
- `fieldset` et `legend` pour les boutons radio (11.5) ;
- `aria-pressed` et `aria-expanded` pour les bascules ;
- motif `tablist` pour les onglets (7.1) ;
- `th scope="col"` sur chaque en-tête de colonne ; `th scope="row"` pour l'en-tête d'une ligne (5.7) ;
- tout tableau qui peut dépasser la largeur dans `<div class="defil">` : il défile seul, pas la page.

Motifs utiles :
- **Cellule codée** (abréviation, pastille de couleur, pictogramme) : l'abréviation visible est masquée aux
  lecteurs d'écran, le libellé complet est lu à sa place :
  `<span aria-hidden="true">P</span><span class="sr-only">Partiellement</span>`. Même chose pour un
  pictogramme qui porte un sens (« avec commentaire »).
- **Bouton icône** : `aria-label` explicite, qui dit l'action et son objet (« Commenter : question 12 »), et, si
  la place le permet, un libellé visible court à côté de l'icône (« 💬 Commenter ») ; icône en
  `aria-hidden="true"`. Un `title` seul ne suffit pas. Le nom accessible **contient le texte visible**, au début
  (« Non att. (non atteint) », pas « Non atteint » seul ; WCAG 2.5.3, RGAA 6.1) : sinon la commande vocale échoue.
  Une bascule garde un nom fixe ; son état passe par `aria-expanded` ou `aria-pressed`.

Contrôles :
- sommaire : `node tests-e2e/rgaa.js` (axe-core, WCAG 2.1 A et AA, sur les onglets de chaque rôle) ;
- **zoom à 200 %** (10.4) : `node tests-e2e/zoom.js`. Une fenêtre de 640 px de large équivaut à un écran de
  1280 px zoomé à 200 % ; pour chaque écran, le script compare la largeur du contenu du module (`scrollWidth`)
  à sa largeur visible et cite les éléments qui dépassent. Ajouter les écrans hors onglets (fiche, fenêtre)
  propres au projet. Les regarder aussi : un texte coupé ne se mesure pas ;
- ce qu'aucun outil ne voit : un parcours au clavier seul, un lecteur d'écran (NVDA et Firefox).
