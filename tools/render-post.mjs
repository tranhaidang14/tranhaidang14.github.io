/**
 * render-post.mjs — turns one Markdown entry into a complete, crawlable HTML
 * page. Search engines and link-preview crawlers cannot be relied on to run the
 * site's JavaScript, so every published post also exists as a static file with
 * its own title, canonical URL, Open Graph data and BlogPosting JSON-LD.
 *
 * The generated page reuses `article.html` as its shell so the markup stays in
 * sync with the client-rendered version. `article.js` detects
 * `data-prerendered="true"` and hydrates the page instead of rendering it again.
 */
import { marked } from "marked";

/* -------------------------------------------------------------------------- */
/* text helpers                                                               */
/* -------------------------------------------------------------------------- */

export function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absoluteUrl(base, relative) {
  if (!relative) return "";
  if (/^https?:\/\//i.test(relative)) return relative;
  const clean = relative.replace(/^\.\//, "").replace(/^\/+/, "");
  return `${base}/${clean.split("/").map(encodeURIComponent).join("/")}`;
}

function slugifyHeading(text, used) {
  const base =
    String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  let id = base;
  let counter = 2;
  while (used.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  used.add(id);
  return id;
}

function formatDateLong(iso) {
  const match = String(iso || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `${Number(match[3])} tháng ${Number(match[2])}, ${match[1]}`;
}

function formatDateShort(iso) {
  const match = String(iso || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `${match[3]}/${match[2]}`;
}

/* -------------------------------------------------------------------------- */
/* display math protection                                                    */
/* -------------------------------------------------------------------------- */

/* Markdown eats backslashes in LaTeX (\{ becomes {, \, becomes ,) and collapses
 * the row breaks in display math. Hide every math span before marked runs, then
 * put the untouched TeX back. KaTeX renders it in the browser. */
const MATH_PLACEHOLDER = "ENCYCLOPEDIAMATHPLACEHOLDER";

function mathToken(blocks, tex) {
  const token = `${MATH_PLACEHOLDER}${blocks.length}END`;
  blocks.push({ token, tex });
  return token;
}

function protectMath(markdown) {
  const blocks = [];
  let text = String(markdown);

  text = text.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (match) =>
    mathToken(blocks, match)
  );
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match) => mathToken(blocks, match));
  text = text.replace(/(^|[^\\$])\$((?:\\.|[^$\n])+?)\$(?!\$)/g, (match, prefix, tex) => {
    if (!tex.trim() || /^\s|\s$/.test(tex)) return match;
    return `${prefix}${mathToken(blocks, `$${tex}$`)}`;
  });

  return { text, blocks };
}

function restoreMath(html, blocks) {
  let output = html;
  for (const { token, tex } of blocks) {
    output = output.replace(token, () => escapeHTML(tex));
  }
  return output;
}

/* -------------------------------------------------------------------------- */
/* markdown                                                                   */
/* -------------------------------------------------------------------------- */

function addAttribute(tag, name, value) {
  if (new RegExp(`\\b${name}\\s*=`, "i").test(tag)) return tag;
  return tag.replace(/\s*\/?>$/, (end) => ` ${name}="${value}"${end}`);
}

export function renderMarkdownBody(markdown) {
  const math = protectMath(markdown);
  let html = marked.parse(math.text, { gfm: true, breaks: false });
  html = restoreMath(html, math.blocks);

  const used = new Set();
  const headings = [];

  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (match, level, inner) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
    if (!text) return match;
    const id = slugifyHeading(text, used);
    headings.push({ id, text, level: Number(level) });
    return `<h${level} id="${escapeHTML(id)}">${inner}</h${level}>`;
  });

  /* Standalone images become plates with captions, matching the client. */
  html = html.replace(/<p>\s*(<img\b[^>]*>)\s*<\/p>/g, (match, image) => {
    const alt = image.match(/\balt="([^"]*)"/i)?.[1] || "";
    const tag = addAttribute(image, "decoding", "async");
    const caption = alt.trim() ? `<figcaption>${alt}</figcaption>` : "";
    return `<figure>${tag}${caption}</figure>`;
  });

  /* External links get safe target/rel attributes. */
  html = html.replace(/<a\s+([^>]*href="https?:[^"]*"[^>]*)>/g, (match, attrs) => {
    if (/\btarget\s*=/.test(attrs)) return match;
    const cleaned = attrs.replace(/\brel="[^"]*"/g, "").replace(/\s+/g, " ").trim();
    return `<a ${cleaned} target="_blank" rel="noopener noreferrer" class="external">`;
  });

  return { html, headings };
}

/* -------------------------------------------------------------------------- */
/* page fragments                                                             */
/* -------------------------------------------------------------------------- */

function renderToc(headings) {
  return headings
    .map(
      (heading) =>
        `<li class="${heading.level === 3 ? "toc--h3" : ""}"><a href="#${escapeHTML(heading.id)}">${escapeHTML(heading.text)}</a></li>`
    )
    .join("");
}

function renderInfobox(post) {
  const tags = post.tags.length
    ? post.tags
        .map(
          (tag, index) =>
            `<a href="/writing?tag=${encodeURIComponent(post.tagSlugs[index])}">${escapeHTML(tag)}</a>`
        )
        .join("")
    : "<span>—</span>";

  return `
    <div class="infobox__title">${escapeHTML(post.title)}</div>
    <div class="infobox__sub">Từ bách khoa</div>
    <div class="infobox__row"><span>Đăng ngày</span><span>${escapeHTML(formatDateLong(post.date))}</span></div>
    <div class="infobox__row"><span>Chuyên mục</span><span><a href="/writing?cat=${encodeURIComponent(post.categorySlug)}">${escapeHTML(post.category)}</a></span></div>
    <div class="infobox__row"><span>Thời gian đọc</span><span>${post.minutes} phút đọc · ${post.words.toLocaleString("vi-VN")} từ</span></div>
    <div class="infobox__row"><span>Thẻ</span><span class="infobox__tags">${tags}</span></div>
    <div class="infobox__row"><span>Liên kết</span><span><code>${escapeHTML(post.url)}</code></span></div>
    <div class="infobox__foot"><a href="feed.xml">RSS</a> · <a href="/writing" data-random>Bài ngẫu nhiên</a> · <a href="/writing?cat=${encodeURIComponent(post.categorySlug)}">Thêm trong ${escapeHTML(post.category)}</a></div>`;
}

function renderRelated(post, index) {
  let related = index.posts.filter(
    (candidate) => candidate.slug !== post.slug && candidate.category === post.category
  );
  if (!related.length) {
    related = index.posts.filter((candidate) => candidate.slug !== post.slug).slice(0, 3);
  }
  if (!related.length) return { html: "", hidden: true };

  const html = `
    <h2>Bài liên quan</h2>
    <ul>
      ${related
        .slice(0, 4)
        .map(
          (candidate) => `
          <li>
            <a href="${escapeHTML(candidate.url)}">${escapeHTML(candidate.title)}</a>
            <small>${escapeHTML(candidate.category)} · ${escapeHTML(formatDateShort(candidate.date))}</small>
          </li>`
        )
        .join("")}
    </ul>`;
  return { html, hidden: false };
}

function renderPager(post, index) {
  const position = index.posts.findIndex((candidate) => candidate.slug === post.slug);
  const newer = index.posts[position - 1];
  const older = index.posts[position + 1];
  if (!newer && !older) return { html: "", hidden: true };

  const links = [];
  if (newer) {
    links.push(
      `<a class="pager-link" href="${escapeHTML(newer.url)}"><span>← Bài mới hơn</span><strong>${escapeHTML(newer.title)}</strong></a>`
    );
  }
  if (older) {
    links.push(
      `<a class="pager-link ${newer ? "pager-link--next" : ""}" href="${escapeHTML(older.url)}"><span>Bài cũ hơn →</span><strong>${escapeHTML(older.title)}</strong></a>`
    );
  }
  return { html: links.join(""), hidden: false };
}

function renderCatbar(post, site) {
  const tags = post.tags
    .map(
      (tag, index) =>
        `<a href="/writing?tag=${encodeURIComponent(post.tagSlugs[index])}">#${escapeHTML(tag)}</a>`
    )
    .join("");

  return `
    <span class="catbar__label">Chuyên mục</span>
    <a href="/writing?cat=${encodeURIComponent(post.categorySlug)}">${escapeHTML(post.category)}</a>
    ${tags}
    <span class="catbar__license">Văn bản: ${escapeHTML(site?.license || "CC BY-SA 4.0")} · Bản vẽ thuộc về tác giả</span>`;
}

/* -------------------------------------------------------------------------- */
/* structured data                                                            */
/* -------------------------------------------------------------------------- */

function jsonLd(payload) {
  /* `</script>` inside a string would close the element early. */
  return JSON.stringify(payload, null, 2).replace(/</g, "\\u003c");
}

function buildStructuredData(post, site, canonicalUrl, imageUrl) {
  const base = (site.url || "").replace(/\/+$/, "");
  const description = post.summary || `${post.title} — ${site.name}`;
  const person = {
    "@type": "Person",
    name: site.name,
    url: `${base}/about`,
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: [imageUrl],
    datePublished: post.date,
    dateModified: post.updated || post.date,
    inLanguage: "vi",
    author: person,
    publisher: person,
    url: canonicalUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    articleSection: post.category,
    keywords: post.tags.join(", "),
    wordCount: post.words,
    isAccessibleForFree: true,
    ...(site.licenseUrl
      ? { license: site.licenseUrl, copyrightNotice: `${site.name} · ${site.license}` }
      : {}),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Bài viết", item: `${base}/writing` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  return `<script type="application/ld+json">\n${jsonLd(article)}\n  </script>\n  <script type="application/ld+json">\n${jsonLd(breadcrumbs)}\n  </script>`;
}

/* -------------------------------------------------------------------------- */
/* page                                                                       */
/* -------------------------------------------------------------------------- */

function firstImage(markdown) {
  const match = String(markdown).match(/!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/);
  return match ? match[1] : "";
}

export function renderArticlePage(template, { post, site, index, markdown }) {
  const base = (site.url || "https://example.com").replace(/\/+$/, "");
  const canonicalUrl = `${base}/${post.url}`;
  const imageUrl = firstImage(markdown)
    ? absoluteUrl(base, firstImage(markdown))
    : `${base}/assets/og-default.png`;
  const description = post.summary || `${post.title} — ${site.name}`;

  const { html: bodyHtml, headings } = renderMarkdownBody(markdown);
  const infobox = renderInfobox(post);
  const related = renderRelated(post, index);
  const pager = renderPager(post, index);
  const catbar = renderCatbar(post, site);

  const seo = `
  <link rel="canonical" href="${escapeHTML(canonicalUrl)}">
  <link rel="alternate" hreflang="vi" href="${escapeHTML(canonicalUrl)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta name="author" content="${escapeHTML(site.name)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHTML(site.name)}">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:title" content="${escapeHTML(post.title)}">
  <meta property="og:description" content="${escapeHTML(description)}">
  <meta property="og:url" content="${escapeHTML(canonicalUrl)}">
  <meta property="og:image" content="${escapeHTML(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHTML(post.title)}">
  <meta property="article:published_time" content="${escapeHTML(post.date)}">
  <meta property="article:modified_time" content="${escapeHTML(post.updated || post.date)}">
  <meta property="article:section" content="${escapeHTML(post.category)}">
  <meta property="article:author" content="${escapeHTML(site.name)}">
${post.tags.map((tag) => `  <meta property="article:tag" content="${escapeHTML(tag)}">`).join("\n")}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHTML(post.title)}">
  <meta name="twitter:description" content="${escapeHTML(description)}">
  <meta name="twitter:image" content="${escapeHTML(imageUrl)}">
  ${buildStructuredData(post, site, canonicalUrl, imageUrl)}`;

  let out = template.replace("<!doctype html>", "<!doctype html>\n<!-- generated-post -->");

  out = out.replace(
    '<html lang="vi">',
    `<html lang="vi" data-prerendered="true" data-post-slug="${escapeHTML(post.slug)}">`
  );
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHTML(`${post.title} — ${site.name}`)}</title>`);
  /* The query-parameter shell is deliberately noindex; the static page is not. */
  out = out.replace(/\s*<meta name="robots"[^>]*>/, "");
  out = out.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHTML(description)}">${seo}`
  );

  /* Prerendered pages no longer need the Markdown bundle or the CDN parser. */
  out = out.replace(/\s*<script defer src="https:\/\/cdn\.jsdelivr\.net\/npm\/marked@[^"]+"[^>]*><\/script>/, "");
  out = out.replace(/\s*<script defer src="content\/posts\/sources\.js"><\/script>/, "");

  out = out.replace(/\s*<div class="article-loading"[\s\S]*?<\/div>\n/, "\n");
  out = out.replace("data-article-root hidden", "data-article-root");

  out = out.replace(
    "<h1 data-article-title>—</h1>",
    `<h1 data-article-title>${escapeHTML(post.title)}</h1>`
  );
  out = out.replace(
    '<p class="article-sub" data-article-subtitle hidden></p>',
    post.subtitle
      ? `<p class="article-sub" data-article-subtitle>${escapeHTML(post.subtitle)}</p>`
      : '<p class="article-sub" data-article-subtitle hidden></p>'
  );
  out = out.replace(
    '<a data-article-category-link href="/writing"><span data-article-category>Bài viết</span></a>',
    `<a data-article-category-link href="/writing?cat=${encodeURIComponent(post.categorySlug)}"><span data-article-category>${escapeHTML(post.category)}</span></a>`
  );
  out = out.replace(
    "<time data-article-date>—</time>",
    `<time data-article-date datetime="${escapeHTML(post.date)}">${escapeHTML(formatDateLong(post.date))}</time>`
  );
  out = out.replace(
    "<span data-article-reading>—</span>",
    `<span data-article-reading>${post.minutes} phút đọc</span>`
  );
  out = out.replace(
    "<span data-article-words>—</span>",
    `<span data-article-words>${post.words.toLocaleString("vi-VN")} từ</span>`
  );
  out = out.replace(
    "<span data-crumb-title>Bài viết</span>",
    `<span data-crumb-title>${escapeHTML(post.title)}</span>`
  );

  if (headings.length) {
    out = out.replace(
      '<ol class="toc" data-toc></ol>',
      `<ol class="toc" data-toc>${renderToc(headings)}</ol>`
    );
  } else {
    out = out.replace(
      /<aside class="article-toc"[\s\S]*?<\/aside>\n\s*/,
      ""
    );
    out = out.replace('<div class="article-layout">', '<div class="article-layout no-toc">');
  }

  /* Use a replacer function: `String.replace` treats `$$`, `$&`, `` $` ``
   * and `$'` in the replacement as special patterns, which would corrupt
   * display math (`$$` became `$`) and any prose containing those sequences. */
  out = out.replace(
    /<article class="prose" data-article-body>\s*<p>Đang tải…<\/p>\s*<\/article>/,
    () => `<article class="prose" data-article-body>\n${bodyHtml}\n          </article>`
  );
  out = out.replace(
    '<div class="infobox" data-infobox></div>',
    `<div class="infobox" data-infobox>${infobox}</div>`
  );
  out = out.replace(
    '<div class="side-box" data-related></div>',
    `<div class="side-box" data-related${related.hidden ? " hidden" : ""}>${related.html}</div>`
  );
  out = out.replace(
    "data-pager></nav>",
    `data-pager${pager.hidden ? " hidden" : ""}>${pager.html}</nav>`
  );
  out = out.replace(
    '<div class="catbar" data-catbar></div>',
    `<div class="catbar" data-catbar>${catbar}</div>`
  );

  return out;
}
