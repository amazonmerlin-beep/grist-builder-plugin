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
