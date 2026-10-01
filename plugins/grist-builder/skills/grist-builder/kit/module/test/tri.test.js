'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.Formulaire = { CONFIG: { tablesModule: [] } };
require('../src/core.js');
const C = globalThis.Formulaire.core;

const cols = [['nom', 'Nom', l => l.nom], ['n', 'Nombre', l => l.n, 'desc']];
const lignes = [{ nom: 'b', n: 2 }, { nom: '', n: 10 }, { nom: 'a10', n: null }, { nom: 'a9', n: 2 }];
const noms = l => l.map(x => x.nom).join(',');

test('tri croissant, décroissant, numérique naturel, vides en fin dans les deux sens', () => {
  assert.equal(noms(C.trier(lignes, cols, { tri: 'nom', sens: 'asc' })), 'a9,a10,b,');
  assert.equal(noms(C.trier(lignes, cols, { tri: 'nom', sens: 'desc' })), 'b,a10,a9,');
  assert.equal(noms(C.trier(lignes, cols, { tri: 'n', sens: 'asc' })), 'b,a9,,a10', 'égalité : ordre reçu');
  assert.equal(noms(C.trier(lignes, cols, { tri: 'n', sens: 'desc' })), ',b,a9,a10');
});

test('sans tri choisi : colonne par défaut et son sens, sinon ordre reçu', () => {
  assert.equal(noms(C.trier(lignes, cols, {}, 'n')), ',b,a9,a10', 'sens par défaut de la colonne');
  assert.equal(noms(C.trier(lignes, cols, {})), noms(lignes));
  assert.notEqual(C.trier(lignes, cols, {}), lignes, 'copie, pas la liste reçue');
});

test('en-têtes : aria-sort sur la seule colonne triée, bouton « trier »', () => {
  const h = C.enteteTri(cols, { tri: 'nom', sens: 'desc' });
  assert.equal((h.match(/aria-sort/g) || []).length, 1);
  assert.match(h, /aria-sort="descending"><button type="button" class="tri actif" data-action="trier" data-tri="nom">Nom/);
  assert.match(C.enteteTri(cols, {}, 'n'), /aria-sort="descending".*data-tri="n" data-sens="desc"/);
});
