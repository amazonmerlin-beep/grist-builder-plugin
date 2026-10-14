'use strict';
// Composants des formulaires (fiche.js) testés sans navigateur : champs, repère « à remplir », navigation de la fiche,
// focus au changement de section, actions « section » et « retour ».
const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.window = globalThis.window || {};
globalThis.Formulaire = { CONFIG: { tablesModule: [], roles: {}, onglets: {} } };
require('../src/core.js');
require('../src/app.js');
require('../src/fiche.js');
const L = globalThis.Formulaire, F = L.fiche, A = L.app, C = L.core;

test('champ texte : libellé relié, colonne, valeur échappée, exemple dans le champ vide, zone d’erreur masquée', () => {
  const h = F.champ({ col: 'Nom', lib: 'Nom', exemple: 'ex. Dupont' }, '<b>');
  assert.match(h, /<label for="f-Nom">Nom<\/label><input id="f-Nom" data-col="Nom" type="text" value="&lt;b&gt;" placeholder="ex\. Dupont">/);
  assert.match(h, /<p class="erreur-champ" id="err-Nom" hidden><\/p>/);
  assert.doesNotMatch(h, /repere/, 'ni requis ni mot du projet : pas de repère');
  const lu = F.champ({ col: 'Nom', lib: 'Nom', exemple: 'ex. Dupont' }, '', { lecture: true });
  assert.match(lu, / disabled>/);
  assert.doesNotMatch(lu, /placeholder/, 'pas d’exemple dans un champ en lecture seule');
});

test('repère « à remplir » : champ requis vide seulement ; mot du projet gardé une fois rempli', () => {
  assert.match(F.champ({ col: 'A', lib: 'A', requis: true }, ''), /<span class="repere a-remplir" data-requis="1">à remplir<\/span><\/label>/);
  assert.match(F.champ({ col: 'A', lib: 'A', requis: true }, 'x'), /<span class="repere" data-requis="1" hidden><\/span>/);
  assert.match(F.champ({ col: 'A', lib: 'A', requis: true, repere: 'publié' }, null), />publié · à remplir</);
  assert.match(F.champ({ col: 'A', lib: 'A', requis: true, repere: 'publié' }, 'x'), /<span class="repere" data-requis="1" data-mot="publié">publié<\/span>/);
  assert.match(F.champ({ col: 'N', lib: 'N', type: 'nombre', requis: true, zeroVide: true }, 0), /à remplir/, 'zéro de Grist lu comme vide');
  assert.doesNotMatch(F.champ({ col: 'N', lib: 'N', type: 'nombre', requis: true }, 0), /à remplir/);
});

test('erreur : texte sous le champ, aria-invalid et aria-describedby posés seulement alors', () => {
  const h = F.champ({ col: 'A', lib: 'A', type: 'zone' }, 'x', { erreur: 'Non enregistré.' });
  assert.match(h, /<textarea id="f-A" data-col="A" aria-describedby="err-A" aria-invalid="true">x<\/textarea><p class="erreur-champ" id="err-A">Non enregistré\.<\/p>/);
});

test('segments : « — » efface et est coché quand vide ; valeur hors liste montrée et cochée', () => {
  const c = { col: 'Urgence', lib: 'Urgence', type: 'segments', valeurs: ['Basse', 'Normale', 'Haute'] };
  const vide = F.champ(c, null);
  assert.match(vide, /^<fieldset class="question segments-q" id="f-Urgence"><legend class="libelle">Urgence<\/legend><div class="segments">/);
  assert.match(vide, /<input type="radio" name="Urgence" id="f-Urgence-vide" data-col="Urgence" value="" checked><span aria-hidden="true">—<\/span><span class="sr-only">Non renseigné<\/span>/);
  assert.equal((vide.match(/type="radio"/g) || []).length, 4);
  assert.match(F.champ(c, 'Normale'), /value="Normale" checked/);
  const hors = F.champ(c, 'Critique');
  assert.match(hors, /value="Critique" checked><span>Critique \(hors liste\)<\/span>/);
  assert.doesNotMatch(hors, /value="" checked/);
});

test('note sur 10, interrupteur, case, liste, choix', () => {
  const n = F.champ({ col: 'Interet', lib: 'Intérêt', type: 'note' }, 7);
  assert.match(n, /<label for="f-Interet">Intérêt<span class="sr-only"> \(note sur 10\)<\/span><\/label><span class="note-sur"><input id="f-Interet" data-col="Interet" type="number" min="0" max="10" step="1" inputmode="numeric" value="7"><span aria-hidden="true">\/ 10<\/span><\/span>/);
  assert.match(F.champ({ col: 'P', lib: 'Suspendu', type: 'interrupteur' }, true), /<label class="interrupteur"><input type="checkbox" role="switch" id="f-P" data-col="P" checked> Suspendu<\/label>/);
  assert.match(F.champ({ col: 'K', lib: 'Accord', type: 'case' }, false), /<label class="case"><input type="checkbox" id="f-K" data-col="K"> Accord<\/label>/);
  const l = F.champ({ col: 'R', lib: 'Référent', type: 'liste', valeurs: [[1, 'Ana'], [2, 'Léo']] }, 3);
  assert.match(l, /<option value="">—<\/option><option value="1">Ana<\/option><option value="2">Léo<\/option><option value="3" selected>3 \(hors liste\)<\/option>/);
  const ch = F.champ({ col: 'S', lib: 'Statut', type: 'choix', valeurs: ['Oui', 'Non'] }, 'Non');
  assert.match(ch, /^<fieldset class="question options" id="f-S">/);
  assert.match(ch, /value="Non" checked> Non<\/label>/);
  assert.match(F.champ({ col: 'E', lib: 'Effectif', type: 'nombre', min: 0, pas: 1 }, null), /type="number" min="0" step="1" inputmode="numeric" value=""/);
});

test('valeur à écrire : case, vide, nombre, texte', () => {
  assert.equal(F.valeur({ type: 'checkbox', checked: true }), true);
  assert.equal(F.valeur({ type: 'radio', value: '' }), null, '« — » efface');
  assert.equal(F.valeur({ type: 'number', value: '7' }), 7);
  assert.equal(F.valeur({ type: 'number', value: '' }), null);
  assert.equal(F.valeur({ type: 'text', value: '  a b  ' }), 'a b');
  assert.equal(F.valeur({ type: 'textarea', value: '   ' }), null);
});

test('en-tête : un seul retour, vers la liste ; titre h2 ; pas de précédent ni de suivant', () => {
  const t = F.tete({ titre: 'n° 4 · Dossier', sousTitre: 'Déposé le 01/10', statuts: '<span class="statut">En cours</span>' });
  assert.match(t, /<button type="button" class="fiche-retour" data-action="retour"><span aria-hidden="true">←<\/span> Retour à la liste<\/button>/);
  assert.match(t, /<h2 title="n° 4 · Dossier">n° 4 · Dossier<\/h2>/);
  assert.equal((t.match(/<button/g) || []).length, 1);
});

test('navigation de la fiche : étapes en liste ordonnée, état dit en texte, aria-current sur la section affichée', () => {
  const h = F.nav({
    courante: 'b',
    groupes: [
      { titre: 'Étapes', etapes: true, liens: [
        { cle: 'a', libelle: 'Dépôt', etat: 'fait', info: '23/09' },
        { cle: 'b', libelle: 'Examen', etat: 'cours', info: '17 j', infoLue: 'depuis 17 jours' },
        { cle: 'c', libelle: 'Décision', etat: 'avenir', manque: 3 },
      ] },
      { titre: 'Suivi', liens: [{ cle: 'n', libelle: 'Notes', picto: '<path d="M3 4h10"/>', compte: 2 }] },
    ],
  });
  assert.match(h, /^<nav class="fiche-nav" id="fiche-nav" aria-label="Dans cette fiche">/);
  assert.match(h, /<ol class="etapes" aria-labelledby="fiche-nav-0">/);
  assert.equal((h.match(/aria-current="page"/g) || []).length, 1);
  assert.match(h, /<li class="cours"><a href="#" data-action="section" data-section="b" aria-current="page"><span class="rond" aria-hidden="true"><\/span><span>Examen<span class="sr-only"> \(en cours\)<\/span><\/span><span class="info num"><span aria-hidden="true">17 j<\/span><span class="sr-only">depuis 17 jours<\/span><\/span><\/a><\/li>/);
  assert.match(h, /Dépôt<span class="sr-only"> \(faite\)<\/span>/);
  assert.match(h, /<span class="info manque">3 à remplir<\/span>/);
  assert.match(h, /<ul class="liens" aria-labelledby="fiche-nav-1"><li><a href="#" data-action="section" data-section="n"><svg class="picto"[^>]*aria-hidden="true"/);
  assert.match(h, /<span class="compte num">2<\/span>/);
});

test('section : titre focalisable par programme ; pied vers les sections voisines de la même fiche', () => {
  assert.match(F.enteteSection('Examen', '', '<button type="button" class="btn">Terminer</button>'), /<h3 id="section-titre" tabindex="-1">Examen<\/h3><\/div><button/);
  const p = F.piedSection({ prec: { cle: 'a', libelle: 'Dépôt' }, suiv: { cle: 'c', libelle: 'Décision' } });
  assert.match(p, /data-section="a"><span aria-hidden="true">←<\/span> Dépôt<\/a>/);
  assert.match(p, /data-section="c" class="suiv">Décision <span aria-hidden="true">→<\/span><\/a>/);
  assert.match(F.avancement('Complétude', 11, 18), /<b class="num">11<span aria-hidden="true"> \/ <\/span><span class="sr-only"> sur <\/span>18<\/b><\/p><progress max="18" value="11"/);
});

test('focus au changement d’écran : titre de section dans la même fiche, titre de la fiche sinon', () => {
  C.etat.vue = 'fiche'; C.etat.arg = { id: 4, section: 'b' };
  const titre = F.titreSection();
  assert.equal(titre({ vue: 'fiche', arg: { id: 4, section: 'a' } }), '#section-titre');
  assert.equal(titre({ vue: 'fiche', arg: { id: 5, section: 'a' } }), null, 'autre fiche');
  assert.equal(titre({ vue: 'liste', arg: {} }), null, 'venue de la liste');
});

test('actions : « section » garde la fiche et change de section ; « retour » va à la liste avec ses filtres', () => {
  const appels = [];
  const aller = A.aller;
  A.aller = (v, arg) => appels.push([v, arg]);
  try {
    A.vues.liste = { rendre: () => '', argRetour: () => ({ statut: 'Ouvert' }) };
    A.vues.fiche = { rendre: () => '', onglet: 'liste' };
    C.etat.vue = 'fiche'; C.etat.arg = { id: 4, section: 'a' };
    A.actions.section({ dataset: { section: 'c' } });
    A.actions.retour();
    assert.deepEqual(appels, [['fiche', { id: 4, section: 'c' }], ['liste', { statut: 'Ouvert' }]]);
  } finally { A.aller = aller; }
});
