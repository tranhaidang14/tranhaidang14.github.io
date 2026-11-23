#!/usr/bin/env node
/**
 * dev.mjs — run the local site and the metadata dashboard together.
 *
 *   npm run dev
 *
 * Builds once, then starts:
 *   tools/serve.mjs          the site preview (default port 4173)
 *   dashboard/server.mjs     the local dashboard (default port 4174)
 *
 * Both links are printed together. Ctrl+C stops both.
 *
 * Optional environment:
 *   SITE_PORT=4173        port for the site preview
 *   DASHBOARD_PORT=4174   port for the dashboard
 *   SITE_HOST=localhost   host shown in the site link
 *   DASHBOARD_HOST=127.0.0.1
 */
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE_PORT = Number(process.env.SITE_PORT || process.env.PORT) || 4173;
const DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT) || 4174;

if (SITE_PORT === DASHBOARD_PORT) {
  console.error(`
  Cổng bị trùng: site và dashboard cùng dùng cổng ${SITE_PORT}.

  Đặt hai cổng khác nhau, ví dụ:
    SITE_PORT=4173 DASHBOARD_PORT=4174 npm run dev
`);
  process.exit(1);
}

const SITE_HOST = process.env.SITE_HOST || "localhost";
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || process.env.HOST || "127.0.0.1";
const dashboardLinkHost = ["0.0.0.0", "::", "::1"].includes(DASHBOARD_HOST)
  ? "localhost"
  : DASHBOARD_HOST;

const siteUrl = `http://${SITE_HOST}:${SITE_PORT}`;
const dashboardUrl = `http://${dashboardLinkHost}:${DASHBOARD_PORT}`;

function probeHost(host) {
  if (!host || ["localhost", "0.0.0.0", "::", "::1"].includes(host)) return "127.0.0.1";
  return host;
}

function portInUse(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const finish = (inUse) => {
      socket.destroy();
      resolve(inUse);
    };

    socket.setTimeout(600);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

const conflicts = [];
if (await portInUse(SITE_PORT)) conflicts.push(`site (${SITE_PORT})`);
if (await portInUse(DASHBOARD_PORT, probeHost(DASHBOARD_HOST))) {
  conflicts.push(`dashboard (${DASHBOARD_PORT})`);
}

if (conflicts.length) {
  console.error(`
  Cổng đang được dùng: ${conflicts.join(", ")}.

  Dừng tiến trình cũ trước, hoặc chọn cổng khác:
    SITE_PORT=4183 DASHBOARD_PORT=4184 npm run dev
`);
  process.exit(1);
}

const build = spawnSync(process.execPath, [path.join(ROOT, "tools", "build.mjs")], {
  cwd: ROOT,
  stdio: "inherit",
});

if (build.status !== 0) {
  console.error("  Build failed. Fix the error above, then run npm run dev again.\n");
  process.exit(build.status ?? 1);
}

console.log(`
  ──────────────────────────────────────────
  Trang web   ${siteUrl}
  Dashboard   ${dashboardUrl}
  ──────────────────────────────────────────

  Nhấn Ctrl+C để dừng cả hai.
`);

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of children) {
    if (!child.killed) child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(code), 250).unref();
}

function start(name, script, env) {
  const child = spawn(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  children.push({ name, child });

  child.on("error", (error) => {
    if (shuttingDown) return;
    console.error(`\n  Không chạy được ${name}: ${error.message}\n`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`\n  ${name} đã dừng (${signal || `mã ${code}`}). Đang dừng phần còn lại…\n`);
    shutdown(code ?? 1);
  });
}

start("site", path.join("tools", "serve.mjs"), {
  PORT: String(SITE_PORT),
});

start("dashboard", path.join("dashboard", "server.mjs"), {
  PORT: String(DASHBOARD_PORT),
  HOST: DASHBOARD_HOST,
  PREVIEW_URL: process.env.PREVIEW_URL || siteUrl,
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
