'use strict';
// Lecteur xlsx minimal, sans dépendance : un .xlsx est un zip de fichiers XML.
// Zip : répertoire central, méthodes « stocké » (0) et « deflate » (8, zlib.inflateRawSync).
// Feuille : chaînes partagées, chaînes en ligne, nombres, booléens ; valeurs des formules telles qu'enregistrées.
// Suffisant pour relire un export Grist ou Excel ; pas pour des classeurs chiffrés ou zip64.
const fs = require('fs');
const zlib = require('zlib');

/** Contenu d'un zip : Map(nom → Buffer décompressé). */
function lireZip(fichier) {
  const buf = fs.readFileSync(fichier);
  // Fin du répertoire central : signature 0x06054b50, dans les 64 Ko finaux
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error(`${fichier} : pas un fichier zip (xlsx) lisible`);
  const nb = buf.readUInt16LE(fin + 10);
  let pos = buf.readUInt32LE(fin + 16);
  const res = new Map();
  for (let k = 0; k < nb; k++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error('Répertoire central du zip illisible');
    const methode = buf.readUInt16LE(pos + 10);
    const tailleC = buf.readUInt32LE(pos + 20);
    const lNom = buf.readUInt16LE(pos + 28), lExtra = buf.readUInt16LE(pos + 30), lCom = buf.readUInt16LE(pos + 32);
    const local = buf.readUInt32LE(pos + 42);
    const nom = buf.toString('utf8', pos + 46, pos + 46 + lNom);
    // En-tête local : ses propres longueurs de nom et d'extra
    const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const brut = buf.subarray(debut, debut + tailleC);
    if (methode === 0) res.set(nom, brut);
    else if (methode === 8) res.set(nom, zlib.inflateRawSync(brut));
    else throw new Error(`${nom} : méthode de compression ${methode} non prise en charge`);
    pos += 46 + lNom + lExtra + lCom;
  }
  return res;
}

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decoder = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITES[e] ?? m));
/** Texte d'un nœud <si> ou <is> : concaténation des <t>, hors annotations phonétiques <rPh>. */
const texteRiche = xml => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)].map(m => decoder(m[1] || '')).join('');
const colonne = ref => [...ref.replace(/\d+$/, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/**
 * Lit une feuille d'un classeur ; renvoie { entetes, lignes } où chaque ligne est un objet { entête: valeur }.
 * @param {string} fichier chemin du .xlsx
 * @param {string} [feuille] nom de la feuille (la première par défaut)
 */
function lireFeuille(fichier, feuille) {
  const zip = lireZip(fichier);
  const txt = n => (zip.has(n) ? zip.get(n).toString('utf8') : '');
  const partagees = [...txt('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => texteRiche(m[1]));
  // Feuille visée : workbook.xml (nom → r:id), puis ses relations (r:id → fichier)
  const classeur = txt('xl/workbook.xml');
  const feuilles = [...classeur.matchAll(/<sheet\b[^>]*>/g)].map(m => ({ nom: decoder((/name="([^"]*)"/.exec(m[0]) || [])[1] || ''), rid: (/r:id="([^"]*)"/.exec(m[0]) || [])[1] }));
  const cible = feuille ? feuilles.find(f => f.nom === feuille) : feuilles[0];
  if (!cible) throw new Error(`Feuille « ${feuille} » absente (${feuilles.map(f => f.nom).join(', ')})`);
  const rels = txt('xl/_rels/workbook.xml.rels');
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m => m[0]).find(r => r.includes(`Id="${cible.rid}"`));
  const chemin = ((/Target="([^"]*)"/.exec(rel || '') || [])[1] || 'worksheets/sheet1.xml').replace(/^\/?(xl\/)?/, 'xl/');
  const xml = txt(chemin);
  const grille = [];
  for (const [, ligne] of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const vals = [];
    for (const m of ligne.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = m[1], corps = m[2] || '';
      const ref = (/r="([A-Z]+\d+)"/.exec(attrs) || [])[1];
      const type = (/t="(\w+)"/.exec(attrs) || [])[1];
      const v = (/<v>([\s\S]*?)<\/v>/.exec(corps) || [])[1];
      let val = null;
      if (type === 's') val = partagees[Number(v)] ?? '';
      else if (type === 'inlineStr') val = texteRiche(((/<is>([\s\S]*?)<\/is>/.exec(corps)) || [])[1] || '');
      else if (type === 'str') val = v !== undefined ? decoder(v) : '';
      else if (type === 'b') val = v === '1';
      else if (v !== undefined) val = Number(v);
      vals[ref ? colonne(ref) : vals.length] = val;
    }
    grille.push(vals);
  }
  const entetes = (grille.shift() || []).map(h => (h == null ? '' : String(h)));
  const lignes = grille.filter(l => l.some(v => v !== null && v !== undefined && v !== ''))
    .map(l => Object.fromEntries(entetes.map((h, i) => [h, l[i] ?? null])));
  return { entetes, lignes };
}

module.exports = { lireZip, lireFeuille };
