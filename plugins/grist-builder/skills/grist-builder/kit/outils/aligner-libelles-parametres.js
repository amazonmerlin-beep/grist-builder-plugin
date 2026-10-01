'use strict';
// Aligne les libellés de la table Parametres d'un document déjà construit, repris ou livré sur schema/modele.js
// (PARAMETRES : [clé, valeur, libellé]) : les valeurs ne changent pas, les clés absentes ne sont pas créées.
// Sert après une relecture des libellés (textes montrés à l'administration : pas de « à fixer », pas de jargon).
// Rejouable. Usage : node outils/aligner-libelles-parametres.js [--doc <identifiant>]
// Autre serveur : GRIST_URL=… GRIST_API_KEY=… GRIST_ORG=… (clé d'un propriétaire du document).
const { client, docCourant } = require('./lib/cles');
const { PARAMETRES } = require('../schema/modele');

(async () => {
  const i = process.argv.indexOf('--doc');
  const docId = i > 0 ? process.argv[i + 1] : (docCourant() || {}).docId;
  if (!docId) throw new Error('Aucun document : indiquez --doc <identifiant>.');
  const g = await client();
  const lignes = await g.sql(docId, 'select id, Cle, Libelle from Parametres');
  const voulus = Object.fromEntries(PARAMETRES.map(([cle, , libelle]) => [cle, libelle]));
  const a = lignes.filter(l => voulus[l.Cle] !== undefined && voulus[l.Cle] !== l.Libelle);
  if (a.length) await g.appliquer(docId, [['BulkUpdateRecord', 'Parametres', a.map(l => l.id), { Libelle: a.map(l => voulus[l.Cle]) }]]);
  const absents = Object.keys(voulus).filter(k => !lignes.some(l => l.Cle === k));
  console.log(`Libellés des paramètres : ${a.length} mis à jour${a.length ? ' (' + a.map(l => l.Cle).join(', ') + ')' : ''}.`);
  if (absents.length) console.log(`Clés du modèle absentes du document (non créées) : ${absents.join(', ')}.`);
})().catch(e => { console.error('Erreur : ' + e.message); process.exitCode = 1; });
