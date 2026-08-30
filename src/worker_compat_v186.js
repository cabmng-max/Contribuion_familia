import legacyWorker from "./index.js";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
});

async function readJson(request) {
  try { return await request.json(); }
  catch (_) { throw new Error("Corps JSON invalide."); }
}

function firstMember(payload) {
  return payload && Array.isArray(payload.members) && payload.members.length ? payload.members[0] || {} : {};
}

function legacyValue(column, ctx) {
  const { inviteToken, branch, contributor, payload, member } = ctx;
  const direct = {
    token: inviteToken,
    invitation_token: inviteToken,
    branch,
    branche: branch,
    contributor,
    contributeur: contributor,
    payload: JSON.stringify(payload),
    status: "pending",
    statut: "pending",
    nom: String(member.nom || ""),
    prenom: String(member.prenom || ""),
    nom_ar: String(member.nom_ar || ""),
    prenom_ar: String(member.prenom_ar || ""),
    sexe: String(member.sexe || ""),
    naissance: String(member.naissance || ""),
    date_naissance: String(member.naissance || ""),
    lieu_naissance: String(member.lieu_naissance || ""),
    gsm: String(member.gsm || ""),
    telephone: String(member.gsm || ""),
    email: String(member.email || ""),
    ville: String(member.ville || ""),
    pays: String(member.pays || ""),
    profession: String(member.profession || ""),
    notes: String(member.notes || ""),
  };
  if (Object.prototype.hasOwnProperty.call(direct, column)) return direct[column];
  if (Object.prototype.hasOwnProperty.call(member, column)) return member[column] == null ? "" : String(member[column]);
  return "";
}

export async function saveCompatibleContribution(env, inviteToken, branch, input) {
  const payload = input.payload;
  const contributor = String(input.contributor || "");
  const member = firstMember(payload);
  const info = await env.DB.prepare("PRAGMA table_info(contributions)").all();
  const columnsInfo = info.results || [];
  const ctx = { inviteToken, branch, contributor, payload, member };

  const columns = [];
  const values = [];
  for (const col of columnsInfo) {
    const name = String(col.name || "");
    if (!name || (Number(col.pk) === 1 && /INT/i.test(String(col.type || "")))) continue;

    const known = ["token","invitation_token","branch","branche","contributor","contributeur","payload","status","statut",
      "nom","prenom","nom_ar","prenom_ar","sexe","naissance","date_naissance","lieu_naissance","gsm","telephone","email","ville","pays","profession","notes"].includes(name)
      || Object.prototype.hasOwnProperty.call(member, name);

    if (known) {
      columns.push(name);
      values.push(legacyValue(name, ctx));
      continue;
    }

    // Toute ancienne colonne obligatoire sans valeur par défaut reçoit une valeur neutre,
    // afin de préserver le schéma historique sans suppression ni reconstruction D1.
    if (Number(col.notnull) === 1 && col.dflt_value == null) {
      columns.push(name);
      values.push(legacyValue(name, ctx));
    }
  }

  const placeholders = columns.map(() => "?").join(",");
  const quoted = columns.map((name) => `"${name.replace(/"/g, '""')}"`).join(",");
  const result = await env.DB.prepare(`INSERT INTO contributions(${quoted}) VALUES(${placeholders})`).bind(...values).run();
  return result;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const submit = url.pathname.match(/^\/invite\/([^/]+)\/contributions$/);

    if (submit && request.method === "POST") {
      try {
        // Laisser d'abord le Worker historique assurer/créer le schéma.
        // Une requête GET sur une route inexistante déclenche son schema() sans modifier les données.
        await legacyWorker.fetch(new Request(`${url.origin}/__schema_probe__`, { method: "GET" }), env, ctx);

        const row = await env.DB.prepare("SELECT branch, expires_at FROM invitations WHERE token=?").bind(submit[1]).first();
        if (!row || !row.expires_at || Date.parse(row.expires_at) <= Date.now()) return json({ error: "Invitation invalide ou expirée." }, 404);

        const input = await readJson(request);
        if (!input.payload || typeof input.payload !== "object") return json({ error: "Contribution invalide." }, 400);

        const result = await saveCompatibleContribution(env, submit[1], String(row.branch || ""), input);
        return json({ ok: true, id: result.meta.last_row_id, status: "pending" }, 201);
      } catch (error) {
        return json({ error: error && error.message ? error.message : "Erreur interne Cloudflare." }, 500);
      }
    }

    return legacyWorker.fetch(request, env, ctx);
  }
};
