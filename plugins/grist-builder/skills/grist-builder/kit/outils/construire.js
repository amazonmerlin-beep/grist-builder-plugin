'use strict';
// Construit de zéro le document du projet : tables, formules, déclencheurs, données de base, guides,
// page du module (widget personnalisé), règles d'accès, partage. Tout vient de projet.config.js et schema/.
// Usage : node outils/construire.js [--nom "…"] [--partage lien|invitations] [--proprietaire adresse]…
// Par défaut : Grist local. Sur un autre serveur : GRIST_URL=… GRIST_API_KEY=… GRIST_ORG=… node outils/construire.js
const fs = require('fs');
const path = require('path');
const { client, ecrireDocCourant, ADMIN, BASE } = require('./lib/cles');
const config = require('../projet.config');
const { TABLES, PARAMETRES } = require('../schema/modele');
const { appliquerRegles } = require('../schema/acces');
const { chargerGuides, DOSSIER: DOSSIER_GUIDES } = require('./lib/guides');
const ENTITES = require('../schema/entites.json');

const BUILDER = 'https://gristlabs.github.io/grist-widget/custom-widget-builder/index.html';

function args() {
  const a = process.argv.slice(2);
  const o = { nom: config.nom, espace: config.espace, partage: 'lien', proprietaires: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--nom') o.nom = a[++i];
    else if (a[i] === '--espace') o.espace = a[++i];
    else if (a[i] === '--partage') o.partage = a[++i];
    else if (a[i] === '--proprietaire') o.proprietaires.push(a[++i].toLowerCase());
  }
  return o;
}

const t0 = Date.now();
const etape = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${m}`);

function infoColonne(c) {
  const info = { type: c.type, label: c.label || c.id };
  if (c.options) info.widgetOptions = JSON.stringify(c.options);
  return info;
}
const estFormule = c => !!c.formule;
const cibleRef = c => (/^Ref(List)?:(.+)$/.exec(c.type) || [])[2];

(async () => {
  const o = args();
  const g = await client(ADMIN, 'Propriétaire');
  const ws = (await g.espaceParNom(o.espace)) || { id: await g.creerEspace(o.espace), docs: [] };
  // Un seul document de ce nom : l'ancien est supprimé (données fictives, reconstruites à chaque fois)
  for (const d of (ws.docs || []).filter(d => d.name === o.nom)) {
    await g.supprimerDoc(d.id);
    etape(`Ancien document supprimé : ${d.id}`);
  }
  const doc = await g.creerDoc(ws.id, o.nom);
  etape(`Document créé : ${doc} dans l'espace « ${o.espace} »`);
  // Adresse fixe, conservée d'une reconstruction à l'autre : /o/docs/doc/<urlId>
  try { await g.req('PATCH', `/api/docs/${doc}`, { urlId: config.urlId }); } catch (e) { etape('Adresse fixe indisponible : ' + e.message); }

  // Réglages du document
  await g.appliquer(doc, [['UpdateRecord', '_grist_DocInfo', 1, { timezone: 'Europe/Paris', documentSettings: JSON.stringify({ locale: 'fr-FR', currency: 'EUR' }) }]]);

  // Passe 1 : tables avec leurs colonnes de données (hors formules)
  const creees = new Set();
  for (const t of TABLES) {
    // Colonnes de données, y compris celles à déclencheur (leur formule est posée en passe 3)
    const cols = t.colonnes.filter(c => (!estFormule(c) || c.declencheur) && (!cibleRef(c) || creees.has(cibleRef(c))));
    await g.appliquer(doc, [['AddTable', t.id, cols.map(c => ({ id: c.id, isFormula: false, ...infoColonne(c) }))]]);
    creees.add(t.id);
  }
  await g.appliquer(doc, [['RemoveTable', 'Table1']]);
  etape(`Passe 1 : ${TABLES.length} tables`);

  // Données de base (avant les déclencheurs, pour qu'ils restent vides)
  await g.ajouter(doc, 'Parametres', PARAMETRES.map(([Cle, Valeur, Libelle]) => ({ Cle, Valeur, Libelle })));
  await g.ajouter(doc, 'Entites', ENTITES);
  // Une réponse par entité ; les colonnes entières sont posées à null (sinon Grist met 0)
  const entiers = (TABLES.find(t => t.id === 'Reponses') || { colonnes: [] }).colonnes.filter(c => c.type === 'Int' || c.type === 'Numeric').map(c => c.id);
  if (TABLES.some(t => t.id === 'Reponses')) {
    await g.ajouter(doc, 'Reponses', ENTITES.map(e => ({ Entite: e.Code, Statut: 'Brouillon', ...Object.fromEntries(entiers.map(c => [c, null])) })));
  }
  await g.ajouter(doc, 'Annuaire', [ADMIN, ...o.proprietaires].map(e => ({ Email: e, Nom: e === ADMIN ? 'Propriétaire' : e, Role: 'admin', Actif: true })));
  etape(`Données de base : ${ENTITES.length} entités, paramètres, propriétaires dans l'annuaire`);
  const gd = fs.existsSync(DOSSIER_GUIDES) ? await chargerGuides(g, doc) : { guides: 0, images: 0, manquantes: [] };
  etape(`Guides de l'onglet Aide : ${gd.guides}, ${gd.images} capture(s)${gd.manquantes.length ? ' ; introuvables : ' + gd.manquantes.join(', ') : ''}`);

  // Passe 2 : colonnes Ref restantes, formules et déclencheurs
  const passe2 = [], tardives = [];
  for (const t of TABLES) {
    for (const c of t.colonnes) {
      if (estFormule(c) && !c.declencheur) (c.tard ? tardives : passe2).push(['AddColumn', t.id, c.id, { ...infoColonne(c), isFormula: true, formula: c.formule }]);
      else if (!estFormule(c) && cibleRef(c) && !TABLES.slice(0, TABLES.indexOf(t) + 1).some(x => x.id === cibleRef(c))) passe2.push(['AddColumn', t.id, c.id, { ...infoColonne(c), isFormula: false }]);
    }
  }
  await g.appliquer(doc, passe2);
  // Colonnes qui lisent les formules d'autres tables (systèmes) : ajoutées une fois celles-ci en place
  await g.appliquer(doc, tardives);
  etape(`Passe 2 : ${passe2.length + tardives.length} colonnes calculées ou déclenchées`);

  // Passe 3 : déclencheurs, descriptions, identifiants découplés des libellés
  const meta = await g.sql(doc, 'select c.id, c.colId, t.tableId from _grist_Tables_column c join _grist_Tables t on t.id = c.parentId');
  const ref = (table, col) => (meta.find(m => m.tableId === table && m.colId === col) || {}).id;
  const passe3 = [];
  for (const t of TABLES) {
    for (const c of t.colonnes) {
      const modif = { untieColIdFromLabel: true };
      if (c.description) modif.description = c.description;
      if (c.declencheur) modif.formula = c.formule;
      if (c.declencheur === 'modif') Object.assign(modif, { recalcWhen: 2, recalcDeps: null });
      else if (c.declencheur === 'ajout') Object.assign(modif, { recalcWhen: 0, recalcDeps: null });
      else if (Array.isArray(c.declencheur)) Object.assign(modif, { recalcWhen: 0, recalcDeps: c.declencheur.map(d => ref(t.id, d)) });
      passe3.push(['ModifyColumn', t.id, c.id, modif]);
    }
  }
  await g.appliquer(doc, passe3);
  etape(`Passe 3 : ${passe3.length} colonnes réglées`);

  // Pages : on retire toutes les pages créées avec les tables, on crée la page du module
  const vues = await g.sql(doc, 'select id from _grist_Views');
  if (vues.length) await g.appliquer(doc, vues.map(v => ['RemoveView', v.id]));
  // Le widget est rattaché à Parametres, lisible par tous : Grist n'affiche pas un widget dont la
  // table est entièrement fermée à l'utilisateur (cas d'un compte non reconnu).
  const tSupport = (await g.sql(doc, "select id from _grist_Tables where tableId = 'Parametres'"))[0].id;
  const r = await g.appliquer(doc, [['CreateViewSection', tSupport, 0, 'custom', null, null]]);
  const { viewRef, sectionRef } = r.retValues[0];
  const customView = { mode: 'url', url: BUILDER, widgetId: null, pluginId: '', widgetDef: null, access: 'full', columnsMapping: null, widgetOptions: { _html: '<p style="font-family:system-ui;padding:2em">Module en cours de déploiement…</p>', _js: '' } };
  await g.appliquer(doc, [
    ['UpdateRecord', '_grist_Views', viewRef, { name: config.titre }],
    ['UpdateRecord', '_grist_Views_section', sectionRef, { title: config.titre, options: JSON.stringify({ customView: JSON.stringify(customView) }) }],
  ]);
  etape(`Page unique « ${config.titre} » (widget ${sectionRef})`);

  // Règles d'accès
  const acl = await appliquerRegles(g, doc);
  etape(`Règles d'accès : ${acl.ressources} ressources, ${acl.regles} règles, toutes compilées`);

  // Partage
  const partage = {};
  if (o.partage === 'lien') partage['everyone@getgrist.com'] = 'editors';
  for (const p of o.proprietaires) partage[p] = 'owners';
  if (Object.keys(partage).length) await g.partager(doc, partage);
  etape(`Partage : ${o.partage === 'lien' ? 'lien (tout compte connecté, filtré par l’annuaire)' : 'invitations nominatives'}`);

  // Contrôle
  const [nb] = await g.sql(doc, "select (select count(*) from _grist_Tables where tableId not like '_grist%') as tables, (select count(*) from _grist_Views) as pages, (select count(*) from _grist_ACLRules) as regles");
  etape(`Contrôle : ${JSON.stringify(nb)}`);

  ecrireDocCourant({ docId: doc, sectionId: sectionRef, viewId: viewRef, nom: o.nom, base: BASE, construitLe: new Date().toISOString(), dureeSecondes: (Date.now() - t0) / 1000 });
  console.log(`\nTerminé en ${((Date.now() - t0) / 1000).toFixed(1)} s. Document : ${BASE}/o/docs/doc/${doc}`);
})().catch(e => { console.error('ÉCHEC :', e.message); if (e.corps) console.error(JSON.stringify(e.corps).slice(0, 2000)); process.exit(1); });
