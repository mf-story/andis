// ===== Daftar tulisan: pencarian + filter kategori =====
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const fmtDate = (s) => { const d = new Date(s); return isNaN(d) ? esc(s || "") : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

  document.getElementById("year").textContent = new Date().getFullYear();

  const grid = document.getElementById("listGrid");
  const search = document.getElementById("searchInput");
  const catBox = document.getElementById("catFilters");
  let all = [], activeCat = "Semua", term = "";

  function card(a) {
    const cover = a.cover ? `<img src="${esc(a.cover)}" alt="${esc(a.title)}">` : `<span class="cover-mark">“ ”</span>`;
    return `
      <a class="article-card reveal visible" href="artikel.html?slug=${encodeURIComponent(a.slug)}">
        <div class="article-cover">${cover}</div>
        <div class="article-body">
          <span class="article-cat">${esc(a.category || "Tulisan")}</span>
          <h3>${esc(a.title)}</h3>
          <p class="article-excerpt">${esc(a.excerpt || "")}</p>
          <div class="article-meta">
            <span>${fmtDate(a.date)}</span><span class="dot"></span>
            <span>${Number(a.readMinutes) || 1} menit baca</span>
          </div>
        </div>
      </a>`;
  }

  function render() {
    let list = all.slice();
    if (activeCat !== "Semua") list = list.filter((a) => (a.category || "") === activeCat);
    if (term) {
      const t = term.toLowerCase();
      list = list.filter((a) => (a.title + " " + (a.excerpt || "") + " " + (a.category || "")).toLowerCase().includes(t));
    }
    grid.innerHTML = list.length
      ? list.map(card).join("")
      : `<div class="empty-note">Tidak ada tulisan yang cocok.</div>`;
  }

  function buildCats() {
    const cats = ["Semua", ...Array.from(new Set(all.map((a) => a.category).filter(Boolean)))];
    catBox.innerHTML = cats.map((c) => `<button class="cat-chip${c === activeCat ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    catBox.querySelectorAll(".cat-chip").forEach((b) => b.addEventListener("click", () => {
      activeCat = b.dataset.cat;
      catBox.querySelectorAll(".cat-chip").forEach((x) => x.classList.toggle("active", x === b));
      render();
    }));
  }

  search.addEventListener("input", () => { term = search.value.trim(); render(); });

  fetch("/api/articles", { cache: "no-store" })
    .then((r) => r.json())
    .then((list) => { all = Array.isArray(list) ? list : []; buildCats(); render(); })
    .catch(() => { grid.innerHTML = `<div class="empty-note">Gagal memuat tulisan.</div>`; });
})();
