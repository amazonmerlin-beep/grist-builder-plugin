'use strict';
// Fichier de livraison : construit un document propre (sans démonstration) sous un autre nom, y
// déploie le module, télécharge le .grist dans livrables/, vérifie qu'il se réimporte (tables, guides,
// module), puis supprime les documents temporaires. Le document de démonstration et
// grist-local/doc-courant.json ne changent pas.
// Usage : node outils/livrer.js   (Grist local démarré)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { client, docCourant, ecrireDocCourant, BASE } = require('./lib/cles');

const config = require('../projet.config');
const NOM = config.nom + ' (livraison)';
const ESPACE = config.espace;
const LIVRABLES = path.join(__dirname, '..', 'livrables');
const lancer = (script, args = []) => execFileSync(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

async function verifierImport(g, fichier) {
  const ws = await g.espaceParNom(ESPACE);
  const fd = new FormData();
  fd.append('upload', new Blob([fs.readFileSync(fichier)]), path.basename(fichier));
  const r = await fetch(`${BASE}/api/workspaces/${ws.id}/import`, { method: 'POST', headers: { Authorization: 'Bearer ' + g.apiKey }, body: fd });
  if (!r.ok) throw new Error(`Réimport refusé : ${r.status} ${await r.text()}`);
  const { id } = await r.json();
  try {
    const [n] = await g.sql(id, "select (select count(*) from _grist_Tables where tableId not like '_grist%') as tables, (select count(*) from Guides) as guides, (select count(*) from Reponses) as reponses, (select count(*) from _grist_ACLRules) as regles, (select count(*) from Annuaire where Role != 'admin') as comptes");
    const [w] = await g.sql(id, "select options from _grist_Views_section where options like '%_js%'");
    // Le code du module est dans options.customView (JSON dans du JSON) → widgetOptions._js
    let module = null;
    try { module = (/Formulaire.VERSION = "([^"]+)"/.exec(JSON.parse(JSON.parse(w.options).customView).widgetOptions._js) || [])[1] || null; } catch (e) { /* absent */ }
    return { ...n, module };
  } finally { await g.supprimerDoc(id); }
}

(async () => {
  const avant = docCourant();
  let temporaire = null;
  try {
    lancer(path.join(__dirname, 'construire.js'), ['--nom', NOM]);
    temporaire = docCourant();
    lancer(path.join(__dirname, '..', 'module', 'build.js'));
    lancer(path.join(__dirname, 'deployer-module.js'), ['--doc', temporaire.docId, '--widget', String(temporaire.sectionId)]);
    const g = await client();
    const buf = await g.telecharger(temporaire.docId);
    fs.mkdirSync(LIVRABLES, { recursive: true });
    const fichier = path.join(LIVRABLES, `${config.urlId}-${new Date().toISOString().slice(0, 10)}.grist`);
    fs.writeFileSync(fichier, buf);
    console.log(`Fichier : ${fichier} (${(buf.length / 1024 / 1024).toFixed(1)} Mo)`);
    const v = await verifierImport(g, fichier);
    console.log(`Réimport vérifié : ${v.tables} tables, ${v.reponses} réponses vides (une par entité), ${v.guides} guides, ${v.regles} règles d'accès, module ${v.module || 'ABSENT'}, ${v.comptes} compte hors administration.`);
    if (!v.module || !v.guides || v.reponses !== require('../schema/entites.json').length) process.exitCode = 1;
  } finally {
    if (temporaire) { try { await (await client()).supprimerDoc(temporaire.docId); } catch (e) { /* déjà supprimé */ } }
    if (avant) ecrireDocCourant(avant);
  }
})().catch(e => { console.error('ÉCHEC : ' + e.message); process.exit(1); });
