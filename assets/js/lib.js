/**
 * lib.js — shared helpers and cached data access.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function dateParts(iso) {
  const match = String(iso || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatDateLong(iso, lang = "vi") {
  const parts = dateParts(iso);
  if (!parts) return "";
  if (lang === "vi") return `${parts.day} tháng ${parts.month}, ${parts.year}`;
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function formatDateShort(iso, lang = "vi") {
  const parts = dateParts(iso);
  if (!parts) return "";
  if (lang === "vi") {
    return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
  }
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1]}`;
}

export function debounce(fn, wait = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function fetchJSON(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.json();
}

const cache = new Map();

function globalData(key) {
  if (typeof window === "undefined") return null;
  const store = window.__ENCYCLOPEDIA__;
  return store && store[key] ? store[key] : null;
}

function cached(key, url, globalKey) {
  if (!cache.has(key)) {
    const promise = Promise.resolve()
      .then(() => {
        /* Generated data scripts let the site work from disk, without fetch. */
        const built = globalData(globalKey);
        if (built) return built;
        return fetchJSON(url);
      })
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, promise);
  }
  return cache.get(key);
}

export const getPostsIndex = () => cached("posts", "content/posts/index.json", "posts");
export const getLibraryIndex = () => cached("library", "content/library/index.json", "library");
export const getSite = () => cached("site", "content/site.json", "site");
