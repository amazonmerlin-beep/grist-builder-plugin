'use strict';
// Corrige un document déjà construit (ou repris, ou livré) sans le reconstruire : les réglages des questions du
// formulaire public passent des champs aux colonnes, ce qui fait réapparaître les listes de choix dans
// l'éditeur du formulaire (« Aucun choix configuré ») ; textes et mise en page repris de schema/formulaire.js.
// Rejouable. Voir outils/lib/formulaire.js.
// Usage : node outils/corriger-formulaire.js   (document de grist-local/doc-courant.json, ou DOC_COURANT)
const { client, docCourant } = require('./lib/cles');
const { formulaire, actionColonnes, champsFormulaire, mise_en_page } = require('./lib/formulaire');

(async () => {
  const f = formulaire();
  if (!f) throw new Error('Pas de formulaire public dans ce projet (schema/formulaire.js absent).');
  const d = docCourant();
  if (!d || !d.formSectionId) throw new Error('Document courant ou formulaire introuvable (doc-courant.json, champ formSectionId)');
  const g = await client();
  const meta = await g.sql(d.docId, 'select c.id, c.colId, t.tableId from _grist_Tables_column c join _grist_Tables t on t.id = c.parentId where t.tableId = ?', [f.TABLE]);
  const ref = (table, col) => (meta.find(m => m.tableId === table && m.colId === col) || {}).id;
  const champs = await g.sql(d.docId, 'select id, colRef from _grist_Views_section_field where parentId = ?', [d.formSectionId]);
  const idsChamps = Object.fromEntries(champs.map(c => [(meta.find(m => m.id === c.colRef) || {}).colId, c.id]));
  const manquants = champsFormulaire().filter(e => !idsChamps[e.col]).map(e => e.col);
  if (manquants.length) throw new Error(`Questions absentes du formulaire publié (reconstruire) : ${manquants.join(', ')}`);
  await g.appliquer(d.docId, [
    actionColonnes(ref),
    ['BulkUpdateRecord', '_grist_Views_section_field', champs.map(c => c.id), { widgetOptions: champs.map(() => '') }],
    ['UpdateRecord', '_grist_Views_section', d.formSectionId, { layoutSpec: JSON.stringify(mise_en_page(idsChamps)) }],
  ]);
  console.log(`Formulaire corrigé : ${champsFormulaire().length} colonnes réglées, ${champs.length} champs sans réglages propres.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
