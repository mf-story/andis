// ===== Homepage renderer + interactions =====
(function () {
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  function fmtDate(s) {
    const d = new Date(s);
    if (isNaN(d)) return esc(s || "");
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function initials(name) {
    return String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "AS";
  }

  let CONTENT = {};

  fetch("/api/content", { cache: "no-store" })
    .then((r) => r.json())
    .then((c) => {
      CONTENT = c || {};
      window.__CONTENT__ = CONTENT;
      applyMeta(CONTENT.meta);
      renderBrand(CONTENT.brand, (CONTENT.hero && CONTENT.hero.avatarImage) || "");
      renderHero(CONTENT.hero || {});
      renderAbout(CONTENT.about || {});
      renderExperience(CONTENT.experience || {});
      renderEducation(CONTENT.education || {});
      renderWorks(CONTENT.works || {});
      renderWritingsHead(CONTENT.writings || {});
      renderContact(CONTENT.contact || {});
      const ft = document.getElementById("footerText");
      if (ft && CONTENT.footer) ft.textContent = CONTENT.footer;
    })
    .catch(() => {})
    .finally(() => {
      loadArticles();
      initInteractions();
    });

  function applyMeta(m) {
    if (!m) return;
    if (m.title) document.title = m.title;
    const d = document.querySelector('meta[name="description"]');
    if (d && m.description) d.setAttribute("content", m.description);
  }

  function renderBrand(b, photo) {
    b = b || {};
    const badge = document.querySelector(".brand-badge");
    const name = document.querySelector(".brand-name");
    if (badge) {
      if (photo) {
        badge.classList.add("has-photo");
        badge.innerHTML = `<img alt="${esc(b.name)}" src="${esc(photo)}">`;
      } else badge.textContent = b.badge || "AS";
    }
    if (name) name.innerHTML = `${esc(b.name || "")}<small>${esc(b.credential || "")}</small>`;
    const navPhoto = document.getElementById("navPhotoImg");
    if (navPhoto && photo) navPhoto.src = photo;
  }

  function renderHero(h) {
    const text = document.querySelector(".hero-text");
    if (text) {
      text.innerHTML = `
        <span class="hero-kicker">${esc(h.kicker || "")}</span>
        <h1>${h.nameHtml || ""}</h1>
        <p class="hero-role" id="typewriter"></p>
        <div class="hero-desc">${h.desc || ""}</div>
        <div class="hero-actions">
          <a href="${esc(h.btnPrimaryHref || "tulisan.html")}" class="btn btn-primary">${esc(h.btnPrimary || "Baca Tulisan")}</a>
          <a href="${esc(h.btnGhostHref || "#about")}" class="btn btn-ghost">${esc(h.btnGhost || "Tentang Saya")}</a>
        </div>
        <div class="hero-stats">
          ${(h.stats || []).map((s) => `<div class="stat"><b data-count="${Number(s.count) || 0}">0</b><span>${esc(s.label)}</span></div>`).join("")}
        </div>`;
    }
    const visual = document.querySelector(".hero-visual");
    if (visual) {
      const img = h.avatarImage
        ? `<img src="${esc(h.avatarImage)}" alt="Foto Prof. Andi Sukri Syamsuri">`
        : `<span class="portrait-initials">${esc(initials((CONTENT.brand && CONTENT.brand.name) || "AS"))}</span>`;
      visual.innerHTML = `
        <div class="portrait-frame">${img}</div>
        <div class="hero-quote">“Bahasa adalah cermin peradaban.”</div>`;
    }
  }

  function sectionHead(tag, headingHtml, sub) {
    return `
      <span class="section-tag">${esc(tag)}</span>
      <h2>${headingHtml || ""}</h2>
      ${sub ? `<div class="section-sub">${sub}</div>` : ""}`;
  }

  function renderAbout(a) {
    const c = document.querySelector("#about .container");
    if (!c) return;
    c.innerHTML = `
      <div class="section-head reveal">${sectionHead(a.tag, a.headingHtml)}</div>
      <div class="about-grid">
        <div class="about-text reveal">
          ${(a.paragraphs || []).map((p) => `<p>${p}</p>`).join("")}
          <ul class="about-list">${(a.list || []).map((li) => `<li>${esc(li)}</li>`).join("")}</ul>
        </div>
        <div class="about-cards reveal">
          ${(a.cards || []).map((m) => `
            <div class="mini-card">
              <div class="mini-ico">${esc(m.icon)}</div>
              <h4>${esc(m.title)}</h4>
              <div>${m.text || ""}</div>
            </div>`).join("")}
        </div>
      </div>`;
  }

  function renderExperience(e) {
    const c = document.querySelector("#experience .container");
    if (!c) return;
    c.innerHTML = `
      <div class="section-head reveal">${sectionHead(e.tag, e.headingHtml)}</div>
      <div class="timeline">
        ${(e.items || []).map((it) => `
          <div class="tl-item reveal">
            <div class="tl-dot"></div>
            <div class="tl-card">
              <span class="tl-date">${esc(it.date)}</span>
              <h4>${esc(it.role)}</h4>
              <p class="tl-org">${esc(it.org)}</p>
              ${(it.desc && it.desc.replace(/<br\s*\/?>(\s|&nbsp;)*/gi, "").trim()) ? `<div class="tl-desc">${it.desc}</div>` : ""}
            </div>
          </div>`).join("")}
      </div>`;
  }

  function renderEducation(ed) {
    const c = document.querySelector("#education .container");
    if (!c) return;
    c.innerHTML = `
      <div class="section-head reveal">${sectionHead(ed.tag, ed.headingHtml)}</div>
      <div class="edu-grid">
        ${(ed.items || []).map((it) => `
          <div class="edu-card reveal">
            <div class="edu-ico">${esc(it.icon)}</div>
            <span class="edu-date">${esc(it.date)}</span>
            <h4>${esc(it.degree)}</h4>
            <p class="edu-org">${esc(it.org)}</p>
            <div>${it.desc || ""}</div>
          </div>`).join("")}
      </div>
      ${(ed.focus && ed.focus.length) ? `
      <h3 class="works-subhead reveal">${esc(ed.focusTitle || "Fokus Keilmuan")}</h3>
      <div class="focus-grid">
        ${ed.focus.map((f) => `
          <div class="focus-card reveal">
            <div class="focus-ico">${esc(f.icon)}</div>
            <h4>${esc(f.title)}</h4>
            <div>${f.desc || ""}</div>
          </div>`).join("")}
      </div>` : ""}`;
  }

  function renderWorks(w) {
    const c = document.querySelector("#works .container");
    if (!c) return;
    const scholarLinks = [];
    if (w.scholarUrl) scholarLinks.push(`<a class="btn btn-primary" href="${esc(w.scholarUrl)}" target="_blank" rel="noopener">${esc(w.scholarBtn || "Google Scholar ↗")}</a>`);
    if (w.sintaUrl) scholarLinks.push(`<a class="btn btn-ghost" href="${esc(w.sintaUrl)}" target="_blank" rel="noopener">${esc(w.sintaBtn || "SINTA ↗")}</a>`);
    if (w.scopusUrl) scholarLinks.push(`<a class="btn btn-ghost" href="${esc(w.scopusUrl)}" target="_blank" rel="noopener">${esc(w.scopusBtn || "Scopus ↗")}</a>`);
    const PUB_LIMIT = 8;
    const pubs = w.publications || [];
    const pubCard = (p, i) => {
      const cm = String(p.meta || "").match(/·\s*([\d.,]+)\s*sitasi/i);
      const cites = cm ? cm[1] : "";
      const metaClean = String(p.meta || "").replace(/\s*·\s*[\d.,]+\s*sitasi/i, "").trim();
      return `
        <div class="pub-item${i >= PUB_LIMIT ? " pub-hidden" : ""}">
          <div class="pub-body">
            <div class="pub-title">${esc(p.title)}</div>
            ${metaClean ? `<div class="pub-meta">${esc(metaClean)}</div>` : ""}
          </div>
          ${cites ? `<span class="pub-cite" title="${esc(cites)} sitasi">${esc(cites)}<small>sitasi</small></span>` : ""}
        </div>`;
    };
    const renderCols = (cols) => `
      <div class="works-cols">
        ${(cols || []).map((col) => `
          <div class="work-col reveal">
            <h4><span class="wc-ico">${esc(col.icon)}</span> ${esc(col.title)}</h4>
            <div class="work-items">
              ${(col.items || []).map((it) => `
                <div class="work-item">
                  <div class="wi-title">${esc(it.title)}</div>
                  <div class="wi-meta">${esc(it.meta)}</div>
                </div>`).join("")}
            </div>
          </div>`).join("")}
      </div>`;
    c.innerHTML = `
      <div class="section-head reveal">${sectionHead(w.tag, w.headingHtml, w.sub)}</div>

      <h3 class="works-subhead reveal">${esc(w.scholarTitle || "Rekam Jejak Publikasi")}</h3>
      <div class="scholar-stats reveal">
        ${(w.scholarStats || []).map((s) => `
          <div class="sc-stat">
            <span class="sc-ico">${esc(s.icon)}</span>
            <b>${esc(s.value)}</b>
            <span class="sc-label">${esc(s.label)}</span>
          </div>`).join("")}
      </div>
      ${scholarLinks.length ? `<div class="scholar-cta reveal">${scholarLinks.join("")}</div>` : ""}

      ${((w.scopusStats || []).some((s) => { const v = String(s.value || "").trim(); return v && v !== "—" && v !== "-"; })) ? `
      <h3 class="works-subhead reveal">${esc(w.scopusTitle || "Rekam Jejak Scopus")}</h3>
      <div class="scholar-stats reveal scopus-stats">
        ${w.scopusStats.map((s) => `
          <div class="sc-stat">
            <span class="sc-ico">${esc(s.icon)}</span>
            <b>${esc(s.value)}</b>
            <span class="sc-label">${esc(s.label)}</span>
          </div>`).join("")}
      </div>` : ""}

      ${pubs.length ? `
      <h3 class="works-subhead reveal">${esc(w.worksListTitle || "Daftar Karya Ilmiah")} <span class="pub-count">${pubs.length}</span></h3>
      <div class="pub-panel reveal" id="pubPanel">
        <div class="pub-grid" id="pubList">
          ${pubs.map(pubCard).join("")}
        </div>
      </div>
      ${pubs.length > PUB_LIMIT ? `<div class="pub-more-wrap reveal"><button class="btn btn-ghost" id="pubMoreBtn">Lihat semua ${pubs.length} karya ↓</button></div>` : ""}
      ` : ""}

      ${(w.columns && w.columns.length) ? `<h3 class="works-subhead reveal">${esc(w.researchTitle || "Penelitian dan Pengabdian")}</h3>${renderCols(w.columns)}` : ""}

      ${(w.kiprahColumns && w.kiprahColumns.length) ? `<h3 class="works-subhead reveal">${esc(w.kiprahTitle || "Amanah dan Kiprah")}</h3>${renderCols(w.kiprahColumns)}` : ""}`;

    const moreBtn = document.getElementById("pubMoreBtn");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        const panel = document.getElementById("pubPanel");
        const expanded = panel.classList.toggle("show-all");
        moreBtn.textContent = expanded ? "Tampilkan lebih sedikit ↑" : `Lihat semua ${pubs.length} karya ↓`;
        if (!expanded) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  function renderWritingsHead(wr) {
    const h = document.getElementById("writingsHead");
    if (h) h.innerHTML = sectionHead(wr.tag, wr.headingHtml, wr.sub);
    const more = document.getElementById("writingsMore");
    if (more) more.innerHTML = `<a class="btn btn-ghost" href="tulisan.html">${esc(wr.viewAll || "Lihat semua tulisan →")}</a>`;
  }

  function articleCard(a) {
    const cover = a.cover
      ? `<img src="${esc(a.cover)}" alt="${esc(a.title)}">`
      : `<span class="cover-mark">“ ”</span>`;
    return `
      <a class="article-card reveal" href="artikel.html?slug=${encodeURIComponent(a.slug)}">
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

  function loadArticles() {
    const grid = document.getElementById("writingsGrid");
    if (!grid) return;
    fetch("/api/articles", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        const arr = (Array.isArray(list) ? list : []).slice(0, 3);
        if (!arr.length) {
          grid.innerHTML = `<div class="empty-note">Belum ada tulisan. Tambahkan lewat halaman admin.</div>`;
          return;
        }
        grid.innerHTML = arr.map(articleCard).join("");
        observeReveal();
      })
      .catch(() => {
        grid.innerHTML = `<div class="empty-note">Gagal memuat tulisan.</div>`;
      });
  }

  function renderContact(ct) {
    const head = document.getElementById("contactHead");
    if (head) head.innerHTML = sectionHead(ct.tag, ct.headingHtml, ct.sub);
    const info = document.getElementById("contactInfo");
    if (info) {
      const rows = [];
      if (ct.email) rows.push(`<div class="contact-row"><span class="ci">✉️</span><div><b>Email</b><br><a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a></div></div>`);
      if (ct.whatsappNumber) rows.push(`<div class="contact-row"><span class="ci">💬</span><div><b>WhatsApp</b><br><a href="https://wa.me/${esc(String(ct.whatsappNumber).replace(/[^0-9]/g, ""))}" target="_blank" rel="noopener">${esc(ct.whatsappNumber)}</a></div></div>`);
      if (ct.location) rows.push(`<div class="contact-row"><span class="ci">📍</span><div><b>Lokasi</b><br><span>${esc(ct.location)}</span></div></div>`);
      const socials = (ct.socials || []).filter((s) => s.url);
      if (socials.length) rows.push(`<div class="socials">${socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.label)}">${esc(s.text)}</a>`).join("")}</div>`);
      info.innerHTML = rows.join("");
    }
  }

  // ---------- Interactions ----------
  let revObserver;
  function observeReveal() {
    if (!revObserver) return;
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => revObserver.observe(el));
  }

  function initInteractions() {
    document.getElementById("year").textContent = new Date().getFullYear();

    const navbar = document.getElementById("navbar");
    const progress = document.getElementById("scrollProgress");
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 20);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    });

    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");
    const backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);
    const setMenu = (open) => {
      navLinks.classList.toggle("open", open);
      navToggle.classList.toggle("open", open);
      backdrop.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
    };
    navToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
    backdrop.addEventListener("click", () => setMenu(false));
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

    // Typewriter
    const roles = (CONTENT.hero && CONTENT.hero.roles) || [];
    const tw = document.getElementById("typewriter");
    if (tw && roles.length) {
      let ri = 0, ci = 0, del = false;
      const type = () => {
        const word = roles[ri];
        tw.textContent = word.slice(0, ci);
        if (!del && ci < word.length) ci++;
        else if (del && ci > 0) ci--;
        else if (!del && ci === word.length) { del = true; return setTimeout(type, 1500); }
        else { del = false; ri = (ri + 1) % roles.length; }
        setTimeout(type, del ? 45 : 95);
      };
      type();
    }

    // Reveal
    revObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); revObserver.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    observeReveal();

    // Count-up
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target, target = +el.dataset.count;
        let cur = 0; const step = Math.max(1, Math.round(target / 40));
        const tick = () => { cur += step; if (cur >= target) el.textContent = target; else { el.textContent = cur; requestAnimationFrame(tick); } };
        tick(); countObserver.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll(".stat b").forEach((el) => countObserver.observe(el));

    // Contact form
    const form = document.getElementById("contactForm");
    const note = document.getElementById("formNote");
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !email || !message) { note.textContent = "Mohon lengkapi semua kolom."; note.className = "form-note err"; return; }
      if (!emailOk) { note.textContent = "Format email tidak valid."; note.className = "form-note err"; return; }
      const to = (CONTENT.contact && CONTENT.contact.email) || "";
      window.location.href = `mailto:${to}?subject=${encodeURIComponent("Pesan dari " + name)}&body=${encodeURIComponent(message + "\n\n— " + name + " (" + email + ")")}`;
      note.textContent = "Terima kasih! Aplikasi email Anda akan terbuka."; note.className = "form-note ok"; form.reset();
    });

    initSectionNav();
  }

  // ---------- Navigasi antar-bagian (mode presentasi / layar penuh) ----------
  function initSectionNav() {
    const ids = ["hero", "about", "experience", "education", "works", "writings", "contact"];
    const sections = () => ids.map((id) => document.getElementById(id)).filter(Boolean);
    const NAV_OFFSET = 76;

    function scrollToEl(s) {
      const y = Math.max(0, Math.round(window.scrollY + s.getBoundingClientRect().top - NAV_OFFSET));
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    function nextSection() {
      for (const s of sections()) {
        if (s.getBoundingClientRect().top > NAV_OFFSET + 12) { scrollToEl(s); return; }
      }
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
    function prevSection() {
      const secs = sections().reverse();
      for (const s of secs) {
        if (s.getBoundingClientRect().top < NAV_OFFSET - 12) { scrollToEl(s); return; }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function atBottom() {
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 40;
    }

    // Tombol melayang: layar penuh + next
    const dock = document.createElement("div");
    dock.className = "nav-dock";
    const fsBtn = document.createElement("button");
    fsBtn.className = "dock-fs";
    fsBtn.title = "Layar penuh (mode presentasi)";
    fsBtn.innerHTML = "⛶";
    const nextBtn = document.createElement("button");
    nextBtn.className = "dock-next";
    nextBtn.title = "Bagian selanjutnya";
    nextBtn.innerHTML = "⌄";
    dock.appendChild(fsBtn);
    dock.appendChild(nextBtn);
    document.body.appendChild(dock);

    nextBtn.addEventListener("click", () => {
      if (atBottom()) window.scrollTo({ top: 0, behavior: "smooth" });
      else nextSection();
    });
    const syncNextIcon = () => { nextBtn.innerHTML = atBottom() ? "⌃" : "⌄"; nextBtn.title = atBottom() ? "Kembali ke atas" : "Bagian selanjutnya"; };
    window.addEventListener("scroll", syncNextIcon);
    syncNextIcon();

    fsBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement);
      else (document.exitFullscreen || (() => {})).call(document);
    });
    document.addEventListener("fullscreenchange", () => {
      const on = !!document.fullscreenElement;
      fsBtn.innerHTML = on ? "🡴" : "⛶";
      document.body.classList.toggle("is-fullscreen", on);
    });

    // Keyboard: aktif saat layar penuh (mode presentasi)
    document.addEventListener("keydown", (e) => {
      if (!document.fullscreenElement) return;
      const t = e.target || {};
      const tag = (t.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); nextSection(); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prevSection(); }
    });
  }
})();
