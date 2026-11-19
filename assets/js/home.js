/**
 * home.js — the animated equations, the shelf slider, and the front-page data.
 */
import {
  qs,
  qsa,
  escapeHTML,
  getPostsIndex,
  getLibraryIndex,
  formatDateLong,
  formatDateShort,
  prefersReducedMotion,
} from "./lib.js";
import { t, getLang, onLanguageChange } from "./i18n.js";

/* -------------------------------------------------------------------------- */
/* the mathematical background                                                */
/* -------------------------------------------------------------------------- */

function initMathCanvas() {
  const canvas = qs("[data-math-canvas]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduced = prefersReducedMotion();
  const glyphSet = [
    "∫", "∂", "∑", "π", "√", "∞", "∇", "ℝ", "ℂ", "≅", "≈", "θ",
    "λ", "φ", "ℵ", "⊂", "⊕", "⊗", "∈", "∀", "∃", "Δ",
  ];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let glyphs = [];
  let frameId = 0;
  let lastDraw = 0;
  let visible = true;

  const makeGlyphs = () => {
    const count = width < 640 ? 22 : 38;
    return Array.from({ length: count }, (_, index) => {
      const ghost = index % 9 === 0;
      return {
        character: glyphSet[index % glyphSet.length],
        x: Math.random(),
        y: Math.random(),
        size: ghost ? 64 + Math.random() * 48 : 17 + Math.random() * 36,
        alpha: ghost ? 0.032 + Math.random() * 0.022 : 0.055 + Math.random() * 0.075,
        speed: 0.000006 + Math.random() * 0.000016,
        drift: (Math.random() - 0.5) * 0.00008,
        rotation: (Math.random() - 0.5) * 0.5,
        phase: index * 1.7,
      };
    });
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    glyphs = makeGlyphs();
    draw(performance.now());
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    const step = width < 640 ? 34 : 46;
    ctx.fillStyle = "rgba(13, 13, 13, 0.09)";
    for (let x = step / 2; x < width; x += step) {
      for (let y = step / 2; y < height; y += step) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const mobile = width < 760;
    const cx = mobile ? width * 0.55 : width * 0.765;
    const cy = height * 0.5;
    const radius = Math.min(width * (mobile ? 0.38 : 0.28), height * 0.4);
    const strength = mobile ? 0.62 : 1;
    const t = time * 0.001;

    ctx.save();
    ctx.strokeStyle = `rgba(13, 13, 13, ${0.2 * strength})`;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([1, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.99, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Draughtsman's tick marks around the orbit. */
    ctx.strokeStyle = `rgba(13, 13, 13, ${0.17 * strength})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const inner = radius * (i % 6 === 0 ? 0.95 : 0.968);
      const outer = radius * 1.008;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    for (let layer = 0; layer < 3; layer += 1) {
      const phase = t * 0.26 + layer * 1.15;
      const a = radius * (1 - layer * 0.1);
      const b = a * 0.92;
      ctx.beginPath();
      for (let i = 0; i <= 620; i += 1) {
        const theta = (i / 620) * Math.PI * 2;
        const x = cx + a * Math.sin(3 * theta + phase);
        const y = cy + b * Math.sin(2 * theta + phase * 0.62);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(13, 13, 13, ${
        (layer === 0 ? 0.3 : layer === 1 ? 0.14 : 0.09) * strength
      })`;
      ctx.lineWidth = layer === 0 ? 1.5 : 0.9;
      ctx.stroke();
    }

    const pointPhase = t * 0.26;

    /* A short oxblood trail behind the moving point. */
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 28; i += 1) {
      const p0 = pointPhase - i * 0.013;
      const p1 = pointPhase - (i + 1) * 0.013;
      ctx.strokeStyle = `rgba(125, 29, 29, ${(1 - i / 28) * 0.42 * strength})`;
      ctx.beginPath();
      ctx.moveTo(
        cx + radius * Math.sin(3 * p0),
        cy + radius * 0.92 * Math.sin(2 * p0 + 0.713)
      );
      ctx.lineTo(
        cx + radius * Math.sin(3 * p1),
        cy + radius * 0.92 * Math.sin(2 * p1 + 0.713)
      );
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    const dotX = cx + radius * Math.sin(3 * pointPhase);
    const dotY = cy + radius * 0.92 * Math.sin(2 * pointPhase + 0.713);
    ctx.fillStyle = `rgba(125, 29, 29, ${0.85 * strength})`;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(125, 29, 29, ${0.26 * strength})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    for (const glyph of glyphs) {
      const y = ((glyph.y - time * glyph.speed) % 1 + 1) % 1;
      const x = glyph.x + Math.sin(time * glyph.drift + glyph.phase) * 0.012;
      ctx.save();
      ctx.translate(x * width, y * height);
      ctx.rotate(glyph.rotation);
      ctx.font = `italic ${glyph.size}px "EB Garamond", Georgia, serif`;
      ctx.fillStyle = `rgba(13, 13, 13, ${glyph.alpha * strength})`;
      ctx.fillText(glyph.character, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function loop(now) {
    if (!visible) {
      frameId = 0;
      return;
    }
    frameId = window.requestAnimationFrame(loop);
    if (now - lastDraw < 33) return;
    lastDraw = now;
    draw(now);
  }

  function start() {
    if (reduced || frameId || !visible) return;
    frameId = window.requestAnimationFrame(loop);
  }

  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (reduced) draw(0);
  });
  resizeObserver.observe(canvas);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    observer.observe(canvas);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  if (!reduced) start();
}

/* -------------------------------------------------------------------------- */
/* the shelf slider                                                           */
/* -------------------------------------------------------------------------- */

function initShelf() {
  const root = qs("[data-shelf]");
  if (!root) return;

  const track = qs("[data-shelf-track]", root);
  const viewport = qs("[data-shelf-viewport]", root);
  const slides = qsa("[data-shelf-slide]", root);
  const tabs = qsa("[data-shelf-tab]", root);
  const counter = qs("[data-shelf-count]", root);
  const previous = qs("[data-shelf-prev]", root);
  const next = qs("[data-shelf-next]", root);
  if (!track || !viewport || !slides.length) return;

  let index = 0;
  let frame = 0;

  const setHeight = () => {
    const slide = slides[index];
    if (!slide) return;
    viewport.style.height = `${slide.offsetHeight}px`;
  };

  const scheduleHeight = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(setHeight);
  };

  const go = (nextIndex, focusTab = false) => {
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;

    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      if (active) slide.removeAttribute("inert");
      else slide.setAttribute("inert", "");
      slide.setAttribute("aria-hidden", String(!active));
    });

    if (counter) {
      counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    }

    scheduleHeight();
    if (focusTab) tabs[index]?.focus();
  };

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener("click", () => go(tabIndex));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        go(tabIndex + 1, true);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        go(tabIndex - 1, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        go(0, true);
      } else if (event.key === "End") {
        event.preventDefault();
        go(slides.length - 1, true);
      }
    });
  });

  previous?.addEventListener("click", () => go(index - 1));
  next?.addEventListener("click", () => go(index + 1));

  let startX = null;
  let startY = null;
  viewport.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    },
    { passive: true }
  );
  viewport.addEventListener(
    "touchend",
    (event) => {
      if (startX === null) return;
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        go(index + (dx < 0 ? 1 : -1));
      }
      startX = null;
      startY = null;
    },
    { passive: true }
  );

  const resizeObserver = new ResizeObserver(scheduleHeight);
  slides.forEach((slide) => resizeObserver.observe(slide));
  window.addEventListener("resize", scheduleHeight);
  window.addEventListener("load", scheduleHeight);
  document.fonts?.ready?.then(scheduleHeight).catch(() => {});

  go(0);
}

/* -------------------------------------------------------------------------- */
/* front-page content                                                         */
/* -------------------------------------------------------------------------- */

function renderFeature(container, post) {
  if (!container) return;
  if (!post) {
    container.innerHTML = `
      <p class="kicker">${t("home.emptyFeatureKicker")}</p>
      <p class="shelf-feature__title">${t("home.emptyFeatureTitle")}</p>
      <p class="shelf-feature__summary">${t("home.emptyFeatureText")}</p>
      <a class="arrow-link" href="writing.html">${t("home.emptyFeatureLink")} <span aria-hidden="true">→</span></a>`;
    return;
  }

  container.innerHTML = `
    <p class="kicker">${t("home.featured")}</p>
    <p class="shelf-feature__title"><a href="${post.url}">${escapeHTML(post.title)}</a></p>
    <p class="shelf-feature__summary">${escapeHTML(post.summary)}</p>
    <p class="meta-line">${escapeHTML(post.category)} · ${escapeHTML(formatDateLong(post.date, getLang()))} · ${t("common.minRead", { n: post.minutes })}</p>
    <a class="arrow-link" href="${post.url}">${t("home.readArticle")} <span aria-hidden="true">→</span></a>`;
}

function renderRecent(container, posts) {
  if (!container) return;
  if (!posts.length) {
    container.innerHTML = `<li class="loading-line">${t("home.moreComing")}</li>`;
    return;
  }
  container.innerHTML = posts
    .slice(0, 3)
    .map(
      (post, index) => `
      <li>
        <span class="shelf-list__num">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <a href="${post.url}">${escapeHTML(post.title)}</a>
          <p>${escapeHTML(post.category)} · ${escapeHTML(formatDateShort(post.date, getLang()))}</p>
        </div>
      </li>`
    )
    .join("");
}

function renderGallery(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<p class="shelf-empty">${t("home.emptyGallery")}</p>`;
    return;
  }
  container.innerHTML = items
    .slice(0, 4)
    .map(
      (item) => `
      <a class="shelf-plate" href="library.html#${encodeURIComponent(item.id)}">
        <span class="shelf-plate__frame"><img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.title)}" decoding="async"></span>
        <span class="shelf-plate__caption">${escapeHTML(item.title)}</span>
        <span class="shelf-plate__meta">${t("home.plateMeta", { date: formatDateShort(item.date, getLang()) })}</span>
      </a>`
    )
    .join("");
}

function renderChanges(container, posts) {
  if (!container) return;
  if (!posts.length) {
    container.innerHTML = `<li class="loading-line">${t("home.emptyChanges")}</li>`;
    return;
  }
  container.innerHTML = posts
    .slice(0, 6)
    .map(
      (post) => `
      <li>
        <time datetime="${post.date}">${escapeHTML(formatDateShort(post.date, getLang()))}</time>
        <a href="${post.url}">${escapeHTML(post.title)}</a>
        <span class="changes__cat">${escapeHTML(post.category)}</span>
      </li>`
    )
    .join("");
}

function renderMiniGallery(container, photos) {
  if (!container) return;
  if (!photos.length) {
    container.innerHTML = `<p class="shelf-empty">${t("home.emptyMiniGallery")}</p>`;
    return;
  }
  container.innerHTML = photos
    .slice(0, 3)
    .map(
      (item) => `
      <a class="mini-plate" href="library.html#${encodeURIComponent(item.id)}">
        <img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.title)}" decoding="async">
        <span>${escapeHTML(item.title)}</span>
      </a>`
    )
    .join("");
}

let frontPosts = null;
let frontLibrary = null;

function renderFrontPage() {
  if (frontPosts) {
    qsa("[data-stat-posts]").forEach((element) => {
      element.textContent = String(frontPosts.counts.posts);
    });

    const featured =
      frontPosts.posts.find((post) => post.featured) || frontPosts.posts[0] || null;
    renderFeature(qs("[data-feature]"), featured);

    const rest = featured
      ? frontPosts.posts.filter((post) => post.slug !== featured.slug)
      : frontPosts.posts;
    renderRecent(qs("[data-recent]"), rest.length ? rest : frontPosts.posts.slice(1));
    renderChanges(qs("[data-changes]"), frontPosts.posts);
  } else {
    renderFeature(qs("[data-feature]"), null);
    const changes = qs("[data-changes]");
    if (changes) changes.innerHTML = `<li class="loading-line">${t("home.indexError")}</li>`;
  }

  if (frontLibrary) {
    qsa("[data-stat-library]").forEach((element) => {
      element.textContent = String(frontLibrary.counts.total);
    });
    const photos = frontLibrary.items.filter((item) => item.type === "photo");
    renderGallery(qs("[data-gallery]"), photos);
    renderMiniGallery(qs("[data-mini-gallery]"), photos);
  } else {
    renderGallery(qs("[data-gallery]"), []);
    renderMiniGallery(qs("[data-mini-gallery]"), []);
  }
}

async function loadFrontPage() {
  const [postsResult, libraryResult] = await Promise.allSettled([getPostsIndex(), getLibraryIndex()]);
  frontPosts = postsResult.status === "fulfilled" ? postsResult.value : null;
  frontLibrary = libraryResult.status === "fulfilled" ? libraryResult.value : null;

  renderFrontPage();
  initShelf();

  onLanguageChange(() => renderFrontPage());
}

initMathCanvas();
loadFrontPage();
