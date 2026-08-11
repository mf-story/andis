// ===== Pembaca artikel (by ?slug=) =====
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const fmtDate = (s) => { const d = new Date(s); return isNaN(d) ? esc(s || "") : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

  document.getElementById("year").textContent = new Date().getFullYear();
  const root = document.getElementById("readerRoot");
  const slug = new URLSearchParams(location.search).get("slug");

  const progress = document.getElementById("scrollProgress");
  window.addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  });

  if (!slug) {
    root.innerHTML = `<div class="empty-note">Tulisan tidak ditemukan.</div>`;
    return;
  }

  Promise.all([
    fetch("/api/article?slug=" + encodeURIComponent(slug), { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
    fetch("/api/content", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
  ]).then(([a, content]) => {
    if (!a || a.ok === false) {
      root.innerHTML = `<div class="empty-note">Tulisan tidak ditemukan.</div>`;
      return;
    }
    document.title = a.title + " — Prof. Dr. H. Andi Sukri Syamsuri";
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", a.excerpt || a.title);

    const brand = (content && content.brand) || {};
    const authorName = "Prof. Dr. H. Andi Sukri Syamsuri, S.Pd., M.Hum.";
    const photo = (content && content.hero && content.hero.avatarImage) || "";
    const badge = photo ? `<img src="${esc(photo)}" alt="">` : esc(brand.badge || "AS");
    const cover = a.cover ? `<div class="reader-cover reveal visible"><img src="${esc(a.cover)}" alt="${esc(a.title)}"></div>` : "";

    root.innerHTML = `
      <div class="reader-head">
        <span class="reader-cat">${esc(a.category || "Tulisan")}</span>
        <h1>${esc(a.title)}</h1>
        <div class="reader-meta">
          <span>${fmtDate(a.date)}</span> · <span>${Number(a.readMinutes) || 1} menit baca</span>
        </div>
      </div>
      ${cover}
      <div class="prose">${a.bodyHtml || ""}</div>
      <div class="reader-footer">
        <div class="byline">
          <span class="badge">${badge}</span>
          <span class="who"><b>${esc(authorName)}</b><span>Guru Besar Ilmu Linguistik</span></span>
        </div>
      </div>`;
  }).catch(() => {
    root.innerHTML = `<div class="empty-note">Gagal memuat tulisan.</div>`;
  });
})();
