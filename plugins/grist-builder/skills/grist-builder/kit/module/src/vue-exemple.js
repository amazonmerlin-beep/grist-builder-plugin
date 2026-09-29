// Vues d'exemple, à remplacer par celles du projet : la réponse de l'entité (répondant) et le suivi (pilotage).
(function (L) {
  'use strict';
  const C = L.core, A = L.app, esc = C.esc, e = C.etat;
  const QUESTIONS = [
    { col: 'Q1_Nom', libelle: '1. Nom du répondant', type: 'texte' },
    { col: 'Q2_Effectif', libelle: '2. Effectif', type: 'entier' },
  ];
  const nomEntite = code => ((e.doc.Entites || []).find(x => x.Code === code) || {}).Libelle || code;
  const maReponse = () => (e.doc.Reponses || []).find(r => r.Entite === e.moi.entite) || null;

  A.vues.reponse = {
    rendre() {
      const r = maReponse();
      if (!r) return `<div class="colonne"><div class="note erreur">Aucune réponse n'est prévue pour votre entité (${esc(e.moi.entite || 'non renseignée')}). Écrivez à ${esc(C.param('contact_email'))}.</div></div>`;
      const lecture = r.Statut !== 'Brouillon';
      return `<div class="colonne"><h2>Réponse : ${esc(nomEntite(r.Entite))}</h2>
        <p class="discret">Statut : <b data-statut>${esc(r.Statut)}</b>. Chaque réponse est enregistrée dès que vous quittez le champ.</p>
        ${QUESTIONS.map(q => `<div class="question"><label for="f-${q.col}">${esc(q.libelle)}</label>
          <input id="f-${q.col}" data-col="${q.col}" type="${q.type === 'entier' ? 'number' : 'text'}" value="${esc(r[q.col] === null || r[q.col] === undefined ? '' : r[q.col])}"${lecture ? ' disabled' : ''}></div>`).join('')}
        ${lecture ? '<p class="note">Réponse transmise : elle ne peut plus être modifiée.</p>' : '<div class="actions"><button type="button" class="btn" data-action="transmettre">Transmettre</button></div>'}
      </div>`;
    },
  };
  A.actions.saisie = async el => {
    const r = maReponse();
    const q = QUESTIONS.find(x => x.col === el.dataset.col);
    if (!r || !q) return;
    const v = q.type === 'entier' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
    await C.maj('Reponses', r.id, { [q.col]: v });
  };
  A.actions.transmettre = async () => {
    const r = maReponse();
    if (!r || !(await C.confirmer('Transmettre la réponse', 'Elle ne pourra plus être modifiée.', 'Transmettre'))) return;
    await C.maj('Reponses', r.id, { Statut: 'Transmis' });
    C.toast('Réponse transmise.');
  };

  A.vues.suivi = {
    rendre() {
      const reps = (e.doc.Reponses || []).slice().sort((a, b) => String(a.Entite).localeCompare(String(b.Entite)));
      return `<div class="large"><h2>Suivi des réponses</h2>
        <table class="tableau"><thead><tr><th>Entité</th><th>Statut</th>${QUESTIONS.map(q => `<th>${esc(q.libelle)}</th>`).join('')}</tr></thead>
        <tbody>${reps.map(r => `<tr><td>${esc(nomEntite(r.Entite))}</td><td>${esc(r.Statut)}</td>${QUESTIONS.map(q => `<td>${esc(r[q.col])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    },
  };
})(globalThis.Formulaire = globalThis.Formulaire || {});
