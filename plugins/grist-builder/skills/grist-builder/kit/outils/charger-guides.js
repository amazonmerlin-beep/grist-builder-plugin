'use strict';
// Recharge les guides (guides/*.md et leurs captures) dans le document courant, sans le reconstruire.
// Usage : node outils/charger-guides.js [--doc <identifiant>]
// Autre serveur : GRIST_URL=… GRIST_API_KEY=… GRIST_ORG=… (clé d'un propriétaire du document).
const { client, docCourant } = require('./lib/cles');
const { chargerGuides } = require('./lib/guides');

(async () => {
  const i = process.argv.indexOf('--doc');
  const docId = i > 0 ? process.argv[i + 1] : (docCourant() || {}).docId;
  if (!docId) throw new Error('Aucun document : indiquez --doc <identifiant>.');
  const r = await chargerGuides(await client(), docId);
  console.log(`${r.guides} guide(s), ${r.images} capture(s) déposée(s)${r.retires ? `, ${r.retires} guide(s) retiré(s)` : ''}.`);
  if (r.manquantes.length) console.log('Captures introuvables dans guides/images : ' + r.manquantes.join(', '));
})().catch(e => { console.error('Erreur : ' + e.message); process.exit(1); });
