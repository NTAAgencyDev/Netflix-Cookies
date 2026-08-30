# 🔐 NTA Shop Premium - ADMIN GUIDE (PRIVATE)

> **⚠️ TÀI LIỆU NỘI BỘ - KHÔNG ĐƯỢC SHARE**

Đây là hướng dẫn dành riêng cho admin (bạn) để quản lý hệ thống license.

## 📁 Cấu trúc Private Package

```
NTA-PRIVATE/
├── server/
│   └── apps-script.gs ← Google Apps Script API (đã gộp config + secrets)
├── admin.html ← Tạo key local (root - để deploy GitHub Pages)
├── admin.js
├── docs/
│   └── README-ADMIN.md ← File này
├── build-public.bat ← Tự động build PUBLIC package
└── README.md
```

## 🚀 Setup lần đầu

### 1. Tạo Google Apps Script Project
1. Truy cập https://script.google.com
2. Tạo **New Project**, đặt tên: `NTA License API`
3. Copy toàn bộ từ `server/apps-script.gs` paste vào editor
4. **Ctrl + S** lưu
5. Chạy function `setupSheet()` (chọn từ dropdown → Run) - cấp quyền nếu hỏi

### 2. Deploy Web App
1. **Deploy** → **New deployment**
2. Icon ⚙️ → chọn **Web app**
3. Cấu hình:
 - Description: `NTA License API v3`
 - Execute as: **Me**
 - Who has access: **Anyone**
4. **Deploy** → Copy URL → Lưu lại URL này

### 3. Cấu hình URL trong source
Mở các file sau và paste URL vào:
- `NTA-PUBLIC/license.js` → dòng `DEFAULT_API_URL`
- `NTA-PRIVATE/admin.js` → dòng `API_URL`

## 🔑 Tạo License Key

### Cách 1: Qua Google Sheet (thủ công)
Mở Google Sheet → Sheet "Licenses" → Thêm dòng mới:
```
| A | B | C | D | E | F | G |
| KEY | | | <ngày hết hạn hoặc trống> | active | <ghi chú> | <ngày tạo> |
```

### Cách 2: Qua admin.html (tự động)
1. Mở `NTA-PRIVATE/admin.html` trong trình duyệt
2. Nhập **ADMIN_SECRET** (lần đầu, sẽ lưu vào localStorage)
3. Chọn thời hạn + số lượng + ghi chú
4. Click **"✨ Tạo Key"**
5. Key sẽ tự động thêm vào Google Sheet
6. Copy key → gửi cho khách

## 🔄 Update Cookie Netflix

Khi cần đổi cookie Netflix:

1. Mở Google Apps Script editor
2. Sửa array `NETFLIX_COOKIES` (dòng ~35)
3. **Deploy** → **Manage deployments** → Edit → **New version** → **Deploy**
4. Mọi user sẽ tự động nhận cookie mới khi mở extension

## 🛡 Quản lý User

### Xem danh sách key đang dùng
Mở Google Sheet → Sheet "Licenses" → Cột B (deviceId) sẽ hiển thị UUID của user đang dùng.

### Reset device (khi user đổi máy)
1. Mở Google Sheet
2. Tìm dòng có key của user
3. **Xóa** giá trị ở cột B (deviceId)
4. User có thể kích hoạt lại trên máy mới

### Thu hồi key
1. Mở Google Sheet
2. Tìm dòng có key
3. Sửa cột E (status) thành `revoked`
4. User sẽ bị từ chối ngay lập tức

## 🔐 Bảo mật

### Đổi ADMIN_SECRET
1. Mở Apps Script editor
2. Sửa dòng: `const ADMIN_SECRET = 'YOUR_NEW_SECRET_HERE';`
3. Lưu + Deploy lại
4. Thông báo cho admin tools cập nhật secret mới

### Đổi AES_MASTER_KEY
⚠️ **CẢNH BÁO**: Đổi key sẽ làm tất cả session cũ không giải mã được. User phải re-verify.

1. Mở Apps Script editor
2. Sửa `const AES_MASTER_KEY = 'YOUR_NEW_KEY_64_CHARS';`
3. Lưu + Deploy lại
4. Tất cả user phải nhập lại key

## 🆘 Troubleshooting

### User báo "Lỗi kết nối server"
- Kiểm tra URL API có đúng không
- Kiểm tra Apps Script có bị lỗi không (xem Execution Log)

### User báo "Key không tồn tại"
- Kiểm tra key trong Google Sheet có đúng không
- Key phải viết HOA

### User báo "Key đã dùng trên thiết bị khác"
- Xóa deviceId ở cột B trong Google Sheet

### User báo "Session hết hạn"
- Tự động refresh, không cần làm gì
- Nếu liên tục báo → kiểm tra session storage

## 📊 Monitoring

### Xem logs Apps Script
1. Apps Script editor → **Executions** (menu trái)
2. Xem các request gần đây
3. Click vào từng execution để xem chi tiết

### Xem ai đang active
Google Sheet → Sheet "Licenses" → Sắp xếp theo cột H (lastVerified) → User nào có lastVerified gần nhất là đang dùng.

## 🚀 Build PUBLIC package

Khi cần gửi extension cho khách:

1. Mở `NTA-PRIVATE/build-public.bat` (double-click)
2. Sẽ tự động copy các file an toàn vào `D:\Downloads\NTA-PUBLIC\`
3. Nén folder `NTA-PUBLIC` thành `.zip`
4. Gửi cho khách

## ⚠️ LƯU Ý BẢO MẬT

- ❌ **KHÔNG BAO GIỜ** share folder `NTA-PRIVATE` cho ai
- ❌ **KHÔNG** push lên Git public
- ❌ **KHÔNG** gửi ADMIN_SECRET qua Telegram/email không mã hóa
- ✅ **NÊN** backup `NTA-PRIVATE` vào USB/ổ cứng riêng
- ✅ **NÊN** đổi ADMIN_SECRET định kỳ (1-3 tháng)