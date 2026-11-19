# Hướng dẫn deploy và đăng nội dung

Tài liệu này hướng dẫn cách đưa trang web lên **GitHub Pages miễn phí**, sau đó
cách đăng bài viết mới và thêm ảnh/PDF vào thư viện.

Trang web là site tĩnh: không có cơ sở dữ liệu, không cần server riêng. Mọi thứ
được tạo từ các file trong thư mục này và tự động build lại trên GitHub.

> File hướng dẫn này không được deploy lên trang web. Workflow chỉ copy các file
> cần thiết của site.

---

## 1. Chạy thử trên máy

Yêu cầu: **Node.js 20 trở lên** (khuyến nghị Node 22).

```bash
cd /media/Data/Workspace/Project/tranhaidang
npm start
```

Mở <http://localhost:4173>.

- `npm start` = build nội dung rồi chạy server local.
- `npm run build` = chỉ build lại index, RSS, sitemap và script.
- `npm run serve` = chạy server mà không build lại.

Sau khi sửa nội dung, chạy lại `npm start` (hoặc `npm run build`) để thấy thay
đổi. Trình duyệt có thể cần hard refresh: **Ctrl + Shift + R**.

---

## 2. Deploy miễn phí bằng GitHub Pages

### 2.1. Điều kiện

- Tài khoản GitHub miễn phí.
- Repository phải là **public** (gói Free của GitHub Pages không hỗ trợ repo
  private).
- Site này đã cấu hình cho địa chỉ:
  **<https://tranhaidang14.github.io/>**

### 2.2. Tạo repository

1. Vào <https://github.com/new>.
2. Đặt tên repo chính xác là:

   ```text
   tranhaidang14.github.io
   ```

   Tên này tạo **user site**, cho URL gốc `https://tranhaidang14.github.io/`.

3. Chọn **Public**.
4. **Không** tick “Add a README file”, “Add .gitignore” hay “Choose a license”
   để tránh phải xử lý conflict khi push lần đầu.
5. Bấm **Create repository**.

### 2.3. Đưa code lên GitHub

Thư mục hiện tại chưa phải git repo. Chạy lần lượt:

```bash
cd /media/Data/Workspace/Project/tranhaidang

git init
git add .
git commit -m "Initial personal encyclopedia"
git branch -M main

# Dùng SSH (khuyến nghị nếu đã cấu hình SSH key)
git remote add origin git@github.com:tranhaidang14/tranhaidang14.github.io.git

# Hoặc dùng HTTPS (mật khẩu phải là Personal Access Token, không phải mật khẩu GitHub)
# git remote add origin https://github.com/tranhaidang14/tranhaidang14.github.io.git

git push -u origin main
```

Nếu chưa cấu hình git identity:

```bash
git config --global user.name "Trần Hải Đăng"
git config --global user.email "tranhaidangg2@gmail.com"
```

Nếu chưa có SSH key hoặc token, cách nhanh nhất là dùng **GitHub Desktop** hoặc
chạy `gh auth login` (GitHub CLI).

### 2.4. Bật GitHub Pages

Trên GitHub, vào repository:

1. **Settings** → **Pages**.
2. Mục **Build and deployment** → **Source**: chọn **GitHub Actions**.
3. Không cần chọn branch hay thư mục.

Workflow có sẵn tại `.github/workflows/pages.yml` sẽ tự chạy mỗi khi push lên
nhánh `main`.

Nếu workflow chạy lần đầu trước khi bật Pages và bị lỗi:

1. Vào tab **Actions**.
2. Chọn workflow **Deploy to GitHub Pages**.
3. Bấm **Re-run all jobs**.

### 2.5. Kiểm tra kết quả

1. Vào tab **Actions**, đợi workflow **Deploy to GitHub Pages** có dấu ✅ xanh.
2. Mở:

   **<https://tranhaidang14.github.io/>**

Lần deploy đầu có thể mất 1–2 phút. Nếu vẫn thấy 404, đợi thêm vài phút rồi
refresh.

### 2.6. Cập nhật site về sau

Mỗi lần sửa nội dung hoặc code:

```bash
npm run build        # tạo lại dữ liệu và bundle
git add .
git commit -m "Thêm bài viết mới"
git push
```

GitHub Actions sẽ tự build và deploy lại. Không cần chạy lệnh deploy thủ công.

### 2.7. Nếu đổi tên repo hoặc dùng tên miền riêng

Mở `content/site.json` và cập nhật:

```json
{
  "url": "https://tranhaidang14.github.io",
  "repo": "https://github.com/tranhaidang14/tranhaidang14.github.io",
  "email": "tranhaidangg2@gmail.com"
}
```

- Repo tên khác `<username>.github.io` sẽ có URL dạng
  `https://<username>.github.io/<ten-repo>/`. Khi đó phải đổi `url` cho đúng.
- Muốn dùng tên miền riêng: **Settings → Pages → Custom domain**, sau đó trỏ DNS
  (CNAME cho `www`, hoặc bản ghi A cho tên miền gốc) và cập nhật `url`.
  Tên miền phải mua, còn phần hosting của GitHub Pages vẫn miễn phí.

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

và tự chạy build. Bài mới luôn có `draft: true`, nên **chưa xuất hiện** trên
site.

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
draft: true
---
```

Các trường:

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `title` | Có | Tiêu đề bài viết. Có dấu `:` thì phải đặt trong ngoặc kép. |
| `subtitle` | Không | Dòng phụ dưới tiêu đề. Để trống nếu không dùng. |
| `date` | Nên có | Định dạng `YYYY-MM-DD`. Dùng để sắp xếp và hiển thị. |
| `category` | Không | Nhóm bài, dùng cho bộ lọc. Mặc định `Notes`. |
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

Tiêu đề mục (tự sinh mục lục bên cạnh bài):

```markdown
## Một mục lớn

### Một mục nhỏ
```

Ảnh trong bài:

```markdown
![Chú thích ảnh](content/posts/figures/ten-anh.svg)
```

Nên đặt ảnh riêng của bài trong `content/posts/figures/`. Có thể dùng lại ảnh
trong thư viện:

```markdown
![Mist over Đà Lạt](content/library/photos/da-lat-mist.svg)
```

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

Danh sách, trích dẫn, code block đều dùng cú pháp Markdown chuẩn.

### 3.4. Xuất bản

1. Đổi:

   ```yaml
   draft: true
   ```

   thành:

   ```yaml
   draft: false
   ```

   (hoặc xóa hẳn dòng `draft`).

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

Nếu chỉ muốn xem trước một bài nháp mà không muốn đăng, tạm đổi `draft: false`,
chạy `npm start`, xem xong thì đổi lại `draft: true` **và chạy `npm run build`**
trước khi commit.

---

## 4. Đăng tài liệu vào thư viện

Thư viện nhận hai loại file:

- **Ảnh:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`, `.svg`
- **Tài liệu:** `.pdf`

### 4.1. Copy file vào đúng thư mục

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

---

## 5. Quy trình chuẩn mỗi lần đăng nội dung

### Bài viết

```bash
npm run new -- "Tên bài" --category=Analysis --tags="Tag 1, Tag 2"
# sửa content/posts/ten-bai.md
# đổi draft: false
npm start                      # xem thử
npm run build                  # tạo lại dữ liệu
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

- [ ] `draft` đã đổi thành `false` cho bài muốn đăng.
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

### GitHub Actions báo lỗi

1. Vào tab **Actions** → chọn lần chạy lỗi → mở bước bị đỏ.
2. Chạy lại locally:

   ```bash
   npm run build
   ```

3. Sửa lỗi nếu có, commit và push lại.
4. Kiểm tra **Settings → Pages → Source** đã là **GitHub Actions** chưa.

### Push bị từ chối (`rejected`, `fetch first`)

```bash
git pull --rebase origin main
git push
```

### Bài viết không xuất hiện

- Kiểm tra `draft` đã là `false` hoặc đã xóa chưa.
- Kiểm tra `date` đúng định dạng `YYYY-MM-DD`.
- Chạy `npm run build` và xem lại log: nếu file bị bỏ qua, log sẽ ghi
  `drafts ... ten-bai.md (draft)`.

### Ảnh hoặc PDF bị 404

- Đường dẫn phải tính từ thư mục gốc của site, ví dụ
  `content/library/photos/anh.jpg`.
- GitHub chạy trên Linux nên phân biệt chữ hoa/chữ thường:
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

GitHub Pages miễn phí nhưng có giới hạn mềm:

- Repository nên dưới **1 GB**.
- Site đã deploy nên dưới **1 GB**.
- Băng thông khoảng **100 GB/tháng**.
- Mỗi file trong Git tối đa **100 MB**.

Workflow dùng GitHub Actions, miễn phí với repository public.

Vì vậy:

- Nén ảnh trước khi đăng (JPEG/WebP, cạnh dài khoảng 1600–2000 px là đủ).
- Nén PDF nếu có nhiều hình ảnh.
- Không commit `node_modules/` hoặc `_site/` (đã có trong `.gitignore`).

---

## 8. Tóm tắt lệnh

```bash
npm start                                  # build + chạy local
npm run build                              # build lại dữ liệu và bundle
npm run serve                              # chạy local, không build

npm run new -- "Tên bài" --category=Analysis --tags="A, B"

git add .
git commit -m "Mô tả thay đổi"
git push
```

Sau khi push, mở tab **Actions** trên GitHub để theo dõi deploy. Site thật:
**<https://tranhaidang14.github.io/>**
