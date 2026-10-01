'use strict';
// Applique les règles d'accès de schema/acces.js à un document existant (construit, repris ou livré), sans le
// reconstruire. Rejouable. Sert après une relecture des droits : un correctif de règle se pose en une commande.
// 1. Ajoute les colonnes du modèle absentes du document (colonnes d'aide lues par les règles : référence
//    valide, doublon, statut recopié d'une autre table…).
// 2. Aligne formule et déclencheur des colonnes à déclencheur sur schema/modele.js (dont les colonnes
//    « reservee », protégées contre le formulaire public).
// 3. Remplace toutes les règles par celles de jeux() ; contrôle que le moteur a compilé chaque formule.
// Usage : node outils/appliquer-regles.js [--doc ID] [--simulation]
//   document : --doc, sinon celui de DOC_COURANT (grist-local/doc-courant.json par défaut)
//   autre instance : GRIST_URL=… GRIST_API_KEY=<clé d'un propriétaire> node outils/appliquer-regles.js --doc <id>
// Les colonnes en trop dans le document ne sont ni retirées ni modifiées ; une table absente arrête tout
// (reconstruire plutôt).
const { client, docCourant, BASE } = require('./lib/cles');
const { TABLES } = require('../schema/modele');
const { jeux, appliquerRegles } = require('../schema/acces');

function infoColonne(c) {
  const info = { type: c.type, label: c.label || c.id };
  if (c.options) info.widgetOptions = JSON.stringify(c.options);
  return info;
}
const SQL = 'select c.id, c.colId, c.formula, c.recalcWhen, c.recalcDeps, t.tableId from _grist_Tables_column c join _grist_Tables t on t.id = c.parentId';
const deps = v => { try { return (JSON.parse(v || 'null') || []).filter(x => x !== 'L').sort((a, b) => a - b); } catch (e) { return []; } };

/** Réglage voulu d'une colonne à déclencheur (comme la passe 3 de construire.js). */
function voulu(t, c, ref) {
  if (c.declencheur === 'modif') return { recalcWhen: 2, deps: [] };
  if (c.declencheur === 'ajout') return { recalcWhen: 0, deps: [] };
  return { recalcWhen: 0, deps: c.declencheur.map(d => ref(t, d)).sort((a, b) => a - b) };
}
function reglage(t, c, ref) {
  const modif = { untieColIdFromLabel: true };
  if (c.description) modif.description = c.description;
  if (c.declencheur) {
    const v = voulu(t, c, ref);
    Object.assign(modif, { formula: c.formule, recalcWhen: v.recalcWhen, recalcDeps: v.deps.length ? v.deps : null });
  }
  return ['ModifyColumn', t, c.id, modif];
}

(async () => {
  const a = process.argv.slice(2);
  const doc = a.includes('--doc') ? a[a.indexOf('--doc') + 1] : (docCourant() || {}).docId;
  if (!doc) throw new Error('Document inconnu : --doc <id> ou DOC_COURANT');
  const simulation = a.includes('--simulation');
  const g = await client();
  const info = await g.req('GET', `/api/docs/${doc}`);
  console.log(`Document : « ${info.name} » (${doc}) sur ${BASE}${simulation ? ' (simulation : rien n’est écrit)' : ''}`);

  // 1. Colonnes du modèle absentes du document
  let meta = await g.sql(doc, SQL);
  const trouver = (t, col) => meta.find(m => m.tableId === t && m.colId === col);
  const ref = (t, col) => (trouver(t, col) || {}).id;
  const tablesDoc = new Set(meta.map(m => m.tableId));
  const manquantes = [];
  for (const t of TABLES) {
    if (!tablesDoc.has(t.id)) throw new Error(`Table ${t.id} absente du document : reconstruire plutôt`);
    for (const c of t.colonnes) if (!trouver(t.id, c.id)) manquantes.push([t.id, c]);
  }
  console.log(manquantes.length ? `Colonnes à ajouter : ${manquantes.map(([t, c]) => `${t}.${c.id}`).join(', ')}` : 'Colonnes : aucune à ajouter');
  if (manquantes.length && !simulation) {
    // Formule sans déclencheur : colonne calculée ; sinon colonne de données, déclencheur réglé ensuite
    const calculee = c => !!c.formule && !c.declencheur;
    await g.appliquer(doc, manquantes.map(([t, c]) => ['AddColumn', t, c.id,
      { ...infoColonne(c), isFormula: calculee(c), ...(calculee(c) ? { formula: c.formule } : {}) }]));
    meta = await g.sql(doc, SQL);
    await g.appliquer(doc, manquantes.map(([t, c]) => reglage(t, c, ref)));
  }

  // 2. Colonnes à déclencheur : formule et déclencheur conformes au modèle
  const aRegler = [];
  for (const t of TABLES) {
    for (const c of t.colonnes.filter(x => x.declencheur && x.formule)) {
      const m = trouver(t.id, c.id);
      if (!m || manquantes.some(([tt, cc]) => tt === t.id && cc.id === c.id)) continue;   // réglée au point 1
      const v = voulu(t.id, c, ref);
      if (m.formula !== c.formule || m.recalcWhen !== v.recalcWhen || JSON.stringify(deps(m.recalcDeps)) !== JSON.stringify(v.deps)) aRegler.push([t.id, c]);
    }
  }
  console.log(aRegler.length ? `Déclencheurs à aligner : ${aRegler.map(([t, c]) => `${t}.${c.id}${c.reservee ? ' (réservée)' : ''}`).join(', ')}` : 'Déclencheurs : à jour');
  if (aRegler.length && !simulation) await g.appliquer(doc, aRegler.map(([t, c]) => reglage(t, c, ref)));

  // 3. Règles
  const nb = jeux().reduce((n, j) => n + j.regles.length + (j.attribut ? 1 : 0), 0);
  if (simulation) return console.log(`Règles : ${jeux().length} ressources, ${nb} règles (non appliquées)`);
  const r = await appliquerRegles(g, doc);   // lève une erreur si une formule n'est pas compilée
  console.log(`Règles appliquées : ${r.ressources} ressources, ${r.regles} règles, toutes compilées.`);
})().catch(e => { console.error('ÉCHEC :', e.message); if (e.corps) console.error(JSON.stringify(e.corps).slice(0, 1500)); process.exit(1); });
