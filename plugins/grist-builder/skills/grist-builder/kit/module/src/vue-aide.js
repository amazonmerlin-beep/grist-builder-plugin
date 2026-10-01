// Onglet « Aide » : les guides que le compte peut lire. La table Guides est filtrée par les règles
// d'accès (colonne Public) : le module affiche simplement ce que Grist lui transmet.
(function (L) {
  'use strict';
  const C = L.core, A = L.app, M = L.markdown;
  const esc = C.esc;
  const e = C.etat;

  const guides = () => (e.doc.Guides || []).slice().sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0));
  // « Vos guides » : ceux dont le premier public est votre rôle (un rôle qui lit aussi les guides d'un autre les trouve sous « Autres guides »)
  const pourMoi = g => (g.Public || [])[0] === e.moi.role;
  const courant = () => { const l = guides(); return l.find(g => g.Cle === e.arg.guide) || l.find(g => pourMoi(g) && !enFin(g)) || l.find(g => !enFin(g)) || l[0]; };
  // Largeur réduite : le sommaire « Dans ce guide » est replié, pour ne pas repousser le texte (il reste dépliable)
  const etroit = () => !!(window.matchMedia && window.matchMedia('(max-width: 860px)').matches);
  const imageDiff = (nom, alt) => `<img data-image="${esc(nom)}" alt="${alt}" loading="lazy">`;

  /** Contenu d'un guide, images à résoudre ensuite par resoudreImages. {{cle}} : valeur du paramètre (« [cle à fixer] » s'il manque). */
  const avecParametres = t => String(t || '').replace(/\{\{(\w+)\}\}/g, (_, k) => C.param(k) || `[${k} à fixer]`);
  const rendreGuide = g => M.versHtml(avecParametres(g.Contenu), { image: imageDiff });
  // Guides toujours en fin de liste, rubrique « Informations », dans l'ordre de CONFIG.guidesEnFin
  // (informations légales : confidentialité, puis les CGU en dernier)
  const EN_FIN = (L.CONFIG && L.CONFIG.guidesEnFin) || [];
  const enFin = g => EN_FIN.includes(g.Cle);

  async function resoudreImages(racine, g) {
    const imgs = [...racine.querySelectorAll('img[data-image]')];
    if (!imgs.length) return;
    const infos = await C.infosPiecesJointes(Array.isArray(g.Images) ? g.Images : []);
    const parNom = new Map(infos.filter(f => f.url).map(f => [f.nom, f.url]));
    for (const im of imgs) {
      const u = parNom.get(im.dataset.image);
      if (u) im.src = u;
      else im.replaceWith(Object.assign(document.createElement('span'), { className: 'discret petit', textContent: `[capture « ${im.dataset.image} » indisponible]` }));
    }
  }

  A.vues.aide = {
    rendre() {
      const l = guides();
      if (!l.length) {
        return `<div class="colonne"><h2>Aide</h2><p>Aucun guide n'est disponible pour votre compte. Pour toute question : ${esc(C.param('contact_nom', 'l’équipe du projet'))},
          <a href="mailto:${esc(C.param('contact_email'))}">${esc(C.param('contact_email'))}</a>.</p></div>`;
      }
      const g = courant();
      const som = M.sommaire(g.Contenu);
      return `<div class="page-aide">
        <nav class="aide-liste" aria-label="Guides">
          ${[['Vos guides', l.filter(x => pourMoi(x) && !enFin(x))], [l.some(x => pourMoi(x) && !enFin(x)) ? 'Autres guides' : 'Guides', l.filter(x => !pourMoi(x) && !enFin(x))],
            ['Informations', l.filter(enFin).sort((a, b) => EN_FIN.indexOf(a.Cle) - EN_FIN.indexOf(b.Cle))]].filter(([, xs]) => xs.length).map(([titre, xs]) => `
          <p class="aide-rubrique">${titre}</p>
          <ul>${xs.map(x => `<li><button type="button" data-action="guide" data-cle="${esc(x.Cle)}"${x.id === g.id ? ' aria-current="page"' : ''}>${esc(x.Titre)}</button></li>`).join('')}</ul>`).join('')}
          ${som.length > 1 ? `<details class="aide-dans-guide" id="aide-dans-guide"${etroit() ? '' : ' open'}><summary class="aide-rubrique">Dans ce guide</summary><ul class="aide-sommaire">${som.map(s => `<li><a href="#${s.ancre}" data-action="ancre" data-ancre="${s.ancre}">${esc(s.texte)}</a></li>`).join('')}</ul></details>` : ''}
        </nav>
        <article class="aide-texte">${g.Resume ? `<p class="aide-resume">${esc(g.Resume)}</p>` : ''}${rendreGuide(g)}
          <p class="discret petit aide-contact">Une question ? ${esc(C.param('contact_nom', 'l’équipe du projet'))} : <a href="mailto:${esc(C.param('contact_email'))}">${esc(C.param('contact_email'))}</a></p>
        </article>
      </div>`;
    },
    async apres(racine) {
      const g = courant();
      if (g) await resoudreImages(racine, g);
    },
  };

  A.actions.guide = el => A.aller('aide', { guide: el.dataset.cle });
  A.actions.ancre = el => {
    const cible = C.racine().querySelector('#' + CSS.escape(el.dataset.ancre));
    if (cible) cible.scrollIntoView({ block: 'start' });
  };
  // Un guide dans une fenêtre, depuis un écran sans onglet Aide (compte non reconnu, demande d'accès)
  A.actions['voir-guide'] = el => {
    const g = guides().find(x => x.Cle === el.dataset.cle);
    if (g) C.fenetre(g.Titre, `<div class="aide-texte">${rendreGuide(g)}</div>`, { large: true });
    else C.toast('Document indisponible.', 'erreur');
  };

  L.aide = { guides, rendreGuide, resoudreImages };
})(globalThis.Formulaire = globalThis.Formulaire || {});
