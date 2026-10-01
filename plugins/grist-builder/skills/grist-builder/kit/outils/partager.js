'use strict';
// ATTENTION, à n'employer qu'en connaissance de cause : toute personne partagée nominativement lit l'adresse
// (et le nom) de TOUS les comptes partagés nominativement (« Partager », API /api/docs/<doc>/access), quelles que
// soient les règles de l'annuaire. Avec un document « public, éditeur » filtré par l'annuaire, l'accès passe par
// le lien : ne pas partager nominativement, ou l'assumer dans la notice de confidentialité. Sans --oui, l'outil
// ne fait qu'une simulation.
// Partage nominatif Grist aligné sur l'annuaire : chaque compte actif est partagé en « Éditeur » (le document
// apparaît alors dans sa liste de documents, et l'instance peut lui envoyer l'invitation) ; un compte
// désactivé perd son partage. Les propriétaires et le lien public ne changent pas. Les droits réels restent
// ceux des règles d'accès : le partage ne fait qu'ouvrir la porte du document.
// Usage : node outils/partager.js [--oui] [--doc ID]   (sur une autre instance : GRIST_URL=… GRIST_API_KEY=…)
const { client, docCourant } = require('./lib/cles');
const { synchroniserPartage } = require('./lib/partage');

(async () => {
  const a = process.argv.slice(2);
  const doc = a.includes('--doc') ? a[a.indexOf('--doc') + 1] : (docCourant() || {}).docId;
  const g = await client();
  const comptes = (await g.lignes(doc, 'Annuaire')).map(x => ({ email: x.Email, actif: !!x.Actif && !!x.Role }));
  const simulation = a.includes('--simulation') || !a.includes('--oui');
  if (simulation && !a.includes('--simulation')) console.log('Simulation : chaque compte partagé nominativement lirait les adresses de tous les autres. Relancer avec --oui pour appliquer.');
  const r = await synchroniserPartage(g, doc, comptes, { role: 'editors', simulation });
  console.log(`${simulation ? '[simulation] ' : ''}Partage : ${r.ajoutes.length} ajouté(s), ${r.retires.length} retiré(s), ${r.inchanges} inchangé(s).`);
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
