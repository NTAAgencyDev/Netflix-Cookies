// NTA Shop Premium - Admin v3.4 (fix clearSecret + cache busting)
const ADMIN_SECRET_KEY = 'nta_admin_secret';
const API_URL = 'https://script.google.com/macros/s/AKfycbwCDI2Q2oKKP2cHTc_qdLoPtC-YIXBn0k6YkCFSvdBZcLeFBZdNMfgrXZoY45Duegtxow/exec';

function genSegment() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function genKey() {
  return 'NTA-' + genSegment() + '-' + genSegment() + '-' + genSegment() + '-' + genSegment();
}

function getDurationMs(d) {
  if (d === 'permanent') return null;
  return parseInt(d) * 86400000;
}

function formatExp(t) {
  if (!t) return 'Vĩnh viễn';
  return new Date(t).toLocaleDateString('vi-VN');
}

function formatDate(t) {
  if (!t) return '-';
  const d = new Date(t);
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

let cbId = 0;
function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + (++cbId);
    window[cb] = (data) => {
      delete window[cb];
      s.remove();
      resolve(data);
    };
    const qs = new URLSearchParams(params).toString();
    const s = document.createElement('script');
    s.src = API_URL + '?' + qs + '&callback=' + cb;
    s.onerror = () => { delete window[cb]; s.remove(); reject(new Error('JSONP failed')); };
    document.body.appendChild(s);
    setTimeout(() => {
      if (window[cb]) { delete window[cb]; s.remove(); reject(new Error('Timeout')); }
    }, 15000);
  });
}

async function createKey(key, exp, note, keyType, secret) {
  try {
    return await jsonp({ action: 'create', key, expiresAt: exp || '', note, keyType: keyType || 'multi', adminSecret: secret });
  } catch (e) {
    return { valid: false, message: e.message };
  }
}

// Helper: render badge theo keyType
function getBadge(keyType, size) {
  const sizes = size === 'sm'
    ? { padding: '1px 5px', fontSize: '9px' }
    : { padding: '2px 6px', fontSize: '10px' };

  if (keyType === 'single-once') {
    return `<span style="background:#9d4edd;color:#fff;padding:${sizes.padding};border-radius:4px;font-size:${sizes.fontSize};font-weight:700;margin-left:6px;">💀 ONE-SHOT</span>`;
  }
  if (keyType === 'single') {
    return `<span style="background:#ff6b6b;color:#000;padding:${sizes.padding};border-radius:4px;font-size:${sizes.fontSize};font-weight:700;margin-left:6px;">🔥 SINGLE</span>`;
  }
  return `<span style="background:#4ecdc4;color:#000;padding:${sizes.padding};border-radius:4px;font-size:${sizes.fontSize};font-weight:700;margin-left:6px;">🔄 MULTI</span>`;
}

async function revokeKey(key, secret) {
  try {
    return await jsonp({ action: 'revoke', key, adminSecret: secret });
  } catch (e) {
    return { valid: false, message: e.message };
  }
}

function getSecret() {
  let s = localStorage.getItem(ADMIN_SECRET_KEY);
  if (!s) {
    s = prompt('Nhập ADMIN_SECRET:');
    if (s && s.trim()) { s = s.trim(); localStorage.setItem(ADMIN_SECRET_KEY, s); }
    else return null;
  }
  return s;
}

function clearSecret() {
  if (confirm('Xóa ADMIN_SECRET?')) {
    localStorage.removeItem(ADMIN_SECRET_KEY);
    alert('Đã xóa!');
  }
}

let isGenerating = false; // Flag chống double-click

async function generateKeys() {
  // CHỐNG GỌI 2 LẦN
  if (isGenerating) {
    console.warn('Already generating, ignoring...');
    return;
  }
  isGenerating = true;

  const secret = getSecret();
  if (!secret) { isGenerating = false; return; }

  const keyType = document.getElementById('keyType').value;
  const dur = document.getElementById('duration').value;
  const cnt = parseInt(document.getElementById('count').value) || 1;
  const note = (document.getElementById('note').value || 'Created by admin').trim();
  const durMs = getDurationMs(dur);

  // Confirm cho single-use key nếu tạo nhiều
  if ((keyType === 'single' || keyType === 'single-once') && cnt > 10 && !confirm('Tạo ' + cnt + ' ' + (keyType === 'single-once' ? 'Single-Use-Only' : 'single-use') + ' key? Mỗi key chỉ dùng được 1 lần.')) {
    isGenerating = false; return;
  }
  if (cnt > 50 && !confirm('Tạo ' + cnt + ' key?')) { isGenerating = false; return; }

  const btn = document.getElementById('generateBtn');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ 0/' + cnt;

  const newKeys = [];
  let ok = 0, fail = 0;

  for (let i = 0; i < cnt; i++) {
    const key = genKey();
    btn.textContent = '⏳ ' + (i + 1) + '/' + cnt;

    const r = await createKey(key, durMs, note, keyType, secret);

    if (r && r.valid) {
      const kd = {
        key,
        keyType: r.keyType || keyType,
        recoveryCode: r.recoveryCode || '',
        expiresAt: durMs ? Date.now() + durMs : null,
        duration: dur,
        note
      };
      newKeys.push(kd);
      ok++;
    } else {
      fail++;
      console.error('Fail:', key, r);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  btn.disabled = false;
  btn.textContent = oldText;
  isGenerating = false; // Reset flag

  showNewKeys(newKeys);
  // Sau khi tạo xong, refresh danh sách từ Google Sheet
  currentPage = 0;
  loadKeys();

  // Alert khác nhau cho multi/single/single-once
  if (keyType === 'single-once' && ok > 0) {
    alert('✅ Xong!\nThành công: ' + ok + '\nThất bại: ' + fail + '\n\n💀 Đã tạo ' + ok + ' Single-Use-Only key.\nLogout = chết key. Gửi kèm Recovery Code!');
  } else if (keyType === 'single' && ok > 0) {
    alert('✅ Xong!\nThành công: ' + ok + '\nThất bại: ' + fail + '\n\n🔥 Đã tạo ' + ok + ' single-use key.\nĐừng quên gửi kèm Recovery Code cho khách!');
  } else {
    alert('Xong!\nThành công: ' + ok + '\nThất bại: ' + fail);
  }
}

function showNewKeys(keys) {
  const c = document.getElementById('generatedKeys');
  if (!keys.length) { c.innerHTML = ''; return; }
  let h = '<h3 style="color:#FFD700;margin-top:20px;font-size:14px;">Key mới tạo:</h3>';
  keys.forEach(k => {
    const hasRecovery = k.keyType === 'single' || k.keyType === 'single-once';
    const badge = getBadge(k.keyType);

    h += '<div class="key-display">' + k.key + badge +
      '<div style="font-size:11px;color:#6b6b6b;margin-top:6px;letter-spacing:0;font-weight:400;">' +
      formatExp(k.expiresAt) + ' | ' + k.note + '</div></div>';

    // Hiển thị recovery code cho cả 2 loại single-use
    if (hasRecovery && k.recoveryCode) {
      const borderColor = k.keyType === 'single-once' ? '#9d4edd' : '#ff6b6b';
      const labelColor = k.keyType === 'single-once' ? '#c77dff' : '#ff8888';
      const codeColor = k.keyType === 'single-once' ? '#c77dff' : '#ff6b6b';
      const warning = k.keyType === 'single-once'
        ? '🚨 KEY NÀY DÙNG 1 LẦN DUY NHẤT - LOGOUT = CHẾT'
        : '🆘 RECOVERY CODE (gửi kèm cho khách):';

      h += '<div style="background:#1a1a2a;border:1px solid ' + borderColor + ';border-radius:6px;padding:10px;margin-bottom:12px;">' +
        '<div style="font-size:11px;color:' + labelColor + ';margin-bottom:4px;font-weight:600;">' + warning + '</div>' +
        '<div style="font-family:SF Mono,Consolas,monospace;font-size:14px;color:' + codeColor + ';font-weight:700;letter-spacing:1px;">' +
        k.recoveryCode + '</div></div>';
    }

    h += '<button class="btn" onclick="cp(\'' + k.key + '\')" style="margin-bottom:8px;">📋 Copy Key</button>';
    if (hasRecovery && k.recoveryCode) {
      h += '<button class="btn btn-secondary" onclick="cp(\'' + k.recoveryCode + '\')" style="margin-bottom:8px;">🆘 Copy Recovery</button>';
    }
  });
  c.innerHTML = h;
}

function cp(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied:', text);
  }).catch(() => {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
  });
}

async function doRevoke(key) {
  if (!confirm('🗑 Thu hồi và XOÁ VĨNH VIỄN key:\n' + key + '\n\nHành động này không thể hoàn tác!')) return;
  const s = getSecret(); if (!s) return;
  const r = await revokeKey(key, s);
  if (r && r.valid) {
    alert('✅ ' + r.message);
    currentPage = 0;
    loadKeys();
  } else {
    alert('❌ Lỗi: ' + (r ? r.message : 'unknown'));
  }
}

function clearAll() {
  document.getElementById('generatedKeys').innerHTML = '';
  alert('Đã xóa danh sách key mới tạo trên màn hình.\n(Danh sách key trong Google Sheet vẫn nguyên.)');
}

// ============================================
// v3.3: QUẢN LÝ KEY TỪ GOOGLE SHEET
// ============================================
let currentPage = 0;
const PAGE_SIZE = 20;
let currentFilters = { keyType: '', status: '', search: '' };

async function loadKeys() {
  const secret = getSecret();
  if (!secret) return;

  const btn = document.getElementById('refreshBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang tải...'; }

  currentFilters = {
    keyType: document.getElementById('filterKeyType').value,
    status: document.getElementById('filterStatus').value,
    search: document.getElementById('searchInput').value.trim()
  };

  try {
    const r = await jsonp({
      action: 'list',
      keyType: currentFilters.keyType,
      status: currentFilters.status,
      search: currentFilters.search,
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
      adminSecret: secret
    });

    if (r && r.valid) {
      renderKeyList(r);
      renderPagination(r);
      const totalPages = Math.max(1, Math.ceil(r.total / PAGE_SIZE));
      document.getElementById('listInfo').textContent =
        `Tổng: ${r.total} key` + (r.totalAll !== r.total ? ` / ${r.totalAll} toàn bộ` : '') +
        ` | Trang ${currentPage + 1}/${totalPages}`;
    } else {
      alert('Lỗi: ' + (r ? r.message : 'unknown'));
      if (r && r.message === 'Unauthorized') {
        localStorage.removeItem(ADMIN_SECRET_KEY);
      }
    }
  } catch (e) {
    alert('Lỗi tải danh sách: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Làm mới'; }
  }
}

function renderKeyList(r) {
  const l = document.getElementById('keyList');
  if (!r.keys.length) {
    l.innerHTML = '<p style="color:#6b6b6b;text-align:center;padding:30px;">📭 Không có key nào.</p>';
    return;
  }

  let h = '';
  r.keys.forEach(k => {
    const badge = getBadge(k.keyType, 'sm');
    const hasRecovery = (k.keyType === 'single' || k.keyType === 'single-once') && k.recoveryCode;
    const recoveryColor = k.keyType === 'single-once' ? '#c77dff' : '#ff8888';
    const recoveryUsed = k.recoveryUsedAt ? ' <span style="color:#fbbf24;">(đã dùng)</span>' : '';

    const statusClass = 'status-' + k.status;
    const statusLabel = {
      active: '🟢 ACTIVE',
      burned: '💀 BURNED',
      expired: '⏰ EXPIRED',
      revoked: '🚫 REVOKED',
      banned: '🚫 BANNED'
    }[k.status] || k.status.toUpperCase();

    const usedBadge = k.usedAt
      ? '<span style="color:#6b6b6b;font-size:10px;">📅 Used: ' + formatDate(k.usedAt) + '</span>'
      : '';
    const burnedInfo = k.burnedAt
      ? '<span style="color:#c77dff;font-size:10px;">💀 Burned: ' + formatDate(k.burnedAt) + '</span>'
      : '';
    const deviceInfo = k.deviceId
      ? '<span style="color:#6b6b6b;font-size:10px;">📱 ' + k.deviceId.substring(0, 12) + '...</span>'
      : '<span style="color:#6b6b6b;font-size:10px;">📱 Chưa gán</span>';

    h += '<div class="key-item" style="flex-wrap:wrap;">' +
      '<div style="flex:1;min-width:200px;">' +
        '<div class="key-text">' + k.key + badge +
          ' <span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
        '</div>' +
        (hasRecovery
          ? '<div class="key-meta" style="color:' + recoveryColor + ';">🆘 ' + k.recoveryCode + recoveryUsed + '</div>'
          : '') +
        '<div class="key-detail-row">' +
          '<span><strong>Hết hạn:</strong> ' + formatDate(k.expiresAt) + '</span>' +
          '<span><strong>Tạo:</strong> ' + formatDate(k.createdAt) + '</span>' +
        '</div>' +
        '<div class="key-detail-row">' +
          deviceInfo + '<span>' + usedBadge + burnedInfo + '</span>' +
        '</div>' +
        (k.note ? '<div class="key-meta">📝 ' + k.note + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
        '<button class="copy-btn" onclick="cp(\'' + k.key + '\')">📋 Key</button>' +
        (hasRecovery ? '<button class="copy-btn" onclick="cp(\'' + k.recoveryCode + '\')">🆘</button>' : '') +
        '<button class="copy-btn" style="background:#5a1a1a;color:#ff8888;" onclick="doRevoke(\'' + k.key + '\')">🗑 Xoá</button>' +
      '</div>' +
    '</div>';
  });
  l.innerHTML = h;
}

function renderPagination(r) {
  const p = document.getElementById('pagination');
  const totalPages = Math.max(1, Math.ceil(r.total / PAGE_SIZE));
  const cur = currentPage + 1;

  let h = '';
  h += '<button class="pagination-btn" ' + (currentPage === 0 ? 'disabled' : '') + ' onclick="goToPage(0)">⏮ Đầu</button>';
  h += '<button class="pagination-btn" ' + (currentPage === 0 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">◀ Trước</button>';
  h += '<span style="padding:6px 14px;color:#FFD700;font-weight:700;">Trang ' + cur + '/' + totalPages + '</span>';
  h += '<button class="pagination-btn" ' + (!r.hasMore ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">Sau ▶</button>';
  h += '<button class="pagination-btn" ' + (cur === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (totalPages - 1) + ')">Cuối ⏭</button>';
  p.innerHTML = h;
}

function goToPage(p) {
  currentPage = Math.max(0, p);
  loadKeys();
}

// Auto-load khi vào trang
window.addEventListener('load', () => {
  loadKeys();
});

// Search với debounce
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 0;
        loadKeys();
      }, 500);
    });
  }
});