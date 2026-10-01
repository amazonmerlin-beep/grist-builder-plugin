# Arbitrages types

Chaque décision a une **valeur par défaut appliquée** : le projet avance sans attendre. Présenter la liste au
client (atelier ou note), noter la décision, l'appliquer. Qui décide : le client (C), l'hébergeur de
l'instance (H), nous (N).

| Décision | Par défaut | Qui | Remarque |
|---|---|---|---|
| Accès au document | Lien partagé « accès public, éditeur », filtré par l'annuaire | H, C | Sinon invitations nominatives (plus lourd ; chaque invité lit les adresses des autres invités, à dire dans la notice). Accord écrit de l'hébergeur si données personnelles. Limites du lien « éditeur » : rechargement forcé, pièces orphelines, choix des colonnes réservés aux propriétaires (`permissions.md`) |
| Envoi des courriels | Depuis la messagerie du client (lots en copie cachée, publipostage) | H | Priorité à vérifier : si l'instance envoie les courriels de Grist, les invitations deviennent simples |
| Rôles | Répondant (par entité), pilotage (lit tout), administration (comptes, paramètres) | C | Ajouter partenaire technique, lecteur extérieur si besoin |
| Propriétaires du document | Un référent du client et nous pendant le projet, le client seul ensuite | C | Un propriétaire voit et modifie tout : deux ou trois personnes au plus |
| Publication des réponses | Question en fin de questionnaire : nominative, agrégée, refus | C | Conditionne ce que lit un lecteur extérieur et les exports publiables |
| Données personnelles | Réservées au suivi ; durée affichée, validée par le DPO du client | C | Jamais dans les exports publiables ni chez un lecteur extérieur |
| Transmission | La réponse est figée après envoi ; le pilotage peut la rouvrir | C | |
| Questions ajoutées | Gardées et marquées « ajout à valider » | C | Ne jamais modifier en silence le questionnaire du client |
| Dates | Valeurs par défaut marquées « à fixer » | C | Ne jamais présenter une date par défaut comme décidée |
| Identité visuelle | Sobre, sans logo | C | Pas de charte d'État (DSFR, Marianne) pour un client qui n'est pas l'État |
| Chargeur du widget | Chargeur public de Grist Labs | H | Secondaire ; l'héberger sur l'instance supprime une dépendance tierce |
| Synthèse, carte | Seulement si la finalité les demande | C | Sinon exports |
