'use strict';
// Partage nominatif Grist aligné sur l'annuaire : chaque compte actif est partagé en « Éditeur » (le document
// apparaît alors dans sa liste de documents, et l'instance peut lui envoyer l'invitation) ; un compte
// désactivé perd son partage. Les propriétaires et le lien public ne changent pas. Les droits réels restent
// ceux des règles d'accès : le partage ne fait qu'ouvrir la porte du document.
// Usage : node outils/partager.js [--simulation] [--doc ID]   (sur une autre instance : GRIST_URL=… GRIST_API_KEY=…)
const { client, docCourant } = require('./lib/cles');
const { synchroniserPartage } = require('./lib/partage');

(async () => {
  const a = process.argv.slice(2);
  const doc = a.includes('--doc') ? a[a.indexOf('--doc') + 1] : (docCourant() || {}).docId;
  const g = await client();
  const comptes = (await g.lignes(doc, 'Annuaire')).map(x => ({ email: x.Email, actif: !!x.Actif && !!x.Role }));
  const r = await synchroniserPartage(g, doc, comptes, { role: 'editors', simulation: a.includes('--simulation') });
  console.log(`${a.includes('--simulation') ? '[simulation] ' : ''}Partage : ${r.ajoutes.length} ajouté(s), ${r.retires.length} retiré(s), ${r.inchanges} inchangé(s).`);
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
