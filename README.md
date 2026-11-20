# canholumi.com

Web cho thuê căn hộ Lumi Hà Nội. Dữ liệu lấy từ bảng hàng `https://lumihanoi.pages.dev/api/listings`.

- `build.mjs`: dựng toàn bộ trang tĩnh (trang chủ, tòa, loại căn, nội thất, từng căn, sitemap, robots, llms.txt).
- `static/`: CSS, JS, favicon.
- GitHub Actions `build-deploy` chạy mỗi giờ + mỗi lần push, đẩy kết quả lên nhánh `gh-pages` (GitHub Pages, tên miền canholumi.com).
- Chạy thử: `node build.mjs duong-dan/listings.json` rồi mở thư mục `dist/`.

Không đưa ghi chú nội bộ (cột note) của bảng hàng lên web.
