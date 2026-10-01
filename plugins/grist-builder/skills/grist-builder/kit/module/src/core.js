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
    etat.moi = moiDepuis(moi);
    return etat.moi;
  }
  /** Identité d'après la ligne de connexion (ses formules suivent l'annuaire : un compte accepté devient connu). */
  function moiDepuis(c) {
    return c
      ? { email: c.Email || '', nom: c.Nom || c.Email || '', role: c.Role || '', entite: c.Entite || '', connu: !!c.Connu, compte: c.Compte || null, ligne: c.id }
      : { email: '', nom: '', role: '', entite: '', connu: false, compte: null, ligne: null };
  }
  const estAdmin = () => etat.moi && etat.moi.role === 'admin';

  // ------------------------------------------------------------------ écriture
  function messageErreur(e) {
    const m = String((e && e.message) || e || '');
    if (/access|denied|Blocked|permission|refus/i.test(m)) return "Cette modification n'est pas autorisée pour votre compte.";
    return 'Enregistrement impossible : ' + m.slice(0, 160);
  }
  // Tables à relire après une écriture : la table écrite et celles dont les formules en dépendent
  // (CONFIG.dependances). Relire tout le document à chaque clic est inutile et lent.
  function tablesTouchees(actions) {
    const dep = L.CONFIG.dependances || {};
    const s = new Set();
    for (const a of actions) { const t = a[1]; if (!t) continue; s.add(t); (dep[t] || []).forEach(x => s.add(x)); }
    return [...s].filter(x => TABLES.includes(x));
  }
  /**
   * Applique des actions. o.rendre = false : l'écran est déjà à jour (saisie, bouton basculé sur place) ;
   * les données sont relues sans redessiner la page.
   */
  async function appliquer(actions, o = {}) {
    try {
      const r = await grist.docApi.applyUserActions(actions);
      if (L.app && L.app.rafraichir) L.app.rafraichir(400, { tables: o.tables || tablesTouchees(actions), rendre: o.rendre !== false });
      // (rendre: false → relecture silencieuse ; les changements des autres seront affichés à la relecture suivante)
      return r;
    } catch (e) { toast(messageErreur(e), 'erreur'); throw e; }
  }
  const maj = (table, id, champs, o) => appliquer([['UpdateRecord', table, id, champs]], o);
  async function ajouter(table, champs, o) { const r = await appliquer([['AddRecord', table, null, champs]], o); return r.retValues[0]; }

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

  /**
   * Ouvre une pièce jointe dans la page. Jeton du widget en lecture seule, requête SANS cookie
   * (credentials: 'omit' : avec cookies, Grist refuse les requêtes d'une autre origine et le navigateur
   * affiche une fausse erreur CORS), statut vérifié : un refus (403) est dit comme tel.
   * Renvoie { url (blob), type, nom } ou lève une erreur au message lisible.
   */
  async function lirePiece(id, nom) {
    let t;
    try { t = await grist.docApi.getAccessToken({ readOnly: true }); }
    catch (e) { throw new Error("Jeton d'accès indisponible : rechargez la page."); }
    let r;
    try { r = await fetch(`${t.baseUrl}/attachments/${id}/download?auth=${encodeURIComponent(t.token)}`, { credentials: 'omit' }); }
    catch (e) { throw new Error('Le serveur ne répond pas (réseau, ou blocage du navigateur).'); }
    if (r.status === 403 || r.status === 404) throw new Error("Accès refusé à ce document : il n'est lisible que par les comptes autorisés (règles d'accès).");
    if (!r.ok) throw new Error(`Téléchargement impossible (erreur ${r.status}).`);
    const blob = await r.blob();
    return { url: URL.createObjectURL(blob), type: blob.type || '', nom: nom || `document-${id}` };
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
  /** RGAA 13.2 : tout lien qui ouvre une nouvelle fenêtre l'annonce (texte lu et pictogramme visible). */
  function signalerNouvellesFenetres(el) {
    el.querySelectorAll('a[target="_blank"]:not([data-nf])').forEach(a => {
      a.dataset.nf = '1';
      a.classList.add('nouvelle-fenetre');
      if (!/nouvelle fenêtre/i.test(a.textContent)) a.insertAdjacentHTML('beforeend', '<span class="sr-only"> (nouvelle fenêtre)</span>');
    });
  }
  /** Fenêtre modale ; boutons : [{ libelle, valeur, classe }] ; renvoie la valeur du bouton (ou null). */
  function fenetre(titre, contenu, { boutons = [{ libelle: 'Fermer', valeur: null, classe: 'secondaire' }], large = false, avant = null } = {}) {
    return new Promise(resoudre => {
      const v = document.createElement('div');
      v.className = 'voile';
      v.innerHTML = `<div class="fenetre${large ? ' fenetre-large' : ''}" role="dialog" aria-modal="true" aria-labelledby="titre-fenetre">
        <h2 id="titre-fenetre">${esc(titre)}</h2><div class="corps">${contenu}</div>
        <div class="actions">${boutons.map((b, i) => `<button type="button" class="btn ${b.classe || ''}" data-i="${i}">${esc(b.libelle)}</button>`).join('')}</div></div>`;
      // RGAA 7.1, 12.8 : focus placé dans la fenêtre, maintenu à l'intérieur (Tab), rendu à l'élément
      // d'origine à la fermeture ; Échap ferme ; le reste de la page est inerte pendant l'ouverture
      const origine = document.activeElement;
      const app = document.getElementById('app');
      const focusables = () => [...v.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, [tabindex]:not([tabindex="-1"])')];
      const fermer = val => {
        v.remove(); document.removeEventListener('keydown', clavier);
        if (app) app.inert = false;
        if (origine && origine.isConnected && origine.focus) origine.focus();
        resoudre(val);
      };
      const clavier = e => {
        if (e.key === 'Escape') return fermer(null);
        if (e.key !== 'Tab') return;
        const f = focusables();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      };
      v.addEventListener('click', e => {
        const b = e.target.closest('[data-i]');
        if (b) { const val = boutons[+b.dataset.i].valeur; if (!avant || avant(val) !== false) fermer(val); }
        else if (e.target === v) fermer(null);
      });
      document.addEventListener('keydown', clavier);
      signalerNouvellesFenetres(v);
      document.body.appendChild(v);
      if (app) app.inert = true;
      const premier = v.querySelector('.corps input, .corps textarea, .corps select') || v.querySelector('.actions .btn:not(.secondaire)') || v.querySelector('.actions .btn');
      if (premier) premier.focus();
    });
  }
  const confirmer = (titre, texte, libelle = 'Confirmer') =>
    fenetre(titre, `<p>${texte}</p>`, { boutons: [{ libelle: 'Annuler', valeur: false, classe: 'secondaire' }, { libelle, valeur: true }] });

  // ------------------------------------------------------------------ tableaux triables
  // cols : [[clé, libellé, valeur(ligne) → nombre ou texte, sens par défaut ('asc' | 'desc')], …]
  // t : { tri, sens } (état de l'écran, etat.arg) ; sans tri choisi, `defaut` (clé) ou l'ordre reçu.
  // Valeurs vides toujours en fin de liste ; à égalité, ordre reçu conservé.
  const vide = v => v === null || v === undefined || v === '';
  function trier(lignes, cols, t = {}, defaut = null) {
    const k = t.tri || defaut;
    const c = cols.find(x => x[0] === k);
    if (!c) return lignes.slice();
    const sens = (t.tri ? t.sens : c[3]) === 'desc' ? -1 : 1;
    const cmp = (x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fr', { numeric: true }));
    return lignes.map((l, i) => [l, c[2](l), i])
      .sort(([, x, i], [, y, j]) => (vide(x) - vide(y)) || (vide(x) ? 0 : sens * cmp(x, y)) || i - j)
      .map(([l]) => l);
  }
  // En-têtes : bouton par colonne, aria-sort sur la colonne triée (RGAA 5.7) ; action « trier » dans app.js.
  // Ajouter au tableau une légende : <caption class="sr-only">… ; les boutons d'en-tête trient la liste</caption>
  function enteteTri(cols, t = {}, defaut = null) {
    const k = t.tri || defaut;
    const c0 = cols.find(x => x[0] === k);
    const sens = t.tri ? t.sens : (c0 && c0[3]) || 'asc';
    return cols.map(([cle, lib, , sensDefaut]) => {
      const actif = cle === k;
      return `<th scope="col"${actif ? ` aria-sort="${sens === 'desc' ? 'descending' : 'ascending'}"` : ''}><button type="button" class="tri${actif ? ' actif' : ''}" data-action="trier" data-tri="${esc(cle)}"${sensDefaut ? ` data-sens="${sensDefaut}"` : ''}>${esc(lib)}<span class="tri-fleche" aria-hidden="true">${actif ? (sens === 'desc' ? '▼' : '▲') : '↕'}</span></button></th>`;
    }).join('');
  }

  L.core = {
    TABLES, etat, charger, lireTable, param, identifier, moiDepuis, estAdmin, appliquer, maj, ajouter, messageErreur,
    televerser, infosPiecesJointes, lirePiece, esc, racine, toast, fenetre, confirmer, signalerNouvellesFenetres,
    trier, enteteTri,
  };
})(globalThis.Formulaire = globalThis.Formulaire || {});
