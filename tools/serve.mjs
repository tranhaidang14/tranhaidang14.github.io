#!/usr/bin/env node
/**
 * serve.mjs — a tiny zero-dependency static server for local preview.
 *
 *   npm start        (builds first, then serves)
 *   npm run serve    (serves and watches content without the initial build)
 *
 * While the server runs, edits to content/ trigger a rebuild automatically;
 * reload the page to see them. Set NO_WATCH=1 to disable the watcher.
 *
 * Open http://localhost:4173
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = Number(process.env.PORT) || 4173;

const GENERATED_CONTENT = new Set(["index.json", "index.js", "sources.js", "site.js"]);
const REBUILD_EXT = new Set([
  ".md", ".json", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".pdf",
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

async function resolveFile(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  } catch {
    return null;
  }

  if (pathname.endsWith("/")) pathname += "index.html";

  const fullPath = path.resolve(ROOT, "." + pathname);
  if (fullPath !== ROOT && !fullPath.startsWith(ROOT + path.sep)) return null;

  try {
    const info = await stat(fullPath);
    if (info.isDirectory()) return resolveFile(pathname.replace(/\/?$/, "/") + "index.html");
    return fullPath;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const filePath = await resolveFile(request.url || "/");

  if (!filePath) {
    try {
      const notFound = await readFile(path.join(ROOT, "404.html"));
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(notFound);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404 — not found");
    }
    console.log(`  404  ${request.url}`);
    return;
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-store",
    });
    if (request.method === "HEAD") response.end();
    else response.end(body);
    console.log(`  200  ${request.url}`);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("500 — " + error.message);
  }
});

server.listen(PORT, () => {
  console.log(`
  Encyclopedia served locally
  http://localhost:${PORT}

  Press Ctrl+C to stop.
`);

  watchContent();
});

let buildRunning = false;
let buildQueued = false;

function needsRebuild(filename) {
  if (!filename) return true;
  const base = path.basename(String(filename)).toLowerCase();
  if (GENERATED_CONTENT.has(base) || base.startsWith(".")) return false;
  return REBUILD_EXT.has(path.extname(base));
}

function rebuild() {
  if (buildRunning) {
    buildQueued = true;
    return;
  }

  buildRunning = true;
  console.log("\n  Content changed — rebuilding…");

  const child = spawn(process.execPath, [path.join(ROOT, "tools", "build.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    buildRunning = false;
    if (code !== 0) {
      console.log("  Build failed. Fix the error and save again.\n");
    } else {
      console.log("  Reload the page to see the change.\n");
    }
    if (buildQueued) {
      buildQueued = false;
      rebuild();
    }
  });
}

function watchContent() {
  if (process.env.NO_WATCH === "1") return;

  let timer = null;
  try {
    const watcher = watch(path.join(ROOT, "content"), { recursive: true }, (_event, filename) => {
      if (!needsRebuild(filename)) return;
      clearTimeout(timer);
      timer = setTimeout(rebuild, 180);
    });

    watcher.on("error", (error) => {
      console.warn("  Content watch stopped:", error.message);
    });

    console.log("  Watching content/ — edit a file, then reload the page.\n");
  } catch (error) {
    console.warn("  Could not watch content/:", error.message, "\n");
  }
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`
  Port ${PORT} is already in use.

  The site may already be running at:
  http://localhost:${PORT}

  To start another copy, choose a different port:
  PORT=4174 npm start

  To stop the process using this port (Linux):
  fuser -k ${PORT}/tcp
`);
    return;
  }

  console.error("\nCould not start the local server:", error.message, "\n");
  process.exitCode = 1;
});
