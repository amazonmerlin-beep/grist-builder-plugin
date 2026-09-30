'use strict';
// Outils Playwright communs : connexion de test sous une adresse, ouverture du module, captures.
// Chrome installé sur le poste (channel « chrome ») : aucun navigateur à télécharger.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { docCourant, BASE } = require('../outils/lib/cles');
const config = require('../projet.config');

const CAPTURES = path.join(__dirname, 'captures');

async function navigateur({ largeur = 1360, hauteur = 900 } = {}) {
  // Test LOCAL seulement : le builder (page publique github.io) appelle Grist sur localhost pour
  // les pièces jointes ; Chrome bloque ces appels « réseau local » par défaut. Sur getgrist.com ou
  // l'instance ANCT, les deux sont publics et la protection ne s'applique pas.
  // Chrome tel qu'un utilisateur l'a : aucune protection levée. En local, le widget passe par le chargeur servi
  // par Grist lui-même (construire.js) : sans cela, Chrome bloquerait ses appels vers localhost.
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  return { b, nouveau: async () => b.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', acceptDownloads: true }) };
}

/** Ouvre le document sous le compte donné et renvoie { page, module } (module = frame du widget). */
async function ouvrir(contexte, email, nom) {
  const doc = docCourant();
  const page = await contexte.newPage();
  const cible = `${BASE}/o/docs/doc/${doc.docId}`;
  await page.goto(`${BASE}/test/login?username=${encodeURIComponent(email)}&name=${encodeURIComponent(nom || email)}&next=${encodeURIComponent(cible)}`);
  // Grist réécrit l'adresse avec l'identifiant fixe (urlId) posé par construire.js (--adresse, sinon celui de projet.config.js)
  await page.waitForURL(u => String(u).includes(doc.docId.slice(0, 12)) || String(u).includes('/doc/' + (doc.urlId || config.urlId)), { timeout: 30000 });
  // Désactive les astuces de Grist pour ce compte (elles recouvrent la page), puis recharge
  const fait = await page.evaluate(async () => {
    const r = await fetch('/api/orgs/docs', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ userPrefs: { behavioralPrompts: { dontShowTips: true, dismissedTips: [] }, showNewUserQuestions: false, recordSignUpEvent: false } }) });
    return r.status;
  });
  if (fait < 300) await page.reload();
  const module = await trouverModule(page);
  await fermerVisite(page);
  return { page, module };
}

/** Ferme la visite guidée de Grist (premier passage d'un compte). */
async function fermerVisite(page) {
  for (let i = 0; i < 3; i++) {
    const croix = await page.$('.test-onboarding-close, [class*="onboarding"] [class*="close"], .test-modal-cancel');
    if (croix) { try { await croix.click({ timeout: 1000 }); } catch (e) { /* déjà fermée */ } }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

/** Clic « DOM » dans le module : insensible aux calques de Grist posés par-dessus l'iframe. */
async function cliquer(module, selecteur) {
  await module.waitForSelector(selecteur, { timeout: 15000 });
  await module.$eval(selecteur, el => el.click());
}

async function trouverModule(page, delai = 40000) {
  const fin = Date.now() + delai;
  while (Date.now() < fin) {
    for (const f of page.frames()) {
      try {
        if (await f.$('#app.formulaire')) {
          // Module prêt : identité connue et premier écran choisi (le HTML du widget s'affiche avant son code)
          await f.waitForFunction(() => globalThis.Formulaire && Formulaire.core && Formulaire.core.etat.vue, null, { timeout: 30000 });
          return f;
        }
      } catch (e) { /* frame en cours de chargement */ }
    }
    await page.waitForTimeout(300);
  }
  throw new Error('Module introuvable dans la page (widget non chargé ?)');
}

async function capturer(page, nom) {
  fs.mkdirSync(CAPTURES, { recursive: true });
  const f = path.join(CAPTURES, nom + '.png');
  await page.screenshot({ path: f, fullPage: false });
  return f;
}

/** Capture la seule iframe du module, sur toute sa hauteur de contenu. */
async function capturerModule(page, module, nom) {
  fs.mkdirSync(CAPTURES, { recursive: true });
  const f = path.join(CAPTURES, nom + '.png');
  const el = await module.frameElement();
  await el.screenshot({ path: f });
  return f;
}

module.exports = { navigateur, ouvrir, trouverModule, capturer, capturerModule, cliquer, fermerVisite, CAPTURES };
