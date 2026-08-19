// ===== Panel Admin: konten profil + tulisan =====
const TOKEN_KEY = "as_admin_token";
const $ = (s, r = document) => r.querySelector(s);
const token = () => sessionStorage.getItem(TOKEN_KEY);

let CONTENT = null;
let ARTICLES = [];

// ---------- API ----------
async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (token()) headers["Authorization"] = "Bearer " + token();
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const r = await fetch(path, { ...opts, headers });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  if (r.status === 401) { logout(); throw new Error("Sesi berakhir, silakan masuk kembali."); }
  if (!r.ok) throw new Error((data && data.error) || "Terjadi kesalahan");
  return data;
}

function toast(msg, kind = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show " + kind;
  setTimeout(() => (t.className = "toast"), 2600);
}

// ---------- Elements ----------
function el(tag, props = {}, kids = []) {
  const n = document.createElement(tag);
  for (const k in props) {
    if (k === "class") n.className = props[k];
    else if (k === "html") n.innerHTML = props[k];
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), props[k]);
    else if (props[k] != null) n.setAttribute(k, props[k]);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach((c) => {
    if (c == null) return;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
}
function fld(label, control) {
  return el("div", { class: "fld" }, [el("label", {}, label), ...(Array.isArray(control) ? control : [control])]);
}

// ---------- Rich text ----------
function buildRichTools(editor) {
  const cmd = (c, v = null) => (e) => { e.preventDefault(); editor.focus(); document.execCommand(c, false, v); };
  const mk = (label, title, handler) => el("button", { type: "button", title, onclick: handler, html: label });
  return el("div", { class: "rich-tools" }, [
    mk("<b>B</b>", "Tebal", cmd("bold")),
    mk("<i>I</i>", "Miring", cmd("italic")),
    mk("H2", "Sub-judul", cmd("formatBlock", "H2")),
    mk("H3", "Sub-sub-judul", cmd("formatBlock", "H3")),
    mk("¶", "Paragraf", cmd("formatBlock", "P")),
    mk("❝", "Kutipan", cmd("formatBlock", "BLOCKQUOTE")),
    mk("•", "Daftar", cmd("insertUnorderedList")),
    mk("1.", "Daftar angka", cmd("insertOrderedList")),
    mk("🔗", "Tautan", (e) => { e.preventDefault(); const u = prompt("URL tautan:"); if (u) { editor.focus(); document.execCommand("createLink", false, u); } }),
    mk("✕", "Bersihkan format", cmd("removeFormat")),
  ]);
}
function richField(label, value, tall) {
  const editor = el("div", { class: "rich" + (tall ? " tall" : ""), contenteditable: "true", html: value || "" });
  const tools = buildRichTools(editor);
  return { el: el("div", { class: "fld" }, [el("label", {}, label), tools, editor]), get: () => editor.innerHTML.trim() };
}

// ---------- Photo upload ----------
async function uploadImage(file) {
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const r = await api("/api/upload", { method: "POST", body: JSON.stringify({ dataUrl }) });
  return r.path;
}
function photoField(label, value) {
  let current = value || "";
  const prev = el("img", { class: "photo-preview", src: current || "", alt: "", style: current ? "" : "display:none" });
  const file = el("input", { type: "file", accept: "image/*" });
  const clear = el("button", { type: "button", class: "btn btn-ghost btn-sm", style: "margin-top:6px", onclick: () => { current = ""; prev.style.display = "none"; prev.src = ""; }, html: "Hapus Foto" });
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    try { toast("Mengunggah…"); current = await uploadImage(f); prev.src = current; prev.style.display = ""; toast("Foto terunggah"); }
    catch (e) { toast(e.message, "err"); }
  });
  const body = el("div", {}, [file, el("div", { class: "hint", html: "Maks 10MB. Kosongkan untuk memakai inisial." }), clear]);
  return { el: el("div", { class: "fld" }, [el("label", {}, label), el("div", { class: "photo-field" }, [prev, body])]), get: () => current };
}

// ---------- Schema ----------
const HREF_OPTS = [
  { v: "tulisan.html", t: "Halaman Tulisan" },
  { v: "#about", t: "Tentang" },
  { v: "#experience", t: "Perjalanan" },
  { v: "#education", t: "Pendidikan" },
  { v: "#works", t: "Karya" },
  { v: "#writings", t: "Tulisan (beranda)" },
  { v: "#contact", t: "Kontak" },
];

const SCHEMA = [
  { key: "meta", title: "Meta & SEO", desc: "Judul tab dan deskripsi mesin pencari.", fields: [
    { key: "title", type: "text", label: "Judul Halaman" },
    { key: "description", type: "textarea", label: "Deskripsi (SEO)" },
  ]},
  { key: "brand", title: "Identitas", desc: "Nama singkat di navbar.", fields: [
    { key: "badge", type: "text", label: "Inisial (badge)" },
    { key: "name", type: "text", label: "Nama" },
    { key: "credential", type: "text", label: "Gelar / keterangan" },
  ]},
  { key: "hero", title: "Hero (Pembuka)", desc: "Bagian paling atas halaman.", fields: [
    { key: "kicker", type: "text", label: "Teks kecil di atas nama" },
    { key: "nameHtml", type: "rich", label: "Nama besar (boleh format)" },
    { key: "roles", type: "list-text", label: "Peran (teks berganti otomatis)" },
    { key: "desc", type: "rich", label: "Deskripsi pembuka" },
    { key: "btnPrimary", type: "text", label: "Tombol utama (teks)" },
    { key: "btnPrimaryHref", type: "select", label: "Tombol utama menuju", options: HREF_OPTS },
    { key: "btnGhost", type: "text", label: "Tombol kedua (teks)" },
    { key: "btnGhostHref", type: "select", label: "Tombol kedua menuju", options: HREF_OPTS },
    { key: "avatarImage", type: "photo", label: "Foto Profil" },
    { key: "quote", type: "text", label: "Kutipan di bawah foto", def: "Bahasa adalah cermin peradaban." },
    { key: "stats", type: "list", label: "Statistik", item: [
      { key: "count", type: "number", label: "Angka" },
      { key: "label", type: "text", label: "Label" },
    ]},
  ]},
  { key: "about", title: "Tentang", desc: "", fields: [
    { key: "tag", type: "text", label: "Nomor / tag section" },
    { key: "headingHtml", type: "rich", label: "Judul" },
    { key: "paragraphs", type: "list-rich", label: "Paragraf" },
    { key: "list", type: "list-text", label: "Daftar poin" },
    { key: "cards", type: "list", label: "Kartu ringkas", item: [
      { key: "icon", type: "text", label: "Ikon (emoji)" },
      { key: "title", type: "text", label: "Judul" },
      { key: "text", type: "rich", label: "Teks" },
    ]},
  ]},
  { key: "experience", title: "Perjalanan / Jabatan", desc: "", fields: [
    { key: "tag", type: "text", label: "Tag section" },
    { key: "headingHtml", type: "rich", label: "Judul" },
    { key: "items", type: "list", label: "Riwayat", item: [
      { key: "date", type: "text", label: "Periode" },
      { key: "role", type: "text", label: "Jabatan" },
      { key: "org", type: "text", label: "Institusi" },
      { key: "desc", type: "rich", label: "Deskripsi" },
    ]},
  ]},
  { key: "education", title: "Pendidikan", desc: "", fields: [
    { key: "tag", type: "text", label: "Tag section" },
    { key: "headingHtml", type: "rich", label: "Judul" },
    { key: "items", type: "list", label: "Jenjang", item: [
      { key: "icon", type: "text", label: "Ikon (emoji)" },
      { key: "date", type: "text", label: "Jenjang / tahun" },
      { key: "degree", type: "text", label: "Gelar" },
      { key: "org", type: "text", label: "Program / institusi" },
      { key: "desc", type: "rich", label: "Deskripsi" },
    ]},
    { key: "focusTitle", type: "text", label: "Judul: Fokus Keilmuan" },
    { key: "focus", type: "list", label: "Fokus keilmuan", item: [
      { key: "icon", type: "text", label: "Ikon" },
      { key: "title", type: "text", label: "Judul" },
      { key: "desc", type: "rich", label: "Deskripsi" },
    ]},
  ]},
  { key: "works", title: "Karya Ilmiah", desc: "", fields: [
    { key: "tag", type: "text", label: "Tag section" },
    { key: "headingHtml", type: "rich", label: "Judul" },
    { key: "sub", type: "textarea", label: "Sub-judul" },
    { key: "scholarTitle", type: "text", label: "Judul: Rekam Jejak" },
    { key: "scholarStats", type: "list", label: "Statistik publikasi", item: [
      { key: "icon", type: "text", label: "Ikon" },
      { key: "value", type: "text", label: "Nilai" },
      { key: "label", type: "text", label: "Label" },
    ]},
    { key: "scholarUrl", type: "url", label: "URL Google Scholar" },
    { key: "scholarBtn", type: "text", label: "Teks tombol Scholar" },
    { key: "sintaUrl", type: "url", label: "URL SINTA" },
    { key: "sintaBtn", type: "text", label: "Teks tombol SINTA" },
    { key: "scopusUrl", type: "url", label: "URL Scopus" },
    { key: "scopusBtn", type: "text", label: "Teks tombol Scopus" },
    { key: "scopusTitle", type: "text", label: "Judul: Rekam Jejak Scopus" },
    { key: "scopusStats", type: "list", label: "Statistik Scopus (isi manual)", item: [
      { key: "icon", type: "text", label: "Ikon" },
      { key: "value", type: "text", label: "Nilai" },
      { key: "label", type: "text", label: "Label" },
    ]},
    { key: "worksListTitle", type: "text", label: "Judul: Daftar Karya Ilmiah" },
    { key: "researchTitle", type: "text", label: "Judul: Penelitian dan Pengabdian" },
    { key: "columns", type: "list", label: "Kolom Penelitian & Pengabdian", item: [
      { key: "icon", type: "text", label: "Ikon" },
      { key: "title", type: "text", label: "Judul kolom" },
      { key: "items", type: "list", label: "Daftar isi", item: [
        { key: "title", type: "text", label: "Judul" },
        { key: "meta", type: "text", label: "Keterangan" },
      ]},
    ]},
    { key: "kiprahTitle", type: "text", label: "Judul: Amanah dan Kiprah" },
    { key: "kiprahColumns", type: "list", label: "Kolom Amanah & Kiprah", item: [
      { key: "icon", type: "text", label: "Ikon" },
      { key: "title", type: "text", label: "Judul kolom" },
      { key: "items", type: "list", label: "Daftar isi", item: [
        { key: "title", type: "text", label: "Judul" },
        { key: "meta", type: "text", label: "Keterangan" },
      ]},
    ]},
  ]},
  { key: "writings", title: "Ruang Tulisan (judul section)", desc: "Teks pengantar section tulisan di beranda.", fields: [
    { key: "tag", type: "text", label: "Tag section" },
    { key: "headingHtml", type: "rich", label: "Judul" },
    { key: "sub", type: "textarea", label: "Sub-judul" },
    { key: "viewAll", type: "text", label: "Teks tombol 'lihat semua'" },
  ]},
  { key: "contact", title: "Kontak", desc: "", fields: [
    { key: "tag", type: "text", label: "Tag section" },
    { key: "headingHtml", type: "rich", label: "Judul" },
    { key: "sub", type: "textarea", label: "Sub-judul" },
    { key: "email", type: "text", label: "Email" },
    { key: "whatsappNumber", type: "text", label: "Nomor WhatsApp (mis. 62812…)" },
    { key: "location", type: "text", label: "Lokasi" },
    { key: "socials", type: "list", label: "Tautan sosial/akademik", item: [
      { key: "label", type: "text", label: "Nama" },
      { key: "text", type: "text", label: "Singkatan (badge)" },
      { key: "url", type: "url", label: "URL" },
    ]},
  ]},
  { key: "footer", title: "Footer", desc: "", fields: [
    { key: "__self", type: "text", label: "Teks footer" },
  ]},
];

// ---------- Field builders ----------
function buildField(field, value) {
  if (field.type === "rich") return richField(field.label, value);
  if (field.type === "photo") return photoField(field.label, value);
  if (field.type === "textarea") {
    const input = el("textarea", {}, value || "");
    return { el: fld(field.label, input), get: () => input.value };
  }
  if (field.type === "select") {
    const sel = el("select", {}, field.options.map((o) => el("option", { value: o.v, ...(o.v === value ? { selected: "" } : {}) }, o.t)));
    return { el: fld(field.label, sel), get: () => sel.value };
  }
  if (field.type === "list-text") return listTextField(field, value || []);
  if (field.type === "list-rich") return listRichField(field, value || []);
  if (field.type === "list") return listObjectField(field, value || []);
  // text / number / url
  const input = el("input", { type: field.type === "number" ? "number" : field.type === "url" ? "url" : "text", value: value == null ? (field.def || "") : value });
  return { el: fld(field.label, input), get: () => (field.type === "number" ? Number(input.value) || 0 : input.value) };
}

function listTextField(field, values) {
  const rows = el("div", { class: "list-items" });
  const addRow = (v = "") => {
    const input = el("input", { type: "text", value: v });
    const row = el("div", { class: "list-text-row" }, [input, el("button", { type: "button", class: "icon-btn", title: "Hapus", onclick: () => row.remove(), html: "✕" })]);
    row._get = () => input.value;
    rows.appendChild(row);
  };
  (values.length ? values : []).forEach(addRow);
  const add = el("button", { type: "button", class: "btn btn-ghost btn-sm add-btn", onclick: () => addRow(), html: "＋ Tambah" });
  return { el: el("div", { class: "fld" }, [el("label", {}, field.label), rows, add]), get: () => [...rows.children].map((r) => r._get()).filter((s) => s !== "") };
}

function listRichField(field, values) {
  const rows = el("div", { class: "list-items" });
  const addRow = (v = "") => {
    const editor = el("div", { class: "rich", contenteditable: "true", html: v || "" });
    const item = el("div", { class: "list-item" }, [
      el("div", { class: "li-head" }, [el("span", {}, "Paragraf"), el("button", { type: "button", class: "icon-btn", onclick: () => item.remove(), html: "✕" })]),
      buildRichTools(editor), editor,
    ]);
    item._get = () => editor.innerHTML.trim();
    rows.appendChild(item);
  };
  (values.length ? values : []).forEach(addRow);
  const add = el("button", { type: "button", class: "btn btn-ghost btn-sm add-btn", onclick: () => addRow(), html: "＋ Tambah" });
  return { el: el("div", { class: "fld" }, [el("label", {}, field.label), rows, add]), get: () => [...rows.children].map((r) => r._get()).filter((s) => s !== "") };
}

function listObjectField(field, values) {
  const rows = el("div", { class: "list-items" });
  const addRow = (obj = {}) => {
    const getters = [];
    const body = el("div", {});
    field.item.forEach((sub) => {
      const built = buildField(sub, obj[sub.key === "__self" ? undefined : sub.key]);
      getters.push({ key: sub.key, get: built.get });
      body.appendChild(built.el);
    });
    const item = el("div", { class: "list-item" }, [
      el("div", { class: "li-head" }, [el("span", {}, field.label + " item"), el("button", { type: "button", class: "icon-btn", title: "Hapus", onclick: () => item.remove(), html: "✕" })]),
      body,
    ]);
    item._get = () => { const o = {}; getters.forEach((g) => (o[g.key] = g.get())); return o; };
    rows.appendChild(item);
  };
  (values.length ? values : []).forEach(addRow);
  const add = el("button", { type: "button", class: "btn btn-ghost btn-sm add-btn", onclick: () => addRow(), html: "＋ Tambah item" });
  return { el: el("div", { class: "fld" }, [el("label", {}, field.label), rows, add]), get: () => [...rows.children].map((r) => r._get()) };
}

// ---------- Build content form ----------
let SECTION_GETTERS = [];
function renderContentForm() {
  const root = $("#contentForm");
  root.innerHTML = "";
  SECTION_GETTERS = [];
  SCHEMA.forEach((sec) => {
    const box = el("div", { class: "group" }, [el("h3", {}, sec.title), sec.desc ? el("p", { class: "group-desc" }, sec.desc) : null]);
    const secData = sec.key === "footer" ? { __self: CONTENT.footer } : (CONTENT[sec.key] || {});
    const getters = [];
    sec.fields.forEach((f) => {
      const built = buildField(f, secData[f.key === "__self" ? "__self" : f.key]);
      getters.push({ key: f.key, get: built.get });
      box.appendChild(built.el);
    });
    SECTION_GETTERS.push({ key: sec.key, getters });
    root.appendChild(box);
  });
}

function collectContent() {
  // Mulai dari salinan konten yang ada agar field non-editor (mis. works.publications) tidak hilang.
  const out = CONTENT ? JSON.parse(JSON.stringify(CONTENT)) : {};
  SECTION_GETTERS.forEach((sec) => {
    if (sec.key === "footer") { out.footer = sec.getters[0].get(); return; }
    out[sec.key] = out[sec.key] || {};
    sec.getters.forEach((g) => (out[sec.key][g.key] = g.get()));
  });
  return out;
}

async function saveContent() {
  try {
    const data = collectContent();
    await api("/api/content", { method: "POST", body: JSON.stringify(data) });
    CONTENT = data;
    applySideBadge();
    toast("Profil tersimpan ✓");
  } catch (e) { toast(e.message, "err"); }
}

// ---------- Articles ----------
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function fmtDate(s) { const d = new Date(s); return isNaN(d) ? (s || "") : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

async function loadArticles() {
  ARTICLES = await api("/api/articles");
  renderArtList();
}
function renderArtList() {
  const box = $("#artList");
  if (!ARTICLES.length) { box.innerHTML = `<div class="group" style="text-align:center;color:var(--ink-soft)">Belum ada tulisan. Klik “Tulisan Baru”.</div>`; return; }
  box.innerHTML = "";
  ARTICLES.forEach((a) => {
    const thumb = a.cover ? el("img", { class: "art-thumb", src: a.cover, alt: "" }) : el("div", { class: "art-thumb" }, "“ ”");
    const row = el("div", { class: "art-row" }, [
      thumb,
      el("div", { class: "art-info" }, [
        el("b", {}, a.title),
        el("span", { html: `${a.category || "—"} · ${fmtDate(a.date)} · ${a.readMinutes || 1} mnt ` }),
        el("span", { class: "badge-pill " + (a.published === false ? "draft" : "pub"), html: a.published === false ? "Draf" : "Terbit" }),
      ]),
      el("div", { class: "art-actions" }, [
        el("a", { class: "btn btn-ghost btn-sm", href: "artikel.html?slug=" + encodeURIComponent(a.slug), target: "_blank", html: "Lihat" }),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openArticle(a), html: "Edit" }),
        el("button", { class: "btn btn-danger btn-sm", onclick: () => delArticle(a), html: "Hapus" }),
      ]),
    ]);
    box.appendChild(row);
  });
}

const artModal = () => $("#artModal");
function openArticle(a) {
  a = a || {};
  $("#artModalTitle").textContent = a.id ? "Edit Tulisan" : "Tulisan Baru";
  $("#artId").value = a.id || "";
  $("#artTitle").value = a.title || "";
  $("#artCategory").value = a.category || "Opini";
  $("#artDate").value = a.date || new Date().toISOString().slice(0, 10);
  $("#artExcerpt").value = a.excerpt || "";
  $("#artCover").value = a.cover || "";
  const prev = $("#artCoverPrev");
  if (a.cover) { prev.src = a.cover; prev.style.display = ""; } else { prev.src = ""; prev.style.display = "none"; }
  $("#artBody").innerHTML = a.bodyHtml || "";
  $("#artPublished").checked = a.published !== false;
  artModal().classList.add("open");
}
function closeArticle() { artModal().classList.remove("open"); }

async function saveArticle() {
  const payload = {
    id: $("#artId").value || undefined,
    title: $("#artTitle").value.trim(),
    category: $("#artCategory").value.trim() || "Opini",
    date: $("#artDate").value.trim(),
    excerpt: $("#artExcerpt").value.trim(),
    cover: $("#artCover").value,
    bodyHtml: $("#artBody").innerHTML.trim(),
    published: $("#artPublished").checked,
  };
  if (!payload.title) { toast("Judul wajib diisi", "err"); return; }
  try {
    await api("/api/article", { method: "POST", body: JSON.stringify(payload) });
    closeArticle();
    await loadArticles();
    toast("Tulisan tersimpan ✓");
  } catch (e) { toast(e.message, "err"); }
}
async function delArticle(a) {
  if (!confirm(`Hapus tulisan "${a.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
  try { await api("/api/article/delete", { method: "POST", body: JSON.stringify({ id: a.id }) }); await loadArticles(); toast("Tulisan dihapus"); }
  catch (e) { toast(e.message, "err"); }
}

// ---------- Scholar & password ----------
async function syncScholar() {
  try {
    toast("Menghubungi Google Scholar…");
    const d = await api("/api/scholar");
    CONTENT = await api("/api/content");
    renderContentForm();
    toast(`Scholar tersimpan: ${d.count} publikasi, ${d.citations} sitasi, h-index ${d.hindex}.`, "ok");
  } catch (e) { toast(e.message, "err"); }
}
async function changePassword() {
  const cur = $("#curPass").value, nw = $("#newPass").value, nw2 = $("#newPass2").value;
  if (nw.length < 6) { toast("Password baru minimal 6 karakter", "err"); return; }
  if (nw !== nw2) { toast("Konfirmasi password tidak cocok", "err"); return; }
  try {
    await api("/api/password", { method: "POST", body: JSON.stringify({ currentPassword: cur, newPassword: nw }) });
    $("#curPass").value = $("#newPass").value = $("#newPass2").value = "";
    toast("Password diperbarui ✓");
  } catch (e) { toast(e.message, "err"); }
}

// ---------- Auth & init ----------
async function enterDashboard() {
  $("#loginView").hidden = true;
  $("#dashView").hidden = false;
  try {
    CONTENT = await api("/api/content");
    renderContentForm();
    applySideBadge();
    await loadArticles();
    // build body toolbar once
    if (!$("#artBodyTools").children.length) $("#artBodyTools").appendChild(buildRichTools($("#artBody")));
  } catch (e) { toast(e.message, "err"); }
}
function applySideBadge() {
  const photo = CONTENT && CONTENT.hero && CONTENT.hero.avatarImage;
  const badge = $("#sideBadge");
  if (photo) badge.innerHTML = `<img src="${photo}" alt="">`;
  else if (CONTENT && CONTENT.brand) badge.textContent = CONTENT.brand.badge || "AS";
  const nameEl = $("#sideName");
  if (nameEl && CONTENT && CONTENT.brand && CONTENT.brand.name) nameEl.textContent = CONTENT.brand.name;
}
function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  $("#dashView").hidden = true;
  $("#loginView").hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#loginNote"); note.textContent = "";
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("#password").value }) });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || "Gagal masuk");
      sessionStorage.setItem(TOKEN_KEY, d.token);
      $("#password").value = "";
      enterDashboard();
    } catch (err) { note.textContent = err.message; }
  });

  $("#logoutBtn").addEventListener("click", logout);
  $("#saveContentBtn").addEventListener("click", saveContent);
  $("#scholarBtn").addEventListener("click", syncScholar);
  $("#changePassBtn").addEventListener("click", changePassword);

  $("#newArticleBtn").addEventListener("click", () => openArticle({}));
  $("#artClose").addEventListener("click", closeArticle);
  $("#artCancel").addEventListener("click", closeArticle);
  $("#artSave").addEventListener("click", saveArticle);
  $("#artModal").addEventListener("click", (e) => { if (e.target === $("#artModal")) closeArticle(); });
  $("#artCoverClear").addEventListener("click", () => { $("#artCover").value = ""; const p = $("#artCoverPrev"); p.src = ""; p.style.display = "none"; });
  $("#artCoverFile").addEventListener("change", async () => {
    const f = $("#artCoverFile").files[0]; if (!f) return;
    try { toast("Mengunggah sampul…"); const p = await uploadImage(f); $("#artCover").value = p; const prev = $("#artCoverPrev"); prev.src = p; prev.style.display = ""; toast("Sampul terunggah"); }
    catch (e) { toast(e.message, "err"); }
  });

  $("#sideNav").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    $("#sideNav").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + b.dataset.panel));
  }));

  if (token()) enterDashboard();
});
