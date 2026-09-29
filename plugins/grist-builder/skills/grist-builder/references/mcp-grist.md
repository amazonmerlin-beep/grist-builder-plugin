# Le MCP Grist

Le connecteur Grist de claude.ai (outils `grist_*`) agit **au nom du compte connecté** sur son instance
(getgrist.com par défaut). Commencer par `grist_help`.

## Ce qu'il fait bien

- Explorer : organisations, espaces, documents, tables, colonnes, pages, widgets ; requêtes SQL en lecture (`grist_query_document`).
- Construire : documents, tables, colonnes (types, formules, choix), enregistrements, pages et widgets,
  options et réglages d'un widget personnalisé (`grist_set_custom_widget_options` : on peut y poser le
  code du module, `_html` et `_js`, comme le fait `deployer-module.js`).
- Règles d'accès : `grist_get_grist_access_rules_reference` donne la syntaxe ; les règles sont des lignes
  des tables `_grist_ACLResources` et `_grist_ACLRules` (même format que `schema/acces.js`).
- Un document POC complet a été construit par MCP en une vingtaine de minutes.

## Ses limites

- Il agit sous **un seul compte** : impossible de tester les droits rôle par rôle ; utiliser « Voir en tant
  que » de Grist, ou mieux, construire et tester sur le **Grist local** du kit (connexion de test).
- Pas de renommage de document observé, pas de création de graphiques natifs (les faire dans le module).
- Pas d'export `.grist` : le télécharger depuis l'interface (menu du document).
- Gros volumes (des centaines de colonnes, de règles) : les scripts du kit sont plus sûrs et rejouables.

## Quand l'utiliser

| Situation | Choix |
|---|---|
| Maquette rapide, démonstration au client, exploration d'un document existant | MCP |
| Petite correction sur le document du client (paramètre, guide, ligne d'annuaire) | MCP |
| Construction du formulaire livré, règles d'accès, tests | Scripts du kit sur Grist local, puis `.grist` importé chez le client |
| Instance sans accès API (pas de clé) | Construire en local, livrer le `.grist` ; le MCP ou l'interface pour les retouches |
