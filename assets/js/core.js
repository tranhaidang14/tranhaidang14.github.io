/**
 * core.js — masthead, search, random page, and site metadata.
 * Loaded on every page.
 */
import {
  qs,
  qsa,
  escapeHTML,
  normalizeText,
  getSite,
  getPostsIndex,
  getLibraryIndex,
  formatDateLong,
  formatDateShort,
} from "./lib.js";
import { initI18n, t, getLang, onLanguageChange } from "./i18n.js";

/* -------------------------------------------------------------------------- */
/* site metadata                                                              */
/* -------------------------------------------------------------------------- */

function applySite(site) {
  if (!site) return;

  qsa("[data-site]").forEach((element) => {
    const value = site[element.dataset.site];
    if (value === undefined || value === null || value === "") return;
    element.textContent = value;
  });

  qsa("[data-site-email]").forEach((element) => {
    if (!site.email) return;
    element.href = `mailto:${site.email}`;
    element.textContent = site.email;
  });

  const licenseLink = qs("[data-site-license-link]");
  if (licenseLink && site.licenseUrl) licenseLink.href = site.licenseUrl;

  const linksContainer = qs("[data-site-links]");
  if (linksContainer && Array.isArray(site.links)) {
    linksContainer.innerHTML = site.links
      .filter((link) => link && link.label && link.url)
      .map((link) => {
        const external = /^https?:/i.test(link.url);
        return `<a href="${escapeHTML(link.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHTML(link.label)}</a>`;
      })
      .join("");
  }
}

async function applySiteStats() {
  try {
    const [posts, library] = await Promise.all([getPostsIndex(), getLibraryIndex()]);

    qsa("[data-about-posts]").forEach((element) => {
      element.textContent = String(posts.counts.posts);
    });
    qsa("[data-about-library]").forEach((element) => {
      element.textContent = String(library.counts.total);
    });
    qsa("[data-last-edited]").forEach((element) => {
      element.textContent = formatDateLong(posts.generated.slice(0, 10), getLang());
    });
  } catch {
    /* The placeholders stay in place if the index is unavailable. */
  }
}

/* -------------------------------------------------------------------------- */
/* mobile navigation                                                          */
/* -------------------------------------------------------------------------- */

function initNavigation() {
  const toggle = qs("[data-nav-toggle]");
  const panel = qs("[data-mobile-nav]");
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  };

  toggle.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* search suggestions                                                         */
/* -------------------------------------------------------------------------- */

function scoreEntry(entry, query) {
  const q = normalizeText(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  const title = normalizeText(entry.data.title);
  let score = 0;

  if (title === q) score += 40;
  else if (title.startsWith(q)) score += 18;
  else if (title.includes(q)) score += 10;

  for (const token of tokens) {
    if (title.startsWith(token)) score += 7;
    else if (title.includes(token)) score += 5;
    if (entry.search.includes(token)) score += 3;
    if (entry.kind === "post" && entry.data.summary && normalizeText(entry.data.summary).includes(token)) {
      score += 2;
    }
  }

  return score;
}

function searchEntryMarkup(entry, index, panelId) {
  const data = entry.data;
  const link = document.createElement("a");
  link.className = "suggestion";
  link.id = `${panelId}-${index}`;
  link.setAttribute("role", "option");
  link.setAttribute("aria-selected", "false");

  if (entry.kind === "post") {
    link.href = data.url;
    link.innerHTML = `<span class="suggestion__title">${escapeHTML(data.title)}</span><span class="suggestion__meta">${escapeHTML(data.category)} · ${escapeHTML(formatDateShort(data.date, getLang()))}</span>`;
  } else {
    link.href = `library.html#${encodeURIComponent(data.id)}`;
    const kind = t(data.type === "document" ? "library.documentKicker" : "library.plateKicker");
    link.innerHTML = `<span class="suggestion__title">${escapeHTML(data.title)}</span><span class="suggestion__meta">${escapeHTML(kind)} · ${escapeHTML(data.collection)} · ${escapeHTML(formatDateShort(data.date, getLang()))}</span>`;
  }

  return link;
}

function initSearchForm(form) {
  const input = qs("[data-search-input]", form);
  if (!input) return;

  const panel = document.createElement("div");
  panel.className = "suggestions";
  panel.id = `suggestions-${Math.random().toString(36).slice(2, 9)}`;
  panel.hidden = true;
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-label", t("search.suggestions"));
  form.appendChild(panel);

  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", panel.id);

  let items = [];
  let activeIndex = -1;
  let loaded = false;
  let loading = false;

  const close = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
    panel.querySelectorAll(".is-active").forEach((element) => element.classList.remove("is-active"));
  };

  const setActive = (index) => {
    const options = [...panel.querySelectorAll(".suggestion")];
    if (!options.length) return;
    activeIndex = (index + options.length) % options.length;
    options.forEach((option, i) => {
      option.classList.toggle("is-active", i === activeIndex);
      option.setAttribute("aria-selected", String(i === activeIndex));
    });
    const current = options[activeIndex];
    input.setAttribute("aria-activedescendant", current.id);
    current.scrollIntoView({ block: "nearest" });
  };

  const show = (query) => {
    if (!loaded || query.length < 2) {
      close();
      return;
    }

    const scored = items
      .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score || b.entry.data.date.localeCompare(a.entry.data.date))
      .slice(0, 6);

    panel.innerHTML = "";

    if (!scored.length) {
      const empty = document.createElement("div");
      empty.className = "suggestions__empty";
      empty.textContent = t("search.none", { query });
      panel.appendChild(empty);
    } else {
      scored.forEach(({ entry }, index) => {
        const link = searchEntryMarkup(entry, index, panel.id);
        link.addEventListener("mousemove", () => setActive(index));
        panel.appendChild(link);
      });
    }

    const all = document.createElement("a");
    all.className = "suggestion suggestion--all";
    const hasPosts = scored.some((match) => match.entry.kind === "post");
    all.href = hasPosts
      ? `writing.html?q=${encodeURIComponent(query)}`
      : `library.html?q=${encodeURIComponent(query)}`;
    all.textContent = t("search.seeAll", { query });
    panel.appendChild(all);

    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-activedescendant", "");
    activeIndex = -1;
  };

  const load = async () => {
    if (loaded || loading) return;
    loading = true;
    try {
      const [postsIndex, libraryIndex] = await Promise.all([getPostsIndex(), getLibraryIndex()]);
      items = [
        ...postsIndex.posts.map((post) => ({
          kind: "post",
          data: post,
          search: normalizeText(
            [post.title, post.category, post.tags.join(" "), post.summary, post.plain].join(" ")
          ),
        })),
        ...libraryIndex.items.map((item) => ({
          kind: "item",
          data: item,
          search: normalizeText(
            [item.title, item.description, item.tags.join(" "), item.collection, item.file].join(" ")
          ),
        })),
      ];
      loaded = true;
    } catch {
      items = [];
    } finally {
      loading = false;
      if (input.value.trim().length >= 2) show(input.value.trim());
    }
  };

  const update = () => {
    const query = input.value.trim();
    if (query.length < 2) close();
    else {
      load();
      show(query);
    }
  };

  input.addEventListener("focus", () => {
    load();
    if (input.value.trim().length >= 2) update();
  });
  input.addEventListener("input", update);
  input.addEventListener("blur", () => setTimeout(close, 140));
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (panel.hidden && input.value.trim().length >= 2) update();
      if (panel.hidden) return;
      event.preventDefault();
      setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Enter") {
      if (!panel.hidden && activeIndex >= 0) {
        const option = panel.querySelectorAll(".suggestion")[activeIndex];
        if (option) {
          event.preventDefault();
          window.location.href = option.href;
        }
      }
    } else if (event.key === "Escape") {
      close();
    } else if (event.key === "Tab") {
      close();
    }
  });

  panel.addEventListener("mousedown", (event) => event.preventDefault());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    window.location.href = query ? `writing.html?q=${encodeURIComponent(query)}` : "writing.html";
  });
}

function initSearch() {
  qsa("[data-search-form]").forEach(initSearchForm);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    const input = qsa("[data-search-input]").find((element) => element.offsetParent !== null);
    if (!input) return;
    event.preventDefault();
    input.focus();
    input.select();
  });
}

/* -------------------------------------------------------------------------- */
/* random page (delegated, so it also works for rendered links)                */
/* -------------------------------------------------------------------------- */

let randomPool = null;

async function loadRandomPool() {
  if (randomPool) return randomPool;
  const index = await getPostsIndex();
  randomPool = index.posts;
  return randomPool;
}

function pickRandom(posts, currentSlug) {
  const pool = posts.filter((post) => post.slug !== currentSlug);
  const list = pool.length ? pool : posts;
  return list[Math.floor(Math.random() * list.length)];
}

async function setRandomTargets() {
  try {
    const posts = await loadRandomPool();
    if (!posts.length) return;
    const current = new URLSearchParams(window.location.search).get("p");
    const pick = pickRandom(posts, current);
    qsa("[data-random]").forEach((trigger) => {
      if (trigger.tagName === "A") trigger.href = pick.url;
    });
  } catch {
    /* The handlers below still fall back to the archive. */
  }
}

function initRandom() {
  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-random]");
    if (!trigger) return;
    event.preventDefault();

    try {
      const posts = await loadRandomPool();
      if (!posts.length) {
        window.location.href = "writing.html";
        return;
      }
      const current = new URLSearchParams(window.location.search).get("p");
      const pick = pickRandom(posts, current);
      window.location.href = pick.url;
    } catch {
      window.location.href = "writing.html";
    }
  });

  setRandomTargets();
}

/* -------------------------------------------------------------------------- */
/* back to top                                                                */
/* -------------------------------------------------------------------------- */

function initBackToTop() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "to-top";
  button.hidden = true;
  button.innerHTML = '<span aria-hidden="true">↑</span>';
  button.setAttribute("aria-label", t("common.toTop"));
  button.title = t("common.toTop");

  document.body.appendChild(button);

  let scheduled = false;
  const update = () => {
    scheduled = false;
    button.hidden = window.scrollY < 600;
  };
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  update();

  button.addEventListener("click", () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  onLanguageChange(() => {
    button.setAttribute("aria-label", t("common.toTop"));
    button.title = t("common.toTop");
  });
}

/* -------------------------------------------------------------------------- */
/* init                                                                       */
/* -------------------------------------------------------------------------- */

async function init() {
  initI18n();
  initNavigation();
  initSearch();
  initRandom();
  initBackToTop();

  onLanguageChange(() => {
    applySiteStats();
    qsa(".suggestions").forEach((panel) => {
      panel.hidden = true;
    });
  });

  try {
    applySite(await getSite());
  } catch {
    /* keep the static defaults */
  }

  applySiteStats();
}

init();
