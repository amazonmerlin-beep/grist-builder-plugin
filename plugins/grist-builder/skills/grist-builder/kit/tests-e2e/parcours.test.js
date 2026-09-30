'use strict';
// Parcours dans un vrai navigateur (Chrome installé), rôle par rôle, sur le Grist local.
// Prérequis : construire.js, puis node module/build.js && node outils/deployer-module.js.
// Lancer : node --test --test-concurrency=1 tests-e2e/parcours.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { navigateur, ouvrir, cliquer } = require('./navigateur');
const { client, docCourant, BASE } = require('../outils/lib/cles');
const config = require('../projet.config');
// Garde-fou : ces tests écrivent des données fictives. Grist local seulement (jamais une instance distante) ;
// si quelqu'un consulte le document de travail, viser un document d'essais : DOC_COURANT=grist-local/doc-essais.json
if (!/localhost|127\.0\.0\.1/.test(BASE) && process.env.TESTS_SUR_CE_DOCUMENT !== 'oui') {
  throw new Error(`Tests refusés sur ${BASE} : ils écrivent des données fictives (Grist local seulement).`);
}

const DOC = docCourant().docId;
const attendre = ms => new Promise(r => setTimeout(r, ms));
const [REP_EMAIL, REP_NOM, , REP_ENTITE] = config.comptesTest.find(x => x[2] === 'repondant');
let nav, proprio;

test.before(async () => {
  proprio = await client();
  await proprio.upsert(DOC, 'Annuaire', config.comptesTest.map(([Email, Nom, Role, Entite]) => ({ require: { Email }, fields: { Nom, Role, Entite, Actif: true } })));
  const r = (await proprio.lignes(DOC, 'Reponses')).find(x => x.Entite === REP_ENTITE);
  await proprio.modifier(DOC, 'Reponses', [{ id: r.id, Statut: 'Brouillon', Q1_Nom: '' }]);
  nav = await navigateur();
});
test.after(async () => { if (nav) await nav.b.close(); });

test('compte inconnu : message clair, son adresse, aucun onglet', async () => {
  const ctx = await nav.nouveau();
  const { module } = await ouvrir(ctx, 'personne@ailleurs.test', 'Personne');
  const t = await module.textContent('main');
  assert.match(t, /pas encore enregistré/);
  assert.match(t, /personne@ailleurs\.test/);
  assert.equal(await module.$$eval('.onglets button', b => b.length), 0);
  await ctx.close();
});

test('répondant : remplit sa réponse (enregistrée au changement de champ) et la transmet', async () => {
  const ctx = await nav.nouveau();
  const { page, module } = await ouvrir(ctx, REP_EMAIL, REP_NOM);
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  assert.deepEqual(await module.$$eval('.onglets button', b => b.map(x => x.textContent.trim())), config.onglets.repondant.map(o => o[1]));
  await module.fill('#f-Q1_Nom', 'Camille Test');
  await module.press('#f-Q1_Nom', 'Tab');
  await attendre(1500);
  let r = (await proprio.lignes(DOC, 'Reponses')).find(x => x.Entite === REP_ENTITE);
  assert.equal(r.Q1_Nom, 'Camille Test');
  await cliquer(module, '[data-action="transmettre"]');
  await attendre(400);
  await module.evaluate(() => [...document.querySelectorAll('.fenetre button')].find(b => b.textContent.trim() === 'Transmettre').click());
  await attendre(1500);
  r = (await proprio.lignes(DOC, 'Reponses')).find(x => x.Entite === REP_ENTITE);
  assert.equal(r.Statut, 'Transmis');
  assert.deepEqual(erreurs, [], 'aucune erreur JavaScript');
  await ctx.close();
});

test('pilotage : onglet Suivi, une ligne par entité', async () => {
  const [email, nom] = config.comptesTest.find(x => x[2] === 'pilote');
  const ctx = await nav.nouveau();
  const { module } = await ouvrir(ctx, email, nom);
  const lignes = await module.$$eval('table.tableau tbody tr', t => t.length);
  assert.equal(lignes, require('../schema/entites.json').length);
  await ctx.close();
});

test('compte inconnu : politique de confidentialité en fenêtre, contact renseigné, liens « nouvelle fenêtre » signalés', async t => {
  if (!(config.guidesEnFin || []).includes('confidentialite')) return t.skip('pas de guide « confidentialite » en fin de liste');
  const ctx = await nav.nouveau();
  const { module } = await ouvrir(ctx, 'personne@ailleurs.test', 'Personne');
  await cliquer(module, '[data-action="voir-guide"][data-cle="confidentialite"]');
  await attendre(400);
  const f = await module.evaluate(() => {
    const v = document.querySelector('.fenetre');
    return v && { texte: v.textContent, liens: [...v.querySelectorAll('a[target="_blank"]')].map(a => a.classList.contains('nouvelle-fenetre') && /nouvelle fenêtre/.test(a.textContent)) };
  });
  assert.ok(f, 'fenêtre ouverte');
  assert.ok(!/\{\{/.test(f.texte), 'paramètres {{…}} remplacés');
  assert.ok(f.texte.includes(await module.evaluate(() => Formulaire.core.param('contact_email'))), 'adresse de contact reprise des paramètres');
  assert.ok(f.liens.length && f.liens.every(Boolean), 'liens externes signalés « nouvelle fenêtre »');
  await ctx.close();
});

test('sans recharger : réponse transmise signalée au pilotage (pastille) ; compte accepté reconnu', async t => {
  if (!(config.veille && config.veille.secondes)) return t.skip('pas de veille (projet.config.js)');
  const NOUVEAU = 'parcours.direct@entite.test';
  const [piloteEmail, piloteNom] = config.comptesTest.find(x => x[2] === 'pilote');
  const autre = (await proprio.lignes(DOC, 'Reponses')).find(x => x.Entite !== REP_ENTITE);
  const vieux = await proprio.sql(DOC, 'select id from Annuaire where Email = ?', [NOUVEAU]);
  if (vieux.length) await proprio.appliquer(DOC, [['BulkRemoveRecord', 'Annuaire', vieux.map(x => x.id)]]);
  await proprio.modifier(DOC, 'Reponses', [{ id: autre.id, Statut: 'Brouillon' }]);
  const jusqua = async (f, max = 3 * config.veille.secondes * 1000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await f().catch(() => false)) return true; await attendre(1000); } return false; };
  const E = await ouvrir(await nav.nouveau(), NOUVEAU, 'Parcours direct');
  const P = await ouvrir(await nav.nouveau(), piloteEmail, piloteNom);
  const pastille = () => P.module.evaluate(() => { const p = document.querySelector('.onglets [data-vue="suivi"] .pastille-onglet'); return p ? +p.textContent : 0; });
  assert.equal(await E.module.evaluate(() => Formulaire.core.etat.vue), 'inconnu');
  const p0 = await pastille();
  let cpt = null;
  try {
    await proprio.modifier(DOC, 'Reponses', [{ id: autre.id, Statut: 'Transmis' }]);
    assert.ok(await jusqua(async () => (await pastille()) === p0 + 1), 'pastille « Suivi » augmentée sans recharger');
    [cpt] = await proprio.ajouter(DOC, 'Annuaire', [{ Email: NOUVEAU, Nom: 'Parcours direct', Role: 'repondant', Entite: autre.Entite, Actif: true }]);
    assert.ok(await jusqua(() => E.module.evaluate(() => Formulaire.core.etat.moi.connu)), 'compte accepté reconnu sans recharger');
    assert.ok(await jusqua(() => E.module.evaluate(() => !!document.querySelector('.onglets [data-vue="reponse"]'))), 'onglets du rôle affichés');
  } finally {
    await proprio.modifier(DOC, 'Reponses', [{ id: autre.id, Statut: 'Brouillon' }]);
    if (cpt) await proprio.appliquer(DOC, [['RemoveRecord', 'Annuaire', cpt]]);
  }
});

test('retour du navigateur : revient à l’écran précédent du module, ferme d’abord une fenêtre, sans quitter Grist', async () => {
  const [email, nom] = config.comptesTest.find(x => x[2] === 'admin');
  const { page, module: m } = await ouvrir(await nav.nouveau(), email, nom);
  const ecran = () => m.evaluate(() => Formulaire.core.etat.vue + ' ' + JSON.stringify(Formulaire.core.etat.arg));
  const url0 = page.url();
  const depart = await ecran();
  await cliquer(m, '[data-vue="aide"]'); await attendre(400);
  await cliquer(m, '.aide-liste [data-action="guide"]:not([aria-current])'); await attendre(400);
  const guide = await ecran();
  assert.match(guide, /^aide \{"guide":/);
  // Le goBack() de Playwright attend un chargement qui n'arrive pas : history.back() dans la page
  await page.evaluate(() => history.back()); await attendre(800);
  assert.equal(await ecran(), 'aide {}');
  await m.evaluate(() => { Formulaire.core.fenetre('Essai', '<p>Fenêtre ouverte</p>'); });
  await page.evaluate(() => history.back()); await attendre(800);
  assert.equal(await m.evaluate(() => !!document.querySelector('.voile')), false, 'fenêtre fermée par « retour »');
  assert.equal(await ecran(), depart);
  assert.equal(page.url(), url0, 'la page Grist ne change pas');
});
