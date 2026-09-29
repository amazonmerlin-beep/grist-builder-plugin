'use strict';
// Guides de l'onglet « Aide » : guides/*.md → table Guides ; les captures citées (![…](nom.png),
// prises dans guides/images/) sont déposées en pièces jointes dans la colonne Images du guide.
// En-tête de chaque fichier :
//   ---
//   titre: Guide du répondant
//   public: repondant, partenaire, df, admin      (rôles, ou « inconnu » pour les comptes non reconnus)
//   ordre: 10
//   resume: Remplir et transmettre la réponse du département.
//   ---
const fs = require('fs');
const path = require('path');
require('../../module/src/markdown.js');
const M = globalThis.Formulaire.markdown;

const DOSSIER = path.join(__dirname, '..', '..', 'guides');
const PUBLICS = [...Object.keys(require('../../projet.config').roles), 'inconnu'];

function lireGuide(texte, cle) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(texte);
  if (!m) throw new Error(`${cle} : en-tête --- manquant`);
  const meta = Object.fromEntries(m[1].split(/\r?\n/).filter(l => l.includes(':')).map(l => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  const pub = (meta.public || '').split(',').map(x => x.trim()).filter(Boolean);
  const inconnus = pub.filter(p => !PUBLICS.includes(p));
  if (!meta.titre) throw new Error(`${cle} : titre manquant`);
  if (!pub.length || inconnus.length) throw new Error(`${cle} : public invalide (${meta.public || 'vide'})`);
  const contenu = m[2].trim();
  return { cle, titre: meta.titre, public: pub, ordre: Number(meta.ordre) || 100, resume: meta.resume || '', contenu, images: M.images(contenu) };
}

function lireGuides(dossier = DOSSIER) {
  return fs.readdirSync(dossier).filter(f => f.endsWith('.md')).sort()
    .map(f => lireGuide(fs.readFileSync(path.join(dossier, f), 'utf8'), f.replace(/\.md$/, '')))
    .sort((a, b) => a.ordre - b.ordre);
}

/** Remplace les guides du document par ceux du dossier (clé = nom du fichier). */
async function chargerGuides(g, docId, { dossier = DOSSIER } = {}) {
  const guides = lireGuides(dossier);
  const manquantes = [];
  const idImage = {};
  for (const nom of [...new Set(guides.flatMap(x => x.images))]) {
    const f = path.join(dossier, 'images', nom);
    if (!fs.existsSync(f)) { manquantes.push(nom); continue; }
    [idImage[nom]] = await g.televerser(docId, [{ nom, type: 'image/png', contenu: fs.readFileSync(f) }]);
  }
  const existants = await g.lignes(docId, 'Guides');
  const champs = x => ({
    Cle: x.cle, Titre: x.titre, Public: ['L', ...x.public], Ordre: x.ordre, Resume: x.resume, Contenu: x.contenu,
    Images: x.images.some(n => idImage[n]) ? ['L', ...x.images.filter(n => idImage[n]).map(n => idImage[n])] : null,
  });
  const actions = [];
  const aModifier = guides.filter(x => existants.some(e => e.Cle === x.cle));
  const aAjouter = guides.filter(x => !existants.some(e => e.Cle === x.cle));
  const aRetirer = existants.filter(e => !guides.some(x => x.cle === e.Cle));
  const colonnes = lignes => Object.fromEntries(Object.keys(champs(guides[0])).map(k => [k, lignes.map(x => champs(x)[k])]));
  if (aAjouter.length) actions.push(['BulkAddRecord', 'Guides', aAjouter.map(() => null), colonnes(aAjouter)]);
  if (aModifier.length) actions.push(['BulkUpdateRecord', 'Guides', aModifier.map(x => existants.find(e => e.Cle === x.cle).id), colonnes(aModifier)]);
  if (aRetirer.length) actions.push(['BulkRemoveRecord', 'Guides', aRetirer.map(e => e.id)]);
  if (actions.length) await g.appliquer(docId, actions);
  return { guides: guides.length, images: Object.keys(idImage).length, manquantes, retires: aRetirer.length };
}

module.exports = { lireGuide, lireGuides, chargerGuides, DOSSIER, PUBLICS };
