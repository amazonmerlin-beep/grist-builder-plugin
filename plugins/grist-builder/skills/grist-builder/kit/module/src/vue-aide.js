// Onglet « Aide » : les guides que le compte peut lire. La table Guides est filtrée par les règles
// d'accès (colonne Public) : le module affiche simplement ce que Grist lui transmet.
(function (L) {
  'use strict';
  const C = L.core, A = L.app, M = L.markdown;
  const esc = C.esc;
  const e = C.etat;

  const guides = () => (e.doc.Guides || []).slice().sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0));
  // « Vos guides » : ceux dont le premier public est votre rôle (l'administration DF lit aussi ceux de DF)
  const pourMoi = g => { const p = (g.Public || [])[0]; const r = e.moi.role; return p === r || (r === 'admin' && p === 'df'); };
  const courant = () => { const l = guides(); return l.find(g => g.Cle === e.arg.guide) || l.find(pourMoi) || l[0]; };
  const imageDiff = (nom, alt) => `<img data-image="${esc(nom)}" alt="${alt}" loading="lazy">`;

  /** Contenu d'un guide, images à résoudre ensuite par resoudreImages. */
  const rendreGuide = g => M.versHtml(g.Contenu || '', { image: imageDiff });

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
        return `<div class="colonne"><h2>Aide</h2><p>Aucun guide n'est disponible pour votre compte. Pour toute question : ${esc(C.param('contact_nom', 'Départements de France'))},
          <a href="mailto:${esc(C.param('contact_email'))}">${esc(C.param('contact_email'))}</a>.</p></div>`;
      }
      const g = courant();
      const som = M.sommaire(g.Contenu);
      return `<div class="page-aide">
        <nav class="aide-liste" aria-label="Guides">
          ${[['Vos guides', l.filter(pourMoi)], [l.some(pourMoi) ? 'Autres guides' : 'Guides', l.filter(x => !pourMoi(x))]].filter(([, xs]) => xs.length).map(([titre, xs]) => `
          <p class="aide-rubrique">${titre}</p>
          <ul>${xs.map(x => `<li><button type="button" data-action="guide" data-cle="${esc(x.Cle)}"${x.id === g.id ? ' aria-current="page"' : ''}>${esc(x.Titre)}</button></li>`).join('')}</ul>`).join('')}
          ${som.length > 1 ? `<p class="aide-rubrique">Dans ce guide</p><ul class="aide-sommaire">${som.map(s => `<li><a href="#${s.ancre}" data-action="ancre" data-ancre="${s.ancre}">${esc(s.texte)}</a></li>`).join('')}</ul>` : ''}
          ${C.estAdmin() ? '<p class="discret petit">Les guides se modifient dans la table Guides des données brutes (texte au format Markdown, captures en pièces jointes).</p>' : ''}
        </nav>
        <article class="aide-texte">${g.Resume ? `<p class="aide-resume">${esc(g.Resume)}</p>` : ''}${rendreGuide(g)}
          <p class="discret petit aide-contact">Une question ? ${esc(C.param('contact_nom', 'Départements de France'))} : <a href="mailto:${esc(C.param('contact_email'))}">${esc(C.param('contact_email'))}</a></p>
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

  L.aide = { guides, rendreGuide, resoudreImages };
})(globalThis.Formulaire = globalThis.Formulaire || {});
