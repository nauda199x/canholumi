# canholumi.com

Web cho thuê căn hộ Lumi Hà Nội. Dữ liệu lấy từ bảng hàng `https://lumihanoi.pages.dev/api/listings`.

- `build.mjs`: dựng toàn bộ trang tĩnh (trang chủ, tòa, loại căn, nội thất, từng căn, sitemap, robots, llms.txt).
- `static/`: CSS, JS, favicon.
- GitHub Actions `build-deploy` chạy mỗi giờ + mỗi lần push, đẩy kết quả lên nhánh `gh-pages` (GitHub Pages, tên miền canholumi.com).
- Chạy thử: `node build.mjs duong-dan/listings.json` rồi mở thư mục `dist/`.

Không đưa ghi chú nội bộ (cột note) của bảng hàng lên web.

## Đồng bộ trực tiếp
- `apps-script/Code.gs`: cổng dữ liệu (Apps Script "canholumi-cong-du-lieu", tài khoản ductrungtran99@gmail.com, triển khai Web app – Bất kỳ ai). Chỉ trả cột an toàn, cache 30 giây.
- `live-endpoint.txt`: URL cổng dữ liệu; `static/assets/site.js` hỏi cổng mỗi 60 giây → ẩn căn đã gỡ, cập nhật giá, thêm căn mới (trang `/can-ho/xem/?id=`).
- Trang tĩnh (SEO) dựng lại mỗi 15 phút, chỉ đẩy lên khi dữ liệu đổi.

## Ngôn ngữ (28/11/2026)
- Tiếng Việt ở gốc `/`; tiếng Anh `/en/`, tiếng Hàn `/ko/`, tiếng Trung `/zh/`, tiếng Nhật `/ja/`.
- Mỗi ngôn ngữ có trang chủ danh sách căn cho thuê và trang riêng từng căn: `/<ngôn ngữ>/apartment/lumi-hanoi-<loại>-<tòa>-<mã>/`.
- Chữ giao diện nằm trong `i18n.mjs`. Các trang nối nhau bằng thẻ `hreflang`; nút đổi ngôn ngữ trên menu mở đúng căn đó ở ngôn ngữ khác.
- Sitemap riêng cho trang ngoại ngữ: `sitemap-ngoai-ngu.xml`.
