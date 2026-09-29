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
    return `<header class="bandeau"><h1>${esc(C.param('titre', CONFIG.titre))}</h1>
      <div class="qui"><b>${esc(m.nom || m.email)}</b><br>${esc(libelleRole(m.role))}</div></header>`;
  }
  let derniereVue = null;
  function rendre() {
    const e = C.etat;
    const vue = vues[e.vue] || vues.inconnu;
    const ong = e.moi.connu ? ongletsDuRole() : [];
    const defil = derniereVue === e.vue + JSON.stringify(e.arg) ? window.scrollY : 0;
    C.racine().innerHTML = `<div class="entete">${bandeau()}` +
      (ong.length ? `<nav class="onglets" aria-label="Rubriques">${ong.map(([v, l]) => `<button type="button" data-vue="${v}"${v === e.vue ? ' aria-current="page"' : ''}>${C.esc(l)}</button>`).join('')}</nav>` : '') +
      `</div><main class="contenu" id="contenu">${vue.rendre()}</main>`;
    if (vue.apres) vue.apres(C.racine());
    derniereVue = e.vue + JSON.stringify(e.arg);
    window.scrollTo(0, defil);
  }
  function aller(vue, arg = {}) { C.etat.vue = vue; C.etat.arg = arg; rendre(); window.scrollTo(0, 0); }

  // Relecture après chaque écriture et quand d'autres écrivent ; pas pendant une saisie ni une fenêtre ouverte
  let minuteur = null, enCours = false;
  function rafraichir(delai = 250) {
    clearTimeout(minuteur);
    minuteur = setTimeout(async () => {
      if (enCours) return rafraichir(400);
      enCours = true;
      try {
        await C.charger();
        const saisie = document.activeElement && document.activeElement.matches && document.activeElement.matches('input, textarea, select');
        if (!saisie && !document.querySelector('.voile')) rendre();
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
