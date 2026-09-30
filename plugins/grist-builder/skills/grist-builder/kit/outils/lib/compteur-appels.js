'use strict';
// Compteur d'appels vers l'instance Grist, à précharger devant n'importe quel outil :
//   node -r ./outils/lib/compteur-appels.js outils/construire.js …
// Compte chaque requête (fetch) vers GRIST_URL, l'affiche en fin de script avec le détail par type d'appel,
// et l'ajoute au journal grist-local/appels.log (ou JOURNAL_APPELS), avec le total du mois.
// Utile sur getgrist.com : le plan gratuit est limité à 3 000 appels d'API par mois.
const fs = require('fs');
const path = require('path');

const BASE = (process.env.GRIST_URL || `http://localhost:${process.env.GRIST_PORT || 8484}`).replace(/\/$/, '');
const JOURNAL = process.env.JOURNAL_APPELS ? path.resolve(process.env.JOURNAL_APPELS) : path.join(__dirname, '..', '..', 'grist-local', 'appels.log');
const detail = {};
let total = 0;

const origine = globalThis.fetch;
globalThis.fetch = function (entree, options) {
  const url = String(entree && entree.url ? entree.url : entree);
  if (url.startsWith(BASE)) {
    total++;
    // Type d'appel : méthode et chemin, identifiants remplacés (…/docs/:id/tables/:table/records)
    const chemin = url.slice(BASE.length).split('?')[0]
      .replace(/\/(docs|workspaces|orgs|attachments|s)\/[^/]+/g, '/$1/:id')
      .replace(/\/tables\/[^/]+/, '/tables/:table');
    const cle = `${((options && options.method) || (entree && entree.method) || 'GET').toUpperCase()} ${chemin}`;
    detail[cle] = (detail[cle] || 0) + 1;
  }
  return origine.apply(this, arguments);
};

process.on('exit', () => {
  if (!total) return;
  const script = path.relative(process.cwd(), process.argv[1] || '?');
  const mois = new Date().toISOString().slice(0, 7);
  let avant = 0;
  try {
    for (const l of fs.readFileSync(JOURNAL, 'utf8').split('\n')) {
      const m = /^(\d{4}-\d{2})\S*\t([^\t]*)\t(\d+)/.exec(l);
      if (m && m[1] === mois && m[2] === BASE) avant += Number(m[3]);
    }
  } catch (e) { /* premier passage : pas encore de journal */ }
  try {
    fs.mkdirSync(path.dirname(JOURNAL), { recursive: true });
    fs.appendFileSync(JOURNAL, `${new Date().toISOString()}\t${BASE}\t${total}\t${script}\t${JSON.stringify(detail)}\n`);
  } catch (e) { /* journal impossible à écrire : le décompte reste affiché */ }
  console.log(`\nAppels vers ${BASE} : ${total} (${Object.entries(detail).map(([k, n]) => `${k} × ${n}`).join(', ')}).` +
    ` Ce mois-ci, journal compris : ${avant + total}.`);
});
