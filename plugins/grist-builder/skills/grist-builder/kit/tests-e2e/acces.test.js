'use strict';
// Droits d'accès, compte par compte, sur le document courant du Grist local.
// Prérequis : Grist local démarré, node outils/construire.js. Lancer : node --test tests-e2e/acces.test.js
// Les attentes sont calculées d'après les données (jamais figées) : le test se rejoue à volonté.
const test = require('node:test');
const assert = require('node:assert/strict');
const { client, docCourant } = require('../outils/lib/cles');
const config = require('../projet.config');

const DOC = (docCourant() || {}).docId;
const c = {};
let proprio;
const refuse = (p, msg) => assert.rejects(p, e => [403, 404].includes(e.status) || /denied|Blocked|access/i.test(e.message), msg);
async function lire(g, table) { try { return await g.lignes(DOC, table); } catch (e) { if (e.status === 403) return []; throw e; } }
const cle = email => email.split('@')[0];

test.before(async () => {
  assert.ok(DOC, 'Aucun document courant : lancer node outils/construire.js');
  proprio = await client();
  await proprio.upsert(DOC, 'Annuaire', config.comptesTest.map(([Email, Nom, Role, Entite]) => ({ require: { Email }, fields: { Nom, Role, Entite, Actif: true } })));
  for (const [email, nom] of config.comptesTest) c[cle(email)] = await client(email, nom);
  c.inconnu = await client('inconnu@ailleurs.test', 'Inconnu');
  const reps = await proprio.lignes(DOC, 'Reponses');
  await proprio.modifier(DOC, 'Reponses', reps.map(r => ({ id: r.id, Statut: 'Brouillon', Q1_Nom: '', Q2_Effectif: null })));
});

test('compte inconnu : ne lit rien, sauf les paramètres et ses connexions ; ne peut rien écrire', async () => {
  assert.equal((await lire(c.inconnu, 'Reponses')).length, 0);
  assert.equal((await lire(c.inconnu, 'Annuaire')).length, 0);
  assert.ok((await lire(c.inconnu, 'Parametres')).length > 0);
  const [id] = await c.inconnu.ajouter(DOC, 'Connexions', [{ Version: 'test' }]);
  const cx = await lire(c.inconnu, 'Connexions');
  assert.ok(cx.some(x => x.id === id) && cx.every(x => x.Email === 'inconnu@ailleurs.test' && x.Connu === false));
  await refuse(c.inconnu.ajouter(DOC, 'Annuaire', [{ Email: 'inconnu@ailleurs.test', Role: 'admin', Actif: true }]), 's’ajouter à l’annuaire');
  await refuse(c.inconnu.appliquer(DOC, [['AddTable', 'Pirate', [{ id: 'A' }]]]), 'créer une table');
});

test('connexion : impossible d’écrire l’adresse de quelqu’un d’autre', async () => {
  await refuse(c.inconnu.ajouter(DOC, 'Connexions', [{ Email: 'admin@projet.test' }]), 'usurpation');
});

test('répondant : ne voit et ne modifie que la réponse de son entité, jusqu’à la transmission', async () => {
  const [, , , entite] = config.comptesTest.find(x => x[2] === 'repondant');
  const g = c[cle(config.comptesTest.find(x => x[2] === 'repondant')[0])];
  const reps = await lire(g, 'Reponses');
  assert.deepEqual(reps.map(r => r.Entite), [entite]);
  await g.modifier(DOC, 'Reponses', [{ id: reps[0].id, Q1_Nom: 'Camille' }]);
  const autre = (await proprio.lignes(DOC, 'Reponses')).find(r => r.Entite !== entite);
  await refuse(g.modifier(DOC, 'Reponses', [{ id: autre.id, Q1_Nom: 'x' }]), 'autre entité');
  await refuse(g.modifier(DOC, 'Reponses', [{ id: reps[0].id, Entite: autre.Entite }]), 'changer d’entité');
  await g.modifier(DOC, 'Reponses', [{ id: reps[0].id, Statut: 'Transmis' }]);
  await refuse(g.modifier(DOC, 'Reponses', [{ id: reps[0].id, Q1_Nom: 'après envoi' }]), 'après transmission');
});

test('pilotage : lit tout, ne modifie rien', async () => {
  const toutes = await proprio.lignes(DOC, 'Reponses');
  assert.equal((await lire(c.pilote, 'Reponses')).length, toutes.length);
  await refuse(c.pilote.modifier(DOC, 'Reponses', [{ id: toutes[0].id, Q1_Nom: 'x' }]), 'modifier une réponse');
  await refuse(c.pilote.ajouter(DOC, 'Annuaire', [{ Email: 'x@y.test', Role: 'repondant', Actif: true }]), 'ajouter un compte');
});

test('admin : gère les comptes ; adresse ramenée en minuscules ; compte désactivé = inconnu', async () => {
  const [id] = await c.admin.ajouter(DOC, 'Annuaire', [{ Email: '  Nouveau.Compte@Entite.TEST ', Nom: 'Nouveau', Role: 'repondant', Entite: 'E03', Actif: true }]);
  const a = (await proprio.lignes(DOC, 'Annuaire')).find(x => x.id === id);
  assert.equal(a.Email, 'nouveau.compte@entite.test', 'adresse normalisée');
  const nouveau = await client('nouveau.compte@entite.test', 'Nouveau');
  assert.deepEqual((await lire(nouveau, 'Reponses')).map(r => r.Entite), ['E03']);
  await c.admin.modifier(DOC, 'Annuaire', [{ id, Actif: false }]);
  assert.equal((await lire(nouveau, 'Reponses')).length, 0, 'désactivé : ne voit plus rien');
  await c.admin.appliquer(DOC, [['RemoveRecord', 'Annuaire', id]]);
});

test('guides : chaque rôle lit ceux de son public ; l’admin les lit tous', async () => {
  const tous = await proprio.lignes(DOC, 'Guides');
  const pub = x => (Array.isArray(x.Public) ? x.Public.filter(v => v !== 'L') : []);
  const attendus = role => tous.filter(x => pub(x).includes(role)).map(x => x.Cle).sort();
  for (const [email, , role] of config.comptesTest) {
    const lus = (await lire(c[cle(email)], 'Guides')).map(x => x.Cle).sort();
    assert.deepEqual(lus, role === 'admin' ? tous.map(x => x.Cle).sort() : attendus(role), role);
  }
  assert.deepEqual((await lire(c.inconnu, 'Guides')).map(x => x.Cle).sort(), attendus('inconnu'));
});
