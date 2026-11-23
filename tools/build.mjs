#!/usr/bin/env node
/**
 * build.mjs — turns content/ into the JSON indexes the site reads.
 *
 *   content/posts/*.md      -> content/posts/index.json
 *   content/library/**      -> content/library/index.json
 *   feed.xml, sitemap.xml
 *
 * No dependencies. Run with: npm run build
 */
import { readFile, writeFile, readdir, stat, open, unlink } from "node:fs/promises";
import path from "node:path";
import { bundleScripts, BUNDLE_ENTRIES } from "./bundle.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const LIBRARY_DIR = path.join(ROOT, "content", "library");
const SITE_FILE = path.join(ROOT, "content", "site.json");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const DOC_EXT = new Set([".pdf"]);
const SKIP_FILES = new Set(["index.json", "index.js", "sources.js", "meta.json", "readme.md", "thumbs.db", ".ds_store"]);

/* -------------------------------------------------------------------------- */
/* small helpers                                                              */
/* -------------------------------------------------------------------------- */

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function toISODate(value, fallback) {
  if (!value) return fallback;
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return fallback;
}

function dateLabel(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function shortDate(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1].slice(0, 3)}`;
}

function escapeXML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripQuotes(value) {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

function splitInlineList(inner) {
  const parts = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];

    if (quote) {
      current += char;
      if (quote === '"' && char === "\\" && i + 1 < inner.length) {
        current += inner[i + 1];
        i += 1;
        continue;
      }
      if (char === quote) {
        if (quote === "'" && inner[i + 1] === "'") {
          current += inner[i + 1];
          i += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);

  return parts.map(stripQuotes).filter((item) => item !== "");
}

/* -------------------------------------------------------------------------- */
/* front matter                                                               */
/* -------------------------------------------------------------------------- */

function parseFrontMatter(raw) {
  const source = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: source };

  const data = {};
  let listKey = null;

  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && listKey) {
      data[listKey].push(stripQuotes(listItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!pair) continue;

    const key = pair[1];
    const value = pair[2].trim();

    if (!value) {
      data[key] = [];
      listKey = key;
      continue;
    }

    listKey = null;

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner ? splitInlineList(inner) : [];
    } else if (/^(true|false)$/i.test(value)) {
      data[key] = value.toLowerCase() === "true";
    } else if (/^\d+(\.\d+)?$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = stripQuotes(value);
    }
  }

  return { data, body: source.slice(match[0].length) };
}

/* -------------------------------------------------------------------------- */
/* markdown helpers                                                          */
/* -------------------------------------------------------------------------- */

function markdownToPlain(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]*\$/g, " ")
    .replace(/[*_`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadings(md) {
  const headings = [];
  for (const match of md.matchAll(/^(#{2,3})\s+(.+?)\s*#*$/gm)) {
    const text = match[2]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) headings.push({ level: match[1].length, text });
  }
  return headings;
}

function wordCount(text) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}

/* -------------------------------------------------------------------------- */
/* posts                                                                      */
/* -------------------------------------------------------------------------- */

async function buildPosts() {
  const files = (await readdir(POSTS_DIR))
    .filter((file) => file.endsWith(".md") && !file.startsWith("."))
    .sort();

  const posts = [];
  const skipped = [];
  const sources = {};

  for (const file of files) {
    const fullPath = path.join(POSTS_DIR, file);
    const raw = await readFile(fullPath, "utf8");
    const { data, body } = parseFrontMatter(raw);
    const info = await stat(fullPath);
    const slug = file.replace(/\.md$/, "");

    if (String(data.draft).toLowerCase() === "true" || data.draft === true) {
      skipped.push(`${file} (draft)`);
      continue;
    }

    if (!data.title) {
      throw new Error(`Missing "title" in front matter: content/posts/${file}`);
    }

    const date = toISODate(data.date, info.mtime.toISOString().slice(0, 10));
    const updated = toISODate(data.updated, date);
    const plain = markdownToPlain(body);
    const words = wordCount(plain);
    const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
    const category = data.category || "Uncategorised";
    const summary = data.summary || plain.slice(0, 180) + (plain.length > 180 ? "…" : "");
    const headings = extractHeadings(body);
    sources[slug] = body;

    posts.push({
      slug,
      title: data.title,
      subtitle: data.subtitle || "",
      date,
      updated,
      dateLabel: dateLabel(date),
      updatedLabel: dateLabel(updated),
      shortDate: shortDate(date),
      year: date.slice(0, 4),
      category,
      categorySlug: slugify(category),
      tags,
      tagSlugs: tags.map(slugify),
      summary,
      featured: data.featured === true,
      words,
      minutes: Math.max(1, Math.round(words / 220)),
      headings,
      excerpt: plain.slice(0, 700),
      plain: plain.slice(0, 2400),
      url: `article.html?p=${encodeURIComponent(slug)}`,
      source: `content/posts/${encodeURIComponent(file)}`,
    });
  }

  posts.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)));

  const categoryMap = new Map();
  const tagMap = new Map();
  const yearMap = new Map();

  for (const post of posts) {
    categoryMap.set(post.category, (categoryMap.get(post.category) || 0) + 1);
    yearMap.set(post.year, (yearMap.get(post.year) || 0) + 1);
    for (const tag of post.tags) tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
  }

  const byCountThenName = (a, b) =>
    b.count - a.count || a.name.localeCompare(b.name, "en", { sensitivity: "base" });

  const categories = [...categoryMap.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort(byCountThenName);

  const tags = [...tagMap.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort(byCountThenName);

  const years = [...yearMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.name.localeCompare(a.name));

  const totalWords = posts.reduce((sum, post) => sum + post.words, 0);

  const index = {
    generated: new Date().toISOString(),
    counts: {
      posts: posts.length,
      words: totalWords,
      categories: categories.length,
      tags: tags.length,
    },
    categories,
    tags,
    years,
    posts,
  };

  await writeFile(path.join(POSTS_DIR, "index.json"), JSON.stringify(index, null, 2) + "\n");

  const namespace = "window.__ENCYCLOPEDIA__ = window.__ENCYCLOPEDIA__ || {};\n";
  await writeFile(
    path.join(POSTS_DIR, "index.js"),
    namespace + `window.__ENCYCLOPEDIA__.posts = ${JSON.stringify(index)};\n`
  );
  await writeFile(
    path.join(POSTS_DIR, "sources.js"),
    namespace + `window.__ENCYCLOPEDIA__.sources = ${JSON.stringify(sources)};\n`
  );

  return { index, skipped, categories, tags, years, posts };
}

/* -------------------------------------------------------------------------- */
/* images                                                                     */
/* -------------------------------------------------------------------------- */

function svgRatio(buffer, text) {
  const viewBox = text.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return parts[2] / parts[3];
  }
  const width = text.match(/\bwidth\s*=\s*["'](\d+(?:\.\d+)?)/i);
  const height = text.match(/\bheight\s*=\s*["'](\d+(?:\.\d+)?)/i);
  if (width && height && Number(height[1]) > 0) return Number(width[1]) / Number(height[1]);
  return undefined;
}

function pngRatio(buffer) {
  if (buffer.length < 24) return undefined;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return width && height ? width / height : undefined;
}

function jpegRatio(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return width && height ? width / height : undefined;
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (!length) break;
    offset += 2 + length;
  }
  return undefined;
}

async function imageRatio(fullPath, ext) {
  try {
    const buffer = await readFile(fullPath);
    if (ext === ".svg") return svgRatio(buffer, buffer.toString("utf8"));
    if (ext === ".png") return pngRatio(buffer);
    if (ext === ".jpg" || ext === ".jpeg") return jpegRatio(buffer);
  } catch {
    /* ratio is nice-to-have, never fatal */
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* library                                                                    */
/* -------------------------------------------------------------------------- */

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, base)));
    } else {
      files.push(path.relative(base, fullPath).split(path.sep).join("/"));
    }
  }
  return files;
}

async function buildLibrary() {
  const metaPath = path.join(LIBRARY_DIR, "meta.json");
  let meta = {};
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8"));
  } catch {
    meta = {};
  }

  const files = (await walk(LIBRARY_DIR))
    .filter((rel) => {
      const base = path.basename(rel).toLowerCase();
      return !SKIP_FILES.has(base) && !rel.split("/").some((part) => part.startsWith("."));
    })
    .sort();

  const items = [];

  for (const rel of files) {
    const ext = path.extname(rel).toLowerCase();
    const isPhoto = IMAGE_EXT.has(ext);
    const isDocument = DOC_EXT.has(ext);
    if (!isPhoto && !isDocument) continue;

    const fullPath = path.join(LIBRARY_DIR, rel);
    const info = await stat(fullPath);
    const stem = path.basename(rel, ext);
    const fallbackTitle = stem
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => (word ? word[0].toLocaleUpperCase("vi") + word.slice(1) : word))
      .join(" ");
    const entry = meta[rel] || meta[path.basename(rel)] || {};

    const date = toISODate(entry.date, info.mtime.toISOString().slice(0, 10));
    const tags = Array.isArray(entry.tags) ? entry.tags : entry.tags ? [entry.tags] : [];
    const id = slugify(rel.replace(/\.[^.]+$/, ""));

    items.push({
      id,
      type: isPhoto ? "photo" : "document",
      src: encodeURI(`content/library/${rel}`),
      file: rel,
      title: entry.title || fallbackTitle,
      date,
      dateLabel: dateLabel(date),
      shortDate: shortDate(date),
      description: entry.description || "",
      tags,
      collection: entry.collection || (isPhoto ? "Plates" : "Documents"),
      ratio: isPhoto ? await imageRatio(fullPath, ext) : undefined,
      ext: ext.slice(1).toUpperCase(),
    });
  }

  items.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)));

  const collections = [...new Set(items.map((item) => item.collection))]
    .map((name) => ({
      name,
      slug: slugify(name),
      count: items.filter((item) => item.collection === name).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const counts = {
    total: items.length,
    photos: items.filter((item) => item.type === "photo").length,
    documents: items.filter((item) => item.type === "document").length,
  };

  const index = {
    generated: new Date().toISOString(),
    counts,
    collections,
    items,
  };

  await writeFile(path.join(LIBRARY_DIR, "index.json"), JSON.stringify(index, null, 2) + "\n");
  await writeFile(
    path.join(LIBRARY_DIR, "index.js"),
    "window.__ENCYCLOPEDIA__ = window.__ENCYCLOPEDIA__ || {};\n" +
      `window.__ENCYCLOPEDIA__.library = ${JSON.stringify(index)};\n`
  );
  return { index, counts, items };
}

/* -------------------------------------------------------------------------- */
/* feed + sitemap                                                             */
/* -------------------------------------------------------------------------- */

async function buildFeed(site, posts) {
  const base = (site.url || "https://example.com").replace(/\/+$/, "");
  const now = new Date().toUTCString();

  const items = posts
    .slice(0, 30)
    .map((post) => {
      const link = `${base}/${post.url}`;
      return `    <item>
      <title>${escapeXML(post.title)}</title>
      <link>${escapeXML(link)}</link>
      <guid isPermaLink="true">${escapeXML(link)}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${escapeXML(post.category)}</category>
      <description>${escapeXML(post.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXML(site.name)} — ${escapeXML(site.tagline || "A Personal Encyclopedia")}</title>
    <link>${escapeXML(base)}/</link>
    <atom:link href="${escapeXML(base)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXML(site.description || "")}</description>
    <language>vi</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>`;

  await writeFile(path.join(ROOT, "feed.xml"), xml + "\n");
}

async function buildSitemap(site, posts) {
  const base = (site.url || "https://example.com").replace(/\/+$/, "");
  const pages = ["", "writing.html", "library.html", "about.html"];
  const urls = [
    ...pages.map((page) => ({ loc: `${base}/${page}`, lastmod: new Date().toISOString().slice(0, 10) })),
    ...posts.map((post) => ({ loc: `${base}/${post.url}`, lastmod: post.updated || post.date })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXML(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

  await writeFile(path.join(ROOT, "sitemap.xml"), xml + "\n");
}

/* -------------------------------------------------------------------------- */
/* main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  let site = {};
  try {
    site = JSON.parse(await readFile(SITE_FILE, "utf8"));
  } catch {
    console.warn("! content/site.json not found or invalid — using defaults");
  }

  const { index, skipped, posts, categories, tags } = await buildPosts();
  const library = await buildLibrary();

  await writeFile(
    path.join(ROOT, "content", "site.js"),
    "window.__ENCYCLOPEDIA__ = window.__ENCYCLOPEDIA__ || {};\n" +
      `window.__ENCYCLOPEDIA__.site = ${JSON.stringify(site)};\n`
  );

  await buildFeed(site, posts);
  await buildSitemap(site, posts);
  await bundleScripts(BUNDLE_ENTRIES);

  console.log("");
  console.log("  Encyclopedia built");
  console.log("  ──────────────────────────────────────────");
  console.log(`  articles     ${String(posts.length).padStart(4)}`);
  console.log(`  words        ${String(index.counts.words).padStart(4)}`);
  console.log(`  categories   ${String(categories.length).padStart(4)}   ${categories.map((c) => c.name).join(", ")}`);
  console.log(`  tags         ${String(tags.length).padStart(4)}`);
  console.log(`  library      ${String(library.counts.total).padStart(4)}   ${library.counts.photos} plates, ${library.counts.documents} documents`);
  if (skipped.length) console.log(`  drafts       ${String(skipped.length).padStart(4)}   ${skipped.join(", ")}`);
  console.log("  ──────────────────────────────────────────");
  console.log("  index.json, feed.xml, sitemap.xml and scripts written");
  console.log("");
}

/* A small lock keeps a manual build and the dev-server watcher from writing the
 * same indexes at the same time. */
async function acquireBuildLock() {
  const lockPath = path.join(ROOT, ".build.lock");
  const started = Date.now();

  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(String(process.pid));
      return handle;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      try {
        const info = await stat(lockPath);
        if (Date.now() - info.mtimeMs > 30_000) {
          await unlink(lockPath).catch(() => {});
          continue;
        }
      } catch {
        /* The other build may have just released it. */
      }

      if (Date.now() - started > 30_000) {
        throw new Error("Another build is still running. Remove .build.lock if it is stale.");
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function releaseBuildLock(handle) {
  await handle.close().catch(() => {});
  await unlink(path.join(ROOT, ".build.lock")).catch(() => {});
}

const buildLock = await acquireBuildLock();

main()
  .catch((error) => {
    console.error("\nBuild failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(() => releaseBuildLock(buildLock));
