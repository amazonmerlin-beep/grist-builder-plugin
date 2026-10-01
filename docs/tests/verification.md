# Vérification avec le skill (29/09/2026)

Mêmes scénarios que `reference.md`, sous-agents Sonnet ayant lu SKILL.md et les références utiles.

| Scénario | Sans skill | Avec skill |
|---|---|---|
| S1. Entrée mûre, 45 questions, 3 rôles | 6 j (5 à 7), pages natives | Diagnostic « mûre », calcul brique par brique : 1,05 j, **1,3 j marge comprise**, séances client à part ; kit, tests par rôle, guides, `.grist` vérifié |
| S2. Entrée floue | « 2 à 5 j indicatifs » | Diagnostic « floue », **pas de chiffre ferme**, cadrage de 1 à 2 j chiffré à part, questions dans l'ordre, catalogue validé par le client |
| S3. Identité et droits dans un widget | Règles seules | Connexions + déclencheur `user.Email`, attribut `user.Moi`, anti-usurpation, tout le monde « Éditeur », minuscules, table du widget lisible, 403, propriétaires, tests par rôle |
| S4. Construction par MCP | Code du widget « à héberger » | Code dans les options du widget (`_html`, `_js`), règles via `_grist_ACLRules` + contrôle de compilation, tests sur Grist local, limites du MCP |

Écart résiduel : en S2, une fourchette indicative (« de l'ordre de 1 j pour un petit formulaire ») est donnée,
assortie de réserves ; conforme à `cadrage.md` (fourchette, jamais de chiffre ferme).

Kit : essai de bout en bout sur un Grist local séparé (port 8485) : construction en 1,6 s, 8 tests unitaires,
6 tests de droits et 3 parcours Chrome verts, `.grist` produit et réimporté (6 tables, 3 réponses, 2 guides,
30 règles, module présent).

## Version 0.2.0 (30/09/2026) : retours de la mission DITND

Quatre scénarios nouveaux. Un sous-agent par scénario a répondu d'abord avec la version 0.1.0 (avant), puis avec
la 0.2.0 (après).

| Scénario | 0.1.0 (avant) | 0.2.0 (après) |
|---|---|---|
| S5. Pièces jointes en « CORS » pour les évaluateurs | Blocage « réseau local » vu, sans remède en local ; ni cookies, ni statut | Diagnostic ordonné (propriétaire, 403 légitime, réseau local, cookies) ; `lirePiece` ; chargeur local ; Chrome par défaut |
| S6. 29 notes par clic, CGU, 30 connectés | CGU hors de l'annuaire (déduit) ; « relire tout » | Table dédiée aux CGU ; relecture ciblée (`dependances`), `rendre: false`, redessin seulement si les données ont changé |
| S7. Formulaire public sur table fermée | **Échec** : publication inconnue ; règle `not user.Moi…` → `+C` trop ouverte | Publication par script en trois étapes ; `user.ShareRef` → `+C-RUD` ; test anonyme ; partage nominatif |
| S8. Reprise d'un document getgrist.com | **Échec** : pièces une à une (quota) ; stockage externe ignoré | Deux appels (`cloner.js`) ; stockage externe et correctif ; reprise rejouable ; lecteur tar |

**Kit** : vérifié sur une copie fraîche, dans un Chrome par défaut avec le chargeur local.
- 8 tests unitaires ;
- 8 tests de droits, dont les pièces jointes réservées et le formulaire anonyme ;
- 3 parcours ;
- 0 violation d'accessibilité ;
- `.grist` livré avec le chargeur public.

## Version 0.5.0 (01/10/2026) : revue design d'un projet client

Portage générique des constats vérifiés d'une revue design (rien de propre au client : noms, adresses,
identifiants et termes métier relus et retirés). Vérification **sans Grist, sans Docker et sans Chrome** (poste à
court de mémoire) : les contrôles dans le navigateur restent à rejouer (SUIVI.md, prochaines actions).

| Contrôle | Résultat |
|---|---|
| `node --check` (app.js, core.js, vue-aide.js, vue-exemple.js, build.js, formulaire.exemple.js, captures-guides.js, aligner-libelles-parametres.js, app.test.js) | sans erreur |
| Tests unitaires (`npm test`) | 14 / 14 (dont 3 nouveaux : `app.test.js`) |
| Assemblage du module (`node module/build.js`) | 5 fichiers, 50 Ko de JS, 24 Ko de CSS |
| Ordre des feuilles | `ui.css`, puis les feuilles du projet, puis `retouche-*.css` (feuilles temporaires) |
| `claude plugin validate` (marketplace et plugin) | validation réussie |
| Tests de droits, parcours Chrome, axe-core, zoom 200 %, `npm run captures` | **non lancés** |

`app.test.js` couvre, sans navigateur : la nature du focus (texte, choix, rien), la règle de redessin (jamais
pendant une saisie ni une fenêtre ; après un choix, seulement pour sa propre écriture), le retour par l'onglet
parent (`argRetour` depuis une sous-vue seulement). Non couverts sans navigateur : le focus rendu après redessin,
la hauteur d'en-tête au zoom, le masquage des noms dans les captures. Les sélecteurs des parcours sont gardés
(`#f-Q1_Nom`, `[data-action="transmettre"]`, une ligne par entité dans le suivi sans filtre).

### Second lot : règles d'accès (relecture d'un projet client)

Failles prouvées par l'API sur le document d'essais du projet (un client par compte de test), portées de façon
générique. Même contrainte : **ni Grist, ni Docker, ni Chrome** ; les formules ne peuvent donc pas être
compilées par le moteur.

| Contrôle | Résultat |
|---|---|
| `node --check` (acces.js, modele.js, acces.test.js, formulaire.exemple.js, appliquer-regles.js, partager.js, tests-e2e/acces.test.js) | sans erreur |
| Tests unitaires (`npm test`) | 20 / 20 (dont 6 nouveaux : `schema/acces.test.js`) |
| Syntaxe Python des 35 formules (règles et modèle, `$x` lu `rec.x`), `ast.parse(mode='eval')` | toutes valides |
| `claude plugin validate` (marketplace et plugin) | validation réussie |
| Compilation par Grist (`aclFormulaParsed`), `npm run test:acces` (4 cas nouveaux), `npm run regles` | **non lancés** |

`schema/acces.test.js` vérifie, sans Grist : forme des permissions et formules sans syntaxe JavaScript ;
`newRec` jamais avec R ou S ; toute règle `+C` hors administration conditionnée par la ligne ; statut borné
avant une modification ouverte (table à colonne `Statut`) ; garde `newRec.Doublon` avant la règle
d'administration (table à colonne `Doublon`) ; colonnes `reservee` à déclencheur sur elles-mêmes et formule
`… if user.ShareRef else value`. Les deux cas du formulaire public se sautent sans `schema/formulaire.js`.
## Version 0.4.0 (01/10/2026) : retours de la mission DITND, recette des écrans

Copie fraîche du kit, Grist local séparé (port 8486, compose `grist-kit-verif`, supprimé ensuite), Chrome par
défaut.

| Contrôle | Résultat |
|---|---|
| Construction | 4,4 s |
| Tests unitaires | 11 / 11 (dont 3 nouveaux : `tri.test.js`) |
| Tests de droits | 7 / 7, 1 sauté (pas de formulaire) |
| Parcours Chrome | 6 / 6 |
| axe-core | 0 violation |
| Zoom 200 % (7 écrans) | 0 débordement |

Contrôles à la main (Playwright, compte pilote) :
- **Tri** : à l'ouverture, « Entité » croissant (`aria-sort="ascending"`) ; clic sur « Statut » : Brouillon,
  Brouillon, Transmis, `aria-sort` déplacé, focus sur le bouton « Statut » ; second clic : ordre inversé,
  `descending` ;
- **titre d'onglet** masqué (`position: absolute`, classe `sr-only`), toujours présent pour le focus ;
- **sous-vue** déclarée avec `onglet: 'suivi'` : onglet « Suivi » surligné, titre de la page « Suivi — … ».

`corriger-formulaire.js` (retrait des questions) : exercé sur le projet d'origine, sur un Grist local puis sur
un document d'essai d'une instance réelle (66 → 54 → 39 questions, colonnes et données gardées, formulaire
publié relu dans Chrome).

## Version 0.3.0 (01/10/2026) : retours de la mission DITND, 30/09 au soir

Portage des améliorations génériques du projet DITND (rien de propre au client). Vérifié sur deux copies
fraîches du kit, Grist local séparé (port 8486, compose `grist-kit-verif`, supprimé ensuite), Chrome par défaut.

| Contrôle | Kit tel que livré | Kit avec formulaire public (`formulaire.exemple.js` activé) |
|---|---|---|
| Construction | 1,6 à 2,0 s | 2,0 s, 47 appels comptés (`compteur-appels.js`) |
| Tests unitaires | 8 / 8 | 8 / 8 |
| Tests de droits | 7 / 7, 1 sauté (pas de formulaire) | 8 / 8, dont l'envoi anonyme |
| Parcours Chrome | 6 / 6 | 6 / 6 |
| axe-core (7 écrans) | 0 violation | 0 violation |
| Zoom 200 % (7 écrans, fenêtre de 640 px) | 0 débordement | 0 débordement |

Parcours nouveaux : politique de confidentialité en fenêtre depuis l'écran d'accès (`{{contact_email}}` remplacé,
liens « nouvelle fenêtre » signalés) ; pastille « Suivi » qui augmente sans recharger et compte accepté reconnu
sans recharger ; bouton retour (`history.back()`), fenêtre fermée d'abord, adresse Grist inchangée.

Contrôles à la main (Playwright) :
- **Pastille** : pilote ouvert, `jeu-essai.js` lancé à côté (lignes ajoutées par l'API) : pastille « Suivi »
  de 1 à 3 en 19 s, texte lu « (3) », annonce « 2 nouvelles réponses transmises. », sans rechargement.
- **Éditeur du formulaire** : ancien comportement simulé (réglages sur les champs) : « Aucun choix configuré »
  affiché, choix absents ; après `corriger-formulaire.js`, et après une construction neuve : 0 occurrence,
  boutons radio « Brouillon » / « Transmis » visibles, 0 champ avec réglages propres.
- **Jeu d'essai** : 3 entités et lignes fictives, 3 PDF générés (valides, 2 pages, téléchargés en 200),
  6 appels ; `--retirer` enlève tout ; rejouable.
- **`--adresse`** : document d'essai à sa propre adresse, `doc-courant.json` inchangé.
- **`zoom.js`** : un élément de 900 px injecté est détecté (916 px pour 622 px visibles), un tableau large dans
  `.defil` ne l'est pas.

Défaut trouvé pendant la vérification et corrigé : avec `--adresse`, les tests Chrome attendaient l'adresse de
`projet.config.js` ; l'adresse est désormais notée dans `doc-courant.json` et suivie par `navigateur.js`. Autre
correction : la classe `fenetre-large` de `core.fenetre()` n'avait pas de style (`.fenetre.large` seulement).

`claude plugin validate .` : validation réussie, sans avertissement.
