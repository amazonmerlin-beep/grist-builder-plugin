'use strict';
// Clés API du Grist LOCAL, par compte de test, mises en cache dans
// grist-local/.cles-test.json (fichier ignoré par git, jamais livré).
const fs = require('fs');
const path = require('path');
const { cleApiTest, Grist } = require('./grist');

const BASE = process.env.GRIST_URL || `http://localhost:${process.env.GRIST_PORT || 8484}`;
const CACHE = path.join(__dirname, '..', '..', 'grist-local', '.cles-test.json');
const DOC_COURANT = path.join(__dirname, '..', '..', 'grist-local', 'doc-courant.json');
const ADMIN = process.env.GRIST_ADMIN || 'proprietaire@projet.test';

function lireCache() {
  try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { return {}; }
}

async function cle(email, nom) {
  const cache = lireCache();
  if (cache[email]) return cache[email];
  const k = await cleApiTest(BASE, email, nom);
  cache[email] = k;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  return k;
}

/** Client Grist au nom d'un compte de test (local). */
async function client(email = ADMIN, nom) {
  return new Grist({ base: BASE, apiKey: process.env.GRIST_API_KEY && email === ADMIN ? process.env.GRIST_API_KEY : await cle(email, nom) });
}

function docCourant() {
  try { return JSON.parse(fs.readFileSync(DOC_COURANT, 'utf8')); } catch (e) { return null; }
}
function ecrireDocCourant(info) {
  fs.writeFileSync(DOC_COURANT, JSON.stringify(info, null, 1));
}

module.exports = { cle, client, docCourant, ecrireDocCourant, BASE, ADMIN };
