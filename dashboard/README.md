# Bảng điều khiển metadata

Một ứng dụng nhỏ, **chỉ chạy trên máy**, để tạo, sửa, nhập và xóa nội dung:

- `content/posts/*.md` — phần front matter ở đầu tệp.
- `content/library/meta.json` — tiêu đề, ngày, mô tả, thẻ, bộ sưu tập của ảnh và PDF.

Nội dung Markdown, ảnh và PDF không bị sửa khi bạn chỉ lưu metadata. Tệp không
có metadata vẫn hiện trong danh sách; lần lưu đầu tiên sẽ tạo mục metadata cho
tệp đó.

## Tạo và nhập

- **Bài viết mới** hỏi tiêu đề, ngày, nhóm, thẻ, tóm tắt và tạo một tệp `.md`
  chỉ có front matter. Tên tệp được tạo từ tiêu đề; nếu trùng, dashboard thêm
  hậu tố `-2`, `-3`… Bài mới mặc định là bản nháp (`draft: true`). Bạn viết
  phần nội dung sau đó bằng ứng dụng soạn Markdown.
- **Nhập ảnh hoặc PDF** chép tệp vào `content/library/photos/` (ảnh) hoặc
  `content/library/documents/` (PDF). Có thể chọn nhiều tệp một lần; tên tệp
  trùng cũng được thêm hậu tố. Metadata được sửa tiếp trong tab Thư viện.

## Xóa

Có hai thao tác xóa, cả hai đều hỏi xác nhận:

- **Xóa bài viết** xóa hẳn file `.md` trong `content/posts/`.
- **Xóa tệp** xóa hẳn ảnh/PDF trong `content/library/` và mục metadata tương ứng.

Ảnh/PDF được bài viết tham chiếu không bị xóa tự động khi xóa bài viết.

Khi lưu một bài viết, phần front matter được ghi lại theo một thứ tự cố định.
Phần nội dung bên dưới dấu `---` được giữ nguyên từng byte (ngoài việc chuẩn hóa
xuống dòng CRLF thành LF nếu tệp gốc dùng CRLF). `meta.json` được ghi lại với
hai dấu cách thụt lề.

## Chạy

Từ thư mục gốc của site:

```bash
npm run dev
```

Lệnh này chạy cả site lẫn dashboard, in ra hai link và dừng cả hai bằng Ctrl+C.
Chỉ muốn chạy dashboard:

```bash
npm run dashboard
```

Hoặc chạy riêng trong thư mục này:

```bash
cd dashboard
npm start
```

Mở `http://127.0.0.1:4174`.

Sau mỗi lần lưu, dashboard tự chạy `tools/build.mjs`. Nếu site đang chạy bằng
`npm start`, chỉ cần tải lại trang web để thấy thay đổi.

## Cấu hình

Dashboard mặc định tìm site ở thư mục cha (`..`). Nếu bạn chép thư mục
`dashboard/` sang nơi khác, trỏ nó tới site bằng biến môi trường:

```bash
SITE_ROOT=/đường/dẫn/tới/site npm start
```

Các biến khác:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `PORT` | `4174` | Cổng của dashboard |
| `HOST` | `127.0.0.1` | Chỉ nhận kết nối từ máy |
| `PREVIEW_URL` | `http://localhost:4173` | Địa chỉ site để mở liên kết xem trước |
| `NO_DASHBOARD_BUILD` | — | Đặt `1` để không tự build sau khi lưu |

Ví dụ khi site chạy ở cổng khác:

```bash
PREVIEW_URL=http://localhost:4175 PORT=4176 npm start
```

## An toàn

- Máy chủ chỉ nghe trên `127.0.0.1`, không mở ra mạng LAN.
- Chỉ nhận ảnh (JPG, PNG, WebP, AVIF, GIF, SVG) và PDF, tối đa 100 MB mỗi tệp.
  Tên tệp được làm sạch, không thể ghi ra ngoài `content/library/`.
- Không tự xóa hàng loạt; chỉ xóa đúng tệp khi bạn bấm nút và xác nhận.
- Không có tính năng ghi đè: tệp trùng tên được đặt tên mới thay vì thay thế.
- Dashboard không nằm trong `_site/` và không được bước stage của Cloudflare
  Pages đưa lên mạng. Nếu muốn giữ nó hoàn toàn riêng, có thể chép thư mục này
  sang một repo khác rồi dùng `SITE_ROOT`.
