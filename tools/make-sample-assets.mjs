#!/usr/bin/env node
/**
 * make-sample-assets.mjs — regenerates the demo plates, figures and PDFs.
 *
 * This script exists only to produce the sample library that ships with the
 * template. Replace the samples with your own files and you never need to run
 * it again.
 *
 *   node tools/make-sample-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PHOTOS = path.join(ROOT, "content", "library", "photos");
const DOCS = path.join(ROOT, "content", "library", "documents");
const FIGURES = path.join(ROOT, "content", "posts", "figures");

const INK = "#111111";
const FADED = "#8a8a85";
const RULE = "#d6d3ca";
const SEAL = "#7d1d1d";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

const fmt = (n) => Number(n.toFixed(2));

function svgDoc(width, height, content, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t">
  <title id="t">${title}</title>
  <rect width="${width}" height="${height}" fill="#ffffff"/>
${content}
</svg>
`;
}

function pathFromPoints(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`).join(" ");
}

function lissajous() {
  const width = 800;
  const height = 1000;
  const cx = 400;
  const cy = 470;
  const A = 278;
  const B = 326;

  const curves = [
    { phase: 0, opacity: 0.92, strokeWidth: 1.5 },
    { phase: 1.05, opacity: 0.38, strokeWidth: 0.9 },
    { phase: 2.1, opacity: 0.22, strokeWidth: 0.8 },
  ];

  const paths = curves
    .map(({ phase, opacity, strokeWidth }) => {
      const points = [];
      for (let i = 0; i <= 720; i += 1) {
        const t = (i / 720) * Math.PI * 2;
        points.push([cx + A * Math.sin(3 * t + phase), cy + B * Math.sin(2 * t + phase * 0.5)]);
      }
      return `<path d="${pathFromPoints(points)}" fill="none" stroke="${INK}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"/>`;
    })
    .join("\n");

  const ticks = [];
  for (let i = -4; i <= 4; i += 1) {
    if (i === 0) continue;
    const y = cy + (B / 4) * i;
    const x = cx + (A / 4) * i;
    ticks.push(`<line x1="${cx - 8}" y1="${fmt(y)}" x2="${cx + 8}" y2="${fmt(y)}" stroke="${FADED}" stroke-width="1"/>`);
    ticks.push(`<line x1="${fmt(x)}" y1="${cy - 8}" x2="${fmt(x)}" y2="${cy + 8}" stroke="${FADED}" stroke-width="1"/>`);
  }

  const content = `
  <g>
    <line x1="80" y1="${cy}" x2="720" y2="${cy}" stroke="${FADED}" stroke-width="0.8" stroke-dasharray="2 5" opacity="0.6"/>
    <line x1="${cx}" y1="90" x2="${cx}" y2="850" stroke="${FADED}" stroke-width="0.8" stroke-dasharray="2 5" opacity="0.6"/>
    ${ticks.join("\n    ")}
    <circle cx="${cx}" cy="${cy}" r="${B}" fill="none" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="1 7"/>
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="3.2" fill="${SEAL}"/>
  </g>
  <text x="400" y="930" text-anchor="middle" font-family="${SERIF}" font-size="19" font-style="italic" fill="#555">x = sin 3t,&#160;&#160;y = sin 2t</text>
  <text x="400" y="958" text-anchor="middle" font-family="${SERIF}" font-size="11" letter-spacing="3" fill="${FADED}">FIG. I</text>
`;
  return svgDoc(width, height, content, "Lissajous figures, three phases");
}

function harmonograph() {
  const width = 800;
  const height = 1000;
  const cx = 400;
  const cy = 480;
  const A = 276;
  const B = 318;

  const layers = [
    { phase: 0.0, opacity: 0.85, width: 1.3 },
    { phase: 1.7, opacity: 0.34, width: 0.9 },
    { phase: 3.1, opacity: 0.22, width: 0.8 },
  ];

  const paths = layers
    .map(({ phase, opacity, width: sw }) => {
      const points = [];
      const steps = 1800;
      const decay = 0.018;
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * 72;
        const damp = Math.exp(-decay * t);
        const x = cx + A * Math.sin(3.01 * t + phase) * damp;
        const y = cy + B * Math.sin(2.004 * t + phase * 1.31) * damp;
        points.push([x, y]);
      }
      return `<path d="${pathFromPoints(points)}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-opacity="${opacity}" stroke-linecap="round"/>`;
    })
    .join("\n");

  const dots = [];
  for (let i = 0; i < 32; i += 1) {
    const a = (i / 32) * Math.PI * 2;
    dots.push(`<circle cx="${fmt(cx + Math.cos(a) * B)}" cy="${fmt(cy + Math.sin(a) * B)}" r="1.3" fill="${FADED}" opacity="0.55"/>`);
  }

  const content = `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${B}" fill="none" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="1 7"/>
    ${dots.join("\n    ")}
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="2.6" fill="${SEAL}"/>
  </g>
  <text x="400" y="930" text-anchor="middle" font-family="${SERIF}" font-size="19" font-style="italic" fill="#555">x = A sin(3t + φ)e<tspan baseline-shift="super" font-size="13">−δt</tspan></text>
  <text x="400" y="958" text-anchor="middle" font-family="${SERIF}" font-size="11" letter-spacing="3" fill="${FADED}">FIG. II</text>
`;
  return svgDoc(width, height, content, "A damped harmonograph");
}

function rose() {
  const width = 800;
  const height = 1000;
  const cx = 400;
  const cy = 480;
  const R = 306;

  const curves = [0, 0.07, 0.14]
    .map((offset, index) => {
      const points = [];
      for (let i = 0; i <= 2400; i += 1) {
        const theta = (i / 2400) * Math.PI * 6;
        const r = R * Math.cos((7 / 3) * theta + offset * 3);
        points.push([cx + r * Math.cos(theta + offset), cy + r * Math.sin(theta + offset)]);
      }
      return `<path d="${pathFromPoints(points)}" fill="none" stroke="${INK}" stroke-width="${index === 0 ? 1.3 : 0.7}" stroke-opacity="${index === 0 ? 0.9 : 0.25}"/>`;
    })
    .join("\n");

  const content = `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="1 7"/>
    <line x1="${cx - R - 24}" y1="${cy}" x2="${cx + R + 24}" y2="${cy}" stroke="${FADED}" stroke-width="0.7" stroke-dasharray="2 6" opacity="0.5"/>
    <line x1="${cx}" y1="${cy - R - 24}" x2="${cx}" y2="${cy + R + 24}" stroke="${FADED}" stroke-width="0.7" stroke-dasharray="2 6" opacity="0.5"/>
    ${curves}
    <circle cx="${cx}" cy="${cy}" r="2.8" fill="${SEAL}"/>
  </g>
  <text x="400" y="930" text-anchor="middle" font-family="${SERIF}" font-size="19" font-style="italic" fill="#555">r = cos(7θ / 3)</text>
  <text x="400" y="958" text-anchor="middle" font-family="${SERIF}" font-size="11" letter-spacing="3" fill="${FADED}">FIG. III</text>
`;
  return svgDoc(width, height, content, "A fourteen-petalled rose curve");
}

function phyllotaxis() {
  const width = 1200;
  const height = 800;
  const cx = 600;
  const cy = 400;
  const total = 1100;
  const golden = Math.PI * (3 - Math.sqrt(5));

  const dots = [];
  for (let n = 0; n < total; n += 1) {
    const radius = 3 + 7.2 * Math.sqrt(n);
    const angle = n * golden;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    const size = 0.7 + (2.4 * n) / total;
    const accent = n > 0 && n % 89 === 0;
    if (radius > 350) continue;
    dots.push(
      `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(size)}" fill="${accent ? SEAL : INK}" opacity="${accent ? 0.9 : 0.72}"/>`
    );
  }

  const content = `
  <g>
    <circle cx="${cx}" cy="${cy}" r="330" fill="none" stroke="${RULE}" stroke-width="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="215" fill="none" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="1 8"/>
    ${dots.join("\n    ")}
    <circle cx="${cx}" cy="${cy}" r="2.2" fill="${SEAL}"/>
  </g>
  <text x="1160" y="756" text-anchor="end" font-family="${SERIF}" font-size="18" font-style="italic" fill="#555">n · 137.507°</text>
  <text x="1160" y="778" text-anchor="end" font-family="${SERIF}" font-size="11" letter-spacing="3" fill="${FADED}">FIG. IV</text>
`;
  return svgDoc(width, height, content, "Phyllotaxis, golden-angle seeds");
}

function daLatMist() {
  const width = 1200;
  const height = 800;

  const stars = Array.from({ length: 26 }, (_, i) => {
    const x = 90 + ((i * 197) % 1020);
    const y = 70 + ((i * 89) % 210);
    const s = i % 5 === 0 ? 3 : 1.4;
    return `<path d="M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}" stroke="${INK}" stroke-width="0.8" opacity="${i % 3 === 0 ? 0.45 : 0.2}"/>`;
  }).join("\n    ");

  const fog = Array.from({ length: 9 }, (_, i) => {
    const y = 400 + i * 26;
    return `<path d="M60 ${y} Q 300 ${y - 9} 560 ${y - 2} T 1140 ${y - 7}" fill="none" stroke="${FADED}" stroke-width="1" opacity="${0.22 - i * 0.014}" stroke-linecap="round"/>`;
  }).join("\n    ");

  const pines = [
    [120, 650, 60, 170],
    [190, 690, 44, 130],
    [1040, 660, 54, 160],
    [1100, 705, 38, 118],
  ]
    .map(([x, base, w, h]) => {
      const top = base - h;
      const tiers = 4;
      let branches = "";
      for (let i = 0; i < tiers; i += 1) {
        const y = top + (h / tiers) * i + 10;
        const spread = (w / 2) * ((i + 1) / tiers);
        branches += `<path d="M${x - spread} ${y} L${x} ${y - 18} L${x + spread} ${y}" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
      }
      return `<path d="M${x} ${top} V${base}" stroke="${INK}" stroke-width="1.2"/>
      ${branches}`;
    })
    .join("\n    ");

  const content = `
  <g>
    <line x1="60" y1="320" x2="1140" y2="320" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="1 7"/>
    ${stars}
    <circle cx="942" cy="182" r="46" fill="none" stroke="${INK}" stroke-width="1.2"/>
    <circle cx="942" cy="182" r="39" fill="none" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="1 6"/>
    <path d="M60 462 C 210 420, 330 470, 470 438 S 760 392, 900 444 S 1080 470, 1140 452" fill="none" stroke="${INK}" stroke-width="1.4" opacity="0.75"/>
    <path d="M60 505 C 240 462, 380 510, 540 482 S 820 438, 980 492 S 1090 512, 1140 500" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.55"/>
    <path d="M60 558 C 250 512, 410 566, 590 534 S 870 492, 1040 548 S 1110 562, 1140 554" fill="none" stroke="${INK}" stroke-width="1.1" opacity="0.4"/>
    <path d="M60 630 C 280 586, 470 642, 690 606 S 960 570, 1140 628" fill="none" stroke="${INK}" stroke-width="1" opacity="0.28"/>
    ${fog}
    <path d="M0 760 C 240 706, 420 758, 640 728 S 980 690, 1200 744" fill="none" stroke="${INK}" stroke-width="1.4" opacity="0.55"/>
    ${pines}
    <path d="M505 800 C 560 730, 600 700, 690 664" fill="none" stroke="${INK}" stroke-width="0.9" stroke-dasharray="3 5" opacity="0.5"/>
    <text x="70" y="744" font-family="${SERIF}" font-size="20" font-style="italic" fill="#555">Đà Lạt, in the rain</text>
    <text x="70" y="768" font-family="${SERIF}" font-size="11" letter-spacing="3" fill="${FADED}">19 · IX · 2026</text>
  </g>
`;
  return svgDoc(width, height, content, "Line drawing of mist over the hills at Da Lat");
}

function baselFigure() {
  const width = 1000;
  const height = 560;
  const left = 96;
  const right = 930;
  const top = 54;
  const bottom = 478;

  const yMin = 1.0;
  const yMax = 1.75;
  const nMax = 60;
  const x = (n) => left + ((n - 1) / (nMax - 1)) * (right - left);
  const y = (v) => bottom - ((v - yMin) / (yMax - yMin)) * (bottom - top);

  let partial = 0;
  const points = [];
  for (let n = 1; n <= nMax; n += 1) {
    partial += 1 / (n * n);
    points.push([x(n), y(Math.min(partial, yMax))]);
  }

  const path = pathFromPoints(points);
  const dots = points
    .filter((_, i) => i % 2 === 0)
    .map(([px, py]) => `<circle cx="${fmt(px)}" cy="${fmt(py)}" r="2.1" fill="${INK}" opacity="0.75"/>`)
    .join("\n    ");

  const yTicks = [1.0, 1.2, 1.4, 1.6];
  const yGrid = yTicks
    .map(
      (value) =>
        `<line x1="${left}" y1="${fmt(y(value))}" x2="${right}" y2="${fmt(y(value))}" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="2 5"/>
    <text x="${left - 14}" y="${fmt(y(value) + 4)}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${FADED}">${value.toFixed(1)}</text>`
    )
    .join("\n    ");

  const xTicks = [10, 20, 30, 40, 50, 60]
    .map(
      (n) =>
        `<line x1="${fmt(x(n))}" y1="${bottom}" x2="${fmt(x(n))}" y2="${bottom + 6}" stroke="${FADED}" stroke-width="1"/>
    <text x="${fmt(x(n))}" y="${bottom + 22}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${FADED}">${n}</text>`
    )
    .join("\n    ");

  const content = `
  <g>
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="1.1"/>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${INK}" stroke-width="1.1"/>
    ${yGrid}
    ${xTicks}
    <line x1="${left}" y1="${fmt(y(Math.PI * Math.PI / 6))}" x2="${right}" y2="${fmt(y(Math.PI * Math.PI / 6))}" stroke="${SEAL}" stroke-width="1" stroke-dasharray="5 5" opacity="0.8"/>
    <path d="${path}" fill="none" stroke="${INK}" stroke-width="1.5"/>
    ${dots}
    <text x="${right}" y="${fmt(y(Math.PI * Math.PI / 6) - 12)}" text-anchor="end" font-family="${SERIF}" font-size="16" font-style="italic" fill="${SEAL}">π²/6 ≈ 1.6449</text>
    <text x="${left - 58}" y="${top + 10}" font-family="${SERIF}" font-size="15" font-style="italic" fill="#555">S<tspan baseline-shift="sub" font-size="10">N</tspan></text>
    <text x="${right}" y="${bottom + 50}" text-anchor="end" font-family="${SERIF}" font-size="15" font-style="italic" fill="#555">N</text>
  </g>
`;
  return svgDoc(width, height, content, "Partial sums of the reciprocal squares approaching pi squared over six");
}

function cantorFigure() {
  const width = 1000;
  const height = 520;
  const bits = [
    "0 1 1 0 1 0 0 1",
    "1 1 0 0 1 1 0 0",
    "0 0 1 1 0 0 1 0",
    "1 0 1 0 0 1 1 1",
    "0 1 0 1 1 0 0 0",
    "1 1 1 0 2 0 1 1",
    "0 0 1 1 0 1 2 0",
    "1 0 0 1 1 0 1 2",
  ];

  const cell = 44;
  const startX = 300;
  const startY = 110;
  const rows = [];

  bits.forEach((row, r) => {
    const values = row.split(" ");
    const cells = [];
    values.forEach((value, c) => {
      const filled = c === r;
      const x = startX + c * cell;
      const y = startY + r * cell;
      cells.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${filled ? INK : "#ffffff"}" stroke="${INK}" stroke-width="1"/>
        <text x="${x + cell / 2}" y="${y + cell / 2 + 7}" text-anchor="middle" font-family="${MONO}" font-size="19" fill="${filled ? "#ffffff" : value === "2" ? SEAL : "#333"}">${value === "2" ? "?" : value}</text>`
      );
    });
    rows.push(
      `<text x="${startX - 24}" y="${startY + r * cell + 28}" text-anchor="end" font-family="${SERIF}" font-size="17" font-style="italic" fill="#555">s<tspan baseline-shift="sub" font-size="11">${r + 1}</tspan></text>
      ${cells.join("\n      ")}`
    );
  });

  const content = `
  <g>
    ${rows.join("\n    ")}
    <path d="M${startX + 6} ${startY + cell * 8 + 26} H${startX + cell * 8 - 6}" stroke="${INK}" stroke-width="1"/>
    <text x="${startX}" y="${startY + cell * 8 + 62}" font-family="${SERIF}" font-size="18" font-style="italic" fill="#111">s = 0.01100110…</text>
    <text x="${startX}" y="${startY + cell * 8 + 92}" font-family="${SERIF}" font-size="15" font-style="italic" fill="${SEAL}">every digit of s is wrong</text>
    <text x="${width - 70}" y="${height - 54}" text-anchor="end" font-family="${SERIF}" font-size="12" letter-spacing="3" fill="${FADED}">THE DIAGONAL</text>
  </g>
`;
  return svgDoc(width, height, content, "Cantor's diagonal grid with a disagreeing diagonal sequence");
}

/* -------------------------------------------------------------------------- */
/* minimal PDF writer                                                         */
/* -------------------------------------------------------------------------- */

function makePdf(pages) {
  const objects = [];
  const fonts = {
    F1: "Helvetica",
    F2: "Helvetica-Bold",
    F3: "Times-Italic",
    F4: "Times-Roman",
  };

  const pageCount = pages.length;
  const kids = Array.from({ length: pageCount }, (_, i) => `${7 + i * 2} 0 R`).join(" ");

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>";

  const escape = (text) => String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  pages.forEach((page, i) => {
    const pageId = 7 + i * 2;
    const contentId = 8 + i * 2;
    const body = page
      .map((line) => {
        if (line.rule) {
          return `0.15 0.15 0.15 RG 0.6 w\n${line.x || 64} ${line.y} m ${line.x2 || 531} ${line.y} l S`;
        }
        return `BT
/${line.font || "F1"} ${line.size || 11} Tf
1 0 0 1 ${line.x || 64} ${line.y} Tm
(${escape(line.text)}) Tj
ET`;
      })
      .join("\n");

    objects[pageId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`;

    const stream = `<< /Length ${Buffer.byteLength(body, "latin1")} >>\nstream\n${body}\nendstream`;
    objects[contentId - 1] = stream;
  });

  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, "latin1");
}

function baselNotesPdf() {
  const pages = [
    [
      { font: "F2", size: 24, x: 64, y: 764, text: "Notes on the Basel Problem" },
      { font: "F3", size: 13, x: 64, y: 736, text: "Working notes, mostly for myself" },
      { rule: true, y: 718 },
      { font: "F3", size: 12, x: 64, y: 682, text: "The question, in its oldest clothes:" },
      { font: "F1", size: 13, x: 100, y: 654, text: "1 + 1/4 + 1/9 + 1/16 + ... = ?" },
      { font: "F1", size: 11, x: 64, y: 610, text: "Euler's answer is pi^2 / 6. The surprise is not the decimal" },
      { font: "F1", size: 11, x: 64, y: 592, text: "but the appearance of pi in a sum that knows nothing of circles." },
      { font: "F2", size: 13, x: 64, y: 546, text: "The sine product" },
      { font: "F1", size: 11, x: 64, y: 518, text: "sin(x)/x = product over n of (1 - x^2/(n^2 pi^2))." },
      { font: "F1", size: 11, x: 64, y: 500, text: "Compare the coefficient of x^2 on both sides. That is the whole trick." },
      { font: "F2", size: 13, x: 64, y: 454, text: "Why it is not yet a proof" },
      { font: "F1", size: 11, x: 64, y: 426, text: "An infinite product needs a justification. Euler found one; Weierstrass" },
      { font: "F1", size: 11, x: 64, y: 408, text: "later made the argument completely general. The heuristic survives," },
      { font: "F1", size: 11, x: 64, y: 390, text: "which is why we still teach the guess before the theorem." },
      { font: "F2", size: 13, x: 64, y: 344, text: "Consequences" },
      { font: "F1", size: 11, x: 64, y: 316, text: "zeta(2) is irrational, indeed transcendental. The same coefficient" },
      { font: "F1", size: 11, x: 64, y: 298, text: "game gives every even zeta value in terms of Bernoulli numbers." },
      { rule: true, y: 250 },
      { font: "F3", size: 10, x: 64, y: 224, text: "Kept in the library under: Working Papers / Analysis" },
      { font: "F1", size: 9, x: 64, y: 206, text: "Trần Hải Đăng - 14 November 2026" },
      { font: "F1", size: 9, x: 500, y: 60, text: "1" },
    ],
    [
      { font: "F2", size: 20, x: 64, y: 770, text: "A page of references" },
      { rule: true, y: 752 },
      { font: "F4", size: 12, x: 64, y: 714, text: "Euler, L. De summis serierum reciprocarum (1735)." },
      { font: "F3", size: 11, x: 64, y: 692, text: "The original announcement. Short, confident, and a little reckless." },
      { font: "F4", size: 12, x: 64, y: 650, text: "Ayoub, R. Euler and the zeta function (1974)." },
      { font: "F3", size: 11, x: 64, y: 628, text: "A readable account of what Euler actually did." },
      { font: "F4", size: 12, x: 64, y: 586, text: "Weierstrass, K. On the theory of functions (1876)." },
      { font: "F3", size: 11, x: 64, y: 564, text: "For the factorization theorem that closes the gap." },
      { font: "F1", size: 11, x: 64, y: 500, text: "Next notebook: the same trick for zeta(4), and a drawing of the" },
      { font: "F1", size: 11, x: 64, y: 482, text: "partial sums on logarithmic axes." },
      { font: "F1", size: 9, x: 500, y: 60, text: "2" },
    ],
  ];
  return makePdf(pages);
}

function readingListPdf() {
  const pages = [
    [
      { font: "F2", size: 24, x: 64, y: 764, text: "A Reading List for Winter" },
      { font: "F3", size: 13, x: 64, y: 736, text: "Six books, one notebook, and no particular hurry" },
      { rule: true, y: 718 },
      { font: "F2", size: 13, x: 64, y: 682, text: "01  Logic" },
      { font: "F1", size: 11, x: 64, y: 660, text: "Hilbert's programme, read backwards. Start with the questions," },
      { font: "F1", size: 11, x: 64, y: 642, text: "then let Godel close the door." },
      { font: "F2", size: 13, x: 64, y: 600, text: "02  Analysis" },
      { font: "F1", size: 11, x: 64, y: 578, text: "Any proof of the Basel identity. Compare the presentations." },
      { font: "F2", size: 13, x: 64, y: 536, text: "03  Geometry" },
      { font: "F1", size: 11, x: 64, y: 514, text: "Curves that can be drawn with a harmonograph and understood" },
      { font: "F1", size: 11, x: 64, y: 496, text: "with a single parametric equation." },
      { font: "F2", size: 13, x: 64, y: 454, text: "04  Place" },
      { font: "F1", size: 11, x: 64, y: 432, text: "A notebook from Da Lat. Rain is a kind of notation." },
      { font: "F2", size: 13, x: 64, y: 390, text: "05  Practice" },
      { font: "F1", size: 11, x: 64, y: 368, text: "Rewrite one proof each week without looking at the source." },
      { font: "F2", size: 13, x: 64, y: 326, text: "06  Margin" },
      { font: "F1", size: 11, x: 64, y: 304, text: "Leave the last page blank. Something always arrives late." },
      { rule: true, y: 250 },
      { font: "F3", size: 10, x: 64, y: 224, text: "Kept in the library under: Working Papers / Reading" },
      { font: "F1", size: 9, x: 64, y: 206, text: "Trần Hải Đăng - 30 August 2026" },
      { font: "F1", size: 9, x: 500, y: 60, text: "1" },
    ],
  ];
  return makePdf(pages);
}

/* -------------------------------------------------------------------------- */
/* write                                                                      */
/* -------------------------------------------------------------------------- */

await Promise.all([
  mkdir(PHOTOS, { recursive: true }),
  mkdir(DOCS, { recursive: true }),
  mkdir(FIGURES, { recursive: true }),
]);

const files = [
  [path.join(PHOTOS, "lissajous.svg"), lissajous()],
  [path.join(PHOTOS, "harmonograph.svg"), harmonograph()],
  [path.join(PHOTOS, "rose-curve.svg"), rose()],
  [path.join(PHOTOS, "phyllotaxis.svg"), phyllotaxis()],
  [path.join(PHOTOS, "da-lat-mist.svg"), daLatMist()],
  [path.join(FIGURES, "basel-partial-sums.svg"), baselFigure()],
  [path.join(FIGURES, "cantor-diagonal.svg"), cantorFigure()],
  [path.join(DOCS, "basel-notes.pdf"), baselNotesPdf()],
  [path.join(DOCS, "winter-reading-list.pdf"), readingListPdf()],
];

for (const [file, body] of files) {
  await writeFile(file, body);
  console.log("  wrote", path.relative(ROOT, file));
}
