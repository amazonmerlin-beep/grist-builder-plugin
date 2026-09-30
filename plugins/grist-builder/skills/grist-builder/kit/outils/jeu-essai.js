'use strict';
// Jeu d'essai FICTIF, pour essayer le document sur une instance réelle (getgrist.com, instance du client) avec de
// vrais comptes, sans aucune donnée réelle :
// - en option, l'administration (--admin) et un répondant (--repondant) dans l'annuaire ;
// - trois entités « ESSAI » inventées et leurs réponses remplies de valeurs fictives (deux transmises, une en
//   brouillon : celle du répondant, pour qu'il puisse l'essayer) ;
// - si la table des réponses a une colonne de pièces jointes, un PDF généré, marqué « document fictif », par ligne.
// Rejouable : les éléments « ESSAI » précédents sont retirés d'abord. --retirer : les retire seulement (l'annuaire reste).
// Peu d'appels (6 ou 7) : les PDF partent en un seul envoi (quota de getgrist.com).
// Usage : GRIST_URL=… GRIST_API_KEY=… GRIST_ORG=… DOC_COURANT=… node outils/jeu-essai.js [--admin <adresse>] [--repondant <adresse>] [--entite ESSAI1]
//         node outils/jeu-essai.js --retirer
// À adapter au modèle du projet : TABLE, CLE et, au besoin, valeur().
const { client, docCourant } = require('./lib/cles');
const { pdf } = require('./lib/pdf');
const { TABLES } = require('../schema/modele');
const config = require('../projet.config');

const TABLE = 'Reponses';   // table des lignes fictives
const CLE = 'Entite';       // colonne qui rattache la ligne à une entité
const ENTITES = [1, 2, 3].map(k => ({ Code: `ESSAI${k}`, Libelle: `ESSAI - Entité fictive ${k}` }));
const FICTIF = `DOCUMENT FICTIF - jeu d'essai du document Grist « ${config.nom} ». Aucune valeur réelle.`;

const args = (() => {
  const a = process.argv.slice(2), o = { entite: ENTITES[0].Code };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--admin') o.admin = a[++i].toLowerCase();
    else if (a[i] === '--repondant') o.repondant = a[++i].toLowerCase();
    else if (a[i] === '--entite') o.entite = a[++i];
    else if (a[i] === '--retirer') o.retirer = true;
  }
  return o;
})();

const table = TABLES.find(t => t.id === TABLE);
if (!table) throw new Error(`Table ${TABLE} absente de schema/modele.js : adapter TABLE dans ce script.`);
const colPieces = (table.colonnes.find(c => c.type === 'Attachments' && !c.formule) || {}).id;
// Colonnes de données à remplir (ni formules, ni clé, ni statut, ni pièces)
const aRemplir = table.colonnes.filter(c => !c.formule && ![CLE, 'Statut', colPieces].includes(c.id));
/** Valeur fictive vraisemblable selon le type de colonne ; undefined = colonne laissée vide. */
function valeur(c, k) {
  if (c.type === 'Text') return `ESSAI - ${c.label || c.id} (valeur fictive ${k + 1})`;
  if (c.type === 'Int' || c.type === 'Numeric') return 10 * (k + 1);
  if (c.type === 'Bool') return true;
  if (c.type === 'Choice') return ((c.options || {}).choices || [])[0];
  if (c.type === 'Date' || /^DateTime/.test(c.type)) return Math.floor(Date.now() / 1000) - k * 86400;
  return undefined;
}

/** Retire les éléments « ESSAI » : lignes de la table, entités. */
async function retirer(g, DOC) {
  const lignes = await g.sql(DOC, `select id from ${TABLE} where ${CLE} like 'ESSAI%'`);
  const entites = await g.sql(DOC, "select id from Entites where Code like 'ESSAI%'");
  const suppr = [[TABLE, lignes], ['Entites', entites]].filter(([, l]) => l.length).map(([t, l]) => ['BulkRemoveRecord', t, l.map(x => x.id)]);
  if (suppr.length) await g.appliquer(DOC, suppr);
  console.log(`Éléments « ESSAI » retirés : ${lignes.length} ligne(s) de ${TABLE}, ${entites.length} entité(s).`);
}

(async () => {
  const g = await client();
  const d = docCourant();
  if (!d) throw new Error('Aucun document courant (doc-courant.json ou DOC_COURANT).');
  const DOC = d.docId;
  await retirer(g, DOC);
  if (args.retirer) return;

  // Annuaire (facultatif)
  const comptes = [];
  if (args.admin) comptes.push({ require: { Email: args.admin }, fields: { Nom: 'Administration (essai)', Role: 'admin', Entite: '', Actif: true } });
  if (args.repondant) comptes.push({ require: { Email: args.repondant }, fields: { Nom: 'Répondant (essai)', Role: 'repondant', Entite: args.entite, Actif: true } });
  if (comptes.length) await g.upsert(DOC, 'Annuaire', comptes);

  // PDF générés : un seul envoi pour tous les fichiers
  let ids = [];
  if (colPieces) {
    const pages = e => [
      [`Pièce fictive - ${e.Libelle}`, '', FICTIF, '', `Document : ${config.nom}`, '',
        ...Array.from({ length: 20 }, (_, i) => `${i + 1}.  Contenu illustratif, pour tester l'aperçu, le défilement et le téléchargement.`)],
      ['Page 2', '', FICTIF],
    ];
    ids = await g.televerser(DOC, ENTITES.map((e, k) => ({ nom: `essai-${k + 1}.pdf`, contenu: pdf(pages(e)), type: 'application/pdf' })));
  }

  await g.ajouter(DOC, 'Entites', ENTITES);
  await g.ajouter(DOC, TABLE, ENTITES.map((e, k) => {
    const brouillon = e.Code === args.entite;
    const champs = { [CLE]: e.Code, Statut: brouillon ? 'Brouillon' : 'Transmis' };
    for (const c of aRemplir) { const v = brouillon ? null : valeur(c, k); if (v !== undefined) champs[c.id] = v; }
    if (colPieces && !brouillon) champs[colPieces] = ['L', ids[k]];
    return champs;
  }));
  console.log(`Jeu d'essai : ${ENTITES.length} entités fictives et leurs lignes de ${TABLE}${colPieces ? `, ${ids.length} PDF` : ''}` +
    `${args.admin ? ` ; administration ${args.admin}` : ''}${args.repondant ? ` ; répondant ${args.repondant} (${args.entite})` : ''}.`);
})().catch(e => { console.error('ÉCHEC :', e.message); if (e.corps) console.error(JSON.stringify(e.corps).slice(0, 1000)); process.exit(1); });
