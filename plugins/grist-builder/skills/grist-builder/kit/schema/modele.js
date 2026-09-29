'use strict';
// Modèle du document. Socle, à garder : Parametres, Entites, Annuaire, Connexions, Guides.
// Reponses : exemple d'une réponse par entité, à remplacer par le modèle du projet.
// Colonne : { id, type, label, formule?, declencheur? ('ajout' | 'modif' | [colonnes]), options?, description? }
const { roles, titre, contactEmail } = require('../projet.config');

const ROLES = Object.keys(roles);
const TZ = 'DateTime:Europe/Paris';
const DATETIME = { dateFormat: 'DD/MM/YYYY', isCustomDateFormat: true, timeFormat: 'HH:mm', isCustomTimeFormat: true };

const TABLES = [
  {
    id: 'Parametres',
    colonnes: [
      { id: 'Cle', type: 'Text', label: 'Clé' },
      { id: 'Valeur', type: 'Text', label: 'Valeur', options: { wrap: true } },
      { id: 'Libelle', type: 'Text', label: 'À quoi ça sert', options: { wrap: true } },
    ],
  },
  {
    id: 'Entites',
    colonnes: [
      { id: 'Code', type: 'Text', label: 'Code' },
      { id: 'Libelle', type: 'Text', label: 'Libellé' },
    ],
  },
  {
    id: 'Annuaire',
    colonnes: [
      // Grist compare user.Email en minuscules : l'adresse est ramenée en minuscules à la saisie
      { id: 'Email', type: 'Text', label: 'Adresse', formule: 'value.strip().lower() if value else value', declencheur: ['Email'] },
      { id: 'Nom', type: 'Text', label: 'Nom' },
      { id: 'Entite', type: 'Text', label: 'Entité', description: 'Code de l’entité, pour les rôles qui en ont une.' },
      { id: 'Role', type: 'Choice', label: 'Rôle', options: { choices: ROLES } },
      { id: 'Actif', type: 'Bool', label: 'Actif', options: { widget: 'Switch' } },
      // Lu par les règles d'accès. Aucune formule de l'annuaire ne doit dépendre de Connexions :
      // chaque ouverture recalculerait les droits et rechargerait la page de tout le monde.
      { id: 'Role_effectif', type: 'Text', label: 'Rôle effectif', formule: '$Role if $Actif and $Email else ""' },
    ],
  },
  {
    // Identité dans le widget : le module ajoute une ligne à l'ouverture, Grist y inscrit user.Email
    id: 'Connexions',
    colonnes: [
      { id: 'Email', type: 'Text', label: 'Adresse', formule: 'user.Email', declencheur: 'ajout' },
      { id: 'Nom', type: 'Text', label: 'Nom', formule: 'user.Name', declencheur: 'ajout' },
      { id: 'Le', type: TZ, label: 'Le', formule: 'NOW()', declencheur: 'ajout', options: DATETIME },
      { id: 'Version', type: 'Text', label: 'Version du module' },
      { id: 'Compte', type: 'Ref:Annuaire', label: 'Compte', formule: 'Annuaire.lookupOne(Email=$Email) if $Email else None' },
      { id: 'Role', type: 'Text', label: 'Rôle', formule: '$Compte.Role_effectif if $Compte else ""' },
      { id: 'Entite', type: 'Text', label: 'Entité', formule: '$Compte.Entite if $Compte and $Compte.Role_effectif else ""' },
      { id: 'Connu', type: 'Bool', label: 'Compte reconnu', formule: 'bool($Compte and $Compte.Role_effectif)' },
    ],
  },
  {
    id: 'Reponses',
    colonnes: [
      { id: 'Entite', type: 'Text', label: 'Entité' },
      { id: 'Statut', type: 'Choice', label: 'Statut', options: { choices: ['Brouillon', 'Transmis'] } },
      { id: 'Q1_Nom', type: 'Text', label: '1. Nom du répondant' },
      { id: 'Q2_Effectif', type: 'Int', label: '2. Effectif' },
      { id: 'Modifie_par', type: 'Text', label: 'Modifié par', formule: 'user.Email', declencheur: 'modif' },
    ],
  },
  {
    // Guides de l'onglet Aide : chaque rôle ne lit que ceux de son public (règles d'accès)
    id: 'Guides',
    colonnes: [
      { id: 'Cle', type: 'Text', label: 'Clé' },
      { id: 'Titre', type: 'Text', label: 'Titre' },
      { id: 'Public', type: 'ChoiceList', label: 'Public', options: { choices: [...ROLES, 'inconnu'] } },
      { id: 'Ordre', type: 'Numeric', label: 'Ordre' },
      { id: 'Resume', type: 'Text', label: 'En une phrase', options: { wrap: true } },
      { id: 'Contenu', type: 'Text', label: 'Contenu (Markdown)', options: { wrap: true } },
      { id: 'Images', type: 'Attachments', label: 'Captures' },
      { id: 'Modifie_le', type: TZ, label: 'Modifié le', formule: 'NOW()', declencheur: 'modif', options: DATETIME },
    ],
  },
];

const PARAMETRES = [
  ['titre', titre, 'Titre affiché en haut du module'],
  ['contact_nom', 'Équipe du projet', 'Nom du contact affiché aux répondants'],
  ['contact_email', contactEmail, 'Adresse de contact affichée aux comptes non reconnus'],
];

module.exports = { TABLES, PARAMETRES, ROLES };
