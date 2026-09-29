'use strict';
// Partage nominatif du document (accès Grist), par lots : complète l'annuaire, qui ne règle que
// ce que chacun voit DANS le document. Sans partage nominatif, le document n'apparaît pas dans
// la liste de documents de la personne (elle doit alors passer par le lien).

/**
 * @param {Grist} g        client au nom d'un propriétaire
 * @param {string} docId
 * @param {Array<{email, actif}>} comptes
 * @param {object} o { role: 'editors', lot: 100, retirerInactifs: true, simulation: false }
 * @returns {{ ajoutes: string[], retires: string[], inchanges: number }}
 */
async function synchroniserPartage(g, docId, comptes, o = {}) {
  const role = o.role || 'editors';
  const lot = o.lot || 100;
  const acces = await g.acces(docId);
  const actuels = new Map(acces.users.map(u => [String(u.email).toLowerCase(), u.access]));
  const voulu = new Map();
  for (const c of comptes) if (c.email) voulu.set(c.email.toLowerCase().trim(), c.actif !== false);
  const delta = {};
  const ajoutes = [], retires = [];
  let inchanges = 0;
  for (const [email, actif] of voulu) {
    const a = actuels.get(email);
    if (actif && !a) { delta[email] = role; ajoutes.push(email); }
    else if (!actif && a && a !== 'owners' && o.retirerInactifs !== false) { delta[email] = null; retires.push(email); }
    else inchanges++;
  }
  if (!o.simulation) {
    const cles = Object.keys(delta);
    for (let i = 0; i < cles.length; i += lot) {
      const part = Object.fromEntries(cles.slice(i, i + lot).map(k => [k, delta[k]]));
      await g.partager(docId, part);
    }
  }
  return { ajoutes, retires, inchanges };
}

module.exports = { synchroniserPartage };
