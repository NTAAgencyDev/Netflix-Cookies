@echo off
chcp 65001 >nul
echo ============================================
echo  NTA Shop Premium - Build Public Package
echo ============================================
echo.

REM Tạo folder PUBLIC
if not exist "PUBLIC" mkdir PUBLIC
if not exist "PUBLIC\icons" mkdir PUBLIC\icons

REM Copy các file PUBLIC (không chứa cookie/secret)
copy /Y "manifest.json" "PUBLIC\"
copy /Y "popup.html" "PUBLIC\"
copy /Y "popup.css" "PUBLIC\"
copy /Y "popup.js" "PUBLIC\"
copy /Y "license.js" "PUBLIC\"
copy /Y "background.js" "PUBLIC\"
copy /Y "icons\icon16.png" "PUBLIC\icons\"
copy /Y "icons\icon32.png" "PUBLIC\icons\"
copy /Y "icons\icon48.png" "PUBLIC\icons\"
copy /Y "icons\icon128.png" "PUBLIC\icons\"

echo.
echo ✅ Đã tạo folder PUBLIC với các file an toàn
echo.
echo 📁 Cấu trúc PUBLIC:
dir /B PUBLIC
echo.
echo 🚀 Bạn có thể nén folder PUBLIC thành .zip để gửi khách
echo ⚠️ KHÔNG share folder PRIVATE cho ai!
echo.
pause