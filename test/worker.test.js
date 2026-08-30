import assert from "node:assert/strict";
import test from "node:test";

import { invitationForm } from "../src/index.js";
import { saveCompatibleContribution } from "../src/worker_compat_v186.js";

test("the public form offers five languages, Arabic RTL, and in-place translation", () => {
  const html = invitationForm({ branch: "Branche A", members: "[]" });

  for (const language of ["fr", "ar", "en", "es", "tr"]) {
    assert.match(html, new RegExp(`<option value="${language}">`));
    assert.match(html, new RegExp(`"${language}":\\{`));
  }
  assert.match(html, /document\.documentElement\.lang=currentLanguage/);
  assert.match(html, /currentLanguage==='ar'\?'rtl':'ltr'/);
  assert.doesNotMatch(html, /location\.reload/);
  assert.match(html, /Cette branche est définie/);
  assert.match(html, /This branch is set by the invitation/);
  assert.match(html, /تم استلام المساهمة/);
  assert.match(html, /Gönderiliyor/);
  assert.match(html, /Contribución recibida/);
  assert.doesNotMatch(html, /MNG_ADMIN_KEY/);
});

test("spouses use removable single-line selectors and preserve the payload shape", () => {
  const html = invitationForm({
    branch: "Branche A",
    members: JSON.stringify([{ id: "member-1", prenom: "Lina", nom: "Durand", sexe: "Femme" }]),
  });

  assert.match(html, /id="spouse-select" name="conjoint_ids" onchange=/);
  assert.doesNotMatch(html, /name="conjoint_ids" multiple/);
  assert.match(html, /function addSpouseSelector\(\)/);
  assert.match(html, /row\.querySelector\('\.remove'\)\.onclick=\(\)=>\{row\.remove\(\);renumberSpouses\(\)\}/);
  assert.match(html, /select\.value==='__new__'/);
  assert.match(html, /member\.conjoint_ids=\[\]/);
  assert.match(html, /member\.conjoint_ids\.push\(select\.value\)/);
  assert.match(html, /data-i18n-number/);
  assert.match(html, /t\('spouseNumber'\)\.replace/);
  for (const label of ["Conjoint {number}", "الزوج/الزوجة {number}", "Spouse {number}", "Cónyuge {number}", "Eş {number}"]) {
    assert.match(html, new RegExp(label.replace(/[{}]/g, "\\$&")));
  }
});

test("compatible insert fills new and arbitrary historical NOT NULL columns", async () => {
  const columns = [
    { name: "id", type: "INTEGER", pk: 1, notnull: 1, dflt_value: null },
    { name: "token", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "invitation_token", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "branch", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "contributor", type: "TEXT", pk: 0, notnull: 0, dflt_value: null },
    { name: "payload", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "status", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "nom", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "prenom", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
    { name: "ancienne_colonne", type: "TEXT", pk: 0, notnull: 1, dflt_value: null },
  ];
  let inserted;
  const env = { DB: { prepare(sql) {
    if (sql === "PRAGMA table_info(contributions)") return { all: async () => ({ results: columns }) };
    return { bind(...values) { inserted = { sql, values }; return { run: async () => ({ meta: { last_row_id: 42 } }) }; } };
  } } };
  const input = { contributor: "Alice", payload: { members: [{ nom: "Durand", prenom: "Lina" }] } };

  const result = await saveCompatibleContribution(env, "invite-123", "Branche A", input);
  const insertedColumns = [...inserted.sql.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const values = Object.fromEntries(insertedColumns.map((name, index) => [name, inserted.values[index]]));

  assert.equal(result.meta.last_row_id, 42);
  assert.equal(values.token, "invite-123");
  assert.equal(values.invitation_token, "invite-123");
  assert.equal(values.nom, "Durand");
  assert.equal(values.prenom, "Lina");
  assert.equal(values.status, "pending");
  assert.equal(values.ancienne_colonne, "");
  assert.deepEqual(JSON.parse(values.payload), input.payload);
});
