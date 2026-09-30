// Rendu Markdown réduit, pour les guides de l'onglet « Aide » : titres, paragraphes, listes (deux
// niveaux), tableaux, citations, séparateurs, gras, italique, code, liens et images. Le HTML écrit
// dans la source est échappé : un guide ne peut pas injecter de code dans le module.
(function (L) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ancre = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[`*_[\]()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function lien(href, texte) {
    // Seules les adresses web, les courriels et les ancres internes deviennent des liens
    if (/^(https?:\/\/|mailto:)/i.test(href)) return `<a href="${href}" target="_blank" rel="noopener">${texte}</a>`;
    if (/^#[\w-]+$/.test(href)) return `<a href="${href}" data-ancre="${href.slice(1)}">${texte}</a>`;
    return texte;
  }

  function enLigne(t, o) {
    const codes = [];
    t = t.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    t = esc(t);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => o.image(src, alt));
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => lien(href, txt));
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    t = t.replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?!\w)/g, '$1<i>$2</i>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  }

  const RE_PUCE = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
  const RE_TITRE = /^(#{1,4})\s+(.*?)\s*#*\s*$/;
  const RE_IMAGE_SEULE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
  const cellules = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

  /**
   * @param {string} src    texte Markdown
   * @param {object} o      { image(nom, alt) → HTML, decalage : niveaux ajoutés aux titres }
   */
  function versHtml(src, o = {}) {
    const opt = { image: o.image || ((nom, alt) => `<img src="${esc(nom)}" alt="${alt}">`), decalage: o.decalage || 0 };
    const lignes = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [], para = [];
    const vider = () => { if (para.length) { out.push(`<p>${enLigne(para.join(' '), opt)}</p>`); para.length = 0; } };
    let i = 0;
    while (i < lignes.length) {
      const l = lignes[i];
      let m;
      if (!l.trim()) { vider(); i++; continue; }
      if (/^\s*```/.test(l)) {
        vider();
        const code = [];
        i++;
        while (i < lignes.length && !/^\s*```/.test(lignes[i])) code.push(lignes[i++]);
        i++;
        out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
        continue;
      }
      if ((m = RE_TITRE.exec(l))) {
        vider();
        const n = Math.min(6, m[1].length + opt.decalage);
        out.push(`<h${n} id="${ancre(m[2])}">${enLigne(m[2], opt)}</h${n}>`);
        i++; continue;
      }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { vider(); out.push('<hr>'); i++; continue; }
      if (/^>/.test(l)) {
        vider();
        const bloc = [];
        while (i < lignes.length && /^>/.test(lignes[i])) bloc.push(lignes[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${versHtml(bloc.join('\n'), o)}</blockquote>`);
        continue;
      }
      if (/^\s*\|/.test(l) && i + 1 < lignes.length && /^\s*\|?\s*:?-{2,}/.test(lignes[i + 1])) {
        vider();
        const entetes = cellules(l);
        i += 2;
        const corps = [];
        while (i < lignes.length && /^\s*\|/.test(lignes[i])) corps.push(cellules(lignes[i++]));
        out.push(`<div class="defil"><table class="tableau"><thead><tr>${entetes.map(c => `<th scope="col">${enLigne(c, opt)}</th>`).join('')}</tr></thead><tbody>${corps.map(r => `<tr>${entetes.map((_, k) => `<td>${enLigne(r[k] || '', opt)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if ((m = RE_PUCE.exec(l)) && m[1].length < 2) {
        vider();
        const ordonnee = /\d/.test(m[2]);
        const items = [];
        while (i < lignes.length) {
          const x = RE_PUCE.exec(lignes[i]);
          if (x && x[1].length < 2) { items.push({ texte: [x[3]], sous: [] }); i++; continue; }
          if (x && items.length) { items[items.length - 1].sous.push(x[3]); i++; continue; }
          if (lignes[i].trim() && /^\s+/.test(lignes[i]) && items.length) { items[items.length - 1].texte.push(lignes[i].trim()); i++; continue; }
          break;
        }
        const tag = ordonnee ? 'ol' : 'ul';
        const puce = t => t.replace(/^\[( |x|X)\]\s+/, (_, c) => `<span class="case" aria-hidden="true">${c === ' ' ? '☐' : '☑'}</span> `);
        out.push(`<${tag}${items.some(it => /^\[( |x|X)\]\s/.test(it.texte[0])) ? ' class="cases"' : ''}>${items.map(it => `<li>${puce(enLigne(it.texte.join(' '), opt))}${it.sous.length ? `<ul>${it.sous.map(s => `<li>${enLigne(s, opt)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${tag}>`);
        continue;
      }
      if ((m = RE_IMAGE_SEULE.exec(l.trim()))) {
        vider();
        out.push(`<figure>${opt.image(m[2], esc(m[1]))}${m[1] ? `<figcaption>${enLigne(m[1], opt)}</figcaption>` : ''}</figure>`);
        i++; continue;
      }
      para.push(l.replace(/^\s+/, ''));
      i++;
    }
    vider();
    return out.join('\n');
  }

  /** Titres de niveau 2 (## …) : sommaire d'un guide. */
  function sommaire(src) {
    return String(src || '').split(/\r?\n/).map(l => /^##\s+(.*?)\s*#*\s*$/.exec(l)).filter(Boolean).map(m => ({ texte: m[1], ancre: ancre(m[1]) }));
  }

  /** Noms des images citées (![…](nom)), dans l'ordre, sans doublon. */
  function images(src) {
    return [...new Set([...String(src || '').matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map(m => m[1]))];
  }

  L.markdown = { versHtml, sommaire, images, ancre };
})(globalThis.Formulaire = globalThis.Formulaire || {});
