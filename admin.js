// NTA Shop Premium - Admin v3 (Fixed duplicate)
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

async function createKey(key, exp, note, secret) {
  try {
    return await jsonp({ action: 'create', key, expiresAt: exp || '', note, adminSecret: secret });
  } catch (e) {
    return { valid: false, message: e.message };
  }
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

  const dur = document.getElementById('duration').value;
  const cnt = parseInt(document.getElementById('count').value) || 1;
  const note = (document.getElementById('note').value || 'Created by admin').trim();
  const durMs = getDurationMs(dur);

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

    const r = await createKey(key, durMs, note, secret);

    if (r && r.valid) {
      const kd = { key, createdAt: Date.now(), expiresAt: durMs ? Date.now() + durMs : null, duration: dur, note };
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
  alert('Xong!\nThành công: ' + ok + '\nThất bại: ' + fail);
}

function showNewKeys(keys) {
  const c = document.getElementById('generatedKeys');
  if (!keys.length) { c.innerHTML = ''; return; }
  let h = '<h3 style="color:#FFD700;margin-top:20px;font-size:14px;">Key mới tạo:</h3>';
  keys.forEach(k => {
    h += '<div class="key-display">' + k.key + '<div style="font-size:11px;color:#6b6b6b;margin-top:6px;letter-spacing:0;font-weight:400;">' + formatExp(k.expiresAt) + ' | ' + k.note + '</div></div><button class="btn" onclick="cp(\'' + k.key + '\')" style="margin-bottom:8px;">📋 Copy</button>';
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
    h += '<div class="key-item"><div style="flex:1;"><div class="key-text">' + k.key + '</div><div class="key-meta">' + formatExp(k.expiresAt) + ' • ' + k.note + '</div></div><button class="copy-btn" onclick="cp(\'' + k.key + '\')">Copy</button><button class="copy-btn" style="background:#5a1a1a;color:#ff8888;margin-left:4px;" onclick="doRevoke(\'' + k.key + '\')">Thu hồi</button></div>';
  }
  l.innerHTML = h;
}

renderList();