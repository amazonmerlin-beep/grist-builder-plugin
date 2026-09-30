'use strict';
// Lecteur tar minimal (ustar, noms longs en en-têtes pax), sans dépendance ni outil externe : `tar` de Git Bash
// prend « C: » pour un hôte distant. Sert à lire l'archive des pièces jointes d'un document Grist
// (GET /attachments/archive), dont chaque entrée s'appelle « <sha1>_<nom du fichier> ».

const fs = require('fs');

/** Renvoie [{ nom, contenu: Buffer }] pour les fichiers ordinaires de l'archive. */
function lireTar(fichier) {
  const buf = fs.readFileSync(fichier);
  const res = [];
  let pos = 0, nomPax = null;
  const txt = (o, n) => buf.toString('utf8', o, o + n).split('\u0000')[0];
  while (pos + 512 <= buf.length) {
    if (buf.readUInt8(pos) === 0) break;
    const taille = parseInt(txt(pos + 124, 12).trim() || '0', 8);
    const type = txt(pos + 156, 1);
    const prefixe = txt(pos + 345, 155);
    const nom = nomPax || (prefixe ? prefixe + '/' : '') + txt(pos, 100);
    const debut = pos + 512;
    if (type === 'x') {
      const m = /\d+ path=([^\n]*)\n/.exec(buf.toString('utf8', debut, debut + taille));
      nomPax = m ? m[1] : null;
    } else {
      if (type === '0' || type === '') res.push({ nom, contenu: buf.subarray(debut, debut + taille) });
      nomPax = null;
    }
    pos = debut + Math.ceil(taille / 512) * 512;
  }
  return res;
}

/** Pièces jointes d'une archive Grist, indexées par empreinte (fileIdent sans extension). */
function piecesParEmpreinte(fichier) {
  return new Map(lireTar(fichier).map(f => [f.nom.split('/').pop().slice(0, 40), f.contenu]));
}

module.exports = { lireTar, piecesParEmpreinte };
