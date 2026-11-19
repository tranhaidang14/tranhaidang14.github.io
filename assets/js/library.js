/**
 * library.js — the plate cabinet: filtering, sorting, and a lightbox viewer.
 */
import {
  qs,
  qsa,
  escapeHTML,
  normalizeText,
  getLibraryIndex,
  formatDateShort,
  formatDateLong,
  debounce,
} from "./lib.js";
import { t, getLang, onLanguageChange } from "./i18n.js";

const state = {
  q: "",
  type: "all",
  shelf: "",
  sort: "newest",
};

let index = null;
let visibleItems = [];
let navItems = [];
let currentItem = null;

const elements = {
  shelves: qs("[data-shelves]"),
  query: qs("[data-library-q]"),
  clearQuery: qs("[data-library-clear]"),
  typeButtons: qsa("[data-type-filter]"),
  sort: qs("[data-library-sort]"),
  count: qs("[data-library-count]"),
  grid: qs("[data-library-grid]"),
  empty: qs("[data-library-empty]"),
  headerCount: qs("[data-lib-count]"),
  headerPhotos: qs("[data-lib-photos]"),
  headerDocs: qs("[data-lib-docs]"),
  dialog: qs("#lightbox"),
  dialogKicker: qs("[data-lb-kicker]"),
  dialogBody: qs("[data-lb-body]"),
  dialogTitle: qs("[data-lb-title]"),
  dialogDesc: qs("[data-lb-desc]"),
  dialogMeta: qs("[data-lb-meta]"),
  dialogPrev: qs("[data-lb-prev]"),
  dialogNext: qs("[data-lb-next]"),
  dialogClose: qs("[data-lb-close]"),
};

function syncURL() {
  const params = new URLSearchParams();
  const text = state.q.trim();
  if (text) params.set("q", text);
  if (state.type !== "all") params.set("type", state.type);
  if (state.shelf) params.set("shelf", state.shelf);
  if (state.sort !== "newest") params.set("sort", state.sort);
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

function hasFilters() {
  return Boolean(state.q.trim() || state.type !== "all" || state.shelf);
}

function getFiltered() {
  if (!index) return [];
  const tokens = normalizeText(state.q).split(/\s+/).filter(Boolean);

  const list = index.items.filter((item) => {
    if (state.type !== "all" && item.type !== state.type) return false;
    if (state.shelf) {
      const collection = index.collections.find((entry) => entry.slug === state.shelf);
      if (!collection || item.collection !== collection.name) return false;
    }
    if (tokens.length) {
      const haystack = normalizeText(
        [item.title, item.description, item.tags.join(" "), item.collection, item.file].join(" ")
      );
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    if (state.sort === "oldest") return a.date.localeCompare(b.date);
    if (state.sort === "title") return a.title.localeCompare(b.title, getLang(), { sensitivity: "base" });
    return b.date.localeCompare(a.date);
  });

  return list;
}

function itemButton(item) {
  if (item.type === "document") {
    return `
      <button class="doc-card" type="button" data-item-id="${escapeHTML(item.id)}" aria-label="${t("library.openDocAria", { title: item.title })}">
        <span class="doc-card__stamp">PDF</span>
        <span class="doc-card__title">${escapeHTML(item.title)}</span>
        <span class="doc-card__desc">${escapeHTML(item.description || t("library.defaultDocDesc"))}</span>
        <span class="doc-card__meta">
          <span>${escapeHTML(item.collection)} · ${escapeHTML(formatDateLong(item.date, getLang()))}</span>
          <span class="doc-card__open">${t("library.openDocument")}</span>
        </span>
      </button>`;
  }

  const ratio = item.ratio && Number.isFinite(item.ratio) ? item.ratio : 0.8;
  return `
    <button class="plate-card" type="button" data-item-id="${escapeHTML(item.id)}" style="--ratio:${ratio}" aria-label="${t("library.viewPlateAria", { title: item.title })}">
      <span class="plate-card__frame"><img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.title)}" decoding="async"></span>
      <span class="plate-card__title">${escapeHTML(item.title)}</span>
      <span class="plate-card__meta"><span>${escapeHTML(item.collection)}</span><span>${escapeHTML(formatDateShort(item.date, getLang()))}</span></span>
    </button>`;
}

function renderShelves() {
  const buttons = [
    `<button class="shelf-btn ${state.shelf ? "" : "is-active"}" type="button" data-collection="" aria-pressed="${state.shelf ? "false" : "true"}">${t("library.allShelves")} <span>${index.counts.total}</span></button>`,
    ...index.collections.map(
      (collection) =>
        `<button class="shelf-btn ${state.shelf === collection.slug ? "is-active" : ""}" type="button" data-collection="${collection.slug}" aria-pressed="${state.shelf === collection.slug ? "true" : "false"}">${escapeHTML(collection.name)} <span>${collection.count}</span></button>`
    ),
  ];
  elements.shelves.innerHTML = buttons.join("");
}

function render() {
  if (!index) return;

  visibleItems = getFiltered();
  elements.grid.innerHTML = visibleItems.map(itemButton).join("");
  elements.grid.hidden = visibleItems.length === 0;
  elements.empty.hidden = visibleItems.length > 0;

  if (elements.count) {
    elements.count.textContent = hasFilters()
      ? t("library.resultsFiltered", { shown: visibleItems.length, total: index.counts.total })
      : t("library.resultsAll", { total: index.counts.total });
  }

  elements.typeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.typeFilter === state.type));
  });

  qsa("[data-collection]", elements.shelves).forEach((button) => {
    const active = button.dataset.collection === state.shelf;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (
    elements.query &&
    document.activeElement !== elements.query &&
    elements.query.value !== state.q
  ) {
    elements.query.value = state.q;
  }
  if (elements.clearQuery) elements.clearQuery.hidden = !state.q.trim();
  if (elements.sort) elements.sort.value = state.sort;

  syncURL();
  openFromHash();
}

function openFromHash() {
  if (!index) return;

  if (!location.hash) {
    if (elements.dialog?.open) elements.dialog.close();
    return;
  }

  const id = decodeURIComponent(location.hash.slice(1));
  const item = index.items.find((candidate) => candidate.id === id);
  if (item && (!elements.dialog.open || currentItem?.id !== id)) openItem(item);
}

function resetFilters() {
  state.q = "";
  state.type = "all";
  state.shelf = "";
  state.sort = "newest";
  render();
}

/* -------------------------------------------------------------------------- */
/* lightbox                                                                   */
/* -------------------------------------------------------------------------- */

function renderLightboxChrome(item) {
  if (!item) return;

  if (elements.dialogKicker) {
    elements.dialogKicker.textContent = `${t(item.type === "document" ? "library.documentKicker" : "library.plateKicker")} · ${item.collection}`;
  }

  if (elements.dialogDesc) {
    elements.dialogDesc.textContent = item.description || t("library.defaultPlateDesc");
  }

  if (elements.dialogMeta) {
    const tags = item.tags.map((tag) => `#${escapeHTML(tag)}`).join(" ");
    elements.dialogMeta.innerHTML = `${escapeHTML(formatDateLong(item.date, getLang()))} · ${escapeHTML(item.collection)} · ${escapeHTML(item.ext)} ${tags ? `· ${tags}` : ""} · <a href="${escapeHTML(item.src)}" target="_blank" rel="noopener noreferrer">${t("library.openOriginal")}</a>`;
  }
}

function openItem(item) {
  if (!item) return;
  currentItem = item;

  const filtered = visibleItems.some((candidate) => candidate.id === item.id);
  navItems = filtered && visibleItems.length ? visibleItems : index.items;

  if (elements.dialogBody) {
    elements.dialogBody.innerHTML =
      item.type === "document"
        ? `<iframe src="${escapeHTML(item.src)}#view=FitH" title="${escapeHTML(item.title)}"></iframe>`
        : `<img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.title)}" decoding="async">`;
  }

  if (elements.dialogTitle) elements.dialogTitle.textContent = item.title;
  renderLightboxChrome(item);

  const position = navItems.findIndex((candidate) => candidate.id === item.id);
  if (elements.dialogPrev) elements.dialogPrev.disabled = navItems.length < 2;
  if (elements.dialogNext) elements.dialogNext.disabled = navItems.length < 2;
  if (elements.dialog) elements.dialog.dataset.position = String(position);

  if (!elements.dialog.open) elements.dialog.showModal();
  document.body.classList.add("lightbox-open");
  history.replaceState(null, "", `${location.pathname}${location.search}#${encodeURIComponent(item.id)}`);
}

function stepLightbox(direction) {
  if (!currentItem || navItems.length < 2) return;
  const position = navItems.findIndex((candidate) => candidate.id === currentItem.id);
  const next = navItems[(position + direction + navItems.length) % navItems.length];
  openItem(next);
}

function closeLightbox() {
  if (elements.dialog?.open) elements.dialog.close();
}

function initLightbox() {
  if (!elements.dialog) return;

  elements.dialogClose?.addEventListener("click", closeLightbox);

  elements.dialogPrev?.addEventListener("click", () => stepLightbox(-1));
  elements.dialogNext?.addEventListener("click", () => stepLightbox(1));

  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeLightbox();
  });

  elements.dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(1);
    }
  });

  elements.dialog.addEventListener("close", () => {
    document.body.classList.remove("lightbox-open");
    currentItem = null;
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  });
}

/* -------------------------------------------------------------------------- */
/* events and init                                                            */
/* -------------------------------------------------------------------------- */

function bindEvents() {
  elements.shelves.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-collection]");
    if (!button) return;
    state.shelf = button.dataset.collection;
    render();
  });

  elements.typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.type = button.dataset.typeFilter;
      render();
    });
  });

  elements.query?.addEventListener(
    "input",
    debounce(() => {
      state.q = elements.query.value;
      render();
    }, 100)
  );

  elements.query?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      state.q = "";
      elements.query.value = "";
      render();
    }
  });

  elements.clearQuery?.addEventListener("click", () => {
    state.q = "";
    elements.query.value = "";
    elements.query.focus();
    render();
  });

  elements.sort?.addEventListener("change", () => {
    state.sort = elements.sort.value;
    render();
  });

  elements.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-item-id]");
    if (!button) return;
    const item = index.items.find((candidate) => candidate.id === button.dataset.itemId);
    if (item) openItem(item);
  });

  qs("[data-library-reset]")?.addEventListener("click", resetFilters);
}

async function init() {
  try {
    index = await getLibraryIndex();
  } catch {
    if (elements.count) elements.count.textContent = t("library.error");
    return;
  }

  const params = new URLSearchParams(location.search);
  state.q = (params.get("q") || "").trim();
  state.type = ["photo", "document"].includes(params.get("type")) ? params.get("type") : "all";
  state.shelf = params.get("shelf") || "";
  state.sort = ["newest", "oldest", "title"].includes(params.get("sort"))
    ? params.get("sort")
    : "newest";

  if (!index.collections.some((collection) => collection.slug === state.shelf)) state.shelf = "";

  if (elements.headerCount) elements.headerCount.textContent = String(index.counts.total);
  if (elements.headerPhotos) elements.headerPhotos.textContent = String(index.counts.photos);
  if (elements.headerDocs) elements.headerDocs.textContent = String(index.counts.documents);

  renderShelves();
  bindEvents();
  initLightbox();
  window.addEventListener("hashchange", openFromHash);
  render();

  onLanguageChange(() => {
    if (!index) return;
    renderShelves();
    render();
    if (currentItem && elements.dialog?.open) renderLightboxChrome(currentItem);
  });
}

init();
