/**
 * writing.js — filter, search and sort the article archive.
 */
import {
  qs,
  qsa,
  escapeHTML,
  normalizeText,
  getPostsIndex,
  formatDateShort,
  debounce,
} from "./lib.js";
import { t, getLang, onLanguageChange } from "./i18n.js";

const state = {
  q: "",
  cat: "",
  tag: "",
  year: "",
  letter: "",
  sort: "newest",
};

let index = null;

const elements = {
  total: qs("[data-total]"),
  words: qs("[data-words]"),
  categories: qs("[data-categories]"),
  tags: qs("[data-tags]"),
  years: qs("[data-years]"),
  alpha: qs("[data-alpha]"),
  query: qs("[data-filter-q]"),
  clearQuery: qs("[data-filter-clear]"),
  sort: qs("[data-sort]"),
  results: qs("[data-results-count]"),
  entries: qs("[data-entries]"),
  empty: qs("[data-empty]"),
};

function initialOf(title) {
  const character = String(title)
    .trim()
    .charAt(0)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase();
  return /[A-Z]/.test(character) ? character : "#";
}

function scorePost(post, tokens) {
  const title = normalizeText(post.title);
  const haystack = post._search || "";
  let score = 0;

  for (const token of tokens) {
    if (title.startsWith(token)) score += 8;
    else if (title.includes(token)) score += 5;
    if (haystack.includes(token)) score += 3;
  }

  return score;
}

function hasFilters() {
  return Boolean(state.q.trim() || state.cat || state.tag || state.year || state.letter);
}

function syncURL() {
  const params = new URLSearchParams();
  const text = state.q.trim();
  if (text) params.set("q", text);
  if (state.cat) params.set("cat", state.cat);
  if (state.tag) params.set("tag", state.tag);
  if (state.year) params.set("year", state.year);
  if (state.letter) params.set("letter", state.letter);
  if (state.sort !== "newest" && state.sort !== "relevance") params.set("sort", state.sort);
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
}

function buildSidebar() {
  elements.categories.innerHTML =
    `<li><button type="button" data-cat=""><span>${t("writing.allCategories")}</span><span class="count">${index.counts.posts}</span></button></li>` +
    index.categories
      .map(
        (category) =>
          `<li><button type="button" data-cat="${category.slug}"><span>${escapeHTML(category.name)}</span><span class="count">${category.count}</span></button></li>`
      )
      .join("");

  elements.tags.innerHTML =
    `<button type="button" data-tag="">${t("writing.allTags")}</button>` +
    index.tags
      .map(
        (tag) => `<button type="button" data-tag="${tag.slug}">${escapeHTML(tag.name)}</button>`
      )
      .join("");

  elements.years.innerHTML =
    `<li><button type="button" data-year=""><span>${t("writing.allYears")}</span><span class="count">${index.counts.posts}</span></button></li>` +
    index.years
      .map(
        (year) =>
          `<li><button type="button" data-year="${year.name}"><span>${year.name}</span><span class="count">${year.count}</span></button></li>`
      )
      .join("");

  const available = new Set(index.posts.map((post) => initialOf(post.title)));
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  if (available.has("#")) letters.push("#");

  elements.alpha.innerHTML =
    `<button type="button" data-letter="" aria-label="${t("writing.allLetters")}">${t("common.all")}</button>` +
    letters
      .map(
        (letter) =>
          `<button type="button" data-letter="${letter}"${available.has(letter) ? "" : " disabled"}>${letter}</button>`
      )
      .join("");
}

function updateFilterStates() {
  qsa("[data-cat]", elements.categories).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.cat === state.cat);
  });
  qsa("[data-tag]", elements.tags).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tag === state.tag);
  });
  qsa("[data-year]", elements.years).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.year === state.year);
  });
  qsa("[data-letter]", elements.alpha).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.letter === state.letter);
  });

  if (
    elements.query &&
    document.activeElement !== elements.query &&
    elements.query.value !== state.q
  ) {
    elements.query.value = state.q;
  }
  if (elements.clearQuery) {
    elements.clearQuery.hidden = !state.q.trim();
  }
  if (elements.sort) {
    elements.sort.value = state.sort;
  }
}

function getFiltered() {
  if (!index) return [];
  const tokens = normalizeText(state.q).split(/\s+/).filter(Boolean);

  const list = index.posts.filter((post) => {
    if (state.cat && post.categorySlug !== state.cat) return false;
    if (state.tag && !post.tagSlugs.includes(state.tag)) return false;
    if (state.year && post.year !== state.year) return false;
    if (state.letter && initialOf(post.title) !== state.letter) return false;

    if (tokens.length) {
      const haystack = post._search || "";
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }

    return true;
  });

  const scores = new Map();
  if (tokens.length) {
    list.forEach((post) => scores.set(post.slug, scorePost(post, tokens)));
  }

  const sortMode = state.sort === "relevance" && !tokens.length ? "newest" : state.sort;

  list.sort((a, b) => {
    if (sortMode === "relevance") {
      return (scores.get(b.slug) || 0) - (scores.get(a.slug) || 0) || b.date.localeCompare(a.date);
    }
    if (sortMode === "oldest") return a.date.localeCompare(b.date);
    if (sortMode === "title") return a.title.localeCompare(b.title, getLang(), { sensitivity: "base" });
    return b.date.localeCompare(a.date);
  });

  return list;
}

function entryMarkup(post) {
  const tags = post.tags
    .slice(0, 3)
    .map(
      (tag, index) =>
        `<a class="tag" href="/writing?tag=${encodeURIComponent(post.tagSlugs[index])}">${escapeHTML(tag)}</a>`
    )
    .join("");

  return `
    <article class="entry">
      <div class="entry__date">
        <strong>${escapeHTML(formatDateShort(post.date, getLang()))}</strong>
        ${escapeHTML(post.year)}
      </div>
      <div>
        <h2><a href="${post.url}">${escapeHTML(post.title)}</a></h2>
        <p class="entry__summary">${escapeHTML(post.summary)}</p>
        <div class="entry__meta">
          <a href="/writing?cat=${encodeURIComponent(post.categorySlug)}">${escapeHTML(post.category)}</a>
          <span>${t("common.minRead", { n: post.minutes })}</span>
          <span>${t("common.wordsCount", { n: post.words.toLocaleString(getLang() === "vi" ? "vi-VN" : "en-GB") })}</span>
          ${tags}
        </div>
      </div>
    </article>`;
}

function render() {
  if (!index) return;
  const list = getFiltered();

  elements.entries.innerHTML = list.map(entryMarkup).join("");
  elements.empty.hidden = list.length > 0;
  elements.entries.hidden = list.length === 0;

  if (elements.results) {
    elements.results.textContent = hasFilters()
      ? t("writing.resultsFiltered", { shown: list.length, total: index.counts.posts })
      : t("writing.resultsAll", { total: index.counts.posts });
  }

  qsa("[data-clear-all]").forEach((button) => {
    button.hidden = !hasFilters();
  });

  updateFilterStates();
  syncURL();
}

function resetFilters() {
  state.q = "";
  state.cat = "";
  state.tag = "";
  state.year = "";
  state.letter = "";
  state.sort = "newest";
  render();
}

function bindSidebar() {
  elements.categories.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-cat]");
    if (!button) return;
    state.cat = button.dataset.cat;
    render();
  });

  elements.tags.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tag]");
    if (!button) return;
    state.tag = button.dataset.tag;
    render();
  });

  elements.years.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-year]");
    if (!button) return;
    state.year = button.dataset.year;
    render();
  });

  elements.alpha.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-letter]");
    if (!button || button.disabled) return;
    state.letter = button.dataset.letter;
    render();
  });
}

function bindToolbar() {
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

  qsa("[data-clear-all]").forEach((button) => {
    button.addEventListener("click", resetFilters);
  });
}

async function init() {
  try {
    index = await getPostsIndex();
    index.posts.forEach((post) => {
      post._search = normalizeText(
        [post.title, post.category, post.tags.join(" "), post.summary, post.excerpt, post.plain].join(" ")
      );
    });
  } catch {
    if (elements.results) elements.results.textContent = t("writing.error");
    return;
  }

  const params = new URLSearchParams(location.search);
  state.q = (params.get("q") || "").trim();
  state.cat = params.get("cat") || "";
  state.tag = params.get("tag") || "";
  state.year = params.get("year") || "";
  state.letter = params.get("letter") || "";
  state.sort = ["relevance", "newest", "oldest", "title"].includes(params.get("sort"))
    ? params.get("sort")
    : state.q
      ? "relevance"
      : "newest";

  if (!index.categories.some((category) => category.slug === state.cat)) state.cat = "";
  if (!index.tags.some((tag) => tag.slug === state.tag)) state.tag = "";
  if (!index.years.some((year) => year.name === state.year)) state.year = "";
  if (state.letter && !/^[A-Z#]$/.test(state.letter)) state.letter = "";

  if (elements.total) elements.total.textContent = String(index.counts.posts);
  if (elements.words) {
    elements.words.textContent = index.counts.words.toLocaleString(
      getLang() === "vi" ? "vi-VN" : "en-GB"
    );
  }

  buildSidebar();
  bindSidebar();
  bindToolbar();
  render();

  onLanguageChange(() => {
    if (!index) return;
    buildSidebar();
    render();
  });
}

init();
