'use strict';
// Règles de la coquille (app.js) testées sans navigateur : redessin selon le focus, retour par l'onglet parent.
const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.window = globalThis.window || {};
globalThis.Formulaire = { CONFIG: { tablesModule: [], roles: {}, onglets: {} } };
require('../src/core.js');
require('../src/app.js');
const A = globalThis.Formulaire.app;
const { natureFocus, redessinPermis, argClicOnglet, garder } = A.regles;

const champ = (tagName, type) => ({ tagName, type });

test('nature du focus : saisie de texte, choix ou rien', () => {
  assert.equal(natureFocus(champ('TEXTAREA')), 'texte');
  assert.equal(natureFocus(champ('INPUT', 'text')), 'texte');
  assert.equal(natureFocus(champ('INPUT', 'number')), 'texte');
  assert.equal(natureFocus(champ('INPUT', 'search')), 'texte');
  assert.equal(natureFocus(champ('INPUT', undefined)), 'texte', 'input sans type');
  for (const t of ['radio', 'checkbox', 'file']) assert.equal(natureFocus(champ('INPUT', t)), 'choix', t);
  assert.equal(natureFocus(champ('SELECT', 'select-one')), 'choix');
  assert.equal(natureFocus(champ('INPUT', 'button')), null);
  assert.equal(natureFocus(champ('BUTTON', 'button')), null);
  assert.equal(natureFocus(null), null);
  assert.equal(natureFocus({}), null, 'document sans élément actif');
});

test('redessin : jamais pendant une saisie ; après un choix, seulement pour sa propre écriture', () => {
  const r = o => redessinPermis({ nature: null, force: false, change: false, fenetre: false, ...o });
  assert.equal(r({}), false, 'rien demandé, rien changé');
  assert.equal(r({ force: true }), true);
  assert.equal(r({ change: true }), true, 'données changées par un autre, focus ailleurs');
  assert.equal(r({ nature: 'texte', force: true }), false, 'champ texte en cours de saisie');
  assert.equal(r({ nature: 'texte', change: true }), false);
  assert.equal(r({ nature: 'choix', force: true }), true, 'case cochée ou liste choisie : écran mis à jour');
  assert.equal(r({ nature: 'choix', change: true }), false, 'écriture d’un autre : la liste ouverte reste');
  assert.equal(r({ force: true, fenetre: true }), false, 'fenêtre modale ouverte');
});

test('onglet parent cliqué depuis une sous-vue : la liste revient avec ses filtres', () => {
  A.vues.liste = { rendre: () => '', argRetour: () => ({ statut: 'Transmis', tri: 'entite' }) };
  A.vues.fiche = { rendre: () => '', onglet: 'liste' };
  A.vues.autre = { rendre: () => '' };
  assert.deepEqual(argClicOnglet('liste', 'fiche'), { statut: 'Transmis', tri: 'entite' });
  assert.deepEqual(argClicOnglet('liste', 'autre'), {}, 'depuis un autre onglet : liste à zéro');
  assert.deepEqual(argClicOnglet('liste', 'liste'), {}, 'onglet de la liste cliqué sur la liste');
  assert.deepEqual(argClicOnglet('autre', 'fiche'), {}, 'vue sans argRetour');
  A.vues.liste.argRetour = () => null;
  assert.deepEqual(argClicOnglet('liste', 'fiche'), {}, 'argRetour vide');
});

test('action en échec : le rejet est rattrapé et signalé à l\'écran, jamais silencieux', async () => {
  const C = globalThis.Formulaire.core;
  const toastOrigine = C.toast, erreurOrigine = console.error;
  const vus = [];
  C.toast = (msg, type) => vus.push([msg, type]);
  console.error = () => {};
  try {
    await garder(Promise.reject(new Error('access denied')));
    assert.equal(vus.length, 1);
    assert.equal(vus[0][1], 'erreur');
    assert.match(vus[0][0], /autoris/);
    await garder(Promise.resolve(1));
    assert.equal(garder(undefined), undefined, 'action synchrone : rien à garder');
    assert.equal(vus.length, 1, 'une action réussie ne signale rien');
  } finally { C.toast = toastOrigine; console.error = erreurOrigine; }
});
