#!/usr/bin/env node
/**
 * new-post.mjs — create a new markdown article with front matter.
 *
 *   npm run new -- "The title of the piece" --category=Analysis --tags="Euler, Series"
 *
 * New posts start as drafts so a half-finished file never appears on the site.
 * Flip `draft: false` (or remove the line) when it is ready.
 */
import { writeFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const args = process.argv.slice(2);
const flags = {};
const words = [];

for (const arg of args) {
  if (arg.startsWith("--")) {
    const [key, ...rest] = arg.slice(2).split("=");
    flags[key] = rest.join("=");
  } else {
    words.push(arg);
  }
}

const title = words.join(" ").trim();
if (!title) {
  console.log(`
Usage
  npm run new -- "Your title here" [--category=Analysis] [--tags="Euler, Series"] [--summary="..."]

The new post is created as a draft in content/posts/.
`);
  process.exit(1);
}

const slug = slugify(title);
let filename = `${slug}.md`;
let fullPath = path.join(POSTS_DIR, filename);
let counter = 2;

while (true) {
  try {
    await access(fullPath);
    filename = `${slug}-${counter}.md`;
    fullPath = path.join(POSTS_DIR, filename);
    counter += 1;
  } catch {
    break;
  }
}

const tags = (flags.tags || "")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);

const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
subtitle: ""
date: ${todayISO()}
category: ${flags.category || "Notes"}
tags: [${tags.map((tag) => `"${tag.replace(/"/g, '\\"')}"`).join(", ")}]
summary: "${(flags.summary || "").replace(/"/g, '\\"')}"
featured: false
draft: true
---

Write the opening paragraph here. Inline mathematics uses $a^2 + b^2 = c^2$ and
display mathematics uses:

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

## A first section

Keep the writing. Add photographs with:

![A caption for the plate](content/library/photos/your-photo.jpg)

<div class="note">
<p class="note__title">A note</p>
<p>Aside text goes here.</p>
</div>
`;

await writeFile(fullPath, frontMatter, "utf8");

console.log(`
  Created content/posts/${filename}

  It is marked draft: true, so it will not appear on the site yet.
  When it is ready, set draft: false and run: npm run build
`);
