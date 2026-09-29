'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/markdown.js');
const M = globalThis.Formulaire.markdown;

test('titres, paragraphes, gras, italique, code', () => {
  const h = M.versHtml('# Guide\n\n## Avant de commencer\nUne ligne\nsuite **en gras** et *en italique*, `code`.');
  assert.match(h, /<h1 id="guide">Guide<\/h1>/);
  assert.match(h, /<h2 id="avant-de-commencer">Avant de commencer<\/h2>/);
  assert.match(h, /<p>Une ligne suite <b>en gras<\/b> et <i>en italique<\/i>, <code>code<\/code>\.<\/p>/);
  assert.match(M.versHtml('## Titre', { decalage: 1 }), /<h3 /, 'décalage des niveaux');
});

test('listes à puces et numérotées, second niveau, lignes de suite', () => {
  const h = M.versHtml('- un\n  suite\n  - sous\n- deux\n\n1. premier\n2. second');
  assert.equal(h, '<ul><li>un suite<ul><li>sous</li></ul></li><li>deux</li></ul>\n<ol><li>premier</li><li>second</li></ol>');
});

test('tableaux, citations, séparateurs', () => {
  const h = M.versHtml('| Rôle | Voit |\n|---|---|\n| DF | tout |\n| DGGN | publiable |\n\n> **À savoir** : rien.\n\n---');
  assert.match(h, /<thead><tr><th>Rôle<\/th><th>Voit<\/th><\/tr><\/thead><tbody><tr><td>DF<\/td><td>tout<\/td><\/tr><tr><td>DGGN<\/td><td>publiable<\/td><\/tr><\/tbody>/);
  assert.match(h, /<blockquote><p><b>À savoir<\/b> : rien\.<\/p><\/blockquote>/);
  assert.match(h, /<hr>$/);
});

test('images : figure avec légende, résolution par la fonction fournie', () => {
  const h = M.versHtml('![Accueil du répondant](01-accueil.png)', { image: (nom, alt) => `<img data-image="${nom}" alt="${alt}">` });
  assert.equal(h, '<figure><img data-image="01-accueil.png" alt="Accueil du répondant"><figcaption>Accueil du répondant</figcaption></figure>');
  assert.deepEqual(M.images('a ![x](1.png) b ![y](2.png) ![z](1.png)'), ['1.png', '2.png']);
});

test('liens : web, courriel, ancre ; tout autre schéma reste du texte', () => {
  assert.match(M.versHtml('[site](https://anct.gouv.fr)'), /<a href="https:\/\/anct\.gouv\.fr" target="_blank" rel="noopener">site<\/a>/);
  assert.match(M.versHtml('[écrire](mailto:a@b.fr)'), /href="mailto:a@b\.fr"/);
  assert.match(M.versHtml('[plus bas](#comptes)'), /data-ancre="comptes"/);
  assert.equal(M.versHtml('[piège](javascript:alert)'), '<p>piège</p>');
});

test('le HTML de la source est échappé', () => {
  const h = M.versHtml('<script>alert(1)</script> et <img src=x onerror=alert(1)>');
  assert.ok(!/<script|<img/.test(h));
  assert.match(h, /&lt;script&gt;/);
});

test('sommaire : titres de niveau 2', () => {
  assert.deepEqual(M.sommaire('# G\n## Un\n### x\n## Deux étapes'), [{ texte: 'Un', ancre: 'un' }, { texte: 'Deux étapes', ancre: 'deux-etapes' }]);
});

test('blocs de code et cases à cocher', () => {
  assert.equal(M.versHtml('```\nnode outil.js <fichier>\n```'), '<pre><code>node outil.js &lt;fichier&gt;</code></pre>');
  assert.equal(M.versHtml('- [ ] à faire\n- [x] fait'),'<ul class="cases"><li><span class="case" aria-hidden="true">☐</span> à faire</li><li><span class="case" aria-hidden="true">☑</span> fait</li></ul>');
});
