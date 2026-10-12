'use strict';
// Relevé des styles calculés du module, onglet par onglet et rôle par rôle (projet.config.js), pour nettoyer ou
// réorganiser le CSS sans changer l'affichage : relevé avant, modification, déploiement, relevé après, comparaison.
// Usage : node outils/styles/releve.js avant.json ; … ; node outils/styles/releve.js apres.json ;
//         node outils/styles/comparer.js avant.json apres.json   (Grist local, module déployé). Lecture seule.
const fs = require('fs');
const path = require('path');
const { navigateur, ouvrir } = require('../../tests-e2e/navigateur');
const config = require('../../projet.config');
const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-left-color', 'border-bottom-color',
  'border-top-width', 'border-left-width', 'border-bottom-width', 'border-radius', 'box-shadow', 'font-weight', 'font-size',
  'padding-top', 'padding-left', 'opacity', 'filter', 'display', 'grid-template-columns', 'position'];
const pause = ms => new Promise(r => setTimeout(r, ms));

const relever = (module, ecran) => module.evaluate(({ props, ecran }) => {
  const out = {};
  // Largeur stable que la barre de défilement soit là ou non (images de l'aide chargées plus ou moins tôt)
  document.documentElement.style.scrollbarGutter = 'stable';
  const chemin = el => { const p = []; for (let x = el; x && x.id !== 'app'; x = x.parentElement) p.unshift(x.tagName + (typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/).join('.') : '') + ':' + [...(x.parentElement ? x.parentElement.children : [])].indexOf(x)); return p.join('>'); };
  for (const el of document.querySelectorAll('#app *')) { const cs = getComputedStyle(el); out[ecran + ' ' + chemin(el)] = props.map(p => cs.getPropertyValue(p)).join('|'); }
  return out;
}, { props: PROPS, ecran });

(async () => {
  const sortie = process.argv[2];
  if (!sortie) { console.error('Usage : node outils/styles/releve.js <sortie.json>'); process.exit(1); }
  const { b, nouveau } = await navigateur({ largeur: 1440, hauteur: 1000 });
  const res = {}, vus = new Set();
  const comptes = [...config.comptesTest.map(([email, , role]) => [email, role]), ['inconnu@ailleurs.test', 'inconnu']];
  for (const [email, role] of comptes) {
    if (vus.has(role)) continue;   // un compte par rôle
    vus.add(role);
    const ctx = await nouveau();
    const { module } = await ouvrir(ctx, email);
    for (const [vue] of (config.onglets[role] || [[null]])) {
      if (vue) { await module.evaluate(v => Formulaire.app.aller(v), vue); }
      await pause(1200);
      Object.assign(res, await relever(module, `${role}/${vue || 'accueil'}`));
    }
    await ctx.close();
  }
  fs.writeFileSync(path.resolve(sortie), JSON.stringify(res));
  console.log(`${Object.keys(res).length} éléments relevés → ${sortie}`);
  await b.close();
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
