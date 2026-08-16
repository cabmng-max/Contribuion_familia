function pageForm() {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Contribution familiale</title>
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #f3f6fa;
      color: #172033;
      font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    }

    .wrap {
      max-width: 720px;
      margin: 0 auto;
      padding: 12px;
    }

    .hero {
      background: linear-gradient(135deg, #183e66, #2b6da9);
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

    input, textarea {
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
      <h1>👪 Contribution familiale</h1>
      <p>
        Merci de renseigner les informations que vous connaissez.
        Elles seront contrôlées avant leur intégration dans l'arbre familial.
      </p>
    </div>

    <div class="card">

      <form method="post" action="/contribuer">

        <div class="grid">

          <div>
            <label>Prénom *</label>
            <input name="prenom" required autocomplete="given-name">
          </div>

          <div>
            <label>Nom *</label>
            <input name="nom" required autocomplete="family-name">
          </div>

          <div>
            <label>Date de naissance</label>
            <input type="date" name="date_naissance">
          </div>

          <div>
            <label>Lieu de naissance</label>
            <input name="lieu_naissance">
          </div>

          <div>
            <label>Téléphone</label>
            <input type="tel" name="telephone" autocomplete="tel">
          </div>

          <div>
            <label>E-mail</label>
            <input type="email" name="email" autocomplete="email">
          </div>

          <div class="full">
            <label>Informations complémentaires</label>
            <textarea
              name="commentaire"
              placeholder="Profession, conjoint, enfants, ville, informations familiales..."
            ></textarea>
          </div>

        </div>

        <button type="submit">
          📨 Envoyer ma contribution
        </button>

      </form>

      <div class="note">
        Les informations envoyées sont placées en attente de vérification.
        Elles ne sont pas ajoutées automatiquement à l'arbre familial.
      </div>

    </div>

  </div>
</body>
</html>`;
}


function pageMerci() {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Contribution envoyée</title>
  <style>
    body {
      margin: 0;
      background: #f3f6fa;
      font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
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
      color: #177245;
    }
  </style>
</head>

<body>
  <div class="card">
    <h1>✅ Merci</h1>
    <p>Votre contribution a bien été transmise.</p>
    <p>
      Elle sera contrôlée avant son intégration dans l'arbre familial.
    </p>
  </div>
</body>
</html>`;
}


export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(pageForm(), {
        headers: {
          "content-type": "text/html; charset=UTF-8"
        }
      });
    }


    if (request.method === "POST" && url.pathname === "/contribuer") {

      try {

        const form = await request.formData();

        const prenom = String(form.get("prenom") || "").trim();
        const nom = String(form.get("nom") || "").trim();
        const dateNaissance =
          String(form.get("date_naissance") || "").trim();

        const lieuNaissance =
          String(form.get("lieu_naissance") || "").trim();

        const telephone =
          String(form.get("telephone") || "").trim();

        const email =
          String(form.get("email") || "").trim();

        const commentaire =
          String(form.get("commentaire") || "").trim();


        if (!prenom || !nom) {

          return new Response(
            "Le prénom et le nom sont obligatoires.",
            {
              status: 400,
              headers: {
                "content-type": "text/plain; charset=UTF-8"
              }
            }
          );

        }


        await env.DB
          .prepare(`
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
          `)
          .bind(
            "TEST-PUBLIC",
            nom,
            prenom,
            dateNaissance,
            lieuNaissance,
            telephone,
            email,
            commentaire,
            "pending"
          )
          .run();


        return new Response(pageMerci(), {
          headers: {
            "content-type": "text/html; charset=UTF-8"
          }
        });

      } catch (error) {

        console.error("Erreur contribution", error);

        return new Response(
          "Une erreur est survenue lors de l'enregistrement.",
          {
            status: 500,
            headers: {
              "content-type": "text/plain; charset=UTF-8"
            }
          }
        );

      }

    }


    return new Response("Page introuvable", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=UTF-8"
      }
    });

  }

};
