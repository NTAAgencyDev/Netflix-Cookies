// NTA Shop Premium - Admin v3.2 (with Single-Use-Only Key)
const STORAGE_KEY = 'nta_generated_keys';
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
        recoveryCode: r.recoveryCode || '',  // ← LƯU recovery code từ server
        createdAt: Date.now(),
        expiresAt: durMs ? Date.now() + durMs : null,
        duration: dur,
        note
      };
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      arr.push(kd);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
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
  renderList();
  renderRecoveryList();  // ← Render recovery list nếu có single-use key

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

function cp(key) {
  navigator.clipboard.writeText(key).then(() => alert('Đã copy:\n' + key)).catch(() => {
    const t = document.createElement('textarea'); t.value = key; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
    alert('Đã copy:\n' + key);
  });
}

async function doRevoke(key) {
  if (!confirm('Thu hồi ' + key + '?')) return;
  const s = getSecret(); if (!s) return;
  const r = await revokeKey(key, s);
  alert(r && r.valid ? 'Đã thu hồi!' : 'Lỗi: ' + (r ? r.message : '?'));
}

function clearAll() {
  if (confirm('Xóa danh sách local?')) {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('generatedKeys').innerHTML = '';
    renderList();
  }
}

function renderList() {
  const keys = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const l = document.getElementById('keyList');
  if (!keys.length) { l.innerHTML = '<p style="color:#6b6b6b;text-align:center;padding:20px;">Chưa có key.</p>'; return; }
  let h = '';
  for (let i = keys.length - 1; i >= 0; i--) {
    const k = keys[i];
    const hasRecovery = k.keyType === 'single' || k.keyType === 'single-once';
    const badge = getBadge(k.keyType, 'sm');
    const recoveryColor = k.keyType === 'single-once' ? '#c77dff' : '#ff8888';

    h += '<div class="key-item"><div style="flex:1;"><div class="key-text">' + k.key + badge + '</div>' +
      (hasRecovery && k.recoveryCode ? '<div class="key-meta" style="color:' + recoveryColor + ';">🆘 ' + k.recoveryCode + '</div>' : '') +
      '<div class="key-meta">' + formatExp(k.expiresAt) + ' • ' + k.note + '</div></div>' +
      '<button class="copy-btn" onclick="cp(\'' + k.key + '\')">Copy</button>' +
      (hasRecovery && k.recoveryCode ? '<button class="copy-btn" onclick="cp(\'' + k.recoveryCode + '\')" style="margin-left:4px;">🆘</button>' : '') +
      '<button class="copy-btn" style="background:#5a1a1a;color:#ff8888;margin-left:4px;" onclick="doRevoke(\'' + k.key + '\')">Thu hồi</button></div>';
  }
  l.innerHTML = h;
}

// Render riêng danh sách recovery codes cho single-use key (cả single và single-once)
function renderRecoveryList() {
  const keys = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const recoveryKeys = keys.filter(k => (k.keyType === 'single' || k.keyType === 'single-once') && k.recoveryCode);
  const card = document.getElementById('recoveryCard');
  const l = document.getElementById('recoveryList');

  if (recoveryKeys.length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  let h = '';
  for (let i = recoveryKeys.length - 1; i >= 0; i--) {
    const k = recoveryKeys[i];
    const isOnce = k.keyType === 'single-once';
    const borderColor = isOnce ? '#9d4edd' : '#ff6b6b';
    const codeColor = isOnce ? '#c77dff' : '#ff6b6b';
    const typeLabel = isOnce ? '💀 ONE-SHOT' : '🔥 SINGLE';

    h += '<div class="key-item" style="border-left:3px solid ' + borderColor + ';">' +
      '<div style="flex:1;">' +
      '<div style="color:#6b6b6b;font-size:11px;margin-bottom:2px;">' +
      '<span style="background:' + borderColor + ';color:#000;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-right:6px;">' + typeLabel + '</span>' +
      'Key: <code style="color:#a3a3a3;">' + k.key + '</code></div>' +
      '<div class="key-text" style="color:' + codeColor + ';">' + k.recoveryCode + '</div>' +
      '<div class="key-meta">' + formatExp(k.expiresAt) + ' • ' + k.note + '</div>' +
      '</div>' +
      '<button class="copy-btn" onclick="cp(\'' + k.recoveryCode + '\')">Copy</button>' +
      '</div>';
  }
  l.innerHTML = h;
}

renderList();
renderRecoveryList();