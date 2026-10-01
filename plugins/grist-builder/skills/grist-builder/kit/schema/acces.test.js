'use strict';
// Relecture automatique des règles d'accès, sans Grist (npm test). Ne remplace ni la compilation par le moteur
// (appliquerRegles le contrôle) ni les tests par compte (tests-e2e/acces.test.js) : il attrape les oublis
// de forme et les motifs de faille connus avant tout essai.
const test = require('node:test');
const assert = require('node:assert/strict');
const { jeux } = require('./acces');
const { TABLES } = require('./modele');

const toutes = () => jeux().flatMap(j => j.regles.map(([f, p, memo]) => ({ table: j.table, colonnes: j.colonnes, f, p, memo })));
const accorde = (p, bit) => new RegExp(`\\+[CRUDS]*${bit}`).test(p);
const libre = f => !f || /^user\.Access in \[OWNER\]$/.test(f) || /^user\.Moi\.Role_effectif == "admin"$/.test(f);
const colonnesDe = t => ((TABLES.find(x => x.id === t) || {}).colonnes || []);

test('règles : permissions bien formées, formules à la syntaxe Python (pas de &&, ||, ===, !x)', () => {
  for (const r of toutes()) {
    assert.match(r.p, /^([+-][CRUDS]+){1,2}$/, `${r.table} : ${r.p}`);
    const lettres = r.p.replace(/[+-]/g, '');
    assert.equal(new Set(lettres).size, lettres.length, `${r.table} : lettre répétée dans ${r.p}`);
    assert.doesNotMatch(r.f, /&&|\|\||===|!==|![^=]|\btrue\b|\bfalse\b|\bnull\b/, `${r.table} : ${r.f}`);
    const sans = r.f.replace(/"[^"]*"|'[^']*'/g, '');
    assert.ok(!/["']/.test(sans), `${r.table} : guillemets déséquilibrés dans ${r.f}`);
    for (const [o, fe] of [['(', ')'], ['[', ']']]) assert.equal(sans.split(o).length, sans.split(fe).length, `${r.table} : ${o}${fe} déséquilibrés dans ${r.f}`);
  }
});

test('règles : newRec seulement dans des règles de création ou de modification', () => {
  for (const r of toutes().filter(x => /\bnewRec\b/.test(x.f))) assert.doesNotMatch(r.p, /[RS]/, `${r.table} : ${r.f} → ${r.p}`);
});

test('règles : toute création ouverte hors administration contraint la ligne créée (newRec ou rec)', () => {
  for (const r of toutes().filter(x => accorde(x.p, 'C') && !libre(x.f) && x.f !== 'user.ShareRef')) {
    assert.match(r.f, /\b(newRec|rec)\./, `${r.table} : « ${r.f} » ouvre +C sans condition sur la ligne`);
  }
});

test('règles : statut borné avant toute modification ouverte hors administration', () => {
  for (const j of jeux().filter(x => x.colonnes === '*' && colonnesDe(x.table).some(c => c.id === 'Statut' && c.type === 'Choice'))) {
    const i = j.regles.findIndex(([f, p]) => accorde(p, 'U') && !libre(f));
    if (i < 0) continue;
    assert.ok(j.regles.slice(0, i).some(([f, p]) => /newRec\.Statut not in/.test(f) && /-[CRUDS]*U/.test(p)), `${j.table} : pas de « newRec.Statut not in […] → -U » avant « ${j.regles[i][0]} »`);
  }
});

test('règles : la garde de doublon passe avant la règle d’administration', () => {
  for (const j of jeux().filter(x => colonnesDe(x.table).some(c => c.id === 'Doublon'))) {
    const iAdmin = j.regles.findIndex(([f, p]) => /== "admin"$/.test(f) && accorde(p, 'C'));
    if (iAdmin < 0) continue;
    assert.ok(j.regles.slice(0, iAdmin).some(([f, p]) => /newRec\.Doublon/.test(f) && /-[CRUDS]*C/.test(p)), `${j.table} : [ADMIN and newRec.Doublon, -C] manquant avant [ADMIN, +CRUD]`);
  }
});

test('modèle : colonnes réservées ramenées à leur défaut lors d’un dépôt par le formulaire public', () => {
  const res = TABLES.flatMap(t => t.colonnes.filter(c => c.reservee).map(c => ({ t: t.id, c })));
  assert.ok(res.length > 0, 'au moins une colonne réservée (statut des réponses)');
  for (const { t, c } of res) {
    assert.deepEqual(c.declencheur, [c.id], `${t}.${c.id} : déclencheur sur la colonne elle-même`);
    assert.match(c.formule, /^\S.* if user\.ShareRef else (value|\(value or .+\))$/, `${t}.${c.id} : ${c.formule}`);
  }
});
