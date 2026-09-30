'use strict';
// Contrôle d'accessibilité automatisé (sommaire) : axe-core, règles WCAG 2.1 A et AA (base du RGAA 4.1),
// dans le cadre du module, pour chaque compte de test et chacun de ses onglets, plus le compte inconnu.
// Ne remplace pas un audit (lecteur d'écran, zoom à 200 %). Résultat : tests-e2e/captures/rgaa-axe.json.
// Usage : node tests-e2e/rgaa.js   (Grist local, document construit et module déployé)
const fs = require('fs');
const path = require('path');
const { navigateur, ouvrir, CAPTURES } = require('./navigateur');
const config = require('../projet.config');

const AXE = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
const pause = ms => new Promise(r => setTimeout(r, ms));
const resultats = [];

async function auditer(module, ecran) {
  if (!(await module.evaluate(() => !!window.axe))) await module.addScriptTag({ url: AXE });
  const r = await module.evaluate(async () => {
    const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
    return res.violations.map(v => ({ id: v.id, impact: v.impact, aide: v.help, n: v.nodes.length, exemple: v.nodes[0] && v.nodes[0].target.join(' ') }));
  });
  for (const v of r) resultats.push({ ecran, ...v });
  console.log(`${ecran} : ${r.length ? r.map(v => `${v.id} (${v.impact}, ${v.n})`).join(', ') : 'aucune violation détectée'}`);
}

(async () => {
  const { b, nouveau } = await navigateur();
  const comptes = [...config.comptesTest.map(([email, , role]) => [email, role]), ['inconnu@ailleurs.test', 'inconnu']];
  const vus = new Set();
  for (const [email, role] of comptes) {
    if (vus.has(role)) continue;   // un compte par rôle suffit
    vus.add(role);
    const ctx = await nouveau();
    const { module } = await ouvrir(ctx, email);
    const onglets = (config.onglets[role] || [[null, 'accueil']]);
    for (const [vue, lib] of onglets) {
      if (vue) { await module.evaluate(v => Formulaire.app.aller(v), vue); await pause(800); }
      await auditer(module, `${role} — ${lib}`);
    }
    await ctx.close();
  }
  await b.close();
  fs.mkdirSync(CAPTURES, { recursive: true });
  fs.writeFileSync(path.join(CAPTURES, 'rgaa-axe.json'), JSON.stringify(resultats, null, 1));
  console.log(`\nTotal : ${resultats.length} violation(s) détectée(s)`);
  process.exitCode = resultats.length ? 1 : 0;
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
