// Formulaire.app — coquille : démarrage, identité, onglets par rôle, rendu, rafraîchissement, veille, historique.
(function (L) {
  'use strict';
  const C = L.core, CONFIG = L.CONFIG;
  const vues = {}, actions = {};
  // Pastilles des onglets, déclarées par les vues : pastilles[vue] = { compter: () => nombre,
  // annonce: (hausse, total) => texte annoncé quand le nombre augmente }
  const pastilles = {};
  const pastille = v => { const p = pastilles[v]; return p && C.etat.moi.connu ? Number(p.compter()) || 0 : 0; };
  const htmlPastille = n => (n ? ` <span class="pastille-onglet" aria-hidden="true">${n > 99 ? '99+' : n}</span><span class="sr-only"> (${n})</span>` : '');
  const libelleRole = r => (CONFIG.roles[r] || {}).libelle || 'Compte non reconnu';
  const ongletsDuRole = () => (C.etat.moi && CONFIG.onglets[C.etat.moi.role]) || [];
  const vueParDefaut = () => (ongletsDuRole()[0] || ['inconnu'])[0];
  // Onglet surligné : celui de la vue, ou celui dont elle dépend (vue.onglet) : une fiche ouverte depuis une
  // liste garde l'onglet de la liste, sans fil d'Ariane
  const ongletDe = v => (vues[v] && vues[v].onglet) || v;

  function bandeau() {
    const m = C.etat.moi, esc = C.esc;
    return `<header class="bandeau"><h1><span class="bandeau-sur">${esc(C.param('sous_titre', ''))}</span>${esc(C.param('titre', CONFIG.titre))}</h1>
      <div class="qui"><b>${esc(m.nom || m.email)}</b><br>${esc(libelleRole(m.role))}</div></header>`;
  }
  let derniereVue = null;
  function rendre() {
    const e = C.etat;
    const vue = vues[e.vue] || vues.inconnu;
    const ong = e.moi.connu ? ongletsDuRole() : [];
    // RGAA 8.3 et 8.5-8.6 : langue de la page, titre qui dit l'écran affiché
    document.documentElement.lang = 'fr';
    const libVue = (ongletsDuRole().find(o => o[0] === ongletDe(e.vue)) || [])[1];
    document.title = [libVue, C.param('titre', CONFIG.titre)].filter(Boolean).join(' — ');
    const memeVue = derniereVue === e.vue + JSON.stringify(e.arg);
    const defil = memeVue ? window.scrollY : 0;
    // Même écran redessiné : les sections dépliées le restent
    const ouverts = memeVue ? [...C.racine().querySelectorAll('#contenu details')].map(d => d.open) : [];
    C.racine().innerHTML = `<div class="entete">${bandeau()}` +
      (ong.length ? `<nav class="onglets" aria-label="Rubriques">${ong.map(([v, l]) => `<button type="button" data-vue="${v}"${v === ongletDe(e.vue) ? ' aria-current="page"' : ''}>${C.esc(l)}${htmlPastille(pastille(v))}</button>`).join('')}</nav>` : '') +
      `</div><main class="contenu" id="contenu">${vue.rendre()}</main>`;
    C.signalerNouvellesFenetres(C.racine());
    if (ouverts.length) C.racine().querySelectorAll('#contenu details').forEach((d, i) => { if (ouverts[i]) d.open = true; });
    // Hauteur de l'en-tête fixe : les colonnes collantes se placent juste dessous
    const ent = C.racine().querySelector('.entete');
    if (ent) document.documentElement.style.setProperty('--h-entete', ent.offsetHeight + 'px');
    if (vue.apres) vue.apres(C.racine());
    derniereVue = e.vue + JSON.stringify(e.arg);
    window.scrollTo(0, defil);
  }

  // Un compte accepté (ou désactivé) pendant que la page est ouverte change d'écran sans rechargement.
  // La ligne de connexion suit l'annuaire par ses formules : il suffit de la relire (veille).
  function identiteChangee() {
    const m = C.etat.moi;
    const c = m.ligne && (C.etat.doc.Connexions || []).find(x => x.id === m.ligne);
    if (!c) return false;
    const n = C.moiDepuis(c);
    if (n.connu === m.connu && n.role === m.role && n.compte === m.compte) return false;
    C.etat.moi = n;
    C.charger().then(() => {   // les règles d'accès ont changé : tout relire avant d'afficher
      aller(n.connu ? vueParDefaut() : 'inconnu', {}, { historique: false });
      majPastilles(false);
      C.toast(n.connu ? 'Votre accès est ouvert.' : 'Votre accès a été retiré.');
    });
    return true;
  }
  // Pastilles : mises à jour sans redessiner l'écran ; annonce (toast, lu par les lecteurs d'écran) quand un nombre augmente
  const derniers = {};
  function majPastilles(annoncer) {
    for (const [v] of ongletsDuRole()) {
      if (!pastilles[v]) continue;
      const n = pastille(v);
      if (annoncer && derniers[v] !== undefined && n > derniers[v] && pastilles[v].annonce) C.toast(pastilles[v].annonce(n - derniers[v], n));
      derniers[v] = n;
      const b = C.racine().querySelector(`.onglets [data-vue="${v}"]`);
      if (b) { b.querySelectorAll('.pastille-onglet, .sr-only').forEach(x => x.remove()); b.insertAdjacentHTML('beforeend', htmlPastille(n)); }
    }
  }
  // Veille (CONFIG.veille) : toutes les N secondes, relit les quelques tables du rôle qui font apparaître du
  // nouveau (demandes, dépôts, réponses transmises, sa propre connexion). Redessin seulement si elles ont changé.
  function veiller() {
    const v = CONFIG.veille;
    if (!v || !v.secondes) return;
    setInterval(() => {
      if (document.hidden) return;
      const tables = ((v.tables || {})[C.etat.moi.connu ? C.etat.moi.role : 'inconnu'] || []).filter(x => C.TABLES.includes(x));
      if (tables.length) rafraichir(0, { tables });
    }, v.secondes * 1000);
  }

  // Changement d'écran : focus sur le titre du nouvel écran (annoncé par les lecteurs d'écran).
  // Chaque changement d'écran entre dans l'historique : le bouton ou le geste « retour » du navigateur revient
  // à l'écran précédent du module, et ne sort de Grist qu'une fois revenu au premier.
  // L'historique est celui du cadre du chargeur (parent, même origine) : le chargeur écrit le module dans un
  // cadre intérieur par document.write, et Chrome recharge ce cadre au retour au lieu d'y revenir.
  const fenHist = (() => { try { return window.parent !== window && window.parent.history && window.parent.location.href ? window.parent : window; } catch (err) { return window; } })();
  function aller(vue, arg = {}, { historique = true } = {}) {
    if (historique && (vue !== C.etat.vue || JSON.stringify(arg) !== JSON.stringify(C.etat.arg || {}))) {
      try { fenHist.history.pushState({ module: true, vue, arg }, ''); } catch (err) { /* sans historique : sans effet */ }
    }
    C.etat.vue = vue; C.etat.arg = arg; rendre(); window.scrollTo(0, 0);
    const h = C.racine().querySelector('#contenu h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  // Relecture après chaque écriture et quand d'autres écrivent ; pas pendant une saisie ni une fenêtre ouverte
  let minuteur = null, enCours = false;
  // o.tables : tables à relire (toutes par défaut). o.rendre : true = redessiner ; false = relecture silencieuse
  // (l'écran est déjà à jour après sa propre écriture) ; absent = redessiner seulement si les données ont changé
  // (écritures des autres : veille, relecture périodique, onRecords). Les demandes rapprochées sont regroupées.
  let aRelire = null, forcer = false, siChange = false;
  const empreinte = tables => tables.map(t => JSON.stringify(C.etat.doc[t] || [])).join('\u0001');
  function rafraichir(delai = 250, o = {}) {
    const tables = o.tables || C.TABLES;
    aRelire = aRelire === null ? new Set(tables) : new Set([...aRelire, ...tables]);
    if (o.rendre === true) forcer = true;
    else if (o.rendre === undefined) siChange = true;
    clearTimeout(minuteur);
    minuteur = setTimeout(async () => {
      if (enCours) return rafraichir(400);
      enCours = true;
      const liste = [...aRelire], doitRendre = forcer, surChangement = siChange;
      aRelire = null; forcer = false; siChange = false;
      try {
        const avant = empreinte(liste);
        await C.charger(liste);
        const change = empreinte(liste) !== avant;
        const saisie = document.activeElement && document.activeElement.matches && document.activeElement.matches('input, textarea, select');
        if (liste.includes('Connexions') && identiteChangee()) return;
        if ((doitRendre || (surChangement && change)) && !saisie && !document.querySelector('.voile')) rendre();
        majPastilles(true);
      } finally { enCours = false; }
    }, delai);
  }
  // Tri d'un tableau (core.enteteTri) : la même colonne inverse le sens. Redessin sur place, sans entrée
  // d'historique ; le focus reste sur l'en-tête choisi
  actions.trier = el => {
    const k = el.dataset.tri, a = C.etat.arg || {};
    const sens = k === a.tri ? (a.sens === 'desc' ? 'asc' : 'desc') : (el.dataset.sens || 'asc');
    C.etat.arg = { ...a, tri: k, sens };
    rendre();
    const b = C.racine().querySelector(`[data-action="trier"][data-tri="${k}"]`);
    if (b) b.focus();
  };
  function deleguer(racine) {
    racine.addEventListener('click', ev => {
      const v = ev.target.closest('[data-vue]');
      if (v) { ev.preventDefault(); return aller(v.dataset.vue); }
      const a = ev.target.closest('[data-action]');
      if (a && actions[a.dataset.action]) { ev.preventDefault(); actions[a.dataset.action](a, ev); }
    });
    racine.addEventListener('change', ev => {
      const el = ev.target;
      if (el.dataset && el.dataset.actionFichier && actions[el.dataset.actionFichier]) return actions[el.dataset.actionFichier](el, ev);
      if (el.dataset && el.dataset.change && actions[el.dataset.change]) return actions[el.dataset.change](el, ev);
      if (el.dataset && el.dataset.col && actions.saisie) actions.saisie(el);
    });
  }

  vues.inconnu = {
    rendre() {
      const m = C.etat.moi, esc = C.esc;
      // Guides « Informations » (CONFIG.guidesEnFin : confidentialité, CGU) en liens ouverts dans une fenêtre ;
      // les autres guides lisibles par un inconnu s'affichent ici
      const enFin = CONFIG.guidesEnFin || [];
      const guides = L.aide ? L.aide.guides() : [];
      const infos = guides.filter(g => enFin.includes(g.Cle)).sort((a, b) => enFin.indexOf(a.Cle) - enFin.indexOf(b.Cle));
      return `<div class="colonne">
        <h2>Votre compte n'est pas encore enregistré</h2>
        <p class="intro">Vous êtes connecté avec l'adresse <b>${esc(m.email || 'inconnue')}</b>. Elle ne figure pas dans la liste des comptes autorisés, ou le compte a été désactivé.</p>
        <p>Écrivez à ${esc(C.param('contact_nom', 'l’équipe du projet'))} : <b>${esc(C.param('contact_email', CONFIG.contactEmail))}</b>, en indiquant cette adresse exacte. Dès que votre compte est enregistré, cette page s'ouvre d'elle-même.</p>
        ${infos.length ? `<p class="petit">${infos.map(g => `<a href="#" data-action="voir-guide" data-cle="${esc(g.Cle)}">${esc(g.Titre)}</a>`).join(' · ')}</p>` : ''}
        ${guides.filter(g => !enFin.includes(g.Cle)).map(g => `<div class="aide-texte" style="margin-top:28px">${L.aide.rendreGuide(g)}</div>`).join('')}
      </div>`;
    },
  };

  async function demarrer() {
    const racine = C.racine();
    racine.innerHTML = '<main class="contenu"><p class="discret">Chargement…</p></main>';
    // Accès complet : le widget lit et écrit avec les droits de la personne connectée (règles d'accès)
    grist.ready({ requiredAccess: 'full', allowSelectBy: false });
    deleguer(racine);
    try {
      await C.charger(['Parametres']);
      await C.identifier(L.VERSION);
      await C.charger();
    } catch (e) {
      racine.innerHTML = `<main class="contenu"><div class="note erreur">Le module n'a pas pu se charger : ${C.esc(e.message || e)}. Rechargez la page.</div></main>`;
      return;
    }
    C.etat.vue = C.etat.moi.connu ? vueParDefaut() : 'inconnu';
    C.etat.arg = {};
    // Historique : l'écran de départ, puis retour du navigateur (voir aller)
    try { fenHist.history.replaceState({ module: true, vue: C.etat.vue, arg: {} }, ''); } catch (err) { /* idem */ }
    fenHist.addEventListener('popstate', ev => {
      const st = ev.state;
      if (!st || !st.module) return;
      // Fenêtre modale ouverte : « retour » la ferme (comme Échap) avant de changer d'écran
      if (document.querySelector('.voile')) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      aller(st.vue, st.arg || {}, { historique: false });
    });
    rendre();
    majPastilles(false);
    grist.onRecords(() => rafraichir());
    setInterval(() => { if (!document.hidden) rafraichir(0); }, 90000);
    veiller();
  }

  L.app = { actions, vues, pastilles, aller, rendre, rafraichir, demarrer, libelleRole, ongletsDuRole };
})(globalThis.Formulaire = globalThis.Formulaire || {});
