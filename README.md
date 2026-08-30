# 🍪 Netflix Cookies Tool

> **Admin tool để quản lý Netflix cookies qua license API**

Web admin tool giúp tạo và quản lý license key, kết nối tới Google Apps Script API backend.

## 🚀 Quick Start

Truy cập tool tại: **https://ntaagencydev.github.io/Netflix-Cookies/admin.html**

### Sử dụng
1. Mở `admin.html`
2. Nhập **Admin Secret** (lần đầu sẽ được lưu vào localStorage)
3. Chọn thời hạn + số lượng key muốn tạo
4. Click **"Tạo Key"** → keys sẽ tự động thêm vào Google Sheet

## 📁 Cấu trúc

```
Netflix-Cookies/
├── admin.html    ← Entry point (file này được GitHub Pages serve)
├── admin.js      ← Logic tạo key + gọi API
└── .gitignore    ← Loại trỏ tất cả file khác
```

## ⚙️ Cấu hình API

Mở `admin.js`, sửa dòng `API_URL` thành URL Google Apps Script Web App của bạn:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 🔧 Tech Stack

- HTML + Vanilla JS (no framework)
- Google Apps Script (backend)
- Google Sheets (database)

## 📞 Liên hệ

- **Telegram**: [@NTAShopPremium](https://t.me/NTAShopPremium)
- **Version**: 3.0.0
- **Made with 💛 by NTA Shop Premium**