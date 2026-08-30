# 🔐 NTA Shop Premium - ADMIN PACKAGE (PRIVATE)

> **⚠️ KHÔNG ĐƯỢC SHARE FOLDER NÀY CHO AI!**

Đây là package dành riêng cho admin quản lý hệ thống license key và cookie Netflix.

## 📁 Cấu trúc

```
NTA-PRIVATE/
├── server/
│   └── apps-script.gs ← Google Apps Script (deploy file này - đã gộp config + secrets)
├── admin.html ← Tool tạo key local (root - để deploy GitHub Pages)
├── admin.js
├── docs/
│   └── README-ADMIN.md ← Hướng dẫn chi tiết
├── build-public.bat ← Tự động build PUBLIC package
└── README.md ← File này
```

## 🚀 Quick Start

1. **Setup server**: Xem `docs/README-ADMIN.md` phần "Setup lần đầu"
2. **Tạo key**: Mở `admin.html` → nhập secret → tạo key
3. **Build public**: Double-click `build-public.bat`
4. **Gửi khách**: Nén folder `NTA-PUBLIC` → gửi .zip

## 📞 Liên hệ

- **Telegram**: [@NTAShopPremium](https://t.me/NTAShopPremium)
- **Version**: 3.0.0
- **Made with 💛 by NTA Shop Premium**