// Formulaire.fiche — formulaires : fiche à étapes (en-tête fixe, navigation en colonne, une section à la fois) et champs
// (texte, zone, nombre, liste, choix, segments, note, interrupteur, case) avec le repère « à remplir ».
// Règles : references/widget.md, « Formulaires et fiches de saisie ». Styles : ui.css, section « formulaires ».
// Tout texte venant du document passe par esc ; les paramètres dits « HTML » sont fournis par la vue.
(function (L) {
  'use strict';
  const C = L.core, A = L.app, esc = C.esc;

  // ------------------------------------------------------------------ champs
  const vide = (v, c) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length) || (!!(c && c.zeroVide) && v === 0);
  // Repère du libellé : mot du projet (c.repere, facultatif) et « à remplir » tant qu'un champ requis est vide.
  // data-requis et data-mot servent à majRepere (mise à jour sur place après une écriture sans redessin).
  function repere(c, estVide) {
    const manque = !!c.requis && estVide;
    const texte = [c.repere, manque ? 'à remplir' : ''].filter(Boolean).join(' · ');
    if (!c.requis && !c.repere) return '';
    return ` <span class="repere${manque ? ' a-remplir' : ''}"${c.requis ? ' data-requis="1"' : ''}${c.repere ? ` data-mot="${esc(c.repere)}"` : ''}${texte ? '' : ' hidden'}>${esc(texte)}</span>`;
  }
  /**
   * Un champ, libellé compris. c : { col, lib, type, requis, repere, exemple, valeurs, max, min, pas, zeroVide }.
   * type : 'texte' (défaut), 'zone', 'nombre', 'liste', 'choix', 'segments' (3 à 5 valeurs), 'note' (sur c.max, 10 par
   * défaut), 'interrupteur', 'case'. valeurs : [valeur] ou [[valeur, libellé]] (liste seulement).
   * v : valeur stockée. o : { lecture: true (champ désactivé), erreur: 'texte affiché sous le champ' }.
   * Identifiants : f-<col> (champ ou groupe), err-<col> (zone d'erreur, présente et masquée tant qu'il n'y en a pas).
   * data-col porte la colonne : l'action « saisie » de la vue l'écrit (F.valeur(el) donne la valeur).
   */
  function champ(c, v, o = {}) {
    const col = esc(c.col), id = `f-${col}`, type = c.type || 'texte', lib = esc(c.lib);
    const dis = o.lecture ? ' disabled' : '';
    const decrit = o.erreur ? ` aria-describedby="err-${col}"` : '';
    const invalide = o.erreur ? ' aria-invalid="true"' : '';
    const zoneErr = `<p class="erreur-champ" id="err-${col}"${o.erreur ? '' : ' hidden'}>${esc(o.erreur || '')}</p>`;
    const estVide = vide(v, c);
    if (type === 'case' || type === 'interrupteur') {
      const role = type === 'interrupteur' ? ' role="switch"' : '';
      return `<div class="question"><label class="${type}"><input type="checkbox"${role} id="${id}" data-col="${col}"${v ? ' checked' : ''}${decrit}${invalide}${dis}> ${lib}</label>${zoneErr}</div>`;
    }
    if (type === 'segments' || type === 'choix') {
      const vals = c.valeurs || [];
      // Valeur absente de la liste (saisie ailleurs, liste changée) : montrée et cochée, jamais effacée en silence
      const tous = !estVide && !vals.includes(v) ? [...vals, v] : vals;
      const libVal = x => esc(vals.includes(x) ? x : `${x} (hors liste)`);
      const cur = estVide ? '' : String(v);
      const radio = (x, i, contenu) => `<label><input type="radio" name="${col}" id="${id}-${i}" data-col="${col}" value="${esc(x)}"${String(x) === cur ? ' checked' : ''}${dis}>${contenu}</label>`;
      const legende = `<legend class="libelle">${lib}${repere(c, estVide)}</legend>`;
      if (type === 'segments') {
        // Premier bouton « — » : efface la valeur (lu « Non renseigné »)
        const effacer = radio('', 'vide', '<span aria-hidden="true">—</span><span class="sr-only">Non renseigné</span>');
        return `<fieldset class="question segments-q" id="${id}"${decrit}>${legende}<div class="segments">${effacer}${tous.map((x, i) => radio(x, i, `<span>${libVal(x)}</span>`)).join('')}</div>${zoneErr}</fieldset>`;
      }
      return `<fieldset class="question options" id="${id}"${decrit}>${legende}${tous.map((x, i) => radio(x, i, ` ${libVal(x)}`)).join('')}${zoneErr}</fieldset>`;
    }
    if (type === 'liste') {
      const opts = (c.valeurs || []).map(x => (Array.isArray(x) ? x : [x, x]));
      const cur = estVide ? '' : String(v);
      if (cur && !opts.some(([x]) => String(x) === cur)) opts.push([cur, `${cur} (hors liste)`]);
      return `<div class="question"><label for="${id}">${lib}${repere(c, estVide)}</label><select id="${id}" data-col="${col}"${decrit}${invalide}${dis}><option value="">—</option>${opts.map(([x, l]) => `<option value="${esc(x)}"${String(x) === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${zoneErr}</div>`;
    }
    const val = estVide ? '' : v;
    // Une aide devient au plus un exemple dans le champ vide ; jamais une phrase sous le libellé
    const exemple = c.exemple && !o.lecture ? ` placeholder="${esc(c.exemple)}"` : '';
    const attrs = `id="${id}" data-col="${col}"`;
    let ctl, lu = '';
    if (type === 'zone') ctl = `<textarea ${attrs}${exemple}${decrit}${invalide}${dis}>${esc(val)}</textarea>`;
    else if (type === 'note') {
      const max = Number(c.max) || 10;
      ctl = `<span class="note-sur"><input ${attrs} type="number" min="0" max="${max}" step="1" inputmode="numeric" value="${esc(val)}"${decrit}${invalide}${dis}><span aria-hidden="true">/ ${max}</span></span>`;
      lu = `<span class="sr-only"> (note sur ${max})</span>`;
    } else if (type === 'nombre') {
      const bornes = ['min', 'max'].filter(k => c[k] !== undefined).map(k => ` ${k}="${esc(c[k])}"`).join('') + (c.pas !== undefined ? ` step="${esc(c.pas)}"` : '');
      const entier = c.pas !== undefined && Number.isInteger(Number(c.pas)) ? ' inputmode="numeric"' : '';
      ctl = `<input ${attrs} type="number"${bornes}${entier} value="${esc(val)}"${exemple}${decrit}${invalide}${dis}>`;
    } else ctl = `<input ${attrs} type="text" value="${esc(val)}"${exemple}${decrit}${invalide}${dis}>`;
    return `<div class="question"><label for="${id}">${lib}${lu}${repere(c, estVide)}</label>${ctl}${zoneErr}</div>`;
  }
  // Valeur à écrire d'après le champ modifié : case → booléen ; vide (« — » compris) → null ; nombre → Number ;
  // texte sans espaces autour
  function valeur(el) {
    if (el.type === 'checkbox') return el.checked;
    const s = String(el.value === undefined || el.value === null ? '' : el.value).trim();
    if (s === '') return null;
    return el.type === 'number' ? Number(s) : s;
  }
  // Après une écriture sans redessin ({ rendre: false }) : le repère du libellé suit la valeur, sur place
  function majRepere(el) {
    const q = el && el.closest && el.closest('.question');
    const r = q && q.querySelector('.repere[data-requis]');
    if (!r) return;
    const coche = el.type === 'radio' ? q.querySelector('input:checked') : null;
    const estVide = el.type === 'radio' ? !coche || coche.value === '' : String(el.value || '').trim() === '';
    r.classList.toggle('a-remplir', estVide);
    r.textContent = [r.dataset.mot, estVide ? 'à remplir' : ''].filter(Boolean).join(' · ');
    r.hidden = !r.textContent;
  }
  // Groupe de champs titré (h4), sans description ; un filet sépare les groupes, pas de cadre
  const groupe = (titre, corps) => `<div class="groupe-champs"><h4>${esc(titre)}</h4>${corps}</div>`;
  // Champs courts côte à côte (listes, nombres, segments) ou zones de texte entre elles ; jamais l'un à côté de l'autre
  const ligne = (...champs) => `<div class="ligne-champs">${champs.join('')}</div>`;
  // Note et sa justification sur une ligne (exception voulue à la règle précédente)
  const paire = (note, justification) => `<div class="paire-note">${note}${justification}</div>`;

  // ------------------------------------------------------------------ fiche
  // Pictogramme SVG décoratif, jamais un caractère Unicode ; chemins (code de la vue, pas de données) dans un carré de 16
  const picto = chemins => `<svg class="picto" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${chemins}</svg>`;
  // En-tête de la fiche, fin et à hauteur fixe : retour à la liste, titre (h2, une ligne), ligne d'identification,
  // badges d'état (statuts : HTML). Pas de précédent ni de suivant vers une autre fiche, pas d'action d'étape ici.
  const tete = ({ titre, sousTitre = '', statuts = '', retour = 'Retour à la liste' }) => `<div class="fiche-tete">
      <button type="button" class="fiche-retour" data-action="retour"><span aria-hidden="true">←</span> ${esc(retour)}</button>
      <div class="fiche-titre"><h2 title="${esc(titre)}">${esc(titre)}</h2>${sousTitre ? `<p class="fiche-qui" title="${esc(sousTitre)}">${esc(sousTitre)}</p>` : ''}</div>
      ${statuts ? `<div class="fiche-statuts">${statuts}</div>` : ''}
    </div>`;
  const ETAT_LU = { fait: 'faite', cours: 'en cours', avenir: 'à venir' };
  /**
   * Navigation dans la fiche, en colonne (les onglets du module sont horizontaux et soulignés).
   * groupes : [{ titre, etapes: true|false, liens: [{ cle, libelle, etat: 'fait'|'cours'|'avenir', info, infoLue,
   *   manque, compte, picto }] }]. Étapes : pastille faite / en cours / à venir, état dit en texte au lecteur d'écran,
   * trait entre les pastilles. À droite : manque (« n à remplir »), sinon compte, sinon info (date, durée ; infoLue :
   * sa version lue). courante : section affichée (aria-current="page"). pied : HTML sous les groupes (avancement).
   */
  function nav({ groupes, courante, libelle = 'Dans cette fiche', pied = '' }) {
    const droite = x => (x.manque ? `<span class="info manque">${esc(x.manque)} à remplir</span>`
      : x.compte !== undefined && x.compte !== null ? `<span class="compte num">${esc(x.compte)}</span>`
        : x.info ? (x.infoLue ? `<span class="info num"><span aria-hidden="true">${esc(x.info)}</span><span class="sr-only">${esc(x.infoLue)}</span></span>` : `<span class="info num">${esc(x.info)}</span>`) : '');
    const lien = (x, etapes) => {
      const debut = etapes ? '<span class="rond" aria-hidden="true"></span>' : x.picto ? picto(x.picto) : '<span aria-hidden="true"></span>';
      const etat = etapes && x.etat ? `<span class="sr-only"> (${esc(ETAT_LU[x.etat] || x.etat)})</span>` : '';
      return `<a href="#" data-action="section" data-section="${esc(x.cle)}"${x.cle === courante ? ' aria-current="page"' : ''}>${debut}<span>${esc(x.libelle)}${etat}</span>${droite(x)}</a>`;
    };
    const blocs = groupes.map((g, i) => {
      const tag = g.etapes ? 'ol' : 'ul';
      const titre = g.titre ? `<h3 class="fiche-nav-titre" id="fiche-nav-${i}">${esc(g.titre)}</h3>` : '';
      const items = g.liens.map(x => `<li${g.etapes && x.etat ? ` class="${esc(x.etat)}"` : ''}>${lien(x, g.etapes)}</li>`).join('');
      return `${titre}<${tag} class="${g.etapes ? 'etapes' : 'liens'}"${g.titre ? ` aria-labelledby="fiche-nav-${i}"` : ''}>${items}</${tag}>`;
    }).join('');
    return `<nav class="fiche-nav" id="fiche-nav" aria-label="${esc(libelle)}">${blocs}${pied}</nav>`;
  }
  // Avancement (pied de la navigation) : un chiffre et une barre, sans phrase ; « n / total » lu « n sur total »
  const avancement = (libelle, n, total) => `<div class="fiche-avancement"><p><span id="fiche-avancement-lib">${esc(libelle)}</span> <b class="num">${n}<span aria-hidden="true"> / </span><span class="sr-only"> sur </span>${total}</b></p><progress max="${total}" value="${n}" aria-labelledby="fiche-avancement-lib"></progress></div>`;
  // En-tête de section : titre (h3, focalisé au changement de section, sans contour), état en une ligne (HTML),
  // action principale au plus près (HTML : un bouton de taille normale)
  const enteteSection = (titre, etat = '', action = '') => `<div class="entete-section" id="section-entete"><div><h3 id="section-titre" tabindex="-1">${esc(titre)}</h3>${etat ? `<p class="etat-section">${etat}</p>` : ''}</div>${action}</div>`;
  // Pied de section : section précédente et suivante de la même fiche ({ cle, libelle }), action rare au milieu (HTML)
  function piedSection({ prec, suiv, milieu = '' } = {}) {
    const l = (x, avant) => `<a href="#" data-action="section" data-section="${esc(x.cle)}"${avant ? '' : ' class="suiv"'}>${avant ? '<span aria-hidden="true">←</span> ' : ''}${esc(x.libelle)}${avant ? '' : ' <span aria-hidden="true">→</span>'}</a>`;
    return `<div class="pied-section">${prec ? l(prec, true) : ''}${milieu}${suiv ? l(suiv, false) : ''}</div>`;
  }
  const section = (cle, contenu) => `<section class="fiche-section" data-section="${esc(cle)}" aria-labelledby="section-titre">${contenu}</section>`;
  // La fiche : en-tête, puis navigation | section | rail facultatif ; contenu borné et centré
  const page = ({ tete: t, nav: n, section: s, rail = '' }) => `<div class="fiche">${t}<div class="fiche-corps">${n}<div class="fiche-centre">${s}</div>${rail}</div></div>`;

  // ------------------------------------------------------------------ navigation
  // Focus au changement d'écran (vue.titre, app.aller) : titre de la section quand on change de section dans la même
  // fiche (même valeur de arg[cle]), titre de la fiche sinon
  const titreSection = (cle = 'id') => avant => (avant && avant.vue === C.etat.vue && (avant.arg || {})[cle] === (C.etat.arg || {})[cle] ? '#section-titre' : null);
  if (A) {
    // Une section à la fois : chaque changement entre dans l'historique du navigateur (précédent = section d'avant)
    A.actions.section = el => { if (el.dataset.section) A.aller(C.etat.vue, { ...C.etat.arg, section: el.dataset.section }); };
    // « ← Retour à la liste » : l'onglet de la vue (vue.onglet), avec ses filtres et son tri (argRetour)
    A.actions.retour = () => {
      const v = A.vues[C.etat.vue] || {};
      const parent = v.onglet || (A.ongletsDuRole()[0] || [])[0];
      if (parent) A.aller(parent, A.regles.argClicOnglet(parent, C.etat.vue));
    };
  }

  L.fiche = { champ, valeur, majRepere, repere, groupe, ligne, paire, picto, tete, nav, avancement, enteteSection, piedSection, section, page, titreSection };
})(globalThis.Formulaire = globalThis.Formulaire || {});
