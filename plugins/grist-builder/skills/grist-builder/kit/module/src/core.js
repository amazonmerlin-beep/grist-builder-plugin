// Formulaire.core — données, identité, écritures, pièces jointes, composants d'interface de base.
(function (L) {
  'use strict';
  const TABLES = L.CONFIG.tablesModule;
  const etat = { doc: {}, moi: null, params: {}, vue: null, arg: {} };

  // ------------------------------------------------------------------ lecture
  // fetchTable renvoie des colonnes ; les listes arrivent encodées ['L', …], les erreurs ['E', …]
  function decoder(v) {
    if (!Array.isArray(v)) return v;
    switch (v[0]) {
      case 'L': return v.slice(1);
      case 'E': case 'C': case 'P': case 'U': return null;
      case 'D': case 'd': return v[1];
      case 'R': case 'r': return v[2];
      default: return v;
    }
  }
  function lignesDepuisColonnes(data) {
    if (!data || !data.id) return [];
    const cols = Object.keys(data);
    return data.id.map((_, i) => Object.fromEntries(cols.map(c => [c, decoder(data[c][i])])));
  }
  async function lireTable(t) {
    try { return lignesDepuisColonnes(await grist.docApi.fetchTable(t)); }
    catch (e) { return []; }   // table fermée par les règles : Grist refuse (403), on la traite comme vide
  }
  async function charger(tables) {
    const liste = tables || TABLES;
    const res = await Promise.all(liste.map(lireTable));
    liste.forEach((t, i) => { etat.doc[t] = res[i]; });
    etat.params = Object.fromEntries((etat.doc.Parametres || []).map(p => [p.Cle, p.Valeur || '']));
  }
  const param = (cle, defaut = '') => (etat.params[cle] ? etat.params[cle] : defaut);

  // ------------------------------------------------------------------ identité
  // Le widget ne connaît pas l'utilisateur. À chaque ouverture, il ajoute une ligne à Connexions :
  // le déclencheur y inscrit user.Email, les formules y ajoutent rôle et entité lus dans l'annuaire.
  // Les règles interdisent d'écrire l'adresse d'un autre : l'identité ne peut pas être usurpée.
  async function identifier(version) {
    let moi = null;
    try {
      const r = await grist.docApi.applyUserActions([['AddRecord', 'Connexions', null, { Version: version }]]);
      moi = (await lireTable('Connexions')).find(c => c.id === r.retValues[0]) || null;
    } catch (e) { moi = null; }   // lecture seule (rôle « Lecteur ») : identité inconnue
    etat.moi = moi
      ? { email: moi.Email || '', nom: moi.Nom || moi.Email || '', role: moi.Role || '', entite: moi.Entite || '', connu: !!moi.Connu }
      : { email: '', nom: '', role: '', entite: '', connu: false };
    return etat.moi;
  }
  const estAdmin = () => etat.moi && etat.moi.role === 'admin';

  // ------------------------------------------------------------------ écriture
  function messageErreur(e) {
    const m = String((e && e.message) || e || '');
    if (/access|denied|Blocked|permission|refus/i.test(m)) return "Cette modification n'est pas autorisée pour votre compte.";
    return 'Enregistrement impossible : ' + m.slice(0, 160);
  }
  async function appliquer(actions) {
    try {
      const r = await grist.docApi.applyUserActions(actions);
      if (L.app && L.app.rafraichir) L.app.rafraichir(400);   // relire : les formules ont changé
      return r;
    } catch (e) { toast(messageErreur(e), 'erreur'); throw e; }
  }
  const maj = (table, id, champs) => appliquer([['UpdateRecord', table, id, champs]]);
  async function ajouter(table, champs) { const r = await appliquer([['AddRecord', table, null, champs]]); return r.retValues[0]; }

  // ------------------------------------------------------------------ pièces jointes (jeton d'accès du widget)
  const jeton = () => grist.docApi.getAccessToken({ readOnly: false });
  async function televerser(fichiers) {
    const t = await jeton();
    const fd = new FormData();
    for (const f of fichiers) fd.append('upload', f, f.name);
    // En-tête exigé pour un envoi authentifié par jeton (sinon 401, affiché « Failed to fetch »)
    const r = await fetch(`${t.baseUrl}/attachments?auth=${encodeURIComponent(t.token)}`, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!r.ok) throw new Error(`envoi refusé (${r.status})`);
    return r.json();
  }
  /** Nom, taille et lien de chaque pièce jointe (lus un par un : la liste globale est fermée par les règles). */
  async function infosPiecesJointes(ids) {
    if (!ids || !ids.length) return [];
    let t = null;
    try { t = await jeton(); } catch (e) { /* jeton indisponible */ }
    return Promise.all(ids.map(async id => {
      if (!t) return { id, nom: `Fichier n° ${id}`, taille: null, url: null };
      const auth = `auth=${encodeURIComponent(t.token)}`;
      const url = `${t.baseUrl}/attachments/${id}/download?${auth}`;
      try {
        const r = await fetch(`${t.baseUrl}/attachments/${id}?${auth}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const j = r.ok ? await r.json() : {};
        return { id, nom: j.fileName || `Fichier n° ${id}`, taille: j.fileSize || null, url };
      } catch (e) { return { id, nom: `Fichier n° ${id}`, taille: null, url }; }
    }));
  }

  // ------------------------------------------------------------------ interface de base
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const racine = () => document.getElementById('app');
  function toast(msg, type) {
    let z = document.querySelector('.toasts');
    if (!z) { z = document.createElement('div'); z.className = 'toasts'; z.setAttribute('role', 'status'); document.body.appendChild(z); }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    z.appendChild(t);
    setTimeout(() => t.remove(), type === 'erreur' ? 7000 : 3500);
  }
  /** Fenêtre modale ; boutons : [{ libelle, valeur, classe }] ; renvoie la valeur du bouton (ou null). */
  function fenetre(titre, contenu, { boutons = [{ libelle: 'Fermer', valeur: null, classe: 'secondaire' }] } = {}) {
    return new Promise(resoudre => {
      const v = document.createElement('div');
      v.className = 'voile';
      v.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true" aria-labelledby="titre-fenetre">
        <h2 id="titre-fenetre">${esc(titre)}</h2><div class="corps">${contenu}</div>
        <div class="actions">${boutons.map((b, i) => `<button type="button" class="btn ${b.classe || ''}" data-i="${i}">${esc(b.libelle)}</button>`).join('')}</div></div>`;
      const fermer = val => { v.remove(); document.removeEventListener('keydown', echap); resoudre(val); };
      const echap = e => { if (e.key === 'Escape') fermer(null); };
      v.addEventListener('click', e => {
        const b = e.target.closest('[data-i]');
        if (b) fermer(boutons[+b.dataset.i].valeur);
        else if (e.target === v) fermer(null);
      });
      document.addEventListener('keydown', echap);
      document.body.appendChild(v);
    });
  }
  const confirmer = (titre, texte, libelle = 'Confirmer') =>
    fenetre(titre, `<p>${texte}</p>`, { boutons: [{ libelle: 'Annuler', valeur: false, classe: 'secondaire' }, { libelle, valeur: true }] });

  L.core = {
    TABLES, etat, charger, lireTable, param, identifier, estAdmin, appliquer, maj, ajouter, messageErreur,
    televerser, infosPiecesJointes, esc, racine, toast, fenetre, confirmer,
  };
})(globalThis.Formulaire = globalThis.Formulaire || {});
