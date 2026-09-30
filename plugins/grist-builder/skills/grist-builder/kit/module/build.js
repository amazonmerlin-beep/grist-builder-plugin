'use strict';
// Assemble le module : module/src/*.js + ui.css → module/dist/options.json ({ _html, _js })
// et module/dist/widget.html (page autonome, pour le harnais hors Grist).
// Usage : node module/build.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');
const ORDRE = ['core.js', 'markdown.js', 'app.js', 'vue-aide.js', 'vue-exemple.js'];
const FACULTATIFS = new Set([]);

const config = require('../projet.config');
const CONFIG = { titre: config.titre, contactEmail: config.contactEmail, roles: config.roles, onglets: config.onglets, tablesModule: config.tablesModule, dependances: config.dependances || {} };
const version = require('../package.json').version + '+' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const morceaux = [];
for (const f of ORDRE) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) {
    if (FACULTATIFS.has(f)) { console.warn(`! ${f} absent : module construit sans lui`); continue; }
    throw new Error(`Fichier manquant : ${f}`);
  }
  const code = fs.readFileSync(p, 'utf8');
  try { new vm.Script(code, { filename: f }); }
  catch (e) {
    if (FACULTATIFS.has(f)) { console.warn(`! ${f} invalide (${e.message}) : module construit sans lui`); continue; }
    throw e;
  }
  morceaux.push(`// ===== ${f}\n${code}`);
}
const js = `globalThis.Formulaire = { CONFIG: ${JSON.stringify(CONFIG)} };\n${morceaux.join('\n')}\nFormulaire.VERSION = ${JSON.stringify(version)};\nFormulaire.app.demarrer();\n`;
if (/<\/script/i.test(js)) throw new Error('Le code contient « </script » : le builder le couperait.');
// ui.css d'abord, puis les feuilles du projet (theme.css…) par ordre alphabétique : elles l'emportent
const css = ['ui.css', ...fs.readdirSync(SRC).filter(f => f.endsWith('.css') && f !== 'ui.css').sort()].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const html = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>\n${css}\n</style>\n<div id="app" class="formulaire"></div>\n`;

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'options.json'), JSON.stringify({ _html: html, _js: js }));
fs.writeFileSync(path.join(DIST, 'widget.html'), `<!doctype html><html lang="fr"><head>${html.replace('<div id="app" class="formulaire"></div>\n', '')}</head><body><div id="app" class="formulaire"></div><script src="https://docs.getgrist.com/grist-plugin-api.js"></script><script>\n${js}</script></body></html>`);
console.log(`Module ${version} : ${morceaux.length} fichiers, ${(js.length / 1024).toFixed(0)} Ko de JS, ${(css.length / 1024).toFixed(0)} Ko de CSS → module/dist/`);
