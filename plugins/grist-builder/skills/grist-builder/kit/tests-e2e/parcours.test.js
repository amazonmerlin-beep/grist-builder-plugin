'use strict';
// Parcours dans un vrai navigateur (Chrome installé), rôle par rôle, sur le Grist local.
// Prérequis : construire.js, puis node module/build.js && node outils/deployer-module.js.
// Lancer : node --test --test-concurrency=1 tests-e2e/parcours.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { navigateur, ouvrir, cliquer } = require('./navigateur');
const { client, docCourant } = require('../outils/lib/cles');
const config = require('../projet.config');

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
