'use strict';
// Réglages du projet : le premier fichier à adapter. Le reste du kit les lit ici.
module.exports = {
  nom: 'Enquête exemple',            // nom du document Grist
  urlId: 'enquete-exemple',          // adresse fixe : /o/docs/doc/<urlId>
  espace: 'Formulaires',             // espace de travail Grist
  titre: 'Enquête exemple',          // titre de la page et du module
  contactEmail: 'contact@example.org',
  // Rôles de l'annuaire ; « entite » : le compte est rattaché à une entité (département, commune…)
  roles: {
    repondant: { libelle: 'Répondant', entite: true },
    pilote: { libelle: 'Équipe de pilotage', entite: false },
    admin: { libelle: 'Administration', entite: false },
  },
  // Onglets du module par rôle : [identifiant de vue, libellé] ; le premier s'ouvre par défaut
  onglets: {
    repondant: [['reponse', 'Ma réponse'], ['aide', 'Aide']],
    pilote: [['suivi', 'Suivi'], ['aide', 'Aide']],
    admin: [['suivi', 'Suivi'], ['aide', 'Aide']],
  },
  // Onglet Aide : guides placés en fin de liste, dans une rubrique « Informations », dans cet ordre
  // (clés des guides ; « cgu » si le projet a des conditions d'utilisation)
  guidesEnFin: ['confidentialite', 'cgu'],
  // Veille : relecture rapide, par rôle, des tables qui font apparaître du nouveau sans recharger la page
  // (compte accepté, réponse transmise). Petites tables seulement : chaque relecture est un appel par table.
  // « Connexions » pour les rôles qui ne lisent que leur propre connexion : un compte accepté ou désactivé
  // change alors d'écran de lui-même. Supprimer la clé (ou secondes: 0) pour s'en passer.
  veille: {
    secondes: 20,
    tables: {
      inconnu: ['Connexions'],
      repondant: ['Connexions', 'Reponses'],
      pilote: ['Reponses'],
      admin: ['Reponses'],
    },
  },
  // Tables que le module lit (une table fermée par les règles est lue comme vide)
  tablesModule: ['Parametres', 'Entites', 'Annuaire', 'Connexions', 'Reponses', 'Guides'],
  // Après une écriture dans une table, le module relit aussi celles dont les formules en dépendent
  // (sinon il ne relit que la table écrite) : { Reponses: ['Entites'] }
  dependances: {},
  // Comptes de test du Grist local : [adresse, nom, rôle, entité]
  comptesTest: [
    ['admin@projet.test', 'Admin projet', 'admin', ''],
    ['pilote@projet.test', 'Pilote', 'pilote', ''],
    ['rep01@entite.test', 'Répondant E01', 'repondant', 'E01'],
    ['rep02@entite.test', 'Répondant E02', 'repondant', 'E02'],
  ],
};
