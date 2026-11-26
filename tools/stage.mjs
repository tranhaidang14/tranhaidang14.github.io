/**
 * stage.mjs — collect the deployable site into `_site/`.
 *
 * Cloudflare Pages should use:
 *   Build command:    npm run build:pages
 *   Output directory: _site
 *
 * Keeping the output in its own folder means `node_modules/`, `tools/`,
 * `dashboard/` and the Markdown sources are never published by accident.
 */
import { readdir, readFile, rm, mkdir, cp } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "_site");

const SHELLS = [
  "index.html",
  "writing.html",
  "library.html",
  "about.html",
  "article.html",
  "404.html",
];

const FILES = ["feed.xml", "sitemap.xml", "robots.txt", ".nojekyll", "_headers"];
const DIRECTORIES = ["assets", "content"];

async function copyIfPresent(from, to, options = {}) {
  try {
    await cp(from, to, { recursive: true, ...options });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const staged = [];

for (const name of [...SHELLS, ...FILES]) {
  if (await copyIfPresent(path.join(ROOT, name), path.join(OUT, name))) staged.push(name);
}

/* Post pages are the generated `*.html` files at the repository root. */
for (const entry of await readdir(ROOT)) {
  if (!entry.endsWith(".html") || SHELLS.includes(entry)) continue;
  const head = (await readFile(path.join(ROOT, entry), "utf8")).slice(0, 400);
  if (!head.includes("generated-post")) continue;
  await cp(path.join(ROOT, entry), path.join(OUT, entry));
  staged.push(entry);
}

for (const directory of DIRECTORIES) {
  /* Markdown files are build inputs; drafts in particular must never be
   * reachable as plain text on the public site. */
  const options =
    directory === "content"
      ? { filter: (source) => !source.toLowerCase().endsWith(".md") }
      : {};
  if (await copyIfPresent(path.join(ROOT, directory), path.join(OUT, directory), options)) {
    staged.push(`${directory}/`);
  }
}

console.log(`\n  Staged ${staged.length} entries into _site/`);
for (const entry of staged) console.log(`    ${entry}`);
console.log("");
