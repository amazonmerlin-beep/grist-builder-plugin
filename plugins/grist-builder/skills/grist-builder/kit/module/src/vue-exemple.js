// Vues d'exemple, à remplacer par celles du projet : la réponse de l'entité (répondant) et le suivi (pilotage).
(function (L) {
  'use strict';
  const C = L.core, A = L.app, esc = C.esc, e = C.etat;
  const QUESTIONS = [
    { col: 'Q1_Nom', libelle: '1. Nom du répondant', type: 'texte' },
    { col: 'Q2_Effectif', libelle: '2. Effectif', type: 'entier' },
  ];
  // Statuts : valeur stockée → [libellé affiché, classe du badge]. Le libellé peut changer sans toucher aux
  // données ; le code ne compare jamais le texte d'un badge, mais data-etat (la valeur stockée).
  const STATUTS = { Brouillon: ['En cours', 'statut-en-cours'], Transmis: ['Transmise', 'statut-transmis'] };
  const badge = s => `<span class="statut ${(STATUTS[s] || [])[1] || ''}" data-etat="${esc(s)}">${esc((STATUTS[s] || [])[0] || s)}</span>`;
  const nomEntite = code => ((e.doc.Entites || []).find(x => x.Code === code) || {}).Libelle || code;
  const maReponse = () => (e.doc.Reponses || []).find(r => r.Entite === e.moi.entite) || null;

  A.vues.reponse = {
    rendre() {
      const r = maReponse();
      if (!r) return `<div class="colonne"><div class="note erreur">Aucune réponse n'est prévue pour votre entité (${esc(e.moi.entite || 'non renseignée')}). Écrivez à ${esc(C.param('contact_email'))}.</div></div>`;
      const lecture = r.Statut !== 'Brouillon';
      // Erreur dite sous le champ (RGAA 11.10), pas dans un toast : la zone existe, masquée, et n'est reliée au
      // champ (aria-describedby) que lorsqu'elle s'affiche
      return `<div class="colonne"><h2>Réponse : ${esc(nomEntite(r.Entite))}</h2>
        <p class="discret">Statut : ${badge(r.Statut)}. Chaque réponse est enregistrée dès que vous quittez le champ.</p>
        ${QUESTIONS.map(q => `<div class="question"><label for="f-${q.col}">${esc(q.libelle)}</label>
          <input id="f-${q.col}" data-col="${q.col}" type="${q.type === 'entier' ? 'number' : 'text'}"${q.type === 'entier' ? ' min="0" step="1" inputmode="numeric"' : ''} value="${esc(r[q.col] === null || r[q.col] === undefined ? '' : r[q.col])}"${lecture ? ' disabled' : ''}>
          <p class="erreur-champ" id="err-${q.col}" hidden></p></div>`).join('')}
        ${lecture ? '<p class="note">Réponse transmise : elle ne peut plus être modifiée.</p>' : '<div class="actions"><button type="button" class="btn" data-action="transmettre">Transmettre</button></div>'}
      </div>`;
    },
  };
  function erreurChamp(el, texte) {
    const z = document.getElementById('err-' + el.dataset.col);
    if (z) { z.textContent = texte || ''; z.hidden = !texte; }
    if (texte) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'err-' + el.dataset.col); }
    else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
  }
  // Saisie : écrite au changement de champ, sans redessin (l'écran est déjà à jour), puis signalée sur place
  A.actions.saisie = async el => {
    const r = maReponse();
    const q = QUESTIONS.find(x => x.col === el.dataset.col);
    if (!r || !q) return;
    const v = q.type === 'entier' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
    if (q.type === 'entier' && ((el.validity && el.validity.badInput) || (v !== null && (!Number.isInteger(v) || v < 0)))) {
      return erreurChamp(el, 'Indiquez un nombre entier, sans décimale (0 ou plus).');
    }
    erreurChamp(el, '');
    await C.maj('Reponses', r.id, { [q.col]: v }, { rendre: false });
    C.signalerEnregistre(el);
  };
  A.actions.transmettre = async () => {
    const r = maReponse();
    if (!r || !(await C.confirmer('Transmettre la réponse', 'Elle ne pourra plus être modifiée.', 'Transmettre'))) return;
    await C.maj('Reponses', r.id, { Statut: 'Transmis' });
    C.toast('Réponse transmise.');
  };

  // Colonnes triables du suivi : [clé, libellé, valeur de tri, sens par défaut]
  const COLS_SUIVI = () => [
    ['entite', 'Entité', r => nomEntite(r.Entite)],
    ['statut', 'Statut', r => r.Statut],
    ...QUESTIONS.map(q => [q.col, q.libelle, r => r[q.col], q.type === 'entier' ? 'desc' : 'asc']),
  ];
  let filtresSuivi = {};
  A.vues.suivi = {
    rendre() {
      filtresSuivi = { ...e.arg };
      const toutes = e.doc.Reponses || [];
      const f = e.arg.statut || '';
      const reps = C.trier(toutes.filter(r => !f || r.Statut === f), COLS_SUIVI(), e.arg, 'entite');
      const n = reps.length, N = toutes.length;
      // Titre masqué : l'onglet surligné le dit déjà ; gardé pour le focus et la structure des titres (RGAA 9.1).
      // Filtre redessiné sur place (pas d'entrée d'historique) ; compteur « n sur N » ; liste vide qui le dit et
      // propose d'effacer les filtres. En-têtes triables (core.enteteTri) ; tableau dans .defil (zoom à 200 %).
      return `<div class="large"><h2 class="sr-only">Suivi des réponses</h2>
        <div class="filtres"><label>Statut<select data-change="filtre-suivi" data-cle="statut">
          ${[['', 'Tous les statuts'], ...Object.entries(STATUTS).map(([v, [lib]]) => [v, lib])].map(([v, lib]) => `<option value="${esc(v)}"${v === f ? ' selected' : ''}>${esc(lib)}</option>`).join('')}
        </select></label></div>
        <p class="discret petit">${n} réponse${n > 1 ? 's' : ''}${n !== N ? ` sur ${N}` : ''}.</p>
        <div class="defil"><table class="tableau"><caption class="sr-only">Réponses ; les boutons d'en-tête trient la liste</caption><thead><tr>${C.enteteTri(COLS_SUIVI(), e.arg, 'entite')}</tr></thead>
        <tbody>${n ? reps.map(r => `<tr><td>${esc(nomEntite(r.Entite))}</td><td>${badge(r.Statut)}</td>${QUESTIONS.map(q => `<td>${esc(r[q.col])}</td>`).join('')}</tr>`).join('')
          : `<tr><td colspan="${COLS_SUIVI().length}">Aucune réponse ne correspond à ce filtre. <button type="button" class="btn lien" data-action="effacer-filtres">Effacer les filtres</button></td></tr>`}</tbody></table></div></div>`;
    },
    // Une fiche ouverte depuis cette liste (vue déclarée avec onglet: 'suivi') y revient par l'onglet avec les
    // filtres et le tri tels qu'on les a laissés (app.js, argClicOnglet)
    argRetour: () => filtresSuivi,
  };
  const refocaliserFiltre = k => { const x = C.racine().querySelector(`[data-change="filtre-suivi"][data-cle="${k}"]`); if (x) x.focus(); };
  A.actions['filtre-suivi'] = el => {
    const k = el.dataset.cle;
    e.arg = { ...e.arg, [k]: el.value };
    A.memoriser();
    A.rendre();
    refocaliserFiltre(k);
  };
  // Le tri est gardé
  A.actions['effacer-filtres'] = () => {
    e.arg = { tri: e.arg.tri, sens: e.arg.sens };
    A.memoriser();
    A.rendre();
    refocaliserFiltre('statut');
  };
  // Pastille de l'onglet Suivi : réponses transmises, annoncées quand il en arrive (veille, projet.config.js)
  A.pastilles.suivi = {
    compter: () => (e.doc.Reponses || []).filter(r => r.Statut === 'Transmis').length,
    annonce: k => (k > 1 ? `${k} nouvelles réponses transmises.` : 'Nouvelle réponse transmise.'),
  };
})(globalThis.Formulaire = globalThis.Formulaire || {});
