const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
});

async function addColumnIfMissing(env, table, column, definition) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  const exists = (info.results || []).some((row) => row.name === column);
  if (!exists) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

async function schema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS invitations (
    token TEXT PRIMARY KEY,
    branch TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL DEFAULT '',
    members TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT '',
    contributor TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  )`).run();

  await addColumnIfMissing(env, "invitations", "branch", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "invitations", "expires_at", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "invitations", "members", "TEXT NOT NULL DEFAULT '[]'");
  await addColumnIfMissing(env, "invitations", "created_at", "TEXT");

  await addColumnIfMissing(env, "contributions", "token", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "contributions", "branch", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "contributions", "contributor", "TEXT");
  await addColumnIfMissing(env, "contributions", "payload", "TEXT NOT NULL DEFAULT '{}'");
  await addColumnIfMissing(env, "contributions", "status", "TEXT NOT NULL DEFAULT 'pending'");
  await addColumnIfMissing(env, "contributions", "created_at", "TEXT");
  await addColumnIfMissing(env, "contributions", "updated_at", "TEXT");
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const normalizedSex = (value) => String(value || "").trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const isMale = (member) => ["homme","h","m","male","masculin","ذكر","رجل"].includes(normalizedSex(member.sexe));
const isFemale = (member) => ["femme","f","female","feminin","أنثى","امراة"].includes(normalizedSex(member.sexe));

function invitationForm(invitation) {
  let members = [];
  try { members = JSON.parse(invitation.members || "[]"); } catch (_) {}

  const options = (filter) => '<option value="">— Choisir —</option><option value="__new__">Personne absente de la liste / Ajouter une nouvelle personne</option>'
    + members.filter(filter).map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(`${member.prenom || ""} ${member.nom || ""}`.trim())}</option>`).join("");

  const all = options(() => true), father = options(isMale), mother = options(isFemale);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Contribution familiale</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f2f6fb;color:#172033;font:16px system-ui}.wrap{max-width:680px;margin:auto;padding:16px}h1{font-size:1.55rem}.branch{background:#e8f2ff;border:1px solid #98bce8;padding:14px;border-radius:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:flex;flex-direction:column;gap:5px;font-weight:650}input,select,textarea,button{width:100%;font:inherit;padding:12px;border:1px solid #aab8ca;border-radius:9px;background:white}textarea{min-height:95px}select[multiple]{min-height:150px}.wide{grid-column:1/-1}.new-person{grid-column:1/-1;padding:12px;border:1px dashed #1769aa;border-radius:10px;background:#f8fbff}.secondary{background:#e8f2ff;color:#174f7d;margin-top:8px}.remove{background:#9b2c2c;color:white}.hint{font-size:.85rem;color:#506174}#result{padding:12px}@media(max-width:560px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}}</style></head><body><main class="wrap">
<h1>Contribution MNG e-Familia</h1><div class="branch"><b>Branche familiale</b><br>${escapeHtml(invitation.branch)}<div class="hint">Cette branche est définie par l’invitation et ne peut pas être modifiée.</div></div>
<form id="family-form"><div class="grid">
<label>Prénom<input name="prenom" required></label><label>Nom<input name="nom" required></label>
<label>Prénom arabe<input name="prenom_ar" dir="rtl"></label><label>Nom arabe<input name="nom_ar" dir="rtl"></label>
<label>Sexe<select name="sexe"><option></option><option>Homme</option><option>Femme</option></select></label><label>Date de naissance<input type="date" name="naissance"></label>
<label class="wide">Lieu de naissance<input name="lieu_naissance"></label>
<label>Statut<select name="statut_vital"><option value="vivant">Vivant(e)</option><option value="decede">Décédé(e)</option></select></label><label>Date de décès<input type="date" name="deces"></label>
<label>État civil<select name="etat_civil"><option></option><option>Célibataire</option><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf/Veuve</option></select></label>
<label>Téléphone<input type="tel" name="gsm"></label><label>E-mail<input type="email" name="email"></label>
<label>Ville<input name="ville"></label><label>Ville arabe<input name="ville_ar" dir="rtl"></label><label>Pays<input name="pays"></label><label>Pays arabe<input name="pays_ar" dir="rtl"></label>
<label>Profession<input name="profession"></label><label>Profession arabe<input name="profession_ar" dir="rtl"></label><label>Nationalité(s)<input name="nationalites"></label>
<label>Université<input name="universite"></label><label>Université arabe<input name="universite_ar" dir="rtl"></label><label>Organisme<input name="organisme"></label><label>Organisme arabe<input name="organisme_ar" dir="rtl"></label>
<label class="wide">Notes<textarea name="notes"></textarea></label><label class="wide">Notes arabes<textarea name="notes_ar" dir="rtl"></textarea></label>
<label>Père<select id="father-select" name="pere_id" onchange="toggleNewPerson('father',this.value)">${father}</select></label>
<label>Mère<select id="mother-select" name="mere_id" onchange="toggleNewPerson('mother',this.value)">${mother}</select></label>
<div id="new-father" class="new-person" hidden><b>Nouveau père</b><div class="grid"><label>Prénom<input data-field="prenom"></label><label>Nom<input data-field="nom"></label><label>Sexe<select data-field="sexe"><option value="Homme">Homme</option><option value="Masculin">Masculin</option></select></label></div></div>
<div id="new-mother" class="new-person" hidden><b>Nouvelle mère</b><div class="grid"><label>Prénom<input data-field="prenom"></label><label>Nom<input data-field="nom"></label><label>Sexe<select data-field="sexe"><option value="Femme">Femme</option><option value="Féminin">Féminin</option></select></label></div></div>
<label class="wide">Conjoint(s)<select id="spouse-select" name="conjoint_ids" multiple onchange="spouseSelectionChanged(this)">${all}</select><span class="hint">Plusieurs personnes existantes peuvent être choisies.</span><button class="secondary" type="button" onclick="addNewSpouse()">＋ Ajouter un nouveau conjoint</button></label>
<div id="new-spouses" class="wide"></div>
<label class="wide">Statut du conjoint<select name="statut_conjoint"><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf/Veuve</option></select></label>
<label class="wide">Votre nom (contributeur)<input name="contributor"></label></div><button type="submit">Envoyer la contribution</button></form><div id="result"></div></main>
<script>
const temporaryId=(prefix)=>prefix+'-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));
function toggleNewPerson(role,value){document.getElementById('new-'+role).hidden=value!=='__new__'}
function readNewPerson(block,sourceId){const person={source_id:sourceId};block.querySelectorAll('[data-field]').forEach(input=>person[input.dataset.field]=input.value.trim());if(!person.prenom&&!person.nom)throw new Error('Saisissez au moins le prénom ou le nom de chaque nouvelle personne.');return person}
function addNewSpouse(){const sourceId=temporaryId('spouse'),block=document.createElement('div');block.className='new-person';block.dataset.sourceId=sourceId;block.innerHTML='<b>Nouveau conjoint</b><div class="grid"><label>Prénom<input data-field="prenom"></label><label>Nom<input data-field="nom"></label><label>Sexe<select data-field="sexe"><option value="Homme">Homme</option><option value="Femme">Femme</option><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option></select></label></div><button class="remove" type="button">Retirer cette personne</button>';block.querySelector('.remove').onclick=()=>block.remove();document.getElementById('new-spouses').appendChild(block)}
function spouseSelectionChanged(select){const add=[...select.options].some(option=>option.value==='__new__'&&option.selected);if(add){[...select.options].forEach(option=>{if(option.value==='__new__')option.selected=false});addNewSpouse()}}
document.getElementById('family-form').addEventListener('submit',async(e)=>{e.preventDefault();const f=new FormData(e.target),member={source_id:temporaryId('member')},newMembers=[];for(const [k,v] of f.entries()){if(k!=='conjoint_ids'&&k!=='contributor'&&k!=='pere_id'&&k!=='mere_id')member[k]=v}const father=f.get('pere_id');if(father==='__new__'){const id=temporaryId('father');newMembers.push(readNewPerson(document.getElementById('new-father'),id));member.pere_id=id}else if(father)member.pere_id=father;const mother=f.get('mere_id');if(mother==='__new__'){const id=temporaryId('mother');newMembers.push(readNewPerson(document.getElementById('new-mother'),id));member.mere_id=id}else if(mother)member.mere_id=mother;member.conjoint_ids=f.getAll('conjoint_ids').filter(value=>value&&value!=='__new__');document.querySelectorAll('#new-spouses .new-person').forEach(block=>{newMembers.push(readNewPerson(block,block.dataset.sourceId));member.conjoint_ids.push(block.dataset.sourceId)});member.est_decede=member.statut_vital==='decede'?1:0;delete member.statut_vital;const out=document.getElementById('result');out.textContent='Envoi…';try{const r=await fetch(location.pathname+'/contributions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contributor:f.get('contributor')||'',payload:{members:[member,...newMembers]}})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Erreur');e.target.hidden=true;out.textContent='✅ Contribution envoyée. Elle sera intégrée uniquement après validation.'}catch(err){out.textContent='❌ '+err.message}});
</script></body></html>`;
}

function authorized(request, env) {
  return Boolean(env.MNG_ADMIN_KEY) && request.headers.get("X-MNG-Admin-Key") === env.MNG_ADMIN_KEY;
}

async function body(request) {
  try { return await request.json(); } catch (_) { throw new Error("Corps JSON invalide."); }
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "X-MNG-Admin-Key,content-type",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS"
    }});

    try {
      await schema(env);
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/admin/ping" && request.method === "GET") {
        if (!authorized(request, env)) return json({ error: "Non autorisé." }, 401);
        return json({ ok: true, service: "MNG e-Familia contributions" });
      }

      if (path === "/admin/invitations" && request.method === "POST") {
        if (!authorized(request, env)) return json({ error: "Non autorisé." }, 401);
        const input = await body(request);
        const branch = String(input.branch || "").trim();
        if (!branch) return json({ error: "Branche requise." }, 400);
        const members = Array.isArray(input.members) ? input.members.map((member) => ({
          id: member.id, prenom: String(member.prenom || ""), nom: String(member.nom || ""), sexe: String(member.sexe || "")
        })) : [];
        const days = Math.max(1, Math.min(90, Number(input.expires_in_days) || 7));
        const inviteToken = token();
        const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
        await env.DB.prepare("INSERT INTO invitations(token, branch, expires_at, members) VALUES(?,?,?,?)")
          .bind(inviteToken, branch, expiresAt, JSON.stringify(members)).run();
        return json({ token: inviteToken, branch, expires_at: expiresAt, url: `${url.origin}/invite/${inviteToken}` }, 201);
      }

      const invite = path.match(/^\/invite\/([^/]+)$/);
      if (invite && request.method === "GET") {
        const row = await env.DB.prepare("SELECT token, branch, expires_at, members FROM invitations WHERE token=?").bind(invite[1]).first();
        if (!row || !row.expires_at || Date.parse(row.expires_at) <= Date.now()) return json({ error: "Invitation invalide ou expirée." }, 404);
        return new Response(invitationForm(row), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }

      const submit = path.match(/^\/invite\/([^/]+)\/contributions$/);
      if (submit && request.method === "POST") {
        const row = await env.DB.prepare("SELECT branch, expires_at FROM invitations WHERE token=?").bind(submit[1]).first();
        if (!row || !row.expires_at || Date.parse(row.expires_at) <= Date.now()) return json({ error: "Invitation invalide ou expirée." }, 404);
        const input = await body(request);
        if (!input.payload || typeof input.payload !== "object") return json({ error: "Contribution invalide." }, 400);
        const result = await env.DB.prepare("INSERT INTO contributions(token,branch,contributor,payload) VALUES(?,?,?,?)")
          .bind(submit[1], row.branch, String(input.contributor || ""), JSON.stringify(input.payload)).run();
        return json({ ok: true, id: result.meta.last_row_id, status: "pending" }, 201);
      }

      if (path === "/admin/contributions" && request.method === "GET") {
        if (!authorized(request, env)) return json({ error: "Non autorisé." }, 401);
        const result = await env.DB.prepare("SELECT * FROM contributions ORDER BY created_at DESC").all();
        return json({ contributions: (result.results || []).map((row) => {
          let payload = {};
          try { payload = JSON.parse(row.payload || "{}"); } catch (_) {}
          return { ...row, payload };
        })});
      }

      const update = path.match(/^\/admin\/contributions\/(\d+)$/);
      if (update && request.method === "PATCH") {
        if (!authorized(request, env)) return json({ error: "Non autorisé." }, 401);
        const input = await body(request);
        if (!["accepted", "rejected"].includes(input.status)) return json({ error: "Statut invalide." }, 400);
        const result = await env.DB.prepare("UPDATE contributions SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'")
          .bind(input.status, update[1]).run();
        if (!result.meta.changes) return json({ error: "Contribution absente ou déjà traitée." }, 409);
        return json({ ok: true, id: Number(update[1]), status: input.status });
      }

      return json({ error: "Route introuvable." }, 404);
    } catch (error) {
      return json({ error: error && error.message ? error.message : "Erreur interne Cloudflare." }, 500);
    }
  }
};
