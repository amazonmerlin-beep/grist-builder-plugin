'use strict';
// Captures des écrans, en LECTURE SEULE, sur le Grist LOCAL : images des guides (guides/images, reprises par
// `npm run guides`) et jeu complet pour une revue design (`--dossier tests-e2e/captures/revue --entier`).
// - Un écran par onglet de chaque rôle (premier compte de test du rôle, plus un inconnu), nommé <rôle>-<vue>.png,
//   plus les écrans hors onglets déclarés dans EN_PLUS (fiches, sous-vues).
// - Par défaut, seul le contenu est capturé (sous l'en-tête et les onglets) : l'image d'un guide ne se confond pas
//   avec la vraie interface et ne répète pas l'en-tête. `--entier` : tout le cadre du module.
// - Les noms et adresses réels (document repris, données du client) sont remplacés à l'écran par des noms fictifs
//   avant chaque capture (tables de TABLES_PERSONNES) ; `--sans-masque` pour s'en passer (données fictives seules).
// Usage : node tests-e2e/captures-guides.js [--dossier guides/images] [--entier] [--sans-masque] [--seulement a,b]
// Après une nouvelle série d'images de guides : `npm run guides` (sinon le document garde les anciennes).
const fs = require('fs');
const path = require('path');
const { navigateur, ouvrir } = require('./navigateur');
const { BASE } = require('../outils/lib/cles');
const config = require('../projet.config');

// Écrans hors onglets : [rôle, vue, arg, nom du fichier], ouverts par Formulaire.app.aller(vue, arg)
const EN_PLUS = [
  // ['pilote', 'fiche', { id: 1 }, 'pilote-fiche'],
];
// Tables dont les lignes portent Email et Nom de personnes réelles à masquer (ajouter celles du projet)
const TABLES_PERSONNES = ['Annuaire', 'Connexions'];
// Adresses fictives, laissées telles quelles
const FICTIVES = String.raw`(\.(test|example|invalid|localhost)|@(example|exemple)\.(org|com|fr|net))$`;

const opt = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const DOSSIER = path.resolve(path.join(__dirname, '..'), opt('--dossier') || 'guides/images');
const ENTIER = process.argv.includes('--entier');
const MASQUER = !process.argv.includes('--sans-masque');
const SEULEMENT = opt('--seulement') ? new Set(opt('--seulement').split(',')) : null;
const pause = ms => new Promise(r => setTimeout(r, ms));

// Remplace à l'écran (textes, valeurs des champs, title, placeholder, aria-label) les noms et adresses réels
const masquer = module => module.evaluate(({ tables, fictives }) => {
  const d = Formulaire.core.etat.doc, fictive = new RegExp(fictives, 'i'), num = new Map(), rempl = new Map();
  for (const t of tables) for (const r of d[t] || []) {
    const email = String(r.Email || '').trim().toLowerCase();
    if (!email || fictive.test(email)) continue;
    if (!num.has(email)) num.set(email, num.size + 1);
    const n = num.get(email);
    rempl.set(email, `personne${n}@exemple.test`);
    if (r.Nom && String(r.Nom).trim().length > 2) rempl.set(String(r.Nom).trim().toLowerCase(), `Personne ${n}`);
  }
  const cles = [...rempl.keys()].sort((a, b) => b.length - a.length);
  if (!cles.length) return 0;
  const re = new RegExp(cles.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  const sub = v => v.replace(re, m => rempl.get(m.toLowerCase()) || m);
  const racine = document.getElementById('app') || document.body;
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const v = sub(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  for (const el of racine.querySelectorAll('input, textarea')) if (el.value) el.value = sub(el.value);
  for (const a of ['title', 'placeholder', 'aria-label']) for (const el of racine.querySelectorAll(`[${a}]`)) el.setAttribute(a, sub(el.getAttribute(a)));
  return num.size;
}, { tables: TABLES_PERSONNES, fictives: FICTIVES });

async function prendre(page, module, nom) {
  if (SEULEMENT && !SEULEMENT.has(nom)) return;
  await pause(1200);
  const n = MASQUER ? await masquer(module) : 0;
  const bb = await (await module.frameElement()).boundingBox();
  const r = await module.evaluate(entier => {
    const h = entier ? 0 : (document.querySelector('.entete') || { offsetHeight: 0 }).offsetHeight;
    return { y: h, h: window.innerHeight - h };
  }, ENTIER);
  await page.screenshot({ path: path.join(DOSSIER, nom + '.png'), clip: { x: bb.x, y: bb.y + r.y, width: bb.width, height: Math.max(1, Math.min(r.h, bb.height - r.y)) } });
  console.log(`ok ${nom}${n ? ` (${n} personne(s) masquée(s))` : ''}`);
}

async function principal() {
  if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error('Grist local seulement (connexion de test) : GRIST_URL vise ' + BASE);
  fs.mkdirSync(DOSSIER, { recursive: true });
  const { b, nouveau } = await navigateur({ largeur: 1440, hauteur: 1000 });
  const comptes = [...config.comptesTest.map(([email, nom, role]) => [email, nom, role]), ['inconnu@ailleurs.test', 'Inconnu', 'inconnu']];
  const vus = new Set();
  for (const [email, nom, role] of comptes) {
    if (vus.has(role)) continue;   // un compte par rôle
    vus.add(role);
    const ctx = await nouveau();
    const { page, module } = await ouvrir(ctx, email, nom);
    for (const [vue] of (config.onglets[role] || [[null]])) {
      if (vue) await module.evaluate(v => Formulaire.app.aller(v), vue);
      await prendre(page, module, `${role}-${vue || 'accueil'}`);
    }
    for (const [r, vue, arg, fichier] of EN_PLUS.filter(x => x[0] === role)) {
      await module.evaluate(([v, a]) => Formulaire.app.aller(v, a), [vue, arg || {}]);
      await prendre(page, module, fichier || `${r}-${vue}`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(`Captures dans ${path.relative(process.cwd(), DOSSIER) || '.'} ; à regarder une par une.`);
}

if (require.main === module) principal().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
