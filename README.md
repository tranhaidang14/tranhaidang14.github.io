# A Personal Encyclopedia

A small, Wikipedia-inspired personal site for mathematics writing, photographs,
and PDFs. Plain HTML, CSS, and JavaScript; no framework and no build server. The
only runtime dependencies are [Marked](https://marked.js.org/) and
[KaTeX](https://katex.org/), both loaded from a CDN.

The design is deliberately old-fashioned: white paper, black ink, oxblood seal,
thin rules, a blackletter wordmark, a contents box, an infobox, and a random-page
button. The home page has an animated mathematical background and a shelf that
switches between writing and library plates.

## Quick start

Requires Node 20 or newer (Node 22 is what the site is tested with).

```bash
npm start
```

This scans the content, writes the JSON indexes, and serves the site at
<http://localhost:4173>. While the server runs, edits under `content/` trigger an
automatic rebuild — just reload the page. `npm run serve` does the same without
the initial build, and `npm run build` regenerates everything by hand. Set
`NO_WATCH=1` to turn the watcher off.

To work on the site and the metadata dashboard at the same time:

```bash
npm run dev
```

This builds once, starts both servers, and prints both links (site on port 4173,
dashboard on 4174). Ctrl+C stops both. Use `SITE_PORT` and `DASHBOARD_PORT` to
choose different ports.

The pages also open directly from disk (`index.html` via `file://`): the build
writes classic script bundles and data files so no local server is required.

## What is where

```text
index.html              front page: hero, shelf slider, recent changes
writing.html            the article archive with live filters
library.html            plates and documents, with a lightbox
article.html            one reader shell; the entry is chosen by ?p=slug
about.html              the user page / colophon
404.html                not-found page
assets/css/main.css     design system, masthead, home, archive, responsive
assets/css/pages.css    article, library, about, print
assets/js/lib.js        shared helpers and cached JSON fetches
assets/js/core.js       site metadata, navigation, search, random page
assets/js/home.js       canvas animation, shelf slider, front-page content
assets/js/writing.js    archive filters and sorting
assets/js/library.js    shelves, filters, lightbox
assets/js/article.js    Markdown, KaTeX, contents, infobox, pager
assets/js/app/          generated classic bundles (one per page)
content/posts/          one Markdown file per article
content/library/        photos/ and documents/, plus optional meta.json
content/site.json       name, wordmark, seal, links, license
tools/build.mjs         index, feed, sitemap, and script generator
tools/bundle.mjs        turns the ES modules into classic page bundles
tools/new-post.mjs      article scaffolder
tools/serve.mjs         local static server
tools/dev.mjs           runs the site and dashboard together
dashboard/              local-only metadata editor (never deployed)
```

## Writing an article

```bash
npm run new -- "The title of the piece" --category=Geometry --tags="Euler, Series"
```

That creates a dated Markdown file in `content/posts/` and immediately rebuilds
the site. New posts are published by default; add `--draft` to keep one hidden
until you are ready. You can also set `draft: true` in the front matter and run
`npm run build` later.

Categories are free-form. Whatever you pass to `--category` (or write in the
front matter) automatically becomes a new filter on the writing page.

Front matter:

```yaml
---
title: "The Basel Problem"
subtitle: "A stubborn sum and a guess that turned out to be true."
date: 2026-11-12
category: Analysis
tags: [Euler, Series, "Zeta function"]
summary: "One sentence for cards, search results, and the RSS feed."
featured: true
draft: false
---
```

Only `title` and `date` are required in practice; everything else has a sensible
fallback. The newest `featured: true` entry becomes the front-page feature.

### Mathematics

Inline mathematics uses `$...$`; display mathematics uses `$$...$$`. Display
blocks may contain multi-line environments such as `\begin{align}`: `&` marks
the alignment point and `\\` starts a new row. Use `align*` (or `aligned`) to
omit the row numbers. Display math is set aside before Markdown parsing, so
`\\`, `&`, and `_` reach KaTeX unchanged. A few macros are predefined in
`assets/js/article.js`:

| Macro | Renders |
| --- | --- |
| `\R` | the real numbers |
| `\N` | the natural numbers |
| `\Z` | the integers |
| `\Q` | the rationals |
| `\C` | the complex numbers |
| `\dd` | an upright differential d |
| `\abs{x}` | absolute value |

```markdown
The identity
$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
is Euler's.
```

### Figures and notes

Images written as normal Markdown become plates with captions:

```markdown
![The caption that will appear under the plate](content/library/photos/plate.svg)
```

Leave a blank line before and after the image. Without it — especially directly
after an HTML block such as `</div>` — Markdown treats the line as raw HTML and
shows the `![...](...)` syntax as text instead of rendering the image.

Clicking a plate opens it larger in an overlay; use **Mở trong tab mới** there to
open the original file. If the image is wrapped in a link to a larger image, that
link target is used as the full-size version.

A note box is ordinary HTML inside Markdown:

```html
<div class="note">
<p class="note__title">A note on rigour</p>
<p>Aside text goes here.</p>
</div>
```

### Linking to documents

Link straight to a PDF with ordinary Markdown:

```markdown
[Open the exam paper](content/library/documents/example.pdf)
```

Clicking opens it in a viewer inside the article, with **Mở trong tab mới** for a
full-window view or download. You can also point at a library entry:

```markdown
[View it in the Library](library.html#documents-example)
```

The `id` after `#` is the one shown in the address bar when you open the document
in the Library. Run `npm run build` after adding the PDF so the index knows about
it.

Code blocks get a copy button, tables scroll on narrow screens, headings get
anchor links and fill the contents box automatically, and external links open in
a new tab.

## The library

Drop images into `content/library/photos/` and PDFs into
`content/library/documents/`, then run `npm run build`. Supported image types are
`.svg`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, and `.gif`.

Optional metadata lives in `content/library/meta.json`, keyed by the path
relative to `content/library/`:

```json
{
  "photos/example.jpg": {
    "title": "A photograph",
    "date": "2026-09-19",
    "description": "Where and when it was taken.",
    "tags": ["landscape", "memory"],
    "collection": "Field Notes"
  }
}
```

Everything without metadata is still published, with a title derived from the
filename and the file's modification date. Items sharing a `collection` are
grouped onto the same shelf on the library page. Clicking a plate opens it in a
native `<dialog>`; PDFs open in an embedded viewer, and the address bar keeps a
deep link such as `library.html#photos-example`.

## Local metadata dashboard

A small, local-only editor is included for the parts you change most often:
front matter in `content/posts/*.md` and `content/library/meta.json`.

```bash
npm run dashboard
```

Open <http://127.0.0.1:4174>. It binds to localhost only and rebuilds the site
after each change. From there you can create a new post scaffold, import photos
and PDFs into the library, edit their metadata, and delete posts or library files
(with confirmation). It never edits Markdown bodies: new posts contain only front
matter, ready for you to write in your Markdown editor. If the site is already
running with `npm start`, just reload the page. See `dashboard/README.md` for
configuration and for moving the dashboard to a different folder or repository.

The dashboard is not part of `_site/`, and the Cloudflare deploy does not
copy it, so it stays off the public site.

## Site identity

Edit `content/site.json` before publishing:

```json
{
  "name": "Trần Hải Đăng",
  "wordmark": "Hai Dang",
  "seal": "H",
  "tagline": "Bách khoa cá nhân",
  "description": "Một cuốn bách khoa cá nhân về toán học, ảnh chụp, và những ngày đáng nhớ.",
  "since": 2026,
  "url": "https://tranhaidang.cc.cd",
  "email": "tranhaidangg2@gmail.com",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
  "repo": "https://github.com/tranhaidang14/tranhaidang14.github.io",
  "links": [
    { "label": "GitHub", "url": "https://github.com/tranhaidang14" },
    { "label": "Email", "url": "mailto:tranhaidangg2@gmail.com" },
    { "label": "RSS", "url": "feed.xml" }
  ]
}
```

`url` is used for canonical URLs and the sitemap, so set it to the final address.
All page links are relative, so a project site at
`https://username.github.io/repository/` works as well as a user site at the
root.

## Vietnamese interface

The interface is Vietnamese only; there is no language switch. Long and short
dates use Vietnamese formatting. Article and library text stays in whichever
language it was written in.

To revise a label, edit the `STRINGS` table in `assets/js/i18n.js`. Static pages
use `data-i18n="key"` attributes; `data-i18n-placeholder`,
`data-i18n-aria-label`, `data-i18n-title-attr`, and `data-i18n-meta` cover the
other attributes. When adding a new interface string, add it to the table and
reference the key from the page or script.

The `lang` attribute on `<html>` is fixed to `vi`, and the RSS feed language is
set in `tools/build.mjs`.

## Deploying to Cloudflare Workers

The site is live at <https://tranhaidang.cc.cd/>. GitHub Pages is no longer used;
the GitHub repository is kept as the source of truth.

The Cloudflare project is a **Worker with static assets**, not a Pages project.
Workers Builds has no “Build output directory” field: the folder is declared in
`wrangler.jsonc`.

### Workers Builds settings

- **Build command**: `npm run build:pages`
- **Deploy command**: `npx wrangler deploy`
- **Root directory**: `/`
- **Node version**: 22 (or 20+)

`wrangler.jsonc` points Wrangler at the generated `_site/` directory:

```jsonc
{
  "name": "tranhaidang",
  "compatibility_date": "2026-11-26",
  "assets": {
    "directory": "./_site",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

The live Worker is named `tranhaidang` (also reachable at
`tranhaidang.dang-nhac-dev.workers.dev`). Change `name` only if you rename the
Worker in Cloudflare. `html_handling` serves `/<slug>` from `<slug>.html` and
redirects the `.html` form; `not_found_handling` serves `404.html`.

**Keep this file.** Without a Wrangler config, `wrangler deploy` can fall back to
the repository root and expose `content/*.md`, `tools/`, `package.json`, and
other source files. With `assets.directory` set to `./_site`, only the staged
site is public.

`npm run build:pages` runs `tools/build.mjs` (indexes, feed, sitemap, bundles,
and one static HTML page per post) and then `tools/stage.mjs`, which copies only
the deployable files into `_site/`. The dashboard, tools, `node_modules/`, and
the Markdown sources are never published.

If you use a classic **Pages** project instead, its settings are build command
`npm run build:pages` and output directory `_site`. The repository is configured
for Workers Builds.

Update `url` in `content/site.json` whenever the domain changes, then run
`npm run build` so canonical URLs, Open Graph tags, the sitemap, and the feed all
use the new address.

### Static, crawlable post pages

Every published post also exists as a standalone HTML file at the repository
root (`<slug>.html`). Cloudflare serves it at `/<slug>` and redirects the
`.html` form, so internal links, canonical URLs, and the sitemap all use the
clean URL. `article.html?p=…` remains as a legacy shell and is marked `noindex`.

After changing content, run `npm run build` before committing. The generated
indexes, `feed.xml`, `sitemap.xml`, data scripts, post pages, and
`assets/js/app/` bundles are committed so the site also works without a build
step.

### Turning off GitHub Pages

1. Open the repository on GitHub → **Settings** → **Pages**.
2. Click **Unpublish site** in the “Your site is live at …” box and confirm.
   (Current GitHub UI has no “Source: None” option; unpublishing is the way to
   disable Pages.)
3. If a **Custom domain** was configured there, remove it first so it cannot
   conflict with Cloudflare DNS.
4. Optionally delete the `github-pages` environment under **Settings →
   Environments**.
5. The old workflow has been deleted from the repository, so future pushes will
   not redeploy to GitHub Pages.

The repository and its history stay intact; only
`https://<user>.github.io/` stops serving. GitHub’s CDN may keep the old URL
briefly cached, then return 404.

### Search engines

Submit `https://tranhaidang.cc.cd/sitemap.xml` in Google Search Console and Bing
Webmaster Tools, verify the domain, and use URL Inspection to request indexing
for new posts. Each post ships with a unique title, description, canonical URL,
Open Graph/Twitter card, and `BlogPosting` JSON-LD.

## Notes on the design

- Fonts: EB Garamond for text and headings, UnifrakturMaguntia for the wordmark
  and drop caps, both from Google Fonts.
- Accent: oxblood `#7d1d1d`, used only for the seal and small emphases.
- No rounded corners, no cards with shadows except hard offset shadows, no
  tracking, no external services beyond the CDN and Google Fonts.
- The home animation draws a Lissajous figure and drifting mathematical glyphs on
  a canvas. It pauses when off-screen or when the tab is hidden, and renders a
  still frame under `prefers-reduced-motion`.
- The library lightbox uses the native `<dialog>` element, so Escape, focus
  trapping, and the backdrop are handled by the browser.
