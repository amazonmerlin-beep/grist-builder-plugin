'use strict';
// PDF minimal sans dépendance : pages de texte (Helvetica, encodage WinAnsi). Sert aux documents fictifs des
// jeux d'essai, pour tester l'aperçu et le téléchargement des pièces sans vrai document.
const WINANSI = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '…': 0x85, 'œ': 0x9c, 'Œ': 0x8c, '€': 0x80 };
function octets(s) {
  const out = [];
  for (const ch of s) {
    const c = WINANSI[ch] || ch.charCodeAt(0);
    if (c > 255) { out.push(0x3f); continue; }
    if (c === 0x28 || c === 0x29 || c === 0x5c) out.push(0x5c);   // ( ) \ échappés
    out.push(c);
  }
  return Buffer.from(out);
}
/** pages : tableau de pages, chaque page un tableau de lignes ; la première ligne est le titre. */
function pdf(pages) {
  const objets = [];   // Buffer par objet, numérotés à partir de 1
  const ajouter = b => { objets.push(Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1')); return objets.length; };
  const catalogue = ajouter('');   // rempli après
  const racine = ajouter('');
  const police = ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const policeGras = ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const lignes of pages) {
    const flux = [Buffer.from('BT\n', 'latin1')];
    lignes.slice(0, 48).forEach((l, i) => {
      const [f, t, y] = i === 0 ? ['F2', 16, 790] : ['F1', 10.5, 760 - i * 14.5];
      flux.push(Buffer.from(`/${f} ${t} Tf 1 0 0 1 56 ${y} Tm (`, 'latin1'), octets(String(l).slice(0, 110)), Buffer.from(') Tj\n', 'latin1'));
    });
    flux.push(Buffer.from('ET\n', 'latin1'));
    const contenu = Buffer.concat(flux);
    const c = ajouter(Buffer.concat([Buffer.from(`<< /Length ${contenu.length} >>\nstream\n`, 'latin1'), contenu, Buffer.from('\nendstream', 'latin1')]));
    kids.push(ajouter(`<< /Type /Page /Parent ${racine} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${police} 0 R /F2 ${policeGras} 0 R >> >> /Contents ${c} 0 R >>`));
  }
  objets[catalogue - 1] = Buffer.from(`<< /Type /Catalog /Pages ${racine} 0 R >>`, 'latin1');
  objets[racine - 1] = Buffer.from(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`, 'latin1');
  const parties = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let pos = parties[0].length;
  const xref = [];
  objets.forEach((o, i) => {
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), o, Buffer.from('\nendobj\n', 'latin1')]);
    xref.push(pos); pos += b.length; parties.push(b);
  });
  parties.push(Buffer.from(`xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${xref.map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(parties);
}
module.exports = { pdf };
