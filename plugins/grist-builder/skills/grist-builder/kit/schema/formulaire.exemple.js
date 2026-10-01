'use strict';
// EXEMPLE de formulaire public (formulaire natif de Grist, publié par construire.js). Pour l'activer :
// le copier en schema/formulaire.js, l'adapter, et ouvrir la création à la table cible dans schema/acces.js
// (['user.ShareRef', '+C-RUD', …], avant la règle finale de la table).
// Format :
// - TABLE : table qui reçoit les envois ; TITRE : nom de la page du formulaire ;
// - SECTIONS : la première liste est l'en-tête, chacune des suivantes une partie du formulaire ;
// - élément : { texte: 'Markdown', centre? } ou { col: 'Colonne', requis?, question?, lignes? }.
// Les réglages des questions sont posés sur la colonne, pas sur le champ (outils/lib/formulaire.js). Une colonne
// à choix de 6 valeurs au plus s'affiche en boutons radio. La description d'une colonne ne s'affiche PAS dans le
// formulaire publié : une aide à lire passe par `question` ou par un { texte } placé juste après le champ.
// Ici, pour l'exemple, la table Reponses du kit ; dans un projet, la table des dépôts (dossiers, candidatures…).
module.exports = {
  TABLE: 'Reponses',
  TITRE: 'Formulaire public',
  SECTIONS: [
    [
      { texte: '# Formulaire public (exemple)' },
      { texte: 'Les questions marquées d’un astérisque sont obligatoires.' },
    ],
    [
      { col: 'Entite', requis: true, question: 'Code de votre entité' },
      // Jamais de colonne réservée dans le formulaire (statut, contrôle, notes internes, publication, origine) :
      // le dépôt passe outre les règles d'accès ; le modèle les ramène à leur défaut (modele.js, « reservee »).
    ],
    [
      { col: 'Q1_Nom', question: 'Nom de la personne qui répond', lignes: 2 },
      { col: 'Q2_Effectif' },
      { texte: 'L’effectif sert à comparer les réponses entre entités de même taille.' },
    ],
    [
      // Mention courte obligatoire : la notice complète doit être lisible sans compte (site du client), car
      // le guide « confidentialite » du document n'est pas accessible aux déposants anonymes.
      { texte: 'Vos données servent uniquement à traiter votre envoi. Responsable, durées de conservation et droits : **politique de confidentialité, adresse à fixer**.' },
    ],
  ],
};
