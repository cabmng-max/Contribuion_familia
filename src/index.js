var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
__name(escapeHtml, "escapeHtml");
function pageMessage(title, message) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      background: #f3f6fa;
      font-family: system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
      color: #172033;
      padding: 20px;
    }

    .card {
      max-width: 600px;
      margin: 60px auto;
      background: white;
      border-radius: 18px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 8px 30px rgba(0,0,0,.08);
    }

    h1 {
      color: #245f9e;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}
__name(pageMessage, "pageMessage");
function pageForm(token) {
  const safeToken = escapeHtml(token);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1,viewport-fit=cover"
  >

  <title>Contribution familiale</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f3f6fa;
      color: #172033;
      font-family: system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
    }

    .wrap {
      max-width: 720px;
      margin: 0 auto;
      padding: 12px;
    }

    .hero {
      background: linear-gradient(135deg,#183e66,#2b6da9);
      color: white;
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 14px;
    }

    .hero h1 {
      margin: 0 0 7px;
      font-size: 24px;
    }

    .hero p {
      margin: 0;
      line-height: 1.5;
      opacity: .94;
    }

    .card {
      background: white;
      border: 1px solid #dce4ee;
      border-radius: 16px;
      padding: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .full {
      grid-column: 1 / -1;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 650;
      margin-bottom: 5px;
    }

    input,
    textarea {
      width: 100%;
      min-height: 46px;
      border: 1px solid #cbd6e3;
      border-radius: 11px;
      padding: 10px 11px;
      font-size: 16px;
      background: white;
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    button {
      width: 100%;
      margin-top: 16px;
      border: 0;
      border-radius: 11px;
      padding: 14px;
      background: #245f9e;
      color: white;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }

    .note {
      margin-top: 14px;
      color: #65758b;
      font-size: 13px;
      line-height: 1.45;
    }

    @media (max-width: 600px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .full {
        grid-column: auto;
      }

      .wrap {
        padding: 8px;
      }

      .hero {
        border-radius: 14px;
      }
    }
  </style>
</head>

<body>

  <div class="wrap">

    <div class="hero">
      <h1>\u{1F46A} Contribution familiale</h1>

      <p>
        Merci de renseigner les informations que vous connaissez.
        Elles seront contr\xF4l\xE9es avant leur int\xE9gration
        dans l'arbre familial.
      </p>
    </div>

    <div class="card">

      <form method="post" action="/contribuer">

        <input
          type="hidden"
          name="token"
          value="${safeToken}"
        >

        <div class="grid">

          <div>
            <label>Pr\xE9nom *</label>
            <input
              name="prenom"
              required
              autocomplete="given-name"
            >
          </div>

          <div>
            <label>Nom *</label>
            <input
              name="nom"
              required
              autocomplete="family-name"
            >
          </div>

          <div>
            <label>Date de naissance</label>
            <input
              type="date"
              name="date_naissance"
            >
          </div>

          <div>
            <label>Lieu de naissance</label>
            <input name="lieu_naissance">
          </div>

          <div>
            <label>T\xE9l\xE9phone</label>
            <input
              type="tel"
              name="telephone"
              autocomplete="tel"
            >
          </div>

          <div>
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              autocomplete="email"
            >
          </div>

          <div class="full">
            <label>Informations compl\xE9mentaires</label>

            <textarea
              name="commentaire"
              placeholder="Profession, conjoint, enfants, ville, informations familiales..."
            ></textarea>
          </div>

        </div>

        <button type="submit">
          \u{1F4E8} Envoyer ma contribution
        </button>

      </form>

      <div class="note">
        Les informations envoy\xE9es sont plac\xE9es en attente
        de v\xE9rification. Elles ne sont pas ajout\xE9es
        automatiquement \xE0 l'arbre familial.
      </div>

    </div>
  </div>

</body>
</html>`;
}
__name(pageForm, "pageForm");
async function invitationValide(env, token) {
  if (!token) {
    return false;
  }
  const result = await env.DB.prepare(`
      SELECT id
      FROM invitations
      WHERE token = ?
        AND status = 'active'
        AND (
          expires_at IS NULL
          OR datetime(expires_at) > datetime('now')
        )
      LIMIT 1
    `).bind(token).first();
  return Boolean(result);
}
__name(invitationValide, "invitationValide");
function genererTokenInvitation() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(genererTokenInvitation, "genererTokenInvitation");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Diagnostic temporaire : ne révèle jamais la valeur du secret.
    if (url.pathname === "/admin/key-diagnostic") {
      const received = String(
        request.headers.get("X-MNG-Admin-Key") || ""
      );
      const stored = String(env.MNG_ADMIN_KEY || "");

      return new Response(
        JSON.stringify({
          ok: true,
          secret_present: stored.length > 0,
          secret_length: stored.length,
          header_present: received.length > 0,
          header_length: received.length,
          keys_equal: received === stored
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=UTF-8"
          }
        }
      );
    }

    if (request.method === "POST" && url.pathname === "/admin/invitations") {
      const adminKey = String(
        request.headers.get("X-MNG-Admin-Key") || ""
      );
     
      if (!env.MNG_ADMIN_KEY || adminKey !== env.MNG_ADMIN_KEY) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Acc\xE8s administrateur refus\xE9"
          }),
          {
            status: 403,
            headers: {
              "content-type": "application/json; charset=UTF-8"
            }
          }
        );
      }
      try {
        const token = genererTokenInvitation();
        await env.DB.prepare(`
            INSERT INTO invitations (
              token,
              expires_at,
              status
            )
            VALUES (
              ?,
              datetime('now', '+7 days'),
              'active'
            )
          `).bind(token).run();
        const inviteUrl = `${url.origin}/?token=${encodeURIComponent(token)}`;
        return new Response(
          JSON.stringify(
            {
              ok: true,
              token,
              expires_in_days: 7,
              invite_url: inviteUrl
            },
            null,
            2
          ),
          {
            status: 201,
            headers: {
              "content-type": "application/json; charset=UTF-8"
            }
          }
        );
      } catch (error) {
        console.error(
          "Erreur cr\xE9ation invitation",
          error
        );
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Impossible de cr\xE9er l'invitation"
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json; charset=UTF-8"
            }
          }
        );
      }
    }
    if (request.method === "GET" && url.pathname === "/") {
      const token = String(url.searchParams.get("token") || "").trim();
      if (!token) {
        return new Response(
          pageMessage(
            "\u{1F512} Invitation requise",
            "Vous devez utiliser le lien d'invitation qui vous a \xE9t\xE9 transmis."
          ),
          {
            status: 403,
            headers: {
              "content-type": "text/html; charset=UTF-8"
            }
          }
        );
      }
      try {
        const valide = await invitationValide(env, token);
        if (!valide) {
          return new Response(
            pageMessage(
              "\u26A0\uFE0F Invitation invalide",
              "Cette invitation est inconnue, expir\xE9e ou d\xE9sactiv\xE9e."
            ),
            {
              status: 403,
              headers: {
                "content-type": "text/html; charset=UTF-8"
              }
            }
          );
        }
        return new Response(
          pageForm(token),
          {
            headers: {
              "content-type": "text/html; charset=UTF-8"
            }
          }
        );
      } catch (error) {
        console.error(
          "Erreur contr\xF4le invitation",
          error
        );
        return new Response(
          pageMessage(
            "Erreur",
            "Impossible de v\xE9rifier l'invitation."
          ),
          {
            status: 500,
            headers: {
              "content-type": "text/html; charset=UTF-8"
            }
          }
        );
      }
    }
    if (request.method === "POST" && url.pathname === "/contribuer") {
      try {
        const form = await request.formData();
        const token = String(form.get("token") || "").trim();
        const prenom = String(form.get("prenom") || "").trim();
        const nom = String(form.get("nom") || "").trim();
        const dateNaissance = String(
          form.get("date_naissance") || ""
        ).trim();
        const lieuNaissance = String(
          form.get("lieu_naissance") || ""
        ).trim();
        const telephone = String(
          form.get("telephone") || ""
        ).trim();
        const email = String(
          form.get("email") || ""
        ).trim();
        const commentaire = String(
          form.get("commentaire") || ""
        ).trim();
        const valide = await invitationValide(env, token);
        if (!valide) {
          return new Response(
            pageMessage(
              "\u26A0\uFE0F Invitation invalide",
              "Cette invitation n'est plus valable."
            ),
            {
              status: 403,
              headers: {
                "content-type": "text/html; charset=UTF-8"
              }
            }
          );
        }
        if (!prenom || !nom) {
          return new Response(
            pageMessage(
              "Informations manquantes",
              "Le pr\xE9nom et le nom sont obligatoires."
            ),
            {
              status: 400,
              headers: {
                "content-type": "text/html; charset=UTF-8"
              }
            }
          );
        }
        await env.DB.prepare(`
            INSERT INTO contributions (
              invitation_token,
              nom,
              prenom,
              date_naissance,
              lieu_naissance,
              telephone,
              email,
              commentaire,
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
          token,
          nom,
          prenom,
          dateNaissance,
          lieuNaissance,
          telephone,
          email,
          commentaire,
          "pending"
        ).run();
        return new Response(
          pageMessage(
            "\u2705 Merci",
            "Votre contribution a bien \xE9t\xE9 transmise. Elle sera contr\xF4l\xE9e avant son int\xE9gration dans l'arbre familial."
          ),
          {
            headers: {
              "content-type": "text/html; charset=UTF-8"
            }
          }
        );
      } catch (error) {
        console.error(
          "Erreur contribution",
          error
        );
        return new Response(
          pageMessage(
            "Erreur",
            "Une erreur est survenue lors de l'enregistrement."
          ),
          {
            status: 500,
            headers: {
              "content-type": "text/html; charset=UTF-8"
            }
          }
        );
      }
    }
    return new Response(
      "Page introuvable",
      {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
