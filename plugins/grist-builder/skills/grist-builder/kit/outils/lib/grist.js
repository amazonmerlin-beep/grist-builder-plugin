'use strict';
// Client REST Grist minimal pour Node 18+ (fetch intégré), sans dépendance.
// Sert à construire le document, déployer le module, gérer les comptes en masse
// et tester les règles d'accès rôle par rôle.

class ErreurGrist extends Error {
  constructor(message, status, corps) {
    super(message);
    this.status = status;
    this.corps = corps;
  }
}

class Grist {
  /**
   * @param {object} o
   * @param {string} [o.base]   URL du serveur, ex. http://localhost:8484
   * @param {string} [o.apiKey] clé API du compte qui agit
   * @param {string} [o.org]    organisation (« docs » en local)
   */
  constructor({ base = process.env.GRIST_URL || 'http://localhost:8484', apiKey = process.env.GRIST_API_KEY, org = process.env.GRIST_ORG || 'docs' } = {}) {
    if (!apiKey) throw new Error('Clé API manquante (paramètre apiKey ou variable GRIST_API_KEY).');
    this.base = base.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.org = org;
  }

  async req(method, chemin, corps, { brut = false } = {}) {
    const res = await fetch(this.base + chemin, {
      method,
      headers: {
        Authorization: 'Bearer ' + this.apiKey,
        ...(corps !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
    });
    if (brut) {
      if (!res.ok) throw new ErreurGrist(`${method} ${chemin} → ${res.status}`, res.status, await res.text());
      return res;
    }
    const texte = await res.text();
    let json = null;
    try { json = texte ? JSON.parse(texte) : null; } catch (e) { json = null; }
    if (!res.ok) {
      const msg = (json && (json.error || json.details && json.details.userError)) || texte;
      throw new ErreurGrist(`${method} ${chemin} → ${res.status} : ${msg}`, res.status, json || texte);
    }
    return json;
  }

  // --- Organisation, espaces, documents ---
  espaces() { return this.req('GET', `/api/orgs/${this.org}/workspaces`); }
  async espaceParNom(nom) {
    const ws = await this.espaces();
    return ws.find(w => w.name === nom) || null;
  }
  async creerEspace(nom) { return this.req('POST', `/api/orgs/${this.org}/workspaces`, { name: nom }); }
  creerDoc(wsId, nom) { return this.req('POST', `/api/workspaces/${wsId}/docs`, { name: nom }); }
  supprimerDoc(docId) { return this.req('DELETE', `/api/docs/${docId}`); }
  renommerDoc(docId, nom) { return this.req('PATCH', `/api/docs/${docId}`, { name: nom }); }

  // --- Actions et données ---
  /** Applique une liste d'actions utilisateur ; renvoie { actionNum, retValues }. */
  appliquer(docId, actions) { return this.req('POST', `/api/docs/${docId}/apply`, actions); }
  async lignes(docId, table, { filtre } = {}) {
    const q = filtre ? '?filter=' + encodeURIComponent(JSON.stringify(filtre)) : '';
    const r = await this.req('GET', `/api/docs/${docId}/tables/${table}/records${q}`);
    return r.records.map(x => ({ id: x.id, ...x.fields }));
  }
  async ajouter(docId, table, champsListe) {
    if (!champsListe.length) return [];
    const r = await this.req('POST', `/api/docs/${docId}/tables/${table}/records`, { records: champsListe.map(fields => ({ fields })) });
    return r.records.map(x => x.id);
  }
  modifier(docId, table, lignes) {
    if (!lignes.length) return null;
    return this.req('PATCH', `/api/docs/${docId}/tables/${table}/records`, { records: lignes.map(({ id, ...fields }) => ({ id, fields })) });
  }
  /** Ajoute ou met à jour selon la clé `require` (ex. { Email }). */
  upsert(docId, table, lignes) {
    if (!lignes.length) return null;
    return this.req('PUT', `/api/docs/${docId}/tables/${table}/records`, { records: lignes });
  }
  async sql(docId, requete, args = []) {
    const r = await this.req('POST', `/api/docs/${docId}/sql`, { sql: requete, args });
    return r.records.map(x => x.fields);
  }
  tables(docId) { return this.req('GET', `/api/docs/${docId}/tables`); }
  colonnes(docId, table) { return this.req('GET', `/api/docs/${docId}/tables/${table}/columns?hidden=true`); }

  // --- Partage ---
  acces(docId) { return this.req('GET', `/api/docs/${docId}/access`); }
  /** users : { "adresse": "editors" | "viewers" | "owners" | null } */
  partager(docId, users) { return this.req('PATCH', `/api/docs/${docId}/access`, { delta: { users } }); }

  // --- Fichiers ---
  /** Dépose des pièces jointes ; fichiers = [{ nom, contenu, type }] ; renvoie leurs identifiants. */
  async televerser(docId, fichiers) {
    const fd = new FormData();
    for (const f of fichiers) fd.append('upload', new Blob([f.contenu], { type: f.type || 'application/octet-stream' }), f.nom);
    const res = await fetch(`${this.base}/api/docs/${docId}/attachments`, { method: 'POST', headers: { Authorization: 'Bearer ' + this.apiKey }, body: fd });
    if (!res.ok) throw new ErreurGrist(`POST attachments → ${res.status} : ${await res.text()}`, res.status);
    return res.json();
  }
  async telecharger(docId, { sansHistorique = true } = {}) {
    const res = await this.req('GET', `/api/docs/${docId}/download?nohistory=${sansHistorique}`, undefined, { brut: true });
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * Grist local uniquement (GRIST_TEST_LOGIN=1) : ouvre une session sous l'adresse
 * donnée et renvoie la clé API de ce compte (créée au besoin).
 */
async function cleApiTest(base, email, nom) {
  base = base.replace(/\/$/, '');
  const url = `${base}/test/login?username=${encodeURIComponent(email)}&name=${encodeURIComponent(nom || email)}&next=${encodeURIComponent(base + '/')}`;
  const r1 = await fetch(url, { redirect: 'manual' });
  const cookies = (r1.headers.getSetCookie ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie')]).filter(Boolean);
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Connexion de test impossible : GRIST_TEST_LOGIN est-il actif ?');
  const h = { Cookie: cookie, 'X-Requested-With': 'XMLHttpRequest' };
  const r2 = await fetch(`${base}/api/profile/apiKey`, { headers: h });
  let cle = r2.ok ? (await r2.text()).replace(/"/g, '').trim() : '';
  if (!cle) {
    const r3 = await fetch(`${base}/api/profile/apiKey`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}' });
    cle = (await r3.text()).replace(/"/g, '').trim();
  }
  if (!/^[0-9a-f]{20,}$/i.test(cle)) throw new Error(`Clé API inattendue pour ${email} : ${cle.slice(0, 80)}`);
  return cle;
}

module.exports = { Grist, ErreurGrist, cleApiTest };
