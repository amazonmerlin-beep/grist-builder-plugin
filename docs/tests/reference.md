# Scénarios de référence, sans le skill (29/09/2026)

Sous-agents Sonnet, sans outil, réponse en 150 mots au plus.

| Scénario | Réponse obtenue | Écart avec ce que le skill doit produire |
|---|---|---|
| S1. Entrée mûre : 45 questions, Word complet, 3 rôles, suivi, relances, exports, petite doc | **6 jours** (5 à 7) ; pages Grist natives ; 1 j de modèle, 1,5 j de formulaire, 1 j de droits | Surestimation (la grille donne environ 1 j + marge) ; aucun diagnostic de maturité ; pas de widget ni de socle |
| S2. Entrée floue : « un formulaire pour suivre nos partenaires » | Pas de chiffre ferme, « 2 à 5 jours indicatifs », échange de cadrage de 45 min | Correct sur le principe ; manque l'échelle mûre / partielle / floue et le cadrage chiffré à part |
| S3. Identité et droits dans un widget | Tout par les règles d'accès, table d'utilisateurs, refus par défaut, « Voir en tant que », casse des adresses | Ignore l'identité par table de connexions (déclencheur `user.Email`), l'attribut d'annuaire, tout le monde « Éditeur », le 403 d'une table fermée |
| S4. Construction par le MCP | Tables, pages, widget par MCP ; règles via `_grist_ACLRules` ; **code du widget à héberger à une URL** | Faux : le code se stocke dans le document (chargeur + options `_html`/`_js`) ; pas de tests rôle par rôle ; limites du MCP inconnues |
