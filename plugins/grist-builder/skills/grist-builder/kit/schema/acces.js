'use strict';
// Règles d'accès. Pour chaque permission, la première règle qui s'applique décide : l'ordre compte.
// user.Moi = la ligne de l'annuaire dont l'adresse est user.Email (attribut posé sur la table par défaut).
// Un rôle vide (compte inconnu ou désactivé) ne voit rien, sauf Parametres, ses connexions et les guides « inconnu ».
const PROPRIO = 'user.Access in [OWNER]';
const ROLE = 'user.Moi.Role_effectif';
const CONNU = ROLE;
const ADMIN = `${ROLE} == "admin"`;
const PILOTE = `${ROLE} in ["pilote", "admin"]`;
const REP = `${ROLE} == "repondant"`;
const MEME = 'rec.Entite == user.Moi.Entite';
const ATTRIBUT_MOI = { name: 'Moi', tableId: 'Annuaire', lookupColId: 'Email', charId: 'Email' };

function jeux() {
  return [
    {
      table: '*', colonnes: '*', attribut: ATTRIBUT_MOI,
      regles: [
        [PROPRIO, '+CRUDS', 'Propriétaires : tout'],
        ['', '-CRUDS', 'Tous les autres : rien par défaut (chaque table ouvre ce qu’il faut)'],
      ],
    },
    {
      table: 'Parametres', colonnes: '*',
      regles: [
        [PROPRIO, '+CRUD'],
        [ADMIN, '+CRUD', 'Admin : paramètres'],
        ['', '+R-CUD', 'Tous, même inconnus : lecture (le widget est rattaché à cette table)'],
      ],
    },
    {
      table: 'Entites', colonnes: '*',
      regles: [[PROPRIO, '+CRUD'], [CONNU, '+R-CUD', 'Comptes reconnus : lecture'], ['', '-CRUD']],
    },
    {
      table: 'Annuaire', colonnes: '*',
      regles: [
        [PROPRIO, '+CRUD'],
        [ADMIN, '+CRUD', 'Admin : gère les comptes'],
        [`${ROLE} == "pilote"`, '+R-CUD', 'Pilotage : lecture'],
        [`${REP} and ${MEME}`, '+R-CUD', 'Répondant : les comptes de son entité'],
        ['', '-CRUD'],
      ],
    },
    {
      table: 'Connexions', colonnes: '*',
      regles: [
        [PROPRIO, '+CRUD'],
        [PILOTE, '+R-UD', 'Pilotage : lit toutes les connexions'],
        ['rec.Email == user.Email', '+CR-UD', 'Chacun crée et lit ses propres connexions (identité du module)'],
        ['', '-CRUD'],
      ],
    },
    {
      table: 'Reponses', colonnes: 'Entite,Modifie_par',
      regles: [[PROPRIO, '+RU'], ['', '-U', 'Colonnes système : jamais modifiées à la main']],
    },
    // Formulaire public (schema/formulaire.js) sur une table fermée : ajouter à cette table, avant la règle finale,
    // [ 'user.ShareRef', '+C-RUD', 'Formulaire public : création seulement, sans rien lire' ]
    {
      table: 'Reponses', colonnes: '*',
      regles: [
        [PROPRIO, '+CRUD'],
        [PILOTE, '+R-CUD', 'Pilotage : lit toutes les réponses'],
        [`${REP} and ${MEME} and rec.Statut == "Brouillon"`, '+RU-CD', 'Répondant : modifie la réponse de son entité tant qu’elle est en brouillon'],
        [`${REP} and ${MEME}`, '+R-CUD', 'Répondant : lit sa réponse transmise'],
        ['', '-CRUD'],
      ],
    },
    {
      table: 'Guides', colonnes: '*',
      regles: [
        [PROPRIO, '+CRUD'],
        [ADMIN, '+CRUD', 'Admin : lit et modifie tous les guides'],
        [`${CONNU} and ${ROLE} in rec.Public`, '+R-CUD', 'Chaque rôle lit les guides de son public'],
        [`not ${CONNU} and "inconnu" in rec.Public`, '+R-CUD', 'Comptes non reconnus : guide « obtenir un accès »'],
        ['', '-CRUD'],
      ],
    },
  ];
}

/**
 * Remplace toutes les règles du document par celles de jeux().
 * Deux lots : les ressources (tables × colonnes), puis les règles qui s'y rattachent.
 */
async function appliquerRegles(g, docId) {
  const js = jeux();
  const anciennes = await g.sql(docId, 'select id from _grist_ACLRules');
  const anciennesRes = await g.sql(docId, 'select id from _grist_ACLResources');
  const nettoyage = [];
  if (anciennes.length) nettoyage.push(['BulkRemoveRecord', '_grist_ACLRules', anciennes.map(r => r.id)]);
  if (anciennesRes.length) nettoyage.push(['BulkRemoveRecord', '_grist_ACLResources', anciennesRes.map(r => r.id)]);
  if (nettoyage.length) await g.appliquer(docId, nettoyage);

  const r = await g.appliquer(docId, [['BulkAddRecord', '_grist_ACLResources', js.map(() => null), {
    tableId: js.map(j => j.table), colIds: js.map(j => j.colonnes),
  }]]);
  const idsRes = r.retValues[0];
  const regles = { resource: [], aclFormula: [], permissionsText: [], rulePos: [], memo: [], userAttributes: [] };
  let pos = 0;
  js.forEach((j, i) => {
    if (j.attribut) {
      regles.resource.push(idsRes[i]); regles.aclFormula.push(''); regles.permissionsText.push('');
      regles.rulePos.push(++pos); regles.memo.push(''); regles.userAttributes.push(JSON.stringify(j.attribut));
    }
    for (const [formule, perms, memo] of j.regles) {
      regles.resource.push(idsRes[i]); regles.aclFormula.push(formule); regles.permissionsText.push(perms);
      regles.rulePos.push(++pos); regles.memo.push(memo || ''); regles.userAttributes.push('');
    }
  });
  await g.appliquer(docId, [['BulkAddRecord', '_grist_ACLRules', regles.resource.map(() => null), regles]]);
  // Contrôle : le moteur doit avoir compilé chaque formule
  const ko = await g.sql(docId, "select id, aclFormula from _grist_ACLRules where aclFormula != '' and (aclFormulaParsed is null or aclFormulaParsed = '')");
  if (ko.length) throw new Error('Règles non compilées : ' + JSON.stringify(ko));
  return { ressources: idsRes.length, regles: regles.resource.length };
}

module.exports = { jeux, appliquerRegles, ATTRIBUT_MOI };
