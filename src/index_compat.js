import worker from "./index.js";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const submit = url.pathname.match(/^\/invite\/([^/]+)\/contributions$/);

    if (submit && request.method === "POST") {
      const info = await env.DB.prepare("PRAGMA table_info(contributions)").all();
      const columns = new Set((info.results || []).map((row) => row.name));

      // Compatibilité avec la table D1 historique : invitation_token était NOT NULL.
      if (columns.has("invitation_token")) {
        try {
          const invitationToken = submit[1];
          const invitation = await env.DB.prepare(
            "SELECT branch, expires_at FROM invitations WHERE token=?"
          ).bind(invitationToken).first();

          if (!invitation || !invitation.expires_at || Date.parse(invitation.expires_at) <= Date.now()) {
            return json({ error: "Invitation invalide ou expirée." }, 404);
          }

          const input = await request.json();
          if (!input.payload || typeof input.payload !== "object") {
            return json({ error: "Contribution invalide." }, 400);
          }

          const contributor = String(input.contributor || "");
          const payload = JSON.stringify(input.payload);
          let result;

          if (columns.has("token")) {
            result = await env.DB.prepare(
              "INSERT INTO contributions(invitation_token,token,branch,contributor,payload) VALUES(?,?,?,?,?)"
            ).bind(invitationToken, invitationToken, invitation.branch, contributor, payload).run();
          } else {
            result = await env.DB.prepare(
              "INSERT INTO contributions(invitation_token,branch,contributor,payload) VALUES(?,?,?,?)"
            ).bind(invitationToken, invitation.branch, contributor, payload).run();
          }

          return json({ ok: true, id: result.meta.last_row_id, status: "pending" }, 201);
        } catch (error) {
          return json({ error: error && error.message ? error.message : "Erreur interne Cloudflare." }, 500);
        }
      }
    }

    return worker.fetch(request, env, ctx);
  }
};
