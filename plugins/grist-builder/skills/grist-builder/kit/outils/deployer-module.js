'use strict';
// Pousse le module construit (module/dist/options.json) dans le widget du document courant.
// Usage : node outils/deployer-module.js [--doc ID] [--widget N]
// Sur un autre serveur : GRIST_URL=… GRIST_API_KEY=… node outils/deployer-module.js --doc … --widget …
const fs = require('fs');
const path = require('path');
const { client, docCourant } = require('./lib/cles');

(async () => {
  const a = process.argv.slice(2);
  const courant = docCourant() || {};
  const doc = a.includes('--doc') ? a[a.indexOf('--doc') + 1] : courant.docId;
  const widget = a.includes('--widget') ? +a[a.indexOf('--widget') + 1] : courant.sectionId;
  if (!doc || !widget) throw new Error('Document ou widget inconnu : lancer outils/construire.js, ou passer --doc et --widget.');
  const options = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'module', 'dist', 'options.json'), 'utf8'));
  const g = await client();
  const [s] = await g.sql(doc, 'select options from _grist_Views_section where id = ?', [widget]);
  if (!s) throw new Error(`Widget ${widget} introuvable dans ${doc}`);
  const opts = JSON.parse(s.options || '{}');
  const cv = JSON.parse(opts.customView || '{}');
  cv.widgetOptions = { ...(cv.widgetOptions || {}), _html: options._html, _js: options._js };
  cv.access = 'full';
  opts.customView = JSON.stringify(cv);
  await g.appliquer(doc, [['UpdateRecord', '_grist_Views_section', widget, { options: JSON.stringify(opts) }]]);
  const version = (/Formulaire\.VERSION = "([^"]+)"/.exec(options._js) || [])[1];
  console.log(`Module ${version} déployé dans le widget ${widget} du document ${doc}.`);
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
