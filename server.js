// ===== Server Profil & Media Tulisan (Node.js bawaan, tanpa dependensi) =====
// Menyajikan file statis + API untuk halaman admin: login, konten profil,
// artikel/tulisan, unggah gambar, ganti password, dan sinkron Google Scholar.
// Jalankan: node server.js   (atau lewat "Jalankan Server.bat")

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 5533;
const ROOT = __dirname;
// SEED_DIR = data bawaan yang di-commit (benih awal).
// DATA_DIR / UPLOADS_DIR bisa diarahkan ke Volume Railway lewat variabel lingkungan
// agar konten & foto tetap tersimpan setiap kali deploy ulang.
const SEED_DIR = path.join(ROOT, "data");
const DATA_DIR = process.env.DATA_DIR || SEED_DIR;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT, "uploads");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const CONFIG_FILE = path.join(DATA_DIR, "admin.config.json");

// Inisialisasi penyimpanan (dibungkus try/catch agar aplikasi tidak crash bila
// ada kendala izin/berkas di lingkungan hosting).
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  // Bila memakai penyimpanan eksternal (Volume) yang masih kosong, salin data benih.
  if (DATA_DIR !== SEED_DIR) {
    for (const f of ["content.json", "articles.json"]) {
      const dst = path.join(DATA_DIR, f);
      const src = path.join(SEED_DIR, f);
      if (!fs.existsSync(dst) && fs.existsSync(src)) {
        try { fs.copyFileSync(src, dst); } catch (e) {}
      }
    }
  }
  // Pindahkan konfigurasi lama (admin.config.json di root) ke DATA_DIR bila ada.
  const OLD_CONFIG = path.join(ROOT, "admin.config.json");
  if (!fs.existsSync(CONFIG_FILE) && fs.existsSync(OLD_CONFIG)) {
    try { fs.copyFileSync(OLD_CONFIG, CONFIG_FILE); } catch (e) {}
  }
  // Seed berkas gambar bawaan (mis. foto profil) ke Volume bila memakai penyimpanan eksternal.
  const SEED_UPLOADS = path.join(ROOT, "uploads");
  if (UPLOADS_DIR !== SEED_UPLOADS && fs.existsSync(SEED_UPLOADS)) {
    for (const f of fs.readdirSync(SEED_UPLOADS)) {
      try {
        const src = path.join(SEED_UPLOADS, f);
        const dst = path.join(UPLOADS_DIR, f);
        if (fs.statSync(src).isFile() && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
      } catch (e) {}
    }
  }
} catch (e) {
  console.error("  [Init] Peringatan penyiapan penyimpanan:", e.message);
}

// ---- Konfigurasi admin (password) ----
// Password default: admin123  -> WAJIB diganti lewat halaman admin.
function makeHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {}
  const salt = crypto.randomBytes(16).toString("hex");
  const cfg = { salt, hash: makeHash("admin123", salt) };
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); } catch (e) {}
  return cfg;
}
let config = loadConfig();

function verifyPassword(password) {
  const candidate = makeHash(String(password || ""), config.salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(config.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function setPassword(newPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  config = { salt, hash: makeHash(String(newPassword), salt) };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ---- Token sesi (di memori) ----
const tokens = new Map(); // token -> expiry (ms)
const TOKEN_TTL = 8 * 60 * 60 * 1000; // 8 jam
function issueToken() {
  const t = crypto.randomBytes(24).toString("hex");
  tokens.set(t, Date.now() + TOKEN_TTL);
  return t;
}
function validToken(req) {
  const auth = req.headers["authorization"] || "";
  const t = auth.replace(/^Bearer\s+/i, "").trim();
  if (!t || !tokens.has(t)) return false;
  if (Date.now() > tokens.get(t)) {
    tokens.delete(t);
    return false;
  }
  return true;
}

// ---- Util ----
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Payload terlalu besar"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || ("tulisan-" + Date.now());
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  // Cegah path traversal
  const safePath = path
    .normalize(urlPath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  // Sajikan folder "uploads" dari UPLOADS_DIR (bisa berupa Volume)
  let baseDir = ROOT;
  let rel = safePath;
  if (safePath === "uploads" || safePath.startsWith("uploads/") || safePath.startsWith("uploads\\")) {
    baseDir = UPLOADS_DIR;
    rel = safePath.replace(/^uploads[/\\]?/, "");
  }
  const filePath = path.join(baseDir, rel);
  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  // Jangan sajikan file konfigurasi rahasia
  if (path.basename(filePath) === "admin.config.json") {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ---- Google Scholar (opsional) ----
// Ambil satu halaman (HTML) daftar publikasi mulai dari indeks cstart.
function fetchScholarPage(scholarUrl, cstart) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(scholarUrl);
    } catch (e) {
      return reject(new Error("URL Google Scholar tidak valid"));
    }
    u.searchParams.set("cstart", String(cstart || 0));
    u.searchParams.set("pagesize", "100");
    const opts = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "id,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    };
    https
      .get(u, opts, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          r.resume();
          return fetchScholarPage(r.headers.location, cstart).then(resolve, reject);
        }
        if (r.statusCode !== 200) {
          r.resume();
          return reject(
            new Error("Google Scholar menolak permintaan (kode " + r.statusCode + ")")
          );
        }
        let html = "";
        r.setEncoding("utf8");
        r.on("data", (c) => (html += c));
        r.on("end", () => resolve(html));
      })
      .on("error", (e) => reject(new Error("Gagal menghubungi Google Scholar: " + e.message)));
  });
}

// Ambil statistik + seluruh daftar publikasi (menyusuri semua halaman).
async function fetchScholar(scholarUrl) {
  let header = null;
  let all = [];
  for (let cstart = 0; cstart <= 900; cstart += 100) {
    const html = await fetchScholarPage(scholarUrl, cstart);
    const parsed = parseScholar(html);
    if (header === null) header = { citations: parsed.citations, hindex: parsed.hindex, i10: parsed.i10 };
    all = all.concat(parsed.publications);
    if (parsed.publications.length < 100) break;
  }
  return { ...(header || { citations: 0, hindex: 0, i10: 0 }), count: all.length, publications: all };
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ");
}

function parseScholar(html) {
  const nums = [...html.matchAll(/gsc_rsb_std[^>]*>([\d,]+)</g)].map((m) =>
    Number(m[1].replace(/,/g, ""))
  );
  if (!nums.length)
    throw new Error(
      "Tidak dapat membaca data Scholar (mungkin diblokir sementara). Coba lagi nanti."
    );
  const citations = nums[0] || 0;
  const hindex = nums[2] || 0;
  const i10 = nums[4] || 0;
  const publications = [];
  // Hanya baris tabel publikasi sungguhan (hindari selektor CSS yang memakai nama kelas serupa).
  const rowRe = /<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(html))) {
    const row = m[1];
    const title = (/class="gsc_a_at"[^>]*>([^<]+)</.exec(row) || [])[1];
    if (!title) continue;
    const grays = [...row.matchAll(/class="gs_gray"[^>]*>([^<]*)</g)].map((x) => x[1].trim());
    const year = (/class="gsc_a_h[^"]*"[^>]*>\s*(\d{4})/.exec(row) || [])[1] || "";
    const cites = (/class="gsc_a_ac[^"]*"[^>]*>\s*(\d+)/.exec(row) || [])[1] || "";
    publications.push({
      title: decodeEntities(title),
      authors: decodeEntities(grays[0] || ""),
      venue: decodeEntities(grays[1] || ""),
      year,
      cites,
    });
  }
  return { citations, hindex, i10, count: publications.length, publications };
}


const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  const query = new URLSearchParams((req.url.split("?")[1] || ""));

  // ---- API: login ----
  if (url === "/api/login" && req.method === "POST") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (verifyPassword(body.password)) {
        return sendJson(res, 200, { ok: true, token: issueToken() });
      }
      return sendJson(res, 401, { ok: false, error: "Password salah" });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Permintaan tidak valid" });
    }
  }

  // ---- API: konten profil ----
  if (url === "/api/content" && req.method === "GET") {
    const data = fs.readFileSync(CONTENT_FILE, "utf8");
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return res.end(data);
  }
  if (url === "/api/content" && req.method === "POST") {
    if (!validToken(req)) return sendJson(res, 401, { ok: false, error: "Tidak diizinkan" });
    try {
      const parsed = JSON.parse((await readBody(req)) || "");
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(parsed, null, 2));
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Data JSON tidak valid: " + e.message });
    }
  }

  // ---- API: daftar artikel ----
  if (url === "/api/articles" && req.method === "GET") {
    const all = readJsonFile(ARTICLES_FILE, []);
    const isAdmin = validToken(req);
    const list = isAdmin ? all : all.filter((a) => a && a.published !== false);
    // Untuk daftar publik, jangan kirim body penuh agar ringan.
    const wantFull = query.get("full") === "1";
    const out = list
      .map((a) => (wantFull || isAdmin ? a : stripBody(a)))
      .sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")));
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(out));
  }

  // ---- API: satu artikel by slug ----
  if (url === "/api/article" && req.method === "GET") {
    const slug = query.get("slug");
    const all = readJsonFile(ARTICLES_FILE, []);
    const found = all.find((a) => a && a.slug === slug);
    if (!found) return sendJson(res, 404, { ok: false, error: "Tulisan tidak ditemukan" });
    if (found.published === false && !validToken(req))
      return sendJson(res, 404, { ok: false, error: "Tulisan tidak ditemukan" });
    return sendJson(res, 200, found);
  }

  // ---- API: simpan/buat artikel ----
  if (url === "/api/article" && req.method === "POST") {
    if (!validToken(req)) return sendJson(res, 401, { ok: false, error: "Tidak diizinkan" });
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const all = readJsonFile(ARTICLES_FILE, []);
      const now = new Date().toISOString();
      let art = all.find((a) => a && a.id === body.id);
      if (!art) {
        art = { id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: now };
        all.push(art);
      }
      art.title = String(body.title || "Tanpa Judul");
      art.slug = ensureUniqueSlug(all, art, body.slug || body.title);
      art.category = String(body.category || "Opini");
      art.excerpt = String(body.excerpt || "");
      art.cover = String(body.cover || "");
      art.bodyHtml = String(body.bodyHtml || "");
      art.date = String(body.date || art.date || now.slice(0, 10));
      art.readMinutes = estimateReadMinutes(body.bodyHtml || "");
      art.published = body.published !== false;
      art.updatedAt = now;
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(all, null, 2));
      return sendJson(res, 200, { ok: true, article: art });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Gagal menyimpan: " + e.message });
    }
  }

  // ---- API: hapus artikel ----
  if (url === "/api/article/delete" && req.method === "POST") {
    if (!validToken(req)) return sendJson(res, 401, { ok: false, error: "Tidak diizinkan" });
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      let all = readJsonFile(ARTICLES_FILE, []);
      const before = all.length;
      all = all.filter((a) => a && a.id !== body.id);
      if (all.length === before) return sendJson(res, 404, { ok: false, error: "Tulisan tidak ditemukan" });
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(all, null, 2));
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Gagal menghapus: " + e.message });
    }
  }

  // ---- API: ganti password ----
  if (url === "/api/password" && req.method === "POST") {
    if (!validToken(req)) return sendJson(res, 401, { ok: false, error: "Tidak diizinkan" });
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (!body.newPassword || String(body.newPassword).length < 6)
        return sendJson(res, 400, { ok: false, error: "Password baru minimal 6 karakter" });
      if (!verifyPassword(body.currentPassword))
        return sendJson(res, 401, { ok: false, error: "Password lama salah" });
      setPassword(body.newPassword);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Permintaan tidak valid" });
    }
  }

  // ---- API: unggah gambar ----
  if (url === "/api/upload" && req.method === "POST") {
    if (!validToken(req)) return sendJson(res, 401, { ok: false, error: "Tidak diizinkan" });
    try {
      const body = JSON.parse((await readBody(req, 14 * 1024 * 1024)) || "{}");
      const m = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i.exec(String(body.dataUrl || ""));
      if (!m) return sendJson(res, 400, { ok: false, error: "Format gambar tidak didukung" });
      const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 10 * 1024 * 1024)
        return sendJson(res, 400, { ok: false, error: "Ukuran gambar maksimal 10MB" });
      const dir = UPLOADS_DIR;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const fname = "img-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex") + "." + ext;
      fs.writeFileSync(path.join(dir, fname), buf);
      return sendJson(res, 200, { ok: true, path: "uploads/" + fname });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Gagal mengunggah: " + e.message });
    }
  }

  // ---- API: sinkron Google Scholar ----
  if (url === "/api/scholar" && req.method === "GET") {
    if (!validToken(req)) return sendJson(res, 401, { ok: false, error: "Tidak diizinkan" });
    try {
      const data = readJsonFile(CONTENT_FILE, {});
      const scholarUrl = (data.works && data.works.scholarUrl) || "";
      if (!scholarUrl) return sendJson(res, 400, { ok: false, error: "URL Google Scholar belum diisi" });
      const result = await fetchScholar(scholarUrl);
      // Tulis hasil ke content.json (works.scholarStats: publikasi, sitasi, h-index)
      const ss = (data.works && data.works.scholarStats) || [];
      if (ss[0]) ss[0].value = String(result.count);
      if (ss[1]) ss[1].value = String(result.citations);
      if (ss[2]) ss[2].value = String(result.hindex);
      // Selaraskan juga statistik hero (publikasi/sitasi/h-index)
      const hs = (data.hero && data.hero.stats) || [];
      if (hs[0]) hs[0].count = result.count;
      if (hs[1]) hs[1].count = result.citations;
      if (hs[2]) hs[2].count = result.hindex;
      // Simpan daftar publikasi (judul + keterangan) untuk ditampilkan di situs
      if (data.works) {
        data.works.publications = (result.publications || []).map((p) => {
          const bits = [p.venue, p.year].filter(Boolean).join(", ");
          const cite = p.cites ? " · " + p.cites + " sitasi" : "";
          return { title: p.title, meta: (bits + cite).trim() };
        });
      }
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2));
      return sendJson(res, 200, { ok: true, ...result });
    } catch (e) {
      return sendJson(res, 502, { ok: false, error: e.message });
    }
  }

  // ---- File statis ----
  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405);
  res.end("Method Not Allowed");
});

function stripBody(a) {
  const { bodyHtml, ...rest } = a;
  return rest;
}
function estimateReadMinutes(html) {
  const text = String(html).replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
function ensureUniqueSlug(all, self, source) {
  let base = slugify(source);
  let slug = base;
  let i = 2;
  while (all.some((a) => a && a !== self && a.slug === slug)) {
    slug = base + "-" + i++;
  }
  return slug;
}

function lanIps() {
  const nets = require("os").networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) ips.push(ni.address);
    }
  }
  return ips;
}

const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log("============================================================");
  console.log("  Server Profil Prof. Andi Sukri Syamsuri berjalan");
  console.log("============================================================");
  console.log(`  Website  : http://localhost:${PORT}`);
  console.log(`  Tulisan  : http://localhost:${PORT}/tulisan.html`);
  console.log(`  Admin    : http://localhost:${PORT}/admin.html`);
  lanIps().forEach((ip) =>
    console.log(`  Dari HP  : http://${ip}:${PORT}  (admin: /admin.html)`)
  );
  console.log("------------------------------------------------------------");
  console.log("  Password admin default: admin123 (ganti di halaman admin)");
  console.log("  Tekan Ctrl+C untuk berhenti.");
  console.log("============================================================");
});
