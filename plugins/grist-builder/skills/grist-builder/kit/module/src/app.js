// Formulaire.app — coquille : démarrage, identité, onglets par rôle, rendu, rafraîchissement.
(function (L) {
  'use strict';
  const C = L.core, CONFIG = L.CONFIG;
  const vues = {}, actions = {};
  const libelleRole = r => (CONFIG.roles[r] || {}).libelle || 'Compte non reconnu';
  const ongletsDuRole = () => (C.etat.moi && CONFIG.onglets[C.etat.moi.role]) || [];
  const vueParDefaut = () => (ongletsDuRole()[0] || ['inconnu'])[0];

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
    const libVue = (ongletsDuRole().find(o => o[0] === e.vue) || [])[1];
    document.title = [libVue, C.param('titre', CONFIG.titre)].filter(Boolean).join(' — ');
    const memeVue = derniereVue === e.vue + JSON.stringify(e.arg);
    const defil = memeVue ? window.scrollY : 0;
    // Même écran redessiné : les sections dépliées le restent
    const ouverts = memeVue ? [...C.racine().querySelectorAll('#contenu details')].map(d => d.open) : [];
    C.racine().innerHTML = `<div class="entete">${bandeau()}` +
      (ong.length ? `<nav class="onglets" aria-label="Rubriques">${ong.map(([v, l]) => `<button type="button" data-vue="${v}"${v === e.vue ? ' aria-current="page"' : ''}>${C.esc(l)}</button>`).join('')}</nav>` : '') +
      `</div><main class="contenu" id="contenu">${vue.rendre()}</main>`;
    if (ouverts.length) C.racine().querySelectorAll('#contenu details').forEach((d, i) => { if (ouverts[i]) d.open = true; });
    // Hauteur de l'en-tête fixe : les colonnes collantes se placent juste dessous
    const ent = C.racine().querySelector('.entete');
    if (ent) document.documentElement.style.setProperty('--h-entete', ent.offsetHeight + 'px');
    if (vue.apres) vue.apres(C.racine());
    derniereVue = e.vue + JSON.stringify(e.arg);
    window.scrollTo(0, defil);
  }
  // Changement d'écran : focus sur le titre du nouvel écran (annoncé par les lecteurs d'écran)
  function aller(vue, arg = {}) {
    C.etat.vue = vue; C.etat.arg = arg; rendre(); window.scrollTo(0, 0);
    const h = C.racine().querySelector('#contenu h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  // Relecture après chaque écriture et quand d'autres écrivent ; pas pendant une saisie ni une fenêtre ouverte
  let minuteur = null, enCours = false;
  // o.tables : tables à relire (toutes par défaut). o.rendre : true = redessiner ; false = relecture silencieuse
  // (l'écran est déjà à jour après sa propre écriture) ; absent = redessiner seulement si les données ont changé
  // (écritures des autres : relecture périodique, onRecords). Les demandes rapprochées sont regroupées.
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
        if ((doitRendre || (surChangement && change)) && !saisie && !document.querySelector('.voile')) rendre();
      } finally { enCours = false; }
    }, delai);
  }
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
      return `<div class="colonne">
        <h2>Votre compte n'est pas encore enregistré</h2>
        <p class="intro">Vous êtes connecté avec l'adresse <b>${esc(m.email || 'inconnue')}</b>. Elle ne figure pas dans la liste des comptes autorisés, ou le compte a été désactivé.</p>
        <p>Écrivez à ${esc(C.param('contact_nom', 'l’équipe du projet'))} : <b>${esc(C.param('contact_email', CONFIG.contactEmail))}</b>, en indiquant cette adresse exacte.</p>
        ${(C.etat.doc.Guides || []).map(g => `<div class="aide-texte" style="margin-top:28px">${L.aide.rendreGuide(g)}</div>`).join('')}
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
    rendre();
    grist.onRecords(() => rafraichir());
    setInterval(() => { if (!document.hidden) rafraichir(0); }, 90000);
  }

  L.app = { actions, vues, aller, rendre, rafraichir, demarrer, libelleRole, ongletsDuRole };
})(globalThis.Formulaire = globalThis.Formulaire || {});
