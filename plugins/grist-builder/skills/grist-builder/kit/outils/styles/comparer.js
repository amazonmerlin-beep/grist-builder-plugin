// Compare deux relevés de releve.js : éléments manquants et styles différents.
const [a, b] = process.argv.slice(2).map(f => JSON.parse(require('fs').readFileSync(f, 'utf8')));
const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-left-color', 'border-bottom-color',
  'border-top-width', 'border-left-width', 'border-bottom-width', 'border-radius', 'box-shadow', 'font-weight', 'font-size',
  'padding-top', 'padding-left', 'opacity', 'filter', 'display', 'grid-template-columns', 'position'];
let diff = 0, manquants = 0;
for (const k of Object.keys(a)) {
  if (!(k in b)) { manquants++; continue; }
  if (a[k] === b[k]) continue;
  diff++;
  if (diff <= 25) {
    const x = a[k].split('|'), y = b[k].split('|');
    console.log(k.slice(-140), '\n   ', PROPS.map((p, i) => (x[i] !== y[i] ? `${p}: ${x[i]} → ${y[i]}` : '')).filter(Boolean).join(' ; '));
  }
}
console.log(`éléments : ${Object.keys(a).length} / ${Object.keys(b).length} ; absents : ${manquants} ; différents : ${diff}`);
