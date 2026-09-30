'use strict';
// Clone un document Grist existant (celui du client) en DEUX appels d'API : le .grist sans historique, et
// l'archive de toutes ses pièces jointes. Rien n'est modifié chez le client. Étude ensuite hors ligne (SQLite).
// Usage : GRIST_URL=https://<équipe>.getgrist.com GRIST_API_KEY=… node outils/cloner.js <docId> [dossier]
// La clé se lit de préférence dans un fichier ignoré par git : GRIST_API_KEY=$(cat ../api.secret)
// Quota : getgrist.com gratuit = 3 000 appels par mois ; ne jamais télécharger les pièces une par une.
const fs = require('fs');
const path = require('path');

(async () => {
  const [docId, dossier = 'source'] = process.argv.slice(2);
  const base = (process.env.GRIST_URL || '').replace(/\/$/, '');
  const cle = (process.env.GRIST_API_KEY || '').trim();
  if (!docId || !base || !cle) throw new Error('Usage : GRIST_URL=… GRIST_API_KEY=… node outils/cloner.js <docId> [dossier]');
  const h = { Authorization: 'Bearer ' + cle };
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  fs.mkdirSync(dossier, { recursive: true });
  const telecharger = async (chemin, fichier) => {
    const r = await fetch(base + chemin, { headers: h });
    if (!r.ok) throw new Error(`${chemin} → ${r.status} ${(await r.text()).slice(0, 200)}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(dossier, fichier), buf);
    console.log(`${fichier} : ${(buf.length / 1024 / 1024).toFixed(1)} Mo`);
  };
  await telecharger(`/api/docs/${docId}/download?nohistory=true`, `${docId}_${date}.grist`);
  await telecharger(`/api/docs/${docId}/attachments/archive?format=tar`, `${docId}_${date}_pieces-jointes.tar`);
  console.log(`Clone dans ${dossier}/ (2 appels). Données personnelles possibles : ne pas le mettre dans un dépôt.`);
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
