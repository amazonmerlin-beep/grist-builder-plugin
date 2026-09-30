# Reprise d'un document existant : cloner, étudier, migrer

Quand le client a déjà un document Grist (souvent sur getgrist.com) à refondre ou à migrer vers une autre
instance.

## Cloner sans épuiser le quota

- **Quota.** Le plan gratuit d'équipe de getgrist.com est limité à **3 000 appels d'API par mois**, 10 membres,
  2 invités par document, 5 000 lignes. Lire `GET /api/docs/<id>` (champ `features`) avant tout.
- **Deux appels suffisent** (`node outils/cloner.js <docId>`, avec `GRIST_URL` et `GRIST_API_KEY`) :
  - `GET /api/docs/<id>/download?nohistory=true` renvoie le `.grist`, sans l'historique ;
  - `GET /api/docs/<id>/attachments/archive?format=tar` renvoie toutes les pièces jointes en un seul
    fichier.
- **Ne pas télécharger les pièces une par une** : un appel par fichier.
- **Compter** : précharger `outils/lib/compteur-appels.js` devant chaque outil
  (`node -r ./outils/lib/compteur-appels.js outils/cloner.js <docId>`) : nombre d'appels affiché, journal
  `grist-local/appels.log` avec le total du mois.
- **Clé d'API** : dans un fichier ignoré par git (`*.secret`), jamais affichée, jamais copiée dans un livrable.
- **Données personnelles** (CV, adresses) : le clone reste sur le poste. Ne pas le mettre dans un dépôt.

## Étudier hors ligne

- Le `.grist` est un fichier **SQLite** : Python `sqlite3`, ou Node 22.5+ `node:sqlite`. Aucun appel d'API.
- **Structure** : `_grist_Tables`, `_grist_Tables_column` (formules, `recalcWhen` : déclencheurs),
  `_grist_Views_section` (pages et widgets), `_grist_ACLResources` / `_grist_ACLRules` (droits),
  `_grist_Shares` (formulaires publiés).
- **Code d'un widget maison** : dans `_grist_Views_section.options` → `customView` (JSON dans du JSON) →
  `widgetOptions._html` et `_js`. L'extraire dans des fichiers, puis le faire analyser par un sous-agent
  (80 Ko et plus).
- **Profil des données** : taux de remplissage, graphies multiples d'une même valeur, JSON stockés dans du
  texte. Ce profil justifie la refonte auprès du client.
- **Reproduire un défaut signalé** : importer le clone dans le Grist local (`POST /api/workspaces/<ws>/import`)
  et tester **sous le compte concerné, jamais le propriétaire**.

## Pièces jointes : le piège du stockage externe

getgrist.com range les fichiers dans un stockage externe. Le `.grist` téléchargé ne contient pas les
fichiers : chaque ligne de `_gristsys_Files` pointe vers ce stockage (`storageId`), et
`documentSettings.attachmentStoreId` vaut quelque chose comme `…-snapshots`. Importé ailleurs tel quel,
**chaque téléchargement renvoie 500** : `Store '…' is not a valid and available store`.

Pour garder le document tel quel :
1. importer le `.grist` ;
2. basculer le document sur le stockage de l'instance : `POST /api/docs/<doc>/attachments/store`
   `{"type":"internal"}`, ou `external` si l'instance en propose un ;
3. réimporter l'archive : `POST /api/docs/<doc>/attachments/archive` (champ `upload`, `.tar`, type
   `application/x-tar`). Vérifier le retour `{added, errored, unused}`.

Dans une refonte, on redépose plutôt les fichiers dans le nouveau document (`POST /attachments` par lots),
après avoir lu l'archive. Chaque entrée s'appelle `<sha1>_<nom>`, et `fileIdent = <sha1>.<ext>` fait le lien
avec `_grist_Attachments`. Le kit fournit le lecteur (`outils/lib/tar.js`, `piecesParEmpreinte(archive)`), qui évite l'outil `tar`,
lequel prend `C:` pour un hôte distant sous Git Bash.

## Reprendre les données dans le document refondu

- Le script de reprise s'écrit par projet (`outils/reprendre.js`) : il est **rejouable** (`--remplacer`) : il lit le `.grist` (SQLite), écrit dans le document
  construit par le kit et garde un `Ancien_id` sur chaque ligne.
- **Normaliser à la reprise** :
  - adresses en minuscules, sans espaces ;
  - organismes dédoublonnés par une clé sans accents ni ponctuation ;
  - JSON éclatés en lignes (un avis = une ligne) ;
  - identifiants des référentiels mis en correspondance par une colonne `Ancien_id`.
- **Valeurs explicites** : dates et auteurs d'origine l'emportent sur les déclencheurs. Exception : une
  colonne à déclencheur qui dépend d'une **autre** colonne à déclencheur est recalculée et écrase la valeur
  posée (voir `donnees.md`).
- **Exports tableur** (`.xlsx` d'un export Grist ou Excel, archive d'une campagne précédente, liste de comptes) :
  `outils/lib/xlsx.js`, lecteur sans dépendance (`lireFeuille(fichier, feuille?)` → `{ entetes, lignes }`).
  Il lit les chaînes, nombres et booléens, et la valeur enregistrée des formules ; pas les classeurs chiffrés.
  Une reprise d'appoint (données absentes de l'ancien document) ne crée que ce qui manque et propose un mode
  `--essai` (bilan sans écrire).
- **Tests de reprise** : bilan chiffré (lignes par table), contrôle des doublons, échantillon ouvert dans le
  module.
- **Instance cible** (instance d'État, par exemple) : mêmes scripts avec `GRIST_URL` et `GRIST_API_KEY`. Refaire
  sur place les essais de pièces jointes et de formulaire.
