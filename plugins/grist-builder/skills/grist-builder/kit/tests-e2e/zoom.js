'use strict';
// Zoom à 200 % (RGAA 10.4) : aucun écran du module ne doit défiler horizontalement.
// Une fenêtre de 640 px de large équivaut à un écran de 1280 px zoomé à 200 %. Pour chaque rôle (un compte de
// test par rôle, plus un inconnu) et chacun de ses onglets, mesure la largeur du contenu du module
// (scrollWidth) et la compare à la largeur visible ; cite les éléments qui dépassent. Un tableau large placé
// dans .defil défile seul et ne compte pas. Ne remplace pas un contrôle à l'œil : regarder aussi les captures.
// Usage : node tests-e2e/zoom.js [--largeur 640]   (Grist local, document construit et module déployé)
const { navigateur, ouvrir, capturerModule } = require('./navigateur');
const config = require('../projet.config');

const i = process.argv.indexOf('--largeur');
const LARGEUR = i > 0 ? Number(process.argv[i + 1]) : 640;
const pause = ms => new Promise(r => setTimeout(r, ms));

/** Mesure dans le cadre du module : { visible, contenu, fautifs: [sélecteur, …] }. */
const mesurer = module => module.evaluate(() => {
  const d = document.documentElement, visible = d.clientWidth;
  const nom = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].join('.') : '');
  const defile = el => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  const fautifs = [...document.querySelectorAll('#app *')]
    .filter(el => el.getBoundingClientRect().right > visible + 1 && !defile(el))
    // les plus hauts dans l'arbre seulement : un parent qui dépasse suffit
    .filter((el, _, tous) => !tous.includes(el.parentElement))
    .slice(0, 5).map(el => `${nom(el)} (${Math.round(el.getBoundingClientRect().right)} px)`);
  return { visible, contenu: d.scrollWidth, fautifs };
});

async function principal() {
  const { b, nouveau } = await navigateur({ largeur: LARGEUR, hauteur: 900 });
  const comptes = [...config.comptesTest.map(([email, , role]) => [email, role]), ['inconnu@ailleurs.test', 'inconnu']];
  const vus = new Set();
  let debordements = 0, ecrans = 0;
  for (const [email, role] of comptes) {
    if (vus.has(role)) continue;   // un compte par rôle suffit
    vus.add(role);
    const ctx = await nouveau();
    const { page, module } = await ouvrir(ctx, email);
    for (const [vue, lib] of (config.onglets[role] || [[null, 'accueil']])) {
      if (vue) { await module.evaluate(v => Formulaire.app.aller(v), vue); await pause(800); }
      const m = await mesurer(module);
      ecrans++;
      const ok = m.contenu <= m.visible + 1;
      if (!ok) { debordements++; await capturerModule(page, module, `zoom-${role}-${vue || 'accueil'}`); }
      console.log(`${role} — ${lib} : module ${m.visible} px, contenu ${m.contenu} px ${ok ? 'ok' : 'DÉBORDE : ' + m.fautifs.join(', ')}`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(`\nZoom 200 % (fenêtre de ${LARGEUR} px) : ${ecrans} écran(s), ${debordements} débordement(s)${debordements ? ' (captures zoom-*.png)' : ''}.`);
  process.exitCode = debordements ? 1 : 0;
}

module.exports = { mesurer };
if (require.main === module) principal().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
