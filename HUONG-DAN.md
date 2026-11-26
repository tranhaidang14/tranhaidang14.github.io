# Hướng dẫn deploy và đăng nội dung

Tài liệu này hướng dẫn cách deploy trang web lên **Cloudflare Workers** (đang chạy
tại <https://tranhaidang.cc.cd/>), sau đó cách đăng bài viết mới và thêm ảnh/PDF
vào thư viện.

Trang web là site tĩnh: không có cơ sở dữ liệu, không cần server riêng. Mọi thứ
được tạo từ các file trong thư mục này và tự động build lại trên Cloudflare.

> File hướng dẫn này không được deploy lên trang web. `tools/stage.mjs` chỉ copy
> các file cần thiết của site vào `_site/`.

---

## 1. Chạy thử trên máy

Yêu cầu: **Node.js 20 trở lên** (khuyến nghị Node 22).

```bash
cd /media/Data/Workspace/Project/tranhaidang
npm start
```

Mở <http://localhost:4173>.

- `npm run dev` = build rồi chạy **cả site và dashboard**, in ra hai link cùng lúc.
- `npm start` = build nội dung rồi chạy server local.
- `npm run build` = chỉ build lại index, RSS, sitemap và script.
- `npm run serve` = chạy server và theo dõi thay đổi, không build lần đầu.

Khi server đang chạy, mọi thay đổi trong `content/` (bài viết, ảnh, PDF,
`meta.json`, `site.json`) sẽ tự động build lại. Bạn chỉ cần tải lại trang đang
đọc — không cần khởi động lại server hay chạy `npm run build`. Muốn tắt tính
năng theo dõi: `NO_WATCH=1 npm start`.

Muốn mở cả site và dashboard cùng lúc, dùng `npm run dev`: dashboard ở cổng 4174,
site ở cổng 4173, cả hai link được in ra ngay. Ctrl+C dừng cả hai.

### Bảng điều khiển metadata (chỉ trên máy)

Nếu chỉ muốn sửa tiêu đề, ngày, nhóm, thẻ, mô tả… mà không mở file Markdown,
chạy thêm một cửa sổ terminal:

```bash
npm run dashboard
```

Mở <http://127.0.0.1:4174>. Dashboard giúp bạn:

- sửa front matter ở đầu các file trong `content/posts/`;
- sửa `content/library/meta.json` cho ảnh và PDF;
- tạo bài viết mới (chỉ có front matter, mặc định là bản nháp — bạn viết nội
  dung tiếp bằng ứng dụng Markdown);
- nhập ảnh/PDF vào `content/library/` (chọn được nhiều tệp);
- xóa bài viết hoặc tệp thư viện, luôn hỏi xác nhận trước.

Nó **không sửa nội dung bài viết, ảnh hay PDF**. Sau mỗi thao tác, dashboard tự
build lại site; nếu site đang chạy bằng `npm start`, chỉ cần tải lại trang.
Dashboard chỉ nghe trên `127.0.0.1`, không được deploy lên Cloudflare. Chi
tiết và cách chuyển sang thư mục/repo khác: xem `dashboard/README.md`.

Cách nhanh nhất để mở cả hai: chạy `npm run dev` ở thư mục gốc — dashboard và
site cùng khởi động, hai link được in ra một lần.

---

## 2. Deploy miễn phí bằng Cloudflare Workers

Trang đang chạy tại **<https://tranhaidang.cc.cd/>**. GitHub Pages đã được gỡ
khỏi quy trình deploy; repo GitHub vẫn được giữ làm nơi lưu mã nguồn.

Cloudflare project đang dùng **Worker + static assets**, không phải Pages.
Workers Builds **không có ô “Build output directory”**; thư mục deploy được khai
báo trong `wrangler.jsonc`.

### 2.1. Cấu hình Workers Builds

Trong dashboard Cloudflare → **Workers & Pages** → Worker của bạn →
**Settings → Build**:

- **Build command**: `npm run build:pages`
- **Deploy command**: `npx wrangler deploy`
- **Root directory**: `/`
- **Node version**: 22 (hoặc 20+)

File `wrangler.jsonc` trỏ Wrangler vào thư mục `_site/`:

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

Worker đang chạy tên `tranhaidang` (cũng truy cập được ở
`tranhaidang.dang-nhac-dev.workers.dev`). Chỉ đổi `name` nếu bạn đổi tên Worker
trong Cloudflare. `html_handling` giúp `/<slug>` phục vụ `<slug>.html` và
chuyển hướng URL `.html`; `404-page` dùng `404.html` của site.

**Đừng xóa file này.** Nếu không có cấu hình Wrangler, `wrangler deploy` có thể
lấy thư mục gốc của repo và làm lộ `content/*.md`, `tools/`, `package.json` cùng
các file nguồn khác. Với `assets.directory` là `./_site`, chỉ site đã stage được
công khai.

`npm run build:pages` chạy `tools/build.mjs` (tạo index, RSS, sitemap, bundle
và các trang bài viết tĩnh) rồi `tools/stage.mjs` (gom file cần deploy vào
`_site/`). Không đưa `dashboard/`, `tools/`, `node_modules/` hay file Markdown
nguồn lên hosting.

Nếu bạn dùng **Pages** cổ điển thay vì Worker, cấu hình là build command
`npm run build:pages` và output directory `_site`.

Mỗi lần push lên nhánh `main`, Workers Builds tự build và deploy lại. Không cần
workflow GitHub Actions.

### 2.2. Tên miền

1. **Workers & Pages** → Worker → **Settings → Domains & Routes**.
2. Thêm `tranhaidang.cc.cd` (và `www` nếu muốn).
3. Cloudflare tự tạo bản ghi DNS khi tên miền nằm trong cùng tài khoản.
4. Đảm bảo `content/site.json` có:

   ```json
   { "url": "https://tranhaidang.cc.cd" }
   ```

   Sau đó chạy `npm run build` để canonical, sitemap và RSS dùng đúng tên miền.

### 2.3. Tắt GitHub Pages (giữ repo)

1. Mở repo trên GitHub → **Settings** → **Pages**.
2. Bấm **Unpublish site** trong ô “Your site is live at …” rồi xác nhận. Giao
   diện GitHub hiện tại không có mục **Source: None**; unpublish là cách tắt.
3. Nếu đã từng đặt **Custom domain** ở GitHub Pages, xóa tên miền đó trước để
   tránh xung đột DNS với Cloudflare.
4. Vào **Settings → Environments** → xóa môi trường `github-pages` (không bắt
   buộc, nhưng giúp dọn dẹp).
5. Workflow `.github/workflows/pages.yml` đã được xóa khỏi repo, nên các lần
   push sau không còn deploy lên GitHub Pages.

Repo, commit, issue và GitHub Pages cũ không mất dữ liệu; chỉ website
`https://tranhaidang14.github.io/` ngừng được phục vụ (GitHub CDN có thể còn
cache một lúc, sau đó trả 404).

### 2.4. Sau khi đổi nội dung

```bash
npm run build        # tạo lại index, RSS, sitemap, bundle và trang bài viết
git add .
git commit -m "Thêm bài viết mới"
git push
```

Cloudflare tự build lại. Có thể chạy `npm run build:pages` để kiểm tra
`_site/` trước khi push.

### 2.5. SEO sau khi deploy

- Mở **Google Search Console** → thêm property `tranhaidang.cc.cd` → xác minh
  (DNS hoặc thẻ HTML) → **Sitemaps** → gửi
  `https://tranhaidang.cc.cd/sitemap.xml`.
- Làm tương tự với **Bing Webmaster Tools**.
- Dùng **URL Inspection** để yêu cầu Google index từng bài mới.
- Mỗi bài có URL sạch dạng `https://tranhaidang.cc.cd/<slug>`, title/meta riêng,
  Open Graph/Twitter card và JSON-LD `BlogPosting`; nội dung đã nằm trong HTML
  nên crawler đọc được ngay cả khi không chạy JavaScript.

---

## 3. Đăng một bài viết mới

### 3.1. Tạo file bài viết

Chạy:

```bash
npm run new -- "Tên bài viết" --category=Analysis --tags="Euler, Series" --summary="Mô tả ngắn"
```

Ví dụ:

```bash
npm run new -- "Một chứng minh của bất đẳng thức AM–GM" \
  --category=Analysis \
  --tags="Bất đẳng thức, Chứng minh" \
  --summary="Một lối vào ngắn cho bất đẳng thức quen thuộc."
```

Lệnh này tạo file:

```text
content/posts/ten-bai-viet.md
```

và tự chạy build. Bài mới được xuất bản ngay (`draft: false`) nên sẽ xuất hiện
trên site sau khi build xong. Nếu muốn giữ bài ở dạng nháp, thêm `--draft` vào
lệnh tạo bài.

### 3.2. Sửa front matter

Mở file vừa tạo. Phần đầu file là front matter:

```yaml
---
title: "Tên bài viết"
subtitle: ""
date: 2026-11-19
category: Analysis
tags: ["Euler", "Series"]
summary: "Mô tả ngắn"
featured: false
draft: false
---
```

Các trường:

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `title` | Có | Tiêu đề bài viết. Có dấu `:` thì phải đặt trong ngoặc kép. |
| `subtitle` | Không | Dòng phụ dưới tiêu đề. Để trống nếu không dùng. |
| `date` | Nên có | Định dạng `YYYY-MM-DD`. Dùng để sắp xếp và hiển thị. |
| `category` | Không | Nhóm bài, dùng cho bộ lọc. Mặc định `Ghi chú`. |
| `tags` | Không | Mảng tag, dùng cho bộ lọc và tìm kiếm. |
| `summary` | Không | Mô tả hiển thị ở trang chủ, archive và kết quả tìm kiếm. Nếu bỏ trống, hệ thống tự lấy 180 ký tự đầu. |
| `featured` | Không | `true` để đưa bài lên “Bài nổi bật” ở trang chủ. Chỉ nên đặt một bài. |
| `draft` | Không | `true` = ẩn khỏi site. Xóa dòng này hoặc đổi thành `false` để xuất bản. |

Category và tag mới sẽ tự xuất hiện trong bộ lọc của trang bài viết. Giao diện
chỉ có tiếng Việt; bài viết vẫn có thể viết bằng tiếng Việt hoặc tiếng Anh, và
nội dung bài không bị dịch tự động.

### 3.3. Viết nội dung

Nội dung là Markdown, hỗ trợ toán học bằng KaTeX.

Chữ thường, **in đậm**, *in nghiêng*, liên kết:

```markdown
Đây là một đoạn văn có *nhấn mạnh* và [một liên kết](https://example.com).
```

Toán trong dòng:

```markdown
Ta có $a^2 + b^2 = c^2$.
```

Toán hiển thị riêng một dòng:

```markdown
$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
```

Công thức nhiều dòng dùng `\begin{align}` (hoặc `align*` nếu không muốn đánh
số). Dấu `&` đặt điểm căn lề, `\\` xuống dòng:

```latex
$$
\begin{align}
MA + MB &\geq AB \\
MC + MD &\geq CD
\end{align}
$$
```

`align` tự đánh số từng dòng; `align*` thì không. Nếu chỉ cần căn lề mà không
đánh số, có thể dùng `aligned` bên trong `$$...$$`. Khối `$$...$$` và `\[...\]`
được giữ nguyên trước khi Markdown xử lý, nên `\\`, `&` và `_` trong công thức
không bị Markdown ăn mất.

Tiêu đề mục (tự sinh mục lục bên cạnh bài):

```markdown
## Một mục lớn

### Một mục nhỏ
```

Ảnh trong bài:

```markdown
![Chú thích ảnh](content/posts/figures/ten-anh.svg)
```

Luôn để **một dòng trống trước và sau ảnh**. Nếu ảnh nằm ngay sau một khối HTML
như `</div>` mà không có dòng trống, Markdown coi cả đoạn là HTML thô và hiện
nguyên cú pháp `![...](...)` thành chữ thay vì hiển thị ảnh.

Nên đặt ảnh riêng của bài trong `content/posts/figures/`. Có thể dùng lại ảnh
trong thư viện:

```markdown
![Mô tả ảnh](content/library/photos/ten-anh.jpg)
```

Ấn vào ảnh trong bài để mở ảnh lớn hơn trong một lớp phủ; nút **Mở trong tab
mới** mở file gốc. Nếu ảnh được bọc trong một liên kết tới ảnh lớn hơn, hệ thống
dùng chính liên kết đó làm ảnh đầy đủ.

Bảng:

```markdown
| N | Giá trị |
|---:|---:|
| 10 | 1.5497 |
| 100 | 1.6350 |
```

Hộp ghi chú:

```html
<div class="note">
<p class="note__title">Ghi chú</p>
<p>Nội dung ghi chú bên lề.</p>
</div>
```

#### Chèn liên kết tới tài liệu

Đặt file PDF trong `content/library/documents/`, chạy `npm run build`, rồi viết
liên kết Markdown bình thường:

```markdown
[Mở đề khảo sát](content/library/documents/ten-tai-lieu.pdf)
```

Ấn vào liên kết, tài liệu sẽ mở trong một khung xem ngay trên bài viết — không
rời trang. Nút **Mở trong tab mới** ở thanh trên dùng khi muốn xem toàn màn hình
hoặc tải file về.

Cũng có thể trỏ tới một mục đã có trong Thư viện:

```markdown
[Xem trong Thư viện](library.html#documents-ten-tai-lieu)
```

Mã sau dấu `#` là `id` của mục, chính là phần xuất hiện trên thanh địa chỉ khi bạn
mở tài liệu trong Thư viện. Tên file nên viết không dấu, không dấu cách; nếu có
dấu cách thì thay bằng `%20`.

Danh sách, trích dẫn, code block đều dùng cú pháp Markdown chuẩn.

### 3.4. Xuất bản

Bài tạo bằng lệnh trên đã ở trạng thái xuất bản. Nếu bạn đã dùng `--draft` (hoặc
tự đặt `draft: true`), đổi thành `draft: false` hoặc xóa hẳn dòng `draft` trước
khi build.

Có thể tạo nhanh phần front matter bằng dashboard: tab **Bài viết** → **Bài viết
mới**, điền tiêu đề/ngày/nhóm/thẻ rồi bấm **Tạo bài viết**. Dashboard tạo file
`.md` (mặc định `draft: true`) và build lại site; sau đó mở file bằng ứng dụng
Markdown để viết nội dung.

1. Kiểm tra front matter:

   ```yaml
   draft: false
   ```

2. Build và xem thử:

   ```bash
   npm start
   ```

3. Mở <http://localhost:4173>, kiểm tra trang chủ, archive, tìm kiếm và bài chi
   tiết.

4. Đẩy lên GitHub:

   ```bash
   npm run build
   git add .
   git commit -m "Đăng bài: Tên bài viết"
   git push
   ```

Sau khi Actions chạy xong, bài sẽ có trên site thật.

### 3.5. Ẩn hoặc xóa bài

- **Tạm ẩn:** đổi `draft: true`, chạy `npm run build`, commit và push.
- **Xóa hẳn:** xóa file `.md`, chạy `npm run build`, commit và push. RSS,
  sitemap và các bộ lọc sẽ tự cập nhật.

Trong dashboard, hai việc này cũng làm được: sửa `draft` rồi lưu, hoặc bấm
**Xóa bài viết** và xác nhận. Dashboard tự build lại sau đó.

Nếu chỉ muốn xem trước một bài nháp mà không muốn đăng, tạm đổi `draft: false`,
chạy `npm start`, xem xong thì đổi lại `draft: true` **và chạy `npm run build`**
trước khi commit.

---

## 4. Đăng tài liệu vào thư viện

Thư viện nhận hai loại file:

- **Ảnh:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`, `.svg`
- **Tài liệu:** `.pdf`

### 4.1. Copy file vào đúng thư mục

Cách nhanh: mở dashboard (`npm run dashboard`), sang tab **Thư viện**, bấm
**Nhập ảnh hoặc PDF** và chọn tệp. Dashboard tự đặt file vào đúng thư mục và
tạo mục metadata. Phần dưới là cách làm thủ công tương đương.

```text
content/library/photos/       ảnh
content/library/documents/    PDF
```

Có thể tạo thư mục con bên trong, ví dụ:

```text
content/library/photos/2026/da-lat.jpg
content/library/documents/analysis/basel-notes.pdf
```

Nên đặt tên file không dấu, không khoảng trắng, chữ thường:

```text
content/library/photos/mua-o-da-lat.jpg
content/library/documents/ghi-chu-basel.pdf
```

### 4.2. Thêm thông tin vào `content/library/meta.json`

File này là **tùy chọn**, nhưng nên dùng để có tiêu đề, mô tả, tag và bộ sưu tập
đẹp.

Mở `content/library/meta.json` và thêm một mục. Khóa là đường dẫn tương đối
trong `content/library/`:

```json
{
  "photos/mua-o-da-lat.jpg": {
    "title": "Mưa ở Đà Lạt",
    "date": "2026-11-20",
    "description": "Ảnh chụp buổi sáng sau cơn mưa, khi sương còn nằm dưới thung lũng.",
    "tags": ["Đà Lạt", "mưa", "ký ức"],
    "collection": "Field Notes"
  },
  "documents/ghi-chu-basel.pdf": {
    "title": "Ghi chú về bài toán Basel",
    "date": "2026-11-20",
    "description": "Hai trang ghi chú: tích của sin, so sánh hệ số, và phần chứng minh còn thiếu.",
    "tags": ["Euler", "analysis", "notes"],
    "collection": "Working Papers"
  }
}
```

Các trường:

| Trường | Ý nghĩa |
|---|---|
| `title` | Tiêu đề hiển thị. Nếu bỏ trống, lấy từ tên file. |
| `date` | Ngày hiển thị/sắp xếp, dạng `YYYY-MM-DD`. Nếu bỏ trống, lấy ngày sửa file. |
| `description` | Mô tả ngắn, hiển thị trong lightbox và được tìm kiếm. |
| `tags` | Mảng tag, dùng cho bộ lọc và tìm kiếm. |
| `collection` | Tên kệ/bộ sưu tập, tạo nút lọc mới trong thư viện. |

Lưu ý:

- Phải giữ JSON hợp lệ: dấu phẩy giữa các mục, không có dấu phẩy ở mục cuối.
- `collection` có thể là bất kỳ tên nào. Ảnh mặc định vào `Plates`, PDF mặc định
  vào `Documents`.
- Có thể dùng khóa là tên file (`"mua-o-da-lat.jpg"`) thay vì đường dẫn đầy đủ,
  nhưng nên dùng đường dẫn tương đối để tránh nhầm khi có file trùng tên.
- Không cần khai báo file vào `meta.json`; file vẫn xuất hiện với tiêu đề lấy từ
  tên file. Tuy nhiên, thêm metadata sẽ giúp tìm kiếm và hiển thị tốt hơn.

### 4.3. Build và kiểm tra

```bash
npm run build
npm start
```

Mở <http://localhost:4173/library.html>.

- Ảnh mới xuất hiện trong thư viện, và 4 ảnh mới nhất lên trang chủ.
- PDF mới xuất hiện trong thư viện và có thể mở bằng lightbox.
- Tìm kiếm ở đầu trang cũng tìm được theo tiêu đề, mô tả, tag, collection và
  tên file.

### 4.4. Đẩy lên GitHub

```bash
npm run build
git add .
git commit -m "Thêm tài liệu: Mưa ở Đà Lạt"
git push
```

### 4.5. Xóa tài liệu

1. Xóa file ảnh/PDF.
2. Xóa mục tương ứng trong `meta.json` (không bắt buộc, nhưng nên dọn).
3. Chạy `npm run build`, commit và push.

Trong dashboard, chọn tệp ở tab **Thư viện** rồi bấm **Xóa tệp**: dashboard xóa
cả file lẫn mục metadata và build lại site.

---

## 5. Quy trình chuẩn mỗi lần đăng nội dung

### Bài viết

```bash
npm run new -- "Tên bài" --category=Analysis --tags="Tag 1, Tag 2"
# sửa nội dung content/posts/ten-bai.md
# thêm --draft ở lệnh trên nếu muốn tạo bản nháp
npm start                      # xem thử
npm run build                  # tạo lại dữ liệu (lệnh new đã tự build một lần)
git add .
git commit -m "Đăng bài: Tên bài"
git push
```

### Thư viện

```bash
# copy file vào content/library/photos hoặc documents
# thêm metadata vào content/library/meta.json
npm run build
npm start                      # xem thử
git add .
git commit -m "Thêm tài liệu: Tên tài liệu"
git push
```

### Checklist trước khi push

- [ ] Bài không còn `draft: true` nếu muốn xuất bản.
- [ ] `npm run build` chạy không lỗi.
- [ ] Đã xem thử ở `http://localhost:4173`.
- [ ] Ảnh/PDF hiển thị đúng, không bị 404.
- [ ] Tiêu đề, ngày, category/tag/summary đã đúng.
- [ ] Không sửa tay các file được sinh tự động:
      `content/posts/index.json`, `content/posts/index.js`,
      `content/posts/sources.js`, `content/library/index.js`,
      `content/site.js`, `assets/js/app/*.js`, `feed.xml`, `sitemap.xml`.

---

## 6. Xử lý sự cố

### Trang web hiện nội dung cũ hoặc các mục bị trống

```bash
npm run build
```

Sau đó hard refresh trình duyệt: **Ctrl + Shift + R**.

Nếu mở trực tiếp file `index.html` bằng `file://`, vẫn phải chạy
`npm run build` sau mỗi lần sửa nội dung để cập nhật dữ liệu và bundle.

### `EADDRINUSE` — cổng 4173 đang được dùng

Đã có một server đang chạy. Mở luôn <http://localhost:4173>, hoặc dùng cổng
khác:

```bash
PORT=4174 npm start
```

Hoặc tắt tiến trình đang giữ cổng:

```bash
fuser -k 4173/tcp
```

### Cloudflare Workers build báo lỗi

1. Mở Cloudflare → **Workers & Pages** → project → **Deployments** → chọn lần
   deploy lỗi → xem log của bước build.
2. Chạy lại locally để thấy lỗi đầy đủ:

   ```bash
   npm run build:pages
   ```

3. Sửa lỗi nếu có, commit và push lại.
4. Kiểm tra **Settings → Build**: build command là `npm run build:pages`, deploy
   command là `npx wrangler deploy`; kiểm tra `wrangler.jsonc` trỏ đúng
   `./_site` và đúng tên Worker.

### Push bị từ chối (`rejected`, `fetch first`)

```bash
git pull --rebase origin main
git push
```

### Bài viết không xuất hiện

- Nếu tạo bằng `--draft`, kiểm tra `draft` đã là `false` hoặc đã xóa chưa.
- Kiểm tra `date` đúng định dạng `YYYY-MM-DD`.
- Chạy `npm run build` và xem lại log: nếu file bị bỏ qua, log sẽ ghi
  `drafts ... ten-bai.md (draft)`.

### Ảnh hoặc PDF bị 404

- Đường dẫn phải tính từ thư mục gốc của site, ví dụ
  `content/library/photos/anh.jpg`.
- Máy build chạy Linux nên phân biệt chữ hoa/chữ thường:
  `Anh.JPG` khác `anh.jpg`.
- Tên file có dấu cách hoặc ký tự đặc biệt dễ gây lỗi; nên đổi sang chữ thường,
  không dấu, dùng dấu gạch ngang.
- Sau khi thêm file phải chạy `npm run build` để index biết file mới.

### Công thức toán không hiển thị

KaTeX và Marked được tải từ CDN, nên cần kết nối Internet khi xem. Nếu công thức
vẫn không render, kiểm tra cú pháp `$...$` hoặc `$$...$$` và xem Console của
trình duyệt.

### Đã lỡ đăng bài nháp

Đổi `draft: true`, chạy `npm run build`, commit và push. CI sẽ build lại và bài
sẽ biến mất khỏi site.

---

## 7. Giới hạn miễn phí cần biết

Cloudflare Workers (gói Free) rất thoải mái cho site tĩnh:

- Request tới static assets **miễn phí, không giới hạn**.
- Không tốn thêm phí lưu trữ asset.
- Build và deploy chạy trên hạ tầng Cloudflare.
- Site rất lớn mới chạm giới hạn số tệp/kích thước tệp của nền tảng.

Với một site cá nhân vài chục bài, các giới hạn này rất rộng rãi.

Vì vậy:

- Nén ảnh trước khi đăng (JPEG/WebP, cạnh dài khoảng 1600–2000 px là đủ).
- Nén PDF nếu có nhiều hình ảnh.
- Không commit `node_modules/` hoặc `_site/` (đã có trong `.gitignore`).

---

## 8. Tóm tắt lệnh

```bash
npm run dev                                # chạy cả site (4173) và dashboard (4174)
npm start                                  # build + chạy local
npm run build                              # build lại dữ liệu và bundle
npm run serve                              # chạy local và theo dõi content/
npm run dashboard                          # sửa metadata trên máy (cổng 4174)

npm run new -- "Tên bài" --category=Analysis --tags="A, B"

git add .
git commit -m "Mô tả thay đổi"
git push
```

Sau khi push, Workers Builds tự build và deploy. Theo dõi trong
**Workers & Pages → Worker → Deployments**. Site thật:
**<https://tranhaidang.cc.cd/>**
