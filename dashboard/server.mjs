#!/usr/bin/env node
/**
 * Bảng điều khiển metadata — một máy chủ nhỏ, chỉ chạy trên máy của bạn.
 *
 *   node dashboard/server.mjs
 *   # hoặc: npm run dashboard
 *
 * Nó đọc và ghi:
 *   content/posts/*.md          (chỉ phần front matter, giữ nguyên nội dung)
 *   content/library/meta.json   (metadata của ảnh và PDF)
 *
 * Sau mỗi lần lưu, nó chạy tools/build.mjs để site được cập nhật.
 *
 * Cấu hình bằng biến môi trường:
 *   SITE_ROOT=/đường/dẫn/tới/site   (mặc định: thư mục cha của dashboard)
 *   PORT=4174
 *   HOST=127.0.0.1
 *   PREVIEW_URL=http://localhost:4173
 *   NO_DASHBOARD_BUILD=1            (không tự build sau khi lưu)
 */
import { createServer } from "node:http";
import { readFile, writeFile, readdir, stat, unlink, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  cleanText,
  normalizeDate,
  normalizeTags,
  parseFrontMatter,
  slugify,
  titleFromFile,
  writePostSource,
} from "./lib/frontmatter.mjs";

const HERE = import.meta.dirname;
const SITE_ROOT = path.resolve(HERE, process.env.SITE_ROOT || "..");
const POSTS_DIR = path.join(SITE_ROOT, "content", "posts");
const LIBRARY_DIR = path.join(SITE_ROOT, "content", "library");
const META_PATH = path.join(LIBRARY_DIR, "meta.json");
const SITE_PATH = path.join(SITE_ROOT, "content", "site.json");
const BUILD_PATH = path.join(SITE_ROOT, "tools", "build.mjs");
const PUBLIC_DIR = path.join(HERE, "public");

const PORT = Number(process.env.PORT) || 4174;
const HOST = process.env.HOST || "127.0.0.1";
const PREVIEW_URL = (process.env.PREVIEW_URL || "http://localhost:4173").replace(/\/+$/, "");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const DOC_EXT = new Set([".pdf"]);
const MAX_UPLOAD = 100 * 1024 * 1024;
const SKIP_FILES = new Set([
  "index.json",
  "index.js",
  "sources.js",
  "meta.json",
  "readme.md",
  "thumbs.db",
  ".ds_store",
]);

for (const dir of [POSTS_DIR, LIBRARY_DIR]) {
  try {
    await stat(dir);
  } catch {
    console.error(`
  Không tìm thấy thư mục:
    ${dir}

  Hãy chạy dashboard từ thư mục gốc của site, hoặc đặt SITE_ROOT:
    SITE_ROOT=/đường/dẫn/tới/site npm start
`);
    process.exit(1);
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendJson(response, status, data) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function sendText(response, status, text) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  response.end(text);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw httpError(413, "Dữ liệu gửi lên quá lớn.");
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, "JSON không hợp lệ.");
  }
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function pathExists(fullPath) {
  try {
    await stat(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function readBinary(request, limit = MAX_UPLOAD) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      throw httpError(413, `Tệp quá lớn. Giới hạn là ${Math.round(limit / 1024 / 1024)} MB.`);
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function sanitizeUploadName(raw) {
  const base = path.basename(String(raw ?? "").replace(/\\/g, "/"));
  const cleaned = base
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-")
    .replace(/[. ]+$/g, "")
    .trim();

  if (!cleaned || cleaned.startsWith(".")) {
    throw httpError(400, "Tên tệp không hợp lệ.");
  }

  return cleaned.slice(0, 180);
}

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

/* -------------------------------------------------------------------------- */
/* reading                                                                    */
/* -------------------------------------------------------------------------- */

async function readSite() {
  try {
    return JSON.parse(await readFile(SITE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function readMetaInfo() {
  try {
    const raw = await readFile(META_PATH, "utf8");
    if (!raw.trim()) return { meta: {} };

    const meta = JSON.parse(raw);
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
      throw new Error("meta.json phải là một đối tượng JSON.");
    }
    return { meta };
  } catch (error) {
    if (error.code === "ENOENT") return { meta: {} };
    return { meta: {}, error: error.message };
  }
}

async function readMetaForWrite() {
  const info = await readMetaInfo();
  if (info.error) {
    throw httpError(
      500,
      `content/library/meta.json không hợp lệ: ${info.error}. Hãy sửa tệp đó trước khi lưu.`
    );
  }
  return info.meta;
}

function postState(file, raw, info) {
  const { data, hasFrontMatter } = parseFrontMatter(raw);
  const fallbackDate = isoDate(info.mtimeMs);

  return {
    file,
    slug: file.replace(/\.md$/i, ""),
    hasFile: true,
    hasMeta: hasFrontMatter,
    mtime: info.mtime.toISOString(),
    meta: {
      title: cleanText(data.title, 300),
      subtitle: cleanText(data.subtitle, 300),
      date: normalizeDate(data.date) || fallbackDate,
      category: cleanText(data.category, 120),
      tags: normalizeTags(data.tags),
      summary: cleanText(data.summary, 4000),
      featured: data.featured === true || String(data.featured).toLowerCase() === "true",
      draft: data.draft === true || String(data.draft).toLowerCase() === "true",
      updated: normalizeDate(data.updated),
    },
  };
}

async function readPosts() {
  const entries = await readdir(POSTS_DIR, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md") || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(POSTS_DIR, entry.name);
    const [raw, info] = await Promise.all([readFile(fullPath, "utf8"), stat(fullPath)]);
    posts.push(postState(entry.name, raw, info));
  }

  posts.sort(
    (a, b) =>
      (b.meta.date || "").localeCompare(a.meta.date || "") ||
      (a.meta.title || a.file).localeCompare(b.meta.title || b.file, "vi")
  );

  return posts;
}

async function readLibrary(meta) {
  const files = (await walk(LIBRARY_DIR))
    .filter((rel) => {
      const base = path.posix.basename(rel).toLowerCase();
      return !SKIP_FILES.has(base) && !rel.split("/").some((part) => part.startsWith("."));
    })
    .sort();

  const items = [];

  for (const rel of files) {
    const ext = path.posix.extname(rel).toLowerCase();
    const isPhoto = IMAGE_EXT.has(ext);
    const isDocument = DOC_EXT.has(ext);
    if (!isPhoto && !isDocument) continue;

    const fullPath = path.join(LIBRARY_DIR, rel);
    const info = await stat(fullPath);
    const base = path.posix.basename(rel);
    const exact = Object.hasOwn(meta, rel);
    const entryKey = exact ? rel : Object.hasOwn(meta, base) ? base : rel;
    const entry = meta[entryKey] && typeof meta[entryKey] === "object" ? meta[entryKey] : {};
    const fallbackTitle = titleFromFile(rel);

    items.push({
      file: rel,
      name: base,
      type: isPhoto ? "photo" : "document",
      ext: ext.slice(1).toUpperCase(),
      hasMeta: exact || Object.hasOwn(meta, base),
      size: info.size,
      mtime: info.mtime.toISOString(),
      meta: {
        title: cleanText(entry.title, 300) || fallbackTitle,
        date: normalizeDate(entry.date) || isoDate(info.mtimeMs),
        description: cleanText(entry.description, 4000),
        tags: normalizeTags(entry.tags),
        collection: cleanText(entry.collection, 120) || (isPhoto ? "Plates" : "Documents"),
      },
    });
  }

  items.sort(
    (a, b) =>
      (b.meta.date || "").localeCompare(a.meta.date || "") ||
      (a.meta.title || a.file).localeCompare(b.meta.title || b.file, "vi")
  );

  return items;
}

async function buildState() {
  const [site, posts, metaInfo] = await Promise.all([readSite(), readPosts(), readMetaInfo()]);
  const library = await readLibrary(metaInfo.meta);

  const categories = [...new Set(posts.map((post) => post.meta.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "vi")
  );
  const tags = [
    ...new Set([
      ...posts.flatMap((post) => post.meta.tags),
      ...library.flatMap((item) => item.meta.tags),
    ]),
  ].sort((a, b) => a.localeCompare(b, "vi"));
  const collections = [...new Set(library.map((item) => item.meta.collection).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "vi")
  );

  return {
    ok: true,
    generated: new Date().toISOString(),
    site: {
      name: cleanText(site.name, 120) || "Bách khoa cá nhân",
      url: cleanText(site.url, 300),
    },
    previewUrl: PREVIEW_URL,
    counts: {
      posts: posts.length,
      drafts: posts.filter((post) => post.meta.draft).length,
      library: library.length,
      photos: library.filter((item) => item.type === "photo").length,
      documents: library.filter((item) => item.type === "document").length,
    },
    categories,
    tags,
    collections,
    posts,
    library,
    metaError: metaInfo.error || null,
  };
}

/* -------------------------------------------------------------------------- */
/* writing                                                                    */
/* -------------------------------------------------------------------------- */

function validatePostFile(file) {
  const name = String(file ?? "");
  if (!name || name.startsWith(".") || !/^[^/\\]+\.md$/i.test(name)) {
    throw httpError(400, "Tên tệp bài viết không hợp lệ.");
  }
  return path.join(POSTS_DIR, name);
}

async function savePost(input) {
  const fullPath = validatePostFile(input?.file);
  let raw;

  try {
    raw = await readFile(fullPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Không tìm thấy bài viết.");
    throw error;
  }

  let next;
  try {
    next = writePostSource(raw, input?.meta || {});
  } catch (error) {
    throw httpError(400, error.message);
  }

  await writeFile(fullPath, next, "utf8");
  console.log(`  saved  content/posts/${path.basename(fullPath)}`);
}

async function deletePost(input) {
  const fullPath = validatePostFile(input?.file);

  try {
    await unlink(fullPath);
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Không tìm thấy bài viết.");
    throw error;
  }

  console.log(`  deleted content/posts/${path.basename(fullPath)}`);
}

async function createPost(input) {
  const title = cleanText(input?.meta?.title, 300);
  if (!title) throw httpError(400, "Tiêu đề không được để trống.");

  const base =
    (slugify(title) === "untitled" ? "bai-viet" : slugify(title))
      .slice(0, 80)
      .replace(/-+$/g, "") || "bai-viet";

  let name = `${base}.md`;
  let counter = 2;
  while (await pathExists(path.join(POSTS_DIR, name))) {
    name = `${base}-${counter}.md`;
    counter += 1;
  }

  let source;
  try {
    source = writePostSource("", input.meta);
  } catch (error) {
    throw httpError(400, error.message);
  }

  await writeFile(path.join(POSTS_DIR, name), source, "utf8");
  console.log(`  created content/posts/${name}`);
  return name;
}

function validateLibraryFile(file) {
  const rel = String(file ?? "").replace(/\\/g, "/");
  if (!rel || rel.startsWith("/") || rel.split("/").some((part) => !part || part === ".." || part.startsWith("."))) {
    throw httpError(400, "Đường dẫn tệp thư viện không hợp lệ.");
  }

  const fullPath = path.resolve(LIBRARY_DIR, rel);
  if (fullPath !== LIBRARY_DIR && !fullPath.startsWith(LIBRARY_DIR + path.sep)) {
    throw httpError(400, "Đường dẫn tệp thư viện không hợp lệ.");
  }

  const ext = path.extname(fullPath).toLowerCase();
  if (!IMAGE_EXT.has(ext) && !DOC_EXT.has(ext)) {
    throw httpError(400, "Chỉ hỗ trợ ảnh và PDF.");
  }

  return { rel, fullPath };
}

async function saveLibrary(input) {
  const { rel, fullPath } = validateLibraryFile(input?.file);

  try {
    await stat(fullPath);
  } catch {
    throw httpError(404, "Không tìm thấy tệp trong thư viện.");
  }

  const meta = await readMetaForWrite();
  const base = path.posix.basename(rel);
  const key = Object.hasOwn(meta, rel) ? rel : Object.hasOwn(meta, base) ? base : rel;
  const existing = meta[key] && typeof meta[key] === "object" ? { ...meta[key] } : {};

  if (input.meta === null || input.meta === undefined) {
    delete meta[key];
  } else {
    const entry = { ...existing };

    const title = cleanText(input.meta.title, 300);
    if (title) entry.title = title;
    else delete entry.title;

    const rawDate = String(input.meta.date ?? "").trim();
    if (rawDate) {
      const date = normalizeDate(rawDate);
      if (!date) throw httpError(400, "Ngày không hợp lệ.");
      entry.date = date;
    } else {
      delete entry.date;
    }

    const description = cleanText(input.meta.description, 4000);
    if (description) entry.description = description;
    else delete entry.description;

    const tags = normalizeTags(input.meta.tags);
    if (tags.length) entry.tags = tags;
    else delete entry.tags;

    const collection = cleanText(input.meta.collection, 120);
    if (collection) entry.collection = collection;
    else delete entry.collection;

    if (Object.keys(entry).length) meta[key] = entry;
    else delete meta[key];
  }

  await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  console.log(`  saved  content/library/meta.json (${rel})`);
}

async function deleteLibrary(input) {
  const { rel, fullPath } = validateLibraryFile(input?.file);

  try {
    await stat(fullPath);
  } catch {
    throw httpError(404, "Không tìm thấy tệp trong thư viện.");
  }

  const metaInfo = await readMetaInfo();
  await unlink(fullPath);
  console.log(`  deleted content/library/${rel}`);

  if (metaInfo.error) {
    console.warn("  meta.json invalid; metadata entry was left as-is");
    return "Tệp đã bị xóa, nhưng meta.json đang lỗi nên mục metadata cũ vẫn còn.";
  }

  const base = path.posix.basename(rel);
  const key = Object.hasOwn(metaInfo.meta, rel) ? rel : Object.hasOwn(metaInfo.meta, base) ? base : null;
  if (!key) return "";

  delete metaInfo.meta[key];

  try {
    await writeFile(META_PATH, `${JSON.stringify(metaInfo.meta, null, 2)}\n`, "utf8");
    console.log(`  removed content/library/meta.json (${key})`);
    return "";
  } catch (error) {
    console.warn("  could not clean metadata:", error.message);
    return `Tệp đã bị xóa, nhưng chưa xóa được mục metadata: ${error.message}`;
  }
}

async function saveUpload(request, rawName) {
  const name = sanitizeUploadName(rawName);
  const ext = path.extname(name).toLowerCase();
  const isPhoto = IMAGE_EXT.has(ext);
  const isDocument = DOC_EXT.has(ext);

  if (!isPhoto && !isDocument) {
    throw httpError(400, "Chỉ hỗ trợ ảnh (JPG, PNG, WebP, AVIF, GIF, SVG) và PDF.");
  }

  const folder = isPhoto ? "photos" : "documents";
  const dir = path.join(LIBRARY_DIR, folder);
  await mkdir(dir, { recursive: true });

  const stem = path.basename(name, ext);
  let targetName = name;
  let counter = 2;
  while (await pathExists(path.join(dir, targetName))) {
    targetName = `${stem}-${counter}${ext}`;
    counter += 1;
  }

  const body = await readBinary(request);
  if (!body.length) throw httpError(400, "Tệp rỗng.");

  await writeFile(path.join(dir, targetName), body);
  const rel = `${folder}/${targetName}`;
  console.log(`  imported content/library/${rel}`);
  return rel;
}

/* -------------------------------------------------------------------------- */
/* rebuild                                                                    */
/* -------------------------------------------------------------------------- */

let buildQueue = Promise.resolve();

function rebuild() {
  if (process.env.NO_DASHBOARD_BUILD === "1") {
    return Promise.resolve({ ok: true, skipped: true, output: "" });
  }

  const run = () =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [BUILD_PATH], {
        cwd: SITE_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output = "";
      const collect = (chunk) => {
        output += chunk.toString();
        if (output.length > 20000) output = output.slice(-20000);
      };

      child.stdout.on("data", collect);
      child.stderr.on("data", collect);

      const timer = setTimeout(() => {
        child.kill("SIGTERM");
      }, 60000);

      child.on("error", (error) => {
        clearTimeout(timer);
        resolve({ ok: false, output: error.message });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) console.log("  site rebuilt");
        else console.warn("  site build failed");
        resolve({ ok: code === 0, code, output });
      });
    });

  buildQueue = buildQueue.then(run, run);
  return buildQueue;
}

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

async function serveStatic(response, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  if (decoded === "/") decoded = "/index.html";

  const fullPath = path.resolve(PUBLIC_DIR, `.${decoded}`);
  if (fullPath !== PUBLIC_DIR && !fullPath.startsWith(PUBLIC_DIR + path.sep)) return false;

  try {
    const info = await stat(fullPath);
    if (info.isDirectory()) return serveStatic(response, `${decoded.replace(/\/?$/, "/")}index.html`);

    const body = await readFile(fullPath);
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(fullPath).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-store",
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/api/") && request.method !== "GET" && !sameOrigin(request)) {
      throw httpError(403, "Yêu cầu không cùng nguồn.");
    }

    if (pathname === "/api/state" && request.method === "GET") {
      sendJson(response, 200, await buildState());
      return;
    }

    if (pathname === "/api/posts" && request.method === "POST") {
      const input = await readJson(request);
      const file = await createPost(input);
      const build = await rebuild();
      sendJson(response, 200, { ok: true, file, build, state: await buildState() });
      return;
    }

    if (pathname === "/api/posts" && request.method === "PUT") {
      const input = await readJson(request);
      await savePost(input);
      const build = await rebuild();
      sendJson(response, 200, { ok: true, build, state: await buildState() });
      return;
    }

    if (pathname === "/api/posts" && request.method === "DELETE") {
      const input = await readJson(request);
      await deletePost(input);
      const build = await rebuild();
      sendJson(response, 200, { ok: true, build, state: await buildState() });
      return;
    }

    if (pathname === "/api/library" && request.method === "PUT") {
      const input = await readJson(request);
      await saveLibrary(input);
      const build = await rebuild();
      sendJson(response, 200, { ok: true, build, state: await buildState() });
      return;
    }

    if (pathname === "/api/library" && request.method === "DELETE") {
      const input = await readJson(request);
      const warning = await deleteLibrary(input);
      const build = await rebuild();
      sendJson(response, 200, { ok: true, warning: warning || null, build, state: await buildState() });
      return;
    }

    if (pathname === "/api/library/upload" && request.method === "POST") {
      const file = await saveUpload(request, url.searchParams.get("name"));
      sendJson(response, 200, { ok: true, file });
      return;
    }

    if (pathname === "/api/rebuild" && request.method === "POST") {
      sendJson(response, 200, { ok: true, build: await rebuild() });
      return;
    }

    if (request.method === "GET" && (await serveStatic(response, pathname))) return;

    sendText(response, 404, "404 — không tìm thấy.");
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("  error:", error.message);
    sendJson(response, status, { ok: false, error: error.message || "Đã xảy ra lỗi." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`
  Bảng điều khiển metadata
  http://${HOST}:${PORT}

  Site: ${SITE_ROOT}
  Xem trước: ${PREVIEW_URL}

  Nhấn Ctrl+C để dừng.
`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`
  Cổng ${PORT} đang được dùng.

  Thử cổng khác:
    PORT=4175 npm run dashboard
`);
    return;
  }
  console.error("\nKhông khởi động được máy chủ:", error.message, "\n");
  process.exitCode = 1;
});
