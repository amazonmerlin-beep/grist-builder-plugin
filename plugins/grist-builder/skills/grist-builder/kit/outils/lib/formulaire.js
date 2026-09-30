'use strict';
// Formulaire public (schema/formulaire.js, facultatif : { TABLE, TITRE, SECTIONS }) : réglages des questions
// et mise en page. Utilisé par construire.js et corriger-formulaire.js.
//
// Les réglages des questions (obligatoire, texte de la question, boutons radio, zone de texte) vont sur la
// COLONNE, pas sur le champ du formulaire. Dans Grist, un champ qui porte ses propres réglages (même « {} »)
// cesse de lire ceux de sa colonne, liste de choix comprise : l'éditeur du formulaire affiche alors « Aucun
// choix configuré » sur chaque question à choix, alors que le formulaire publié s'affiche bien. C'est aussi
// ce que fait Grist quand on règle une question à la main. Avantage : un choix ajouté plus tard à la colonne
// apparaît aussi dans le formulaire.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TABLES } = require('../../schema/modele');

const FICHIER = path.join(__dirname, '..', '..', 'schema', 'formulaire.js');
/** Description du formulaire, ou null si le projet n'en a pas. */
const formulaire = () => (fs.existsSync(FICHIER) ? require(FICHIER) : null);
function exiger() {
  const f = formulaire();
  if (!f) throw new Error('Pas de formulaire public dans ce projet (schema/formulaire.js absent).');
  return f;
}

const champsFormulaire = () => exiger().SECTIONS.flat().filter(e => e.col);

/** Réglages complets d'une colonne du formulaire : ceux du modèle, plus ceux de la question. */
function optionsColonne(e) {
  const { TABLE } = exiger();
  const c = ((TABLES.find(t => t.id === TABLE) || {}).colonnes || []).find(x => x.id === e.col);
  if (!c) throw new Error(`Formulaire : colonne inconnue ${TABLE}.${e.col}`);
  const w = { ...(c.options || {}) };
  if (e.requis) w.formRequired = true;
  if (e.question) w.question = e.question;
  if (e.lignes) Object.assign(w, { formTextFormat: 'multiline', formTextLineCount: e.lignes });
  if (c.type === 'Choice' && (w.choices || []).length <= 6) w.formSelectFormat = 'radio';
  return w;
}

/** Action Grist qui pose ces réglages sur les colonnes ; `ref(table, col)` donne l'identifiant d'une colonne. */
function actionColonnes(ref) {
  const { TABLE } = exiger();
  const champs = champsFormulaire();
  return ['BulkUpdateRecord', '_grist_Tables_column', champs.map(e => ref(TABLE, e.col)),
    { widgetOptions: champs.map(e => JSON.stringify(optionsColonne(e))) }];
}

/** Mise en page du formulaire (textes, parties, champs) ; idsChamps : colonne → identifiant du champ. */
function mise_en_page(idsChamps) {
  const { SECTIONS } = exiger();
  const uid = () => crypto.randomUUID();
  const noeud = e => e.col
    ? { id: uid(), type: 'Field', leaf: idsChamps[e.col] }
    : { id: uid(), type: 'Paragraph', text: e.texte, alignment: e.centre ? 'center' : 'left', children: [] };
  const [entete, ...sections] = SECTIONS;
  return {
    id: uid(), type: 'Layout', children: [
      ...entete.map(noeud),
      ...sections.map(s => ({ id: uid(), type: 'Section', children: s.map(noeud) })),
      { id: uid(), type: 'Submit' },
    ],
  };
}

module.exports = { formulaire, champsFormulaire, optionsColonne, actionColonnes, mise_en_page };
