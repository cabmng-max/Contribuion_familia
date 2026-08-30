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

export function invitationForm(invitation) {
  let members = [];
  try { members = JSON.parse(invitation.members || "[]"); } catch (_) {}

  const options = (filter) => '<option value="" data-i18n="choose">— Choisir —</option><option value="__new__" data-i18n="missing">Personne absente de la liste / Ajouter une nouvelle personne</option>'
    + members.filter(filter).map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(`${member.prenom || ""} ${member.nom || ""}`.trim())}</option>`).join("");

  const all = options(() => true), father = options(isMale), mother = options(isFemale);

  return `<!doctype html><html lang="fr" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Contribution familiale</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f2f6fb;color:#172033;font:16px system-ui}.wrap{max-width:680px;margin:auto;padding:16px}h1{font-size:1.55rem}.language{margin-bottom:16px;max-width:240px}.branch{background:#e8f2ff;border:1px solid #98bce8;padding:14px;border-radius:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:flex;flex-direction:column;gap:5px;font-weight:650}input,select,textarea,button{width:100%;font:inherit;padding:12px;border:1px solid #aab8ca;border-radius:9px;background:white}textarea{min-height:95px}select[multiple]{min-height:150px}.wide{grid-column:1/-1}.new-person{grid-column:1/-1;padding:12px;border:1px dashed #1769aa;border-radius:10px;background:#f8fbff}.secondary{background:#e8f2ff;color:#174f7d;margin-top:8px}.remove{background:#9b2c2c;color:white}.hint{font-size:.85rem;color:#506174}#result{padding:12px}[dir=rtl] input,[dir=rtl] textarea{text-align:right}@media(max-width:560px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}}</style></head><body><main class="wrap">
<label class="language"><span data-i18n="language">Langue</span><select id="language-select" aria-label="Langue"><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option><option value="es">Español</option><option value="tr">Türkçe</option></select></label>
<h1 data-i18n="title">Contribution MNG e-Familia</h1><div class="branch"><b data-i18n="branch">Branche familiale</b><br>${escapeHtml(invitation.branch)}<div class="hint" data-i18n="branchHint">Cette branche est définie par l’invitation et ne peut pas être modifiée.</div></div>
<form id="family-form"><div class="grid">
${["prenom","nom","prenom_ar","nom_ar","sexe","naissance","lieu_naissance","statut_vital","deces","etat_civil","gsm","email","ville","ville_ar","pays","pays_ar","profession","profession_ar","nationalites","universite","universite_ar","organisme","organisme_ar","notes","notes_ar"].map((name) => {
  const wide = ["lieu_naissance","notes","notes_ar"].includes(name) ? " class=\"wide\"" : "";
  if (name === "sexe") return `<label${wide}><span data-i18n="sexe">Sexe</span><select name="sexe"><option></option><option value="Homme" data-i18n="male">Homme</option><option value="Femme" data-i18n="female">Femme</option></select></label>`;
  if (name === "statut_vital") return `<label><span data-i18n="status">Statut</span><select name="statut_vital"><option value="vivant" data-i18n="alive">Vivant(e)</option><option value="decede" data-i18n="dead">Décédé(e)</option></select></label>`;
  if (name === "etat_civil") return `<label><span data-i18n="civil">État civil</span><select name="etat_civil"><option></option><option value="Célibataire" data-i18n="single">Célibataire</option><option value="Marié(e)" data-i18n="married">Marié(e)</option><option value="Divorcé(e)" data-i18n="divorced">Divorcé(e)</option><option value="Veuf/Veuve" data-i18n="widowed">Veuf/Veuve</option></select></label>`;
  const textarea = name.startsWith("notes") ? `<textarea name="${name}"${name.endsWith("_ar") ? ' dir="rtl"' : ""}></textarea>` : `<input${["naissance","deces"].includes(name) ? ' type="date"' : name === "gsm" ? ' type="tel"' : name === "email" ? ' type="email"' : ""} name="${name}"${["prenom","nom"].includes(name) ? " required" : ""}${name.endsWith("_ar") ? ' dir="rtl"' : ""}>`;
  return `<label${wide}><span data-i18n="${name}">${name}</span>${textarea}</label>`;
}).join("")}
<label><span data-i18n="father">Père</span><select id="father-select" name="pere_id" onchange="toggleNewPerson('father',this.value)">${father}</select></label>
<label><span data-i18n="mother">Mère</span><select id="mother-select" name="mere_id" onchange="toggleNewPerson('mother',this.value)">${mother}</select></label>
<div id="new-father" class="new-person" hidden><b data-i18n="newFather">Nouveau père</b><div class="grid"><label><span data-i18n="prenom">Prénom</span><input data-field="prenom"></label><label><span data-i18n="nom">Nom</span><input data-field="nom"></label><label><span data-i18n="sexe">Sexe</span><select data-field="sexe"><option value="Homme" data-i18n="male">Homme</option></select></label></div></div>
<div id="new-mother" class="new-person" hidden><b data-i18n="newMother">Nouvelle mère</b><div class="grid"><label><span data-i18n="prenom">Prénom</span><input data-field="prenom"></label><label><span data-i18n="nom">Nom</span><input data-field="nom"></label><label><span data-i18n="sexe">Sexe</span><select data-field="sexe"><option value="Femme" data-i18n="female">Femme</option></select></label></div></div>
<div class="wide"><div id="spouse-selectors"><div class="spouse-row"><label><span data-i18n-number="1">Conjoint 1</span><select id="spouse-select" name="conjoint_ids" onchange="spouseSelectionChanged(this)">${all}</select></label><div class="spouse-new-person"></div></div></div><span class="hint" data-i18n="spouseHint">Plusieurs personnes existantes peuvent être choisies.</span><button class="secondary" type="button" onclick="addSpouseSelector()" data-i18n="addSpouse">＋ Ajouter un nouveau conjoint</button></div>
<label class="wide"><span data-i18n="spouseStatus">Statut du conjoint</span><select name="statut_conjoint"><option value="Marié(e)" data-i18n="married">Marié(e)</option><option value="Divorcé(e)" data-i18n="divorced">Divorcé(e)</option><option value="Veuf/Veuve" data-i18n="widowed">Veuf/Veuve</option></select></label>
<label class="wide"><span data-i18n="contributor">Votre nom (contributeur)</span><input name="contributor"></label></div><button type="submit" data-i18n="send">Envoyer la contribution</button></form><div id="result" role="status" aria-live="polite"></div></main>
<script>
const translations=${JSON.stringify({
fr:{language:"Langue",title:"Contribution MNG e-Familia",branch:"Branche familiale",branchHint:"Cette branche est définie par l’invitation et ne peut pas être modifiée.",choose:"— Choisir —",missing:"Personne absente de la liste / Ajouter une nouvelle personne",prenom:"Prénom",nom:"Nom",prenom_ar:"Prénom arabe",nom_ar:"Nom arabe",sexe:"Sexe",male:"Homme",female:"Femme",naissance:"Date de naissance",lieu_naissance:"Lieu de naissance",status:"Statut",alive:"Vivant(e)",dead:"Décédé(e)",deces:"Date de décès",civil:"État civil",single:"Célibataire",married:"Marié(e)",divorced:"Divorcé(e)",widowed:"Veuf/Veuve",gsm:"Téléphone",email:"E-mail",ville:"Ville",ville_ar:"Ville arabe",pays:"Pays",pays_ar:"Pays arabe",profession:"Profession",profession_ar:"Profession arabe",nationalites:"Nationalité(s)",universite:"Université",universite_ar:"Université arabe",organisme:"Organisme",organisme_ar:"Organisme arabe",notes:"Notes",notes_ar:"Notes arabes",father:"Père",mother:"Mère",newFather:"Nouveau père",newMother:"Nouvelle mère",spouses:"Conjoint(s)",spouseNumber:"Conjoint {number}",spouseHint:"Plusieurs personnes existantes peuvent être choisies.",addSpouse:"＋ Ajouter un nouveau conjoint",newSpouse:"Nouveau conjoint",remove:"Retirer",spouseStatus:"Statut du conjoint",contributor:"Votre nom (contributeur)",send:"Envoyer la contribution",requiredPerson:"Saisissez au moins le prénom ou le nom de chaque nouvelle personne.",sending:"Envoi…",success:"✅ Contribution envoyée. Elle sera intégrée uniquement après validation.",error:"Erreur"},
ar:{language:"اللغة",title:"مساهمة MNG e-Familia",branch:"الفرع العائلي",branchHint:"يحدد رابط الدعوة هذا الفرع ولا يمكن تغييره.",choose:"— اختر —",missing:"شخص غير موجود في القائمة / إضافة شخص جديد",prenom:"الاسم الأول",nom:"اسم العائلة",prenom_ar:"الاسم الأول بالعربية",nom_ar:"اسم العائلة بالعربية",sexe:"الجنس",male:"ذكر",female:"أنثى",naissance:"تاريخ الميلاد",lieu_naissance:"مكان الميلاد",status:"الحالة",alive:"على قيد الحياة",dead:"متوفى/متوفاة",deces:"تاريخ الوفاة",civil:"الحالة الاجتماعية",single:"أعزب/عزباء",married:"متزوج/متزوجة",divorced:"مطلق/مطلقة",widowed:"أرمل/أرملة",gsm:"الهاتف",email:"البريد الإلكتروني",ville:"المدينة",ville_ar:"المدينة بالعربية",pays:"البلد",pays_ar:"البلد بالعربية",profession:"المهنة",profession_ar:"المهنة بالعربية",nationalites:"الجنسية/الجنسيات",universite:"الجامعة",universite_ar:"الجامعة بالعربية",organisme:"المؤسسة",organisme_ar:"المؤسسة بالعربية",notes:"ملاحظات",notes_ar:"ملاحظات بالعربية",father:"الأب",mother:"الأم",newFather:"أب جديد",newMother:"أم جديدة",spouses:"الزوج/الزوجة",spouseNumber:"الزوج/الزوجة {number}",spouseHint:"يمكن اختيار عدة أشخاص موجودين.",addSpouse:"＋ إضافة زوج/زوجة",newSpouse:"زوج/زوجة جديد(ة)",remove:"إزالة",spouseStatus:"حالة الزوج/الزوجة",contributor:"اسم المساهم",send:"إرسال المساهمة",requiredPerson:"أدخل الاسم الأول أو اسم العائلة لكل شخص جديد على الأقل.",sending:"جارٍ الإرسال…",success:"✅ تم استلام المساهمة. لن تُدمج إلا بعد التحقق.",error:"خطأ"},
en:{language:"Language",title:"MNG e-Familia contribution",branch:"Family branch",branchHint:"This branch is set by the invitation and cannot be changed.",choose:"— Choose —",missing:"Person missing from the list / Add a new person",prenom:"First name",nom:"Last name",prenom_ar:"First name in Arabic",nom_ar:"Last name in Arabic",sexe:"Sex",male:"Male",female:"Female",naissance:"Date of birth",lieu_naissance:"Place of birth",status:"Status",alive:"Living",dead:"Deceased",deces:"Date of death",civil:"Marital status",single:"Single",married:"Married",divorced:"Divorced",widowed:"Widowed",gsm:"Phone",email:"Email",ville:"City",ville_ar:"City in Arabic",pays:"Country",pays_ar:"Country in Arabic",profession:"Occupation",profession_ar:"Occupation in Arabic",nationalites:"Nationality/Nationalities",universite:"University",universite_ar:"University in Arabic",organisme:"Organisation",organisme_ar:"Organisation in Arabic",notes:"Notes",notes_ar:"Notes in Arabic",father:"Father",mother:"Mother",newFather:"New father",newMother:"New mother",spouses:"Spouse(s)",spouseNumber:"Spouse {number}",spouseHint:"You may select several existing people.",addSpouse:"＋ Add a new spouse",newSpouse:"New spouse",remove:"Remove",spouseStatus:"Spouse status",contributor:"Your name (contributor)",send:"Send contribution",requiredPerson:"Enter at least the first or last name of each new person.",sending:"Sending…",success:"✅ Contribution received. It will only be integrated after approval.",error:"Error"},
es:{language:"Idioma",title:"Contribución MNG e-Familia",branch:"Rama familiar",branchHint:"Esta rama está definida por la invitación y no se puede modificar.",choose:"— Elegir —",missing:"Persona ausente de la lista / Añadir una persona",prenom:"Nombre",nom:"Apellido",prenom_ar:"Nombre en árabe",nom_ar:"Apellido en árabe",sexe:"Sexo",male:"Hombre",female:"Mujer",naissance:"Fecha de nacimiento",lieu_naissance:"Lugar de nacimiento",status:"Estado",alive:"Vivo/a",dead:"Fallecido/a",deces:"Fecha de defunción",civil:"Estado civil",single:"Soltero/a",married:"Casado/a",divorced:"Divorciado/a",widowed:"Viudo/a",gsm:"Teléfono",email:"Correo electrónico",ville:"Ciudad",ville_ar:"Ciudad en árabe",pays:"País",pays_ar:"País en árabe",profession:"Profesión",profession_ar:"Profesión en árabe",nationalites:"Nacionalidad(es)",universite:"Universidad",universite_ar:"Universidad en árabe",organisme:"Organización",organisme_ar:"Organización en árabe",notes:"Notas",notes_ar:"Notas en árabe",father:"Padre",mother:"Madre",newFather:"Nuevo padre",newMother:"Nueva madre",spouses:"Cónyuge(s)",spouseNumber:"Cónyuge {number}",spouseHint:"Se pueden elegir varias personas existentes.",addSpouse:"＋ Añadir cónyuge",newSpouse:"Nuevo/a cónyuge",remove:"Retirar",spouseStatus:"Estado del cónyuge",contributor:"Su nombre (colaborador)",send:"Enviar contribución",requiredPerson:"Introduzca al menos el nombre o apellido de cada persona nueva.",sending:"Enviando…",success:"✅ Contribución recibida. Solo se integrará después de su validación.",error:"Error"},
tr:{language:"Dil",title:"MNG e-Familia katkısı",branch:"Aile kolu",branchHint:"Bu kol davet tarafından belirlenmiştir ve değiştirilemez.",choose:"— Seçin —",missing:"Listede olmayan kişi / Yeni kişi ekle",prenom:"Ad",nom:"Soyad",prenom_ar:"Arapça ad",nom_ar:"Arapça soyad",sexe:"Cinsiyet",male:"Erkek",female:"Kadın",naissance:"Doğum tarihi",lieu_naissance:"Doğum yeri",status:"Durum",alive:"Hayatta",dead:"Vefat etmiş",deces:"Ölüm tarihi",civil:"Medeni durum",single:"Bekâr",married:"Evli",divorced:"Boşanmış",widowed:"Dul",gsm:"Telefon",email:"E-posta",ville:"Şehir",ville_ar:"Arapça şehir",pays:"Ülke",pays_ar:"Arapça ülke",profession:"Meslek",profession_ar:"Arapça meslek",nationalites:"Uyruk(lar)",universite:"Üniversite",universite_ar:"Arapça üniversite",organisme:"Kurum",organisme_ar:"Arapça kurum",notes:"Notlar",notes_ar:"Arapça notlar",father:"Baba",mother:"Anne",newFather:"Yeni baba",newMother:"Yeni anne",spouses:"Eş(ler)",spouseNumber:"Eş {number}",spouseHint:"Birden fazla mevcut kişi seçilebilir.",addSpouse:"＋ Yeni eş ekle",newSpouse:"Yeni eş",remove:"Kaldır",spouseStatus:"Eş durumu",contributor:"Adınız (katkıda bulunan)",send:"Katkıyı gönder",requiredPerson:"Her yeni kişi için en az ad veya soyad girin.",sending:"Gönderiliyor…",success:"✅ Katkı alındı. Yalnızca onaylandıktan sonra işlenecektir.",error:"Hata"}
})};
let currentLanguage='fr';
function t(key){return translations[currentLanguage][key]||translations.fr[key]||key}
function applyLanguage(language){currentLanguage=translations[language]?language:'fr';document.documentElement.lang=currentLanguage;document.documentElement.dir=currentLanguage==='ar'?'rtl':'ltr';document.title=t('title');document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n)});document.querySelectorAll('[data-i18n-number]').forEach(node=>{node.textContent=t('spouseNumber').replace('{number}',node.dataset.i18nNumber)});document.getElementById('language-select').value=currentLanguage}
document.getElementById('language-select').addEventListener('change',event=>applyLanguage(event.target.value));
const temporaryId=(prefix)=>prefix+'-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));
function toggleNewPerson(role,value){document.getElementById('new-'+role).hidden=value!=='__new__'}
function readNewPerson(block,sourceId){const person={source_id:sourceId};block.querySelectorAll('[data-field]').forEach(input=>person[input.dataset.field]=input.value.trim());if(!person.prenom&&!person.nom)throw new Error(t('requiredPerson'));return person}
const spouseOptions=${JSON.stringify(all)};
function renumberSpouses(){document.querySelectorAll('#spouse-selectors .spouse-row').forEach((row,index)=>{row.querySelector('[data-i18n-number]').dataset.i18nNumber=String(index+1)});applyLanguage(currentLanguage)}
function addSpouseSelector(){const row=document.createElement('div');row.className='spouse-row';row.innerHTML='<label><span data-i18n-number></span><select name="conjoint_ids">'+spouseOptions+'</select></label><button class="remove" type="button" data-i18n="remove"></button><div class="spouse-new-person"></div>';row.querySelector('select').onchange=event=>spouseSelectionChanged(event.target);row.querySelector('.remove').onclick=()=>{row.remove();renumberSpouses()};document.getElementById('spouse-selectors').appendChild(row);renumberSpouses()}
function spouseSelectionChanged(select){const target=select.closest('.spouse-row').querySelector('.spouse-new-person');target.innerHTML='';if(select.value==='__new__'){const block=document.createElement('div');block.className='new-person';block.dataset.sourceId=temporaryId('spouse');block.innerHTML='<b data-i18n="newSpouse"></b><div class="grid"><label><span data-i18n="prenom"></span><input data-field="prenom"></label><label><span data-i18n="nom"></span><input data-field="nom"></label><label><span data-i18n="sexe"></span><select data-field="sexe"><option value="Homme" data-i18n="male"></option><option value="Femme" data-i18n="female"></option></select></label></div>';target.appendChild(block);applyLanguage(currentLanguage)}}
document.getElementById('family-form').addEventListener('submit',async(e)=>{e.preventDefault();const f=new FormData(e.target),member={source_id:temporaryId('member')},newMembers=[];for(const [k,v] of f.entries()){if(k!=='conjoint_ids'&&k!=='contributor'&&k!=='pere_id'&&k!=='mere_id')member[k]=v}const father=f.get('pere_id');if(father==='__new__'){const id=temporaryId('father');newMembers.push(readNewPerson(document.getElementById('new-father'),id));member.pere_id=id}else if(father)member.pere_id=father;const mother=f.get('mere_id');if(mother==='__new__'){const id=temporaryId('mother');newMembers.push(readNewPerson(document.getElementById('new-mother'),id));member.mere_id=id}else if(mother)member.mere_id=mother;member.conjoint_ids=[];document.querySelectorAll('#spouse-selectors .spouse-row').forEach(row=>{const select=row.querySelector('select[name="conjoint_ids"]');if(select.value==='__new__'){const block=row.querySelector('.new-person');newMembers.push(readNewPerson(block,block.dataset.sourceId));member.conjoint_ids.push(block.dataset.sourceId)}else if(select.value)member.conjoint_ids.push(select.value)});member.est_decede=member.statut_vital==='decede'?1:0;delete member.statut_vital;const out=document.getElementById('result');out.textContent=t('sending');try{const r=await fetch(location.pathname+'/contributions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contributor:f.get('contributor')||'',payload:{members:[member,...newMembers]}})});const data=await r.json();if(!r.ok)throw new Error(data.error||t('error'));e.target.hidden=true;out.textContent=t('success')}catch(err){out.textContent='❌ '+err.message}});
applyLanguage('fr');
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
