# Daruma N3 cho Windows (bộ cài)

Chương trình mở trang https://tranhuutai1803-cloud.github.io/ trong cửa sổ riêng (Electron), nên bài học tự cập nhật theo trang web; bản sao của service worker giúp mở được khi mất mạng sau lần đầu. Trang nhận ra chương trình qua `DarumaN3Desktop/<phiên bản>` trong user agent: bắt buộc đăng nhập, tiến độ lưu vào máy chủ của nhóm.

- `main.js`: cửa sổ, một phiên bản chạy, nhớ kích thước cửa sổ, liên kết ra ngoài mở bằng trình duyệt, menu chuột phải tiếng Việt, F5 / F11 / Ctrl ± / Ctrl 0, trang `offline.html` khi lần đầu không có mạng.
- `afterPack.js`: ghi biểu tượng và thông tin phiên bản vào `DarumaN3.exe` (resedit).
- `build-win.js`: dựng bộ cài NSIS trên Linux không cần Wine, thêm tiếng Việt cho các thông báo của bộ cài.
- `make-icons.js`: vẽ biểu tượng các cỡ từ `icon.svg` để ghép `build/icon.ico`.

Dựng: `npm install` rồi `node build-win.js` → `dist/Daruma-N3-Setup-<phiên bản>.exe`. Đổi phiên bản ở `package.json`. Bộ cài đưa lên mục Releases của kho này (tên tệp bắt đầu bằng `Daruma-N3-Setup` và đuôi `.exe`, thẻ dạng `windows-1.0.0`); trang web tự đọc bản mới nhất qua GitHub API để hiện nút **Tải bộ cài Windows** và báo bản mới cho chương trình đã cài.
