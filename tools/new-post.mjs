#!/usr/bin/env node
/**
 * new-post.mjs — create a new markdown article.
 *
 *   npm run new -- "The title of the piece" --category=Geometry --tags="Euler, Series"
 *
 * The post is published by default. Pass --draft to keep it hidden until it is
 * ready. Categories are free-form: whatever you pass to --category becomes a
 * filter on the writing page automatically.
 */
import { writeFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
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

function quote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
  npm run new -- "Tiêu đề bài viết" [--category=Hình học] [--tags="Bất đẳng thức, Tối ưu"] [--summary="..."] [--draft]

  --category   Nhóm bài viết. Nhóm mới được tạo tự động.
  --tags       Danh sách thẻ, phân tách bằng dấu phẩy.
  --summary    Mô tả ngắn hiển thị ở trang chủ và kết quả tìm kiếm.
  --draft      Ẩn bài khỏi site cho đến khi bạn đổi draft thành false.

The new post is written to content/posts/ and the site is rebuilt automatically.
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

const category = (flags.category || "Ghi chú").trim() || "Ghi chú";
const isDraft = "draft" in flags ? flags.draft !== "false" : false;

const frontMatter = `---
title: ${quote(title)}
subtitle: ""
date: ${todayISO()}
category: ${quote(category)}
tags: [${tags.map(quote).join(", ")}]
summary: ${quote(flags.summary || "")}
featured: false
draft: ${isDraft}
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

console.log(`\n  Created content/posts/${filename}`);

const build = spawnSync(process.execPath, [path.join(ROOT, "tools", "build.mjs")], {
  cwd: ROOT,
  stdio: "inherit",
});

if (build.status !== 0) {
  console.error("\nThe post was created, but the site rebuild failed. Run npm run build to try again.\n");
  process.exit(build.status ?? 1);
}

console.log(
  isDraft
    ? `
  The post is a draft, so it is not on the site yet.
  Set draft: false in the file, then run npm run build.
`
    : `
  Category "${category}" is now part of the writing filters.
  Open article.html?p=${encodeURIComponent(slug)} to read it.
`
);
