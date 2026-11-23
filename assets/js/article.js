/**
 * article.js — render one Markdown entry with KaTeX, a contents box, an
 * infobox, related entries, and a reading-progress rule.
 */
import {
  qs,
  qsa,
  escapeHTML,
  getPostsIndex,
  getSite,
  getLibraryIndex,
  formatDateLong,
  formatDateShort,
} from "./lib.js";
import { t, getLang, onLanguageChange } from "./i18n.js";

const params = new URLSearchParams(location.search);
const slug = params.get("p");

let currentPost = null;
let currentSite = null;
let currentIndex = null;
let missingIsCustom = false;

const elements = {
  loading: qs("[data-article-loading]"),
  root: qs("[data-article-root]"),
  error: qs("[data-article-error]"),
  title: qs("[data-article-title]"),
  subtitle: qs("[data-article-subtitle]"),
  category: qs("[data-article-category]"),
  categoryLink: qs("[data-article-category-link]"),
  date: qs("[data-article-date]"),
  reading: qs("[data-article-reading]"),
  words: qs("[data-article-words]"),
  crumb: qs("[data-crumb-title]"),
  body: qs("[data-article-body]"),
  toc: qs("[data-toc]"),
  tocAside: qs(".article-toc"),
  infobox: qs("[data-infobox]"),
  related: qs("[data-related]"),
  pager: qs("[data-pager]"),
  catbar: qs("[data-catbar]"),
  progress: qs("[data-progress]"),
  layout: qs(".article-layout"),
};

const KATEX_MACROS = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\C": "\\mathbb{C}",
  "\\dd": "\\mathrm{d}",
  "\\abs": "\\left|#1\\right|",
};

function waitFor(predicate, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      try {
        if (predicate()) {
          resolve(true);
          return;
        }
      } catch {
        /* keep waiting */
      }
      if (performance.now() - start > timeout) {
        reject(new Error("Timed out"));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

function setMeta(attribute, name, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setText(element, value) {
  if (element) element.textContent = value ?? "";
}

/* -------------------------------------------------------------------------- */
/* media viewer                                                               */
/* -------------------------------------------------------------------------- */

let mediaDialog = null;
let mediaFrame = null;
let mediaImage = null;
let mediaKicker = null;
let mediaOpenLink = null;

function ensureMediaViewer() {
  if (mediaDialog) return mediaDialog;

  mediaDialog = document.createElement("dialog");
  mediaDialog.className = "lightbox media-viewer";
  mediaDialog.innerHTML = `
    <div class="lightbox__bar">
      <p class="lightbox__kicker" data-media-kicker></p>
      <div class="media-viewer__actions">
        <a class="media-viewer__open" target="_blank" rel="noopener noreferrer"></a>
        <button class="lightbox__close" type="button"></button>
      </div>
    </div>
    <div class="lightbox__body">
      <iframe loading="lazy" hidden></iframe>
      <img decoding="async" hidden alt="">
    </div>
  `;

  const close = mediaDialog.querySelector(".lightbox__close");
  mediaKicker = mediaDialog.querySelector("[data-media-kicker]");
  mediaFrame = mediaDialog.querySelector("iframe");
  mediaImage = mediaDialog.querySelector("img");
  mediaOpenLink = mediaDialog.querySelector(".media-viewer__open");

  mediaOpenLink.textContent = t("viewer.openTab");
  close.textContent = "✕";
  close.setAttribute("aria-label", t("viewer.close"));

  close.addEventListener("click", () => mediaDialog.close());
  mediaDialog.addEventListener("click", (event) => {
    if (event.target === mediaDialog) mediaDialog.close();
  });
  mediaDialog.addEventListener("close", () => {
    document.body.classList.remove("lightbox-open");
    mediaFrame.removeAttribute("src");
    mediaFrame.removeAttribute("title");
    mediaImage.removeAttribute("src");
    mediaImage.alt = "";
  });

  document.body.appendChild(mediaDialog);
  return mediaDialog;
}

function showMedia({ src, title, type }) {
  ensureMediaViewer();
  const isImage = type === "image";
  const label = title || t(isImage ? "viewer.imageKicker" : "viewer.documentKicker");

  mediaKicker.textContent = t(isImage ? "viewer.imageKicker" : "viewer.documentKicker");
  mediaOpenLink.href = src;
  mediaOpenLink.setAttribute("aria-label", `${t("viewer.openTab")}: ${label}`);

  if (isImage) {
    mediaFrame.hidden = true;
    mediaFrame.removeAttribute("src");
    mediaFrame.removeAttribute("title");
    mediaImage.hidden = false;
    mediaImage.src = src;
    mediaImage.alt = label;
  } else {
    mediaImage.hidden = true;
    mediaImage.removeAttribute("src");
    mediaImage.alt = "";
    mediaFrame.hidden = false;
    mediaFrame.src = `${src}#view=FitH`;
    mediaFrame.title = label;
  }

  mediaDialog.showModal();
  document.body.classList.add("lightbox-open");
}

function openDocument(src, title) {
  showMedia({ src, title, type: "document" });
}

function openImage(src, title) {
  showMedia({ src, title, type: "image" });
}

function modifierPressed(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function imageHref(link) {
  try {
    const url = new URL(link.getAttribute("href"), location.href);
    return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname) ? url.href : null;
  } catch {
    return null;
  }
}

function imageCaption(image) {
  return (
    image.closest("figure")?.querySelector("figcaption")?.textContent.trim() ||
    image.getAttribute("alt")?.trim() ||
    image.getAttribute("title")?.trim() ||
    t("viewer.imageKicker")
  );
}

function initImageLinks(body) {
  qsa("img", body).forEach((image) => {
    if (image.dataset.mediaReady) return;
    image.dataset.mediaReady = "true";

    const anchor = image.closest("a");
    const view = () =>
      openImage(
        anchor ? imageHref(anchor) || image.currentSrc || image.src : image.currentSrc || image.src,
        imageCaption(image)
      );

    if (anchor) {
      anchor.classList.add("image-link");
      anchor.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || modifierPressed(event)) return;
        event.preventDefault();
        view();
      });
      return;
    }

    image.classList.add("is-zoomable");
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${t("viewer.openImage")}: ${imageCaption(image)}`);

    image.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || modifierPressed(event)) return;
      view();
    });

    image.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      view();
    });
  });
}

function decodeHash(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function pdfTarget(link) {
  let url;
  try {
    url = new URL(link.getAttribute("href"), location.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin) return null;
  const name = decodeHash(url.pathname.split("/").pop() || "");
  if (!/\.pdf$/i.test(name)) return null;
  return { src: url.href, title: link.textContent.trim() || name };
}

function libraryDocumentTarget(link) {
  let url;
  try {
    url = new URL(link.getAttribute("href"), location.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin || !/\/library\.html$/.test(url.pathname) || !url.hash) {
    return null;
  }
  return { id: decodeHash(url.hash.slice(1)), href: url.href };
}

function initDocumentLinks(body) {
  qsa("a[href]", body).forEach((link) => {
    const pdf = pdfTarget(link);
    const library = pdf ? null : libraryDocumentTarget(link);
    if (!pdf && !library) return;

    link.classList.add("document-link");

    link.addEventListener("click", async (event) => {
      if (event.defaultPrevented || event.button !== 0 || modifierPressed(event)) return;

      if (pdf) {
        event.preventDefault();
        openDocument(pdf.src, pdf.title);
        return;
      }

      event.preventDefault();
      try {
        const index = await getLibraryIndex();
        const item = index.items.find((candidate) => candidate.id === library.id);
        if (!item || item.type !== "document") {
          location.href = library.href;
          return;
        }
        openDocument(new URL(item.src, location.href).href, item.title || library.id);
      } catch {
        location.href = library.href;
      }
    });
  });
}

function showMissing(message) {
  missingIsCustom = Boolean(message);
  if (elements.loading) elements.loading.hidden = true;
  if (elements.root) elements.root.hidden = true;
  if (elements.error) {
    elements.error.hidden = false;
    const lead = qs(".article-missing__lead", elements.error);
    if (lead) lead.textContent = message || t("article.missingLead");
  }
  document.title = t("article.errorTitle");
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

function postProcess(body) {
  /* Images become plates with captions. */
  qsa("img", body).forEach((image) => {
    image.setAttribute("decoding", "async");
    if (image.closest("figure")) return;

    const anchor = image.parentElement?.tagName === "A" ? image.parentElement : null;
    const target = anchor || image;
    const paragraph = image.closest("p");

    const figure = document.createElement("figure");
    target.replaceWith(figure);
    figure.appendChild(target);

    if (paragraph && !paragraph.textContent.trim()) {
      paragraph.replaceWith(figure);
    }

    const caption = image.getAttribute("alt") || image.getAttribute("title") || "";
    if (caption.trim()) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = caption.trim();
      figure.appendChild(figcaption);
    }
  });

  /* External links open in a new tab. */
  qsa('a[href^="http"]', body).forEach((link) => {
    try {
      const url = new URL(link.getAttribute("href"), location.href);
      if (url.origin !== location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.classList.add("external");
      }
    } catch {
      /* leave malformed links alone */
    }
  });

  /* Images open a larger overlay when clicked. */
  initImageLinks(body);

  /* Local PDFs and library documents open in a viewer instead of navigating. */
  initDocumentLinks(body);

  /* Code blocks get a label and a copy button. */
  qsa("pre", body).forEach((pre) => {
    const code = pre.querySelector("code");
    const languageClass = [...(code?.classList || [])].find((name) => name.startsWith("language-"));
    const language = languageClass ? languageClass.replace("language-", "") : "Code";

    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    pre.replaceWith(wrapper);

    const head = document.createElement("div");
    head.className = "code-block__head";

    const label = document.createElement("span");
    label.textContent = language;

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "code-block__copy";
    copy.textContent = t("article.copy");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code?.textContent ?? pre.textContent);
        copy.textContent = t("article.copied");
      } catch {
        copy.textContent = t("article.selectCopy");
      }
      setTimeout(() => {
        copy.textContent = t("article.copy");
      }, 1800);
    });

    head.append(label, copy);
    wrapper.append(head, pre);
  });

  /* Tables scroll on narrow screens. */
  qsa("table", body).forEach((table) => {
    if (table.parentElement?.classList.contains("table-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });
}

function buildContents(body) {
  const headings = [];
  const used = new Set();

  qsa("h2, h3", body).forEach((heading) => {
    const text = heading.textContent.trim();
    if (!text) return;
    const id = slugifyHeading(text, used);
    heading.id = id;

    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${id}`;
    anchor.setAttribute("aria-label", t("article.linkToSection", { text }));
    anchor.textContent = "¶";
    heading.appendChild(anchor);

    headings.push({ id, text, level: heading.tagName === "H3" ? 3 : 2 });
  });

  if (!headings.length) {
    if (elements.tocAside) elements.tocAside.hidden = true;
    elements.layout?.classList.add("no-toc");
    return [];
  }

  elements.toc.innerHTML = headings
    .map(
      (heading) =>
        `<li class="${heading.level === 3 ? "toc--h3" : ""}"><a href="#${heading.id}">${escapeHTML(heading.text)}</a></li>`
    )
    .join("");

  return headings;
}

function renderInfobox(post, site) {
  const tags = post.tags.length
    ? post.tags
        .map(
          (tag, index) =>
            `<a href="writing.html?tag=${encodeURIComponent(post.tagSlugs[index])}">${escapeHTML(tag)}</a>`
        )
        .join("")
    : "<span>—</span>";

  elements.infobox.innerHTML = `
    <div class="infobox__title">${escapeHTML(post.title)}</div>
    <div class="infobox__sub">${t("article.infoboxSub")}</div>
    <div class="infobox__row"><span>${t("article.published")}</span><span>${escapeHTML(formatDateLong(post.date, getLang()))}</span></div>
    <div class="infobox__row"><span>${t("article.category")}</span><span><a href="writing.html?cat=${encodeURIComponent(post.categorySlug)}">${escapeHTML(post.category)}</a></span></div>
    <div class="infobox__row"><span>${t("article.reading")}</span><span>${t("common.minRead", { n: post.minutes })} · ${t("common.wordsCount", { n: post.words.toLocaleString(getLang() === "vi" ? "vi-VN" : "en-GB") })}</span></div>
    <div class="infobox__row"><span>${t("article.tags")}</span><span class="infobox__tags">${tags}</span></div>
    <div class="infobox__row"><span>${t("article.permalink")}</span><span><code>${escapeHTML(post.url)}</code></span></div>
    <div class="infobox__foot"><a href="feed.xml">${t("common.rss")}</a> · <a href="writing.html" data-random>${t("article.randomEntry")}</a> · <a href="writing.html?cat=${encodeURIComponent(post.categorySlug)}">${t("article.moreIn", { category: escapeHTML(post.category) })}</a></div>`;
}

function renderRelated(post, index) {
  let related = index.posts.filter(
    (candidate) => candidate.slug !== post.slug && candidate.category === post.category
  );

  if (!related.length) {
    related = index.posts.filter((candidate) => candidate.slug !== post.slug).slice(0, 3);
  }

  if (!related.length) {
    elements.related.hidden = true;
    return;
  }

  elements.related.innerHTML = `
    <h2>${t("article.related")}</h2>
    <ul>
      ${related
        .slice(0, 4)
        .map(
          (candidate) => `
          <li>
            <a href="${candidate.url}">${escapeHTML(candidate.title)}</a>
            <small>${escapeHTML(candidate.category)} · ${escapeHTML(formatDateShort(candidate.date, getLang()))}</small>
          </li>`
        )
        .join("")}
    </ul>`;
}

function renderPager(post, index) {
  const position = index.posts.findIndex((candidate) => candidate.slug === post.slug);
  const newer = index.posts[position - 1];
  const older = index.posts[position + 1];

  if (!newer && !older) {
    elements.pager.hidden = true;
    return;
  }

  const links = [];
  if (newer) {
    links.push(
      `<a class="pager-link" href="${newer.url}"><span>← ${t("article.newer")}</span><strong>${escapeHTML(newer.title)}</strong></a>`
    );
  }
  if (older) {
    links.push(
      `<a class="pager-link ${newer ? "pager-link--next" : ""}" href="${older.url}"><span>${t("article.older")} →</span><strong>${escapeHTML(older.title)}</strong></a>`
    );
  }
  elements.pager.innerHTML = links.join("");
}

function renderCatbar(post, site) {
  const tags = post.tags
    .map(
      (tag, index) =>
        `<a href="writing.html?tag=${encodeURIComponent(post.tagSlugs[index])}">#${escapeHTML(tag)}</a>`
    )
    .join("");

  elements.catbar.innerHTML = `
    <span class="catbar__label">${t("article.catbarLabel")}</span>
    <a href="writing.html?cat=${encodeURIComponent(post.categorySlug)}">${escapeHTML(post.category)}</a>
    ${tags}
    <span class="catbar__license">${t("article.licenseLine", { license: site?.license || "CC BY-SA 4.0" })}</span>`;
}

async function renderMath(body) {
  try {
    await waitFor(() => typeof window.renderMathInElement === "function", 4000);
    window.renderMathInElement(body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
      errorColor: "#7d1d1d",
      macros: KATEX_MACROS,
    });
  } catch {
    /* If KaTeX is unavailable the TeX source is still readable. */
  }
}

/* -------------------------------------------------------------------------- */
/* display math protection                                                    */
/* -------------------------------------------------------------------------- */

/* Markdown treats a doubled backslash as an escape and turns the newline after
 * it into a space. In display math that eats the LaTeX row break, so an
 * \begin{align} collapses onto one line. Inline math has the same problem with
 * escaped punctuation: Markdown turns "\{" into "{", "\," into ",", and so on,
 * so KaTeX silently loses the literal braces. Stash every math span before
 * Markdown runs and put the untouched TeX back afterwards. */
const MATH_PLACEHOLDER = "ENCYCLOPEDIAMATHPLACEHOLDER";

function mathToken(blocks, tex) {
  const token = `${MATH_PLACEHOLDER}${blocks.length}END`;
  blocks.push({ token, tex });
  return token;
}

function protectMath(markdown) {
  const blocks = [];
  let text = String(markdown);

  /* Display math first, so its contents are never mistaken for inline math. */
  text = text.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (match) =>
    mathToken(blocks, match)
  );

  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match) => mathToken(blocks, match));

  /* Inline $...$; skip empty spans and currency-style "$5 and $10" matches. */
  text = text.replace(/(^|[^\\$])\$((?:\\.|[^$\n])+?)\$(?!\$)/g, (match, prefix, tex) => {
    if (!tex.trim() || /^\s|\s$/.test(tex)) return match;
    return `${prefix}${mathToken(blocks, `$${tex}$`)}`;
  });

  return { text, blocks };
}

function restoreMath(html, blocks) {
  if (!blocks.length) return html;
  let output = html;
  for (const { token, tex } of blocks) {
    /* A function replacement keeps "$" sequences in the TeX literal; a string
     * replacement would treat "$$" as a special replacement pattern. */
    output = output.replace(token, () => escapeHTML(tex));
  }
  return output;
}

function initProgress(body) {
  const header = qs(".masthead");
  if (elements.progress && header) {
    elements.progress.style.top = `${header.offsetHeight}px`;
  }

  let scheduled = false;
  const update = () => {
    scheduled = false;
    if (!elements.progress) return;
    const top = body.getBoundingClientRect().top + window.scrollY;
    const span = Math.max(body.offsetHeight - window.innerHeight * 0.55, 1);
    const position = (window.scrollY + window.innerHeight * 0.18 - top) / span;
    elements.progress.style.width = `${Math.min(100, Math.max(0, position * 100))}%`;
  };

  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

function initTocSpy(headings) {
  if (!headings.length || !elements.toc) return;
  const links = new Map(
    qsa("a", elements.toc).map((link) => [decodeURIComponent(link.hash.slice(1)), link])
  );

  let scheduled = false;
  const update = () => {
    scheduled = false;

    /* Match the position anchors actually scroll to: the browser applies both
       scroll-padding (root) and scroll-margin (heading) before settling. */
    const rootStyle = getComputedStyle(document.documentElement);
    const padding = parseFloat(rootStyle.scrollPaddingTop) || 0;
    const firstHeading = document.getElementById(headings[0].id);
    const margin = firstHeading ? parseFloat(getComputedStyle(firstHeading).scrollMarginTop) || 0 : 0;
    const headerHeight = qs(".masthead")?.offsetHeight || 0;
    const offset = (padding + margin || headerHeight + 28) + 2;

    let current = null;

    /* The last heading may never cross the reading line when the page cannot
       scroll any further, so treat "at the bottom" as its own signal. */
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const atBottom = maxScroll > 0 && window.scrollY >= maxScroll - 2;

    if (atBottom) {
      current = headings[headings.length - 1].id;
    } else {
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= offset) current = heading.id;
        else break;
      }
    }

    links.forEach((link, id) => {
      link.classList.toggle("is-active", id === current);
    });
  };

  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}

function initArticleTools() {
  qsa("[data-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });

  qsa("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(location.href);
        button.textContent = t("article.copied");
        button.classList.add("is-done");
      } catch {
        window.prompt(t("article.copyPrompt"), location.href);
        button.textContent = t("article.copyLink");
      }
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-done");
      }, 1800);
    });
  });
}

async function init() {
  let site = null;
  let index = null;

  try {
    [site, index] = await Promise.all([getSite(), getPostsIndex()]);
  } catch {
    showMissing(t("article.indexError"));
    return;
  }

  if (!slug) {
    showMissing();
    return;
  }

  const post = index.posts.find((candidate) => candidate.slug === slug);
  if (!post) {
    showMissing();
    return;
  }

  let markdown = "";
  try {
    const built = window.__ENCYCLOPEDIA__?.sources?.[post.slug];
    if (typeof built === "string") {
      markdown = built;
    } else {
      const response = await fetch(post.source, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Could not load ${post.source}`);
      markdown = await response.text();
    }
    markdown = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  } catch {
    showMissing(t("article.sourceError"));
    return;
  }

  currentPost = post;
  currentSite = site;
  currentIndex = index;

  const pageTitle = `${post.title} — ${site?.name || "A Personal Encyclopedia"}`;
  document.title = pageTitle;
  setMeta("name", "description", post.summary);
  setMeta("property", "og:title", post.title);
  setMeta("property", "og:description", post.summary);
  setMeta("property", "og:type", "article");
  setMeta("property", "article:published_time", post.date);

  if (site?.url) {
    const canonicalUrl = `${site.url.replace(/\/+$/, "")}/${post.url}`;
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = canonicalUrl;
    document.head.appendChild(canonical);

    const structured = document.createElement("script");
    structured.type = "application/ld+json";
    structured.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.summary,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: "vi",
      author: { "@type": "Person", name: site.name },
      publisher: { "@type": "Person", name: site.name },
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      keywords: post.tags.join(", "),
    });
    document.head.appendChild(structured);
  }

  setMeta("property", "og:site_name", site?.name);
  setMeta("property", "og:locale", "vi_VN");

  setText(elements.title, post.title);
  if (elements.subtitle) {
    elements.subtitle.textContent = post.subtitle || "";
    elements.subtitle.hidden = !post.subtitle;
  }
  setText(elements.category, post.category);
  if (elements.categoryLink) {
    elements.categoryLink.href = `writing.html?cat=${encodeURIComponent(post.categorySlug)}`;
  }
  setText(elements.date, formatDateLong(post.date, getLang()));
  setText(elements.reading, t("common.minRead", { n: post.minutes }));
  setText(elements.words, t("common.wordsCount", { n: post.words.toLocaleString(getLang() === "vi" ? "vi-VN" : "en-GB") }));
  setText(elements.crumb, post.title);

  await waitFor(() => window.marked && typeof window.marked.parse === "function", 5000).catch(() => {});

  const math = protectMath(markdown);
  const html = window.marked
    ? restoreMath(
        window.marked.parse(math.text, { gfm: true, breaks: false }),
        math.blocks
      )
    : `<p class="note"><span class="note__title">${t("article.markdownUnavailable")}</span>${t("article.markdownFallback")}</p><pre>${escapeHTML(markdown)}</pre>`;

  elements.body.innerHTML = html;
  postProcess(elements.body);

  const headings = buildContents(elements.body);

  /* On phones the contents box would push the article off-screen. */
  const tocBox = qs(".toc-box");
  if (tocBox && window.matchMedia("(max-width: 860px)").matches) {
    tocBox.open = false;
  }

  renderInfobox(post, site);
  renderRelated(post, index);
  renderPager(post, index);
  renderCatbar(post, site);

  await renderMath(elements.body);

  if (elements.loading) elements.loading.hidden = true;
  if (elements.root) elements.root.hidden = false;

  initArticleTools();
  initProgress(elements.body);
  initTocSpy(headings);

  onLanguageChange(() => {
    if (currentPost) {
      setText(elements.date, formatDateLong(currentPost.date, getLang()));
      setText(elements.reading, t("common.minRead", { n: currentPost.minutes }));
      setText(
        elements.words,
        t("common.wordsCount", {
          n: currentPost.words.toLocaleString(getLang() === "vi" ? "vi-VN" : "en-GB"),
        })
      );
      renderInfobox(currentPost, currentSite);
      renderRelated(currentPost, currentIndex);
      renderPager(currentPost, currentIndex);
      renderCatbar(currentPost, currentSite);
      qsa(".code-block__copy", elements.body).forEach((button) => {
        button.textContent = t("article.copy");
      });
    } else if (elements.error && !elements.error.hidden) {
      document.title = t("article.errorTitle");
      if (!missingIsCustom) {
        const lead = qs(".article-missing__lead", elements.error);
        if (lead) lead.textContent = t("article.missingLead");
      }
    }
  });

  if (location.hash) {
    const scrollToTarget = () => {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    };

    window.requestAnimationFrame(scrollToTarget);
    window.addEventListener("load", () => window.requestAnimationFrame(scrollToTarget), { once: true });
    qsa("img", elements.body).forEach((image) => {
      if (image.complete) return;
      image.addEventListener("load", () => window.requestAnimationFrame(scrollToTarget), { once: true });
      image.addEventListener("error", () => window.requestAnimationFrame(scrollToTarget), { once: true });
    });
  }
}

init();
