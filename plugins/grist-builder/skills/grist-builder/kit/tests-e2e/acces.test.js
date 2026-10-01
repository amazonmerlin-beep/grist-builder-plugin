'use strict';
// Droits d'accès, compte par compte, sur le document courant du Grist local.
// Prérequis : Grist local démarré, node outils/construire.js. Lancer : node --test tests-e2e/acces.test.js
// Les attentes sont calculées d'après les données (jamais figées) : le test se rejoue à volonté.
const test = require('node:test');
const assert = require('node:assert/strict');
const { client, docCourant, BASE } = require('../outils/lib/cles');
const config = require('../projet.config');
// Garde-fou : ces tests écrivent des données fictives. Grist local seulement (jamais une instance distante) ;
// si quelqu'un consulte le document de travail, viser un document d'essais : DOC_COURANT=grist-local/doc-essais.json
if (!/localhost|127\.0\.0\.1/.test(BASE) && process.env.TESTS_SUR_CE_DOCUMENT !== 'oui') {
  throw new Error(`Tests refusés sur ${BASE} : ils écrivent des données fictives (Grist local seulement).`);
}

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

test('connexion : impossible d’écrire l’adresse ni le nom de quelqu’un d’autre', async () => {
  await refuse(c.inconnu.ajouter(DOC, 'Connexions', [{ Email: 'admin@projet.test' }]), 'usurpation');
  // Une règle +C contraint newRec : sans elle, le nom fourni à la création serait gardé (déclencheur à l'ajout)
  await refuse(c.inconnu.ajouter(DOC, 'Connexions', [{ Nom: 'Admin projet', Version: 'test' }]), 'nom d’un autre');
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
  await refuse(g.modifier(DOC, 'Reponses', [{ id: reps[0].id, Statut: 'Validé' }]), 'statut hors liste');
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
  const [e03] = await lire(nouveau, 'Reponses');
  assert.equal(e03 && e03.Entite, 'E03');
  await nouveau.modifier(DOC, 'Reponses', [{ id: e03.id, Q1_Nom: 'actif' }]);
  await c.admin.modifier(DOC, 'Annuaire', [{ id, Actif: false }]);
  assert.equal((await lire(nouveau, 'Reponses')).length, 0, 'désactivé : ne voit plus rien');
  // Écrire = être de l'entité ET encore autorisé : un compte retiré ne continue pas sa réponse
  await refuse(nouveau.modifier(DOC, 'Reponses', [{ id: e03.id, Q1_Nom: 'après retrait' }]), 'désactivé : ne modifie plus');
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

test('pièces jointes : lisibles par qui lit la cellule, refusées aux autres (403)', async () => {
  // Une pièce jointe dans un guide réservé à l'administration
  const [pj] = await proprio.televerser(DOC, [{ nom: 'reserve.pdf', contenu: Buffer.from('%PDF-1.1\n%%EOF\n'), type: 'application/pdf' }]);
  const [gid] = await proprio.ajouter(DOC, 'Guides', [{ Cle: 'test-pj', Titre: 'Test PJ', Public: ['L', 'admin'], Ordre: 999, Contenu: '', Images: ['L', pj] }]);
  const statut = async g => (await fetch(`${BASE}/api/docs/${DOC}/attachments/${pj}/download`, { headers: { Authorization: 'Bearer ' + g.apiKey } })).status;
  try {
    const admin = config.comptesTest.find(x => x[2] === 'admin');
    const autre = config.comptesTest.find(x => x[2] !== 'admin');
    assert.equal(await statut(c[cle(admin[0])]), 200, 'administration : lit la pièce');
    assert.equal(await statut(c[cle(autre[0])]), 403, `${autre[2]} : pièce refusée`);
    assert.equal(await statut(c.inconnu), 403, 'inconnu : pièce refusée');
  } finally { await proprio.appliquer(DOC, [['RemoveRecord', 'Guides', gid]]); }
});

test('formulaire public (si schema/formulaire.js) : un anonyme crée une ligne, sans rien pouvoir lire', async t => {
  const lien = (docCourant() || {}).lienFormulaire;
  if (!lien) return t.skip('pas de formulaire public dans ce projet');
  const cleForm = /forms\/([^/]+)\//.exec(lien)[1];
  const { TABLE } = require('../schema/formulaire');
  const avant = (await proprio.lignes(DOC, TABLE)).length;
  const r = await fetch(`${BASE}/api/s/${cleForm}/tables/${TABLE}/records`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ records: [{ fields: {} }] }) });
  assert.equal(r.status, 200, 'envoi anonyme accepté (règle user.ShareRef → +C sur la table)');
  const { records: [{ id }] } = await r.json();
  const lu = await fetch(`${BASE}/api/s/${cleForm}/tables/${TABLE}/records`);
  assert.equal(((await lu.json()).records || []).length, 0, 'lecture anonyme : rien');
  assert.equal((await proprio.lignes(DOC, TABLE)).length, avant + 1);
  await proprio.appliquer(DOC, [['RemoveRecord', TABLE, id]]);
});

test('formulaire public (si schema/formulaire.js) : les colonnes réservées reviennent à leur défaut ; l’administration les écrit', async t => {
  // Le dépôt par la clé de partage passe outre les règles du document : la protection est dans le modèle
  // (modele.js, « reservee » : déclencheur sur la colonne elle-même, valeur par défaut quand user.ShareRef)
  const lien = (docCourant() || {}).lienFormulaire;
  if (!lien) return t.skip('pas de formulaire public dans ce projet');
  const { TABLE } = require('../schema/formulaire');
  const { TABLES } = require('../schema/modele');
  const reservees = ((TABLES.find(x => x.id === TABLE) || {}).colonnes || []).filter(x => x.reservee);
  if (!reservees.length) return t.skip(`aucune colonne « reservee » dans ${TABLE}`);
  const cleForm = /forms\/([^/]+)\//.exec(lien)[1];
  // Valeur « forcée » par colonne réservée, selon son type
  const force = x => (x.type === 'Bool' ? true : /^(Int|Numeric|Ref:)/.test(x.type) ? 1 : x.type === 'Choice' ? ((x.options || {}).choices || []).slice(-1)[0] : 'forcé');
  const fields = Object.fromEntries(reservees.map(x => [x.id, force(x)]));
  const r = await fetch(`${BASE}/api/s/${cleForm}/tables/${TABLE}/records`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ records: [{ fields }] }) });
  assert.equal(r.status, 200, await r.clone().text());
  const { records: [{ id }] } = await r.json();
  try {
    const d = (await proprio.lignes(DOC, TABLE)).find(x => x.id === id);
    for (const x of reservees) assert.notDeepEqual(d[x.id], fields[x.id], `${x.id} : la valeur du déposant est écartée`);
    // Hors formulaire (administration, reprise, module), la valeur écrite est gardée
    await proprio.modifier(DOC, TABLE, [{ id, ...fields }]);
    const e = (await proprio.lignes(DOC, TABLE)).find(x => x.id === id);
    for (const x of reservees) assert.deepEqual(e[x.id], fields[x.id], `${x.id} : écrite par l’administration`);
  } finally { await proprio.appliquer(DOC, [['RemoveRecord', TABLE, id]]); }
});
