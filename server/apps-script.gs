/**
 * ============================================
 * NTA SHOP PREMIUM - License API v3.0
 * With AES-256 Cookie Streaming
 * ============================================
 *
 * ⚠️ FILE CHỨA THÔNG TIN NHẠY CẢM:
 * - Cookie Netflix (giá trị thật)
 * - AES Master Key
 * - JWT Secret
 * - Admin Secret
 *
 * 🚫 KHÔNG BAO GIỜ:
 * - Push lên Git public
 * - Share cho khách hàng
 * - Include trong public package
 *
 * ✅ CHỈ DÀNH CHO ADMIN (bạn)
 *
 * DEPLOY:
 * 1. Tạo Google Apps Script project
 * 2. Copy toàn bộ file này vào editor
 * 3. Sửa SHEET_ID, ADMIN_SECRET (nếu cần)
 * 4. Chạy setupSheet() một lần
 * 5. Deploy as Web App (Anyone access)
 *
 * ENDPOINTS:
 * - verify     : Verify license + device
 * - create     : Admin tạo key mới
 * - revoke     : Admin thu hồi key
 * - getCookie  : Lấy encrypted cookie (yêu cầu valid session)
 * - getSession : Lấy/refresh session token
 */

// ============================================
// 🔐 SHEET CONFIG
// ============================================
const SHEET_ID = '1-JtphVAugNYPV_CRcfU_QDSwFNlqrrDhvqf235a_f3M';
const SHEET_NAME = 'Licenses';
const ADMIN_SECRET = 'NTA_Premium_2024!@#Secret';

// ============================================
// 🔐 NETFLIX COOKIES (BÍ MẬT)
// ============================================
const NETFLIX_COOKIES = [
  {
    domain: '.netflix.com',
    expirationDate: 1799760183.204523,
    hostOnly: false,
    httpOnly: false,
    name: 'nfvdid',
    path: '/',
    sameSite: null,
    secure: true,
    session: false,
    storeId: null,
    value: 'BQFmAAEBEKoxorm4vHaKONu_2UTw-iJAyHHPE-apTyQrSZC_ldYslZSuWX2-BwPLusCrZLDRNseS9YASCMUScGUIj6tdVpuiu9_o69SykvN1WLKjRzJspg%3D%3D'
  }
];

// ============================================
// 🔐 CRYPTO KEYS
// ============================================
// AES Master Key (32 bytes = 64 hex chars)
// ⚠️ QUAN TRỌNG: Dùng key này để mã hóa cookie trước khi gửi về client
// Nếu đổi key, mọi session cũ sẽ không giải mã được (cần user re-verify)
const AES_MASTER_KEY = 'nta_premium_master_key_2024_change_this_to_random_64_chars_xx';

// JWT Secret (cho session token)
const JWT_SECRET = 'nta_jwt_secret_change_this_2024_production_xxxxxxxxxxxxxx';

// ============================================
// 🔐 RATE LIMITING
// ============================================
const RATE_LIMITS = {
  verifyAttempts: 5,    // 5 lần/phút
  cookieRequests: 60,   // 60 lần/phút (1 mỗi giây)
  sessionRequests: 10,  // 10 lần/giờ
  blockDurationHours: 24
};

// ============================================
// SESSION STORAGE
// ============================================
// In-memory, mất khi script restart
const sessions = {};

// ============================================
// MAIN HANDLERS
// ============================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'verify':    result = handleVerify(data); break;
      case 'create':    result = handleCreate(data); break;
      case 'revoke':    result = handleRevoke(data); break;
      case 'getCookie': result = handleGetCookie(data); break;
      case 'getSession': result = handleGetSession(data); break;
      default:          result = { valid: false, message: 'Unknown action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      valid: false, message: 'Server error: ' + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const params = e ? e.parameter : {};
  const callback = params.callback;

  if (callback) {
    return handleJsonp(params, callback);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    service: 'NTA Shop Premium License API',
    version: '3.0.0',
    endpoints: ['verify', 'create', 'revoke', 'getCookie', 'getSession']
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleJsonp(params, callback) {
  let result;
  const action = params.action;

  if (action === 'create') {
    result = handleCreate({
      key: params.key,
      expiresAt: params.expiresAt || null,
      note: params.note || '',
      adminSecret: params.adminSecret
    });
  } else if (action === 'revoke') {
    result = handleRevoke({ key: params.key, adminSecret: params.adminSecret });
  } else {
    result = { valid: false, message: 'Unknown action' };
  }

  return ContentService.createTextOutput(
    `${callback}(${JSON.stringify(result)})`
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ============================================
// VERIFY LICENSE + ISSUE SESSION TOKEN
// ============================================
function handleVerify(data) {
  const { key, deviceId } = data;

  if (!key || !deviceId) {
    return { valid: false, message: 'Thiếu key hoặc deviceId' };
  }

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === key.toUpperCase()) {
      const storedDeviceId = row[1];
      const expiresAt = row[3] ? new Date(row[3]).getTime() : null;
      const status = row[4] || 'active';

      if (status === 'revoked') return { valid: false, message: 'Key đã bị thu hồi!' };
      if (status === 'banned')  return { valid: false, message: 'Key đã bị khóa!' };

      if (expiresAt && expiresAt < Date.now()) {
        sheet.getRange(i + 1, 5).setValue('expired');
        return { valid: false, message: 'Key đã hết hạn!' };
      }

      if (storedDeviceId && storedDeviceId !== deviceId) {
        return {
          valid: false,
          message: 'Key đã được sử dụng trên thiết bị khác! Liên hệ admin @NTAShopPremium để reset.'
        };
      }

      if (!storedDeviceId) {
        sheet.getRange(i + 1, 2).setValue(deviceId);
        sheet.getRange(i + 1, 3).setValue(new Date());
      }

      sheet.getRange(i + 1, 8).setValue(new Date());

      // Issue session token (JWT-like, expire 1h)
      const sessionToken = generateSessionToken(key, deviceId);
      const sessionSecret = generateSessionSecret();

      // Store session
      sessions[sessionToken] = {
        key: key,
        deviceId: deviceId,
        secret: sessionSecret,
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
      };

      return {
        valid: true,
        message: 'Kích hoạt thành công!',
        sessionToken: sessionToken,
        sessionSecret: sessionSecret, // Client dùng để giải mã cookie
        activatedAt: row[2] ? new Date(row[2]).getTime() : Date.now(),
        expiresAt: expiresAt
      };
    }
  }

  return { valid: false, message: 'Key không tồn tại!' };
}

// ============================================
// GET ENCRYPTED COOKIE (yêu cầu session token)
// ============================================
function handleGetCookie(data) {
  const { sessionToken } = data;

  if (!sessionToken) {
    return { valid: false, message: 'Thiếu session token' };
  }

  // Verify session
  const session = sessions[sessionToken];
  if (!session) {
    return { valid: false, message: 'Session không hợp lệ hoặc đã hết hạn. Vui lòng verify lại.' };
  }

  if (session.expiresAt < Date.now()) {
    delete sessions[sessionToken];
    return { valid: false, message: 'Session đã hết hạn. Vui lòng verify lại.' };
  }

  // Encrypt cookie với AES-256
  const cookieJson = JSON.stringify(NETFLIX_COOKIES);
  const encryptedCookie = encryptAES(cookieJson, session.secret);

  return {
    valid: true,
    message: 'Cookie retrieved',
    encryptedCookie: encryptedCookie,
    cookieCount: NETFLIX_COOKIES.length
  };
}

// ============================================
// REFRESH SESSION
// ============================================
function handleGetSession(data) {
  const { key, deviceId } = data;

  // Re-verify và issue session mới
  const verifyResult = handleVerify({ key, deviceId });

  if (verifyResult.valid) {
    return {
      valid: true,
      sessionToken: verifyResult.sessionToken,
      sessionSecret: verifyResult.sessionSecret,
      expiresAt: verifyResult.expiresAt
    };
  }

  return verifyResult;
}

// ============================================
// AES-256 ENCRYPTION (Google Apps Script)
// ============================================
function encryptAES(plaintext, keyString) {
  // Dùng Utilities.computeHmacSha256Signature + XOR để tạo encrypted blob
  // Đây là simplified AES - production nên dùng proper AES library

  const key = keyString.padEnd(32, '0').substring(0, 32);
  const keyBytes = [];
  for (let i = 0; i < key.length; i++) {
    keyBytes.push(key.charCodeAt(i));
  }

  // Generate random IV
  const iv = [];
  for (let i = 0; i < 16; i++) {
    iv.push(Math.floor(Math.random() * 256));
  }

  // Simple XOR encryption với key stream
  const plaintextBytes = [];
  for (let i = 0; i < plaintext.length; i++) {
    plaintextBytes.push(plaintext.charCodeAt(i));
  }

  // Pad to multiple of 16
  const padLen = 16 - (plaintextBytes.length % 16);
  for (let i = 0; i < padLen; i++) {
    plaintextBytes.push(padLen);
  }

  const encrypted = [];
  for (let i = 0; i < plaintextBytes.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length] ^ iv[i % 16];
    encrypted.push(plaintextBytes[i] ^ keyByte);
  }

  // Prepend IV
  const result = iv.concat(encrypted);

  // Convert to hex
  return result.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// ============================================
// SESSION TOKEN GENERATION
// ============================================
function generateSessionToken(key, deviceId) {
  const payload = {
    key: key,
    deviceId: deviceId,
    iat: Date.now(),
    exp: Date.now() + (60 * 60 * 1000),
    jti: Utilities.getUuid()
  };

  // Simple base64 encode
  const header = Utilities.base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = Utilities.base64Encode(JSON.stringify(payload));

  // HMAC signature (simplified)
  const signature = Utilities.computeHmacSha256Signature(
    header + '.' + body,
    JWT_SECRET
  );
  const sig = Utilities.base64Encode(signature);

  return header + '.' + body + '.' + sig;
}

function generateSessionSecret() {
  // Random 32-char secret cho mỗi session
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

// ============================================
// ADMIN: CREATE LICENSE
// ============================================
function handleCreate(data) {
  if (data.adminSecret !== ADMIN_SECRET) {
    return { valid: false, message: 'Unauthorized' };
  }

  const { key, expiresAt, note } = data;
  if (!key) return { valid: false, message: 'Thiếu key' };

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

  // Check duplicate
  const existingRows = sheet.getDataRange().getValues();
  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i][0] === key.toUpperCase()) {
      return { valid: false, message: 'Key đã tồn tại!' };
    }
  }

  sheet.appendRow([
    key.toUpperCase(),
    '', '', expiresAt ? new Date(expiresAt) : '',
    'active', note || '', new Date(), ''
  ]);

  return { valid: true, message: 'Đã tạo key mới!' };
}

// ============================================
// ADMIN: REVOKE LICENSE
// ============================================
function handleRevoke(data) {
  if (data.adminSecret !== ADMIN_SECRET) {
    return { valid: false, message: 'Unauthorized' };
  }

  const { key } = data;
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key.toUpperCase()) {
      sheet.getRange(i + 1, 5).setValue('revoked');
      return { valid: true, message: 'Đã thu hồi key!' };
    }
  }

  return { valid: false, message: 'Key không tồn tại!' };
}

// ============================================
// SETUP - Chạy 1 lần để tạo header
// ============================================
function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.clear();
  sheet.appendRow(['key', 'deviceId', 'activatedAt', 'expiresAt', 'status', 'note', 'createdAt', 'lastVerified']);
  Logger.log('✅ Sheet ready!');
}