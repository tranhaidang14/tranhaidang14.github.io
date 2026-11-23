/**
 * A tiny front-matter reader/writer for the dashboard.
 *
 * It deliberately mirrors the parser in tools/build.mjs so the dashboard and
 * the site agree about what a post's metadata means. The writer uses JSON
 * strings for scalars, which is valid YAML and keeps commas, quotes, and
 * newlines from breaking the simple line-based parser.
 */

const KNOWN_FIELDS = [
  "title",
  "subtitle",
  "date",
  "category",
  "tags",
  "summary",
  "featured",
  "draft",
  "updated",
];

export function parseScalar(raw) {
  const value = String(raw ?? "").trim();

  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
}

function splitInlineList(inner) {
  const parts = [];
  let current = "";
  let quote = null;

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];

    if (quote) {
      current += char;
      if (quote === '"' && char === "\\" && index + 1 < inner.length) {
        current += inner[index + 1];
        index += 1;
        continue;
      }
      if (char === quote) {
        if (quote === "'" && inner[index + 1] === "'") {
          current += inner[index + 1];
          index += 1;
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
  return parts.map(parseScalar).filter((item) => item !== "");
}

export function parseFrontMatter(raw) {
  const source = String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) return { data: {}, body: source, hasFrontMatter: false };

  const data = {};
  let listKey = null;

  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && listKey) {
      data[listKey].push(parseScalar(listItem[1]));
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
      data[key] = splitInlineList(value.slice(1, -1));
    } else if (/^(true|false)$/i.test(value)) {
      data[key] = value.toLowerCase() === "true";
    } else if (/^\d+(\.\d+)?$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = parseScalar(value);
    }
  }

  return {
    data,
    body: source.slice(match[0].length),
    hasFrontMatter: true,
  };
}

function quoteString(value) {
  return JSON.stringify(String(value));
}

function serializeValue(key, value) {
  if (Array.isArray(value)) {
    return `${key}: [${value.map(quoteString).join(", ")}]`;
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return `${key}: ${value}`;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${key}: ${value}`;
  }
  return `${key}: ${quoteString(value ?? "")}`;
}

export function serializeFrontMatter(data) {
  const known = KNOWN_FIELDS.filter((key) => Object.hasOwn(data, key));
  const rest = Object.keys(data).filter((key) => !KNOWN_FIELDS.includes(key));
  const lines = ["---"];

  for (const key of [...known, ...rest]) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    lines.push(serializeValue(key, value));
  }

  lines.push("---");
  return `${lines.join("\n")}\n`;
}

export function slugify(input) {
  return (
    String(input)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

export function cleanText(value, maxLength = 5000) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() + 1 !== Number(match[2]) ||
    date.getDate() !== Number(match[3])
  ) {
    return "";
  }

  return raw;
}

export function normalizeTags(value, maxTags = 50) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const tags = [];
  const seen = new Set();

  for (const item of raw) {
    const tag = cleanText(item, 80);
    if (!tag) continue;

    const key = tag.toLocaleLowerCase("vi");
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
    if (tags.length >= maxTags) break;
  }

  return tags;
}

export function mergePostMeta(existing, input) {
  const data = { ...existing };

  const title = cleanText(input?.title, 300);
  if (!title) throw new Error("Tiêu đề không được để trống.");
  data.title = title;

  const subtitle = cleanText(input?.subtitle, 300);
  if (subtitle) data.subtitle = subtitle;
  else delete data.subtitle;

  const rawDate = String(input?.date ?? "").trim();
  if (rawDate) {
    const date = normalizeDate(rawDate);
    if (!date) throw new Error("Ngày không hợp lệ.");
    data.date = date;
  } else {
    delete data.date;
  }

  const category = cleanText(input?.category, 120);
  if (category) data.category = category;
  else delete data.category;

  data.tags = normalizeTags(input?.tags);

  const summary = cleanText(input?.summary, 4000);
  if (summary) data.summary = summary;
  else delete data.summary;

  data.featured = input?.featured === true || input?.featured === "true";

  data.draft = input?.draft === true || input?.draft === "true";

  const rawUpdated = String(input?.updated ?? "").trim();
  if (rawUpdated) {
    const updated = normalizeDate(rawUpdated);
    if (!updated) throw new Error("Ngày cập nhật không hợp lệ.");
    data.updated = updated;
  } else {
    delete data.updated;
  }

  return data;
}

export function writePostSource(raw, input) {
  const source = String(raw ?? "");
  const bom = source.startsWith("\uFEFF") ? "\uFEFF" : "";
  const withoutBom = bom ? source.slice(1) : source;
  const parsed = parseFrontMatter(withoutBom);
  const data = mergePostMeta(parsed.data, input);
  const spacer = parsed.hasFrontMatter ? "" : "\n";

  return `${bom}${serializeFrontMatter(data)}${spacer}${parsed.body}`;
}

export function titleFromFile(relativePath) {
  const name = String(relativePath).split("/").pop() || String(relativePath);
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toLocaleUpperCase("vi") + word.slice(1) : word))
    .join(" ");
}
