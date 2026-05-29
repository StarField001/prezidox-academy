const PX = {
  async get(path) {
    const r = await fetch('/api' + path, { credentials: 'include' });
    if (r.status === 401) { window.location.href = '/login.html'; return null; }
    return r.json();
  },
  async post(path, body) {
    const r = await fetch('/api' + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  async patch(path, body) {
    const r = await fetch('/api' + path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  async del(path) {
    const r = await fetch('/api' + path, {
      method: 'DELETE',
      credentials: 'include'
    });
    return r.json();
  },
  async adminGet(path) {
    const r = await fetch('/api/admin' + path, { credentials: 'include' });
    if (r.status === 401) { window.location.href = '/admin/login.html'; return null; }
    return r.json();
  },
  async adminPost(path, body) {
    const r = await fetch('/api/admin' + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  async adminPatch(path, body) {
    const r = await fetch('/api/admin' + path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  async adminDel(path) {
    const r = await fetch('/api/admin' + path, {
      method: 'DELETE',
      credentials: 'include'
    });
    return r.json();
  }
};

function showToast(msg, type = 'default') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show' +
    (type === 'error' ? ' toast-error' :
     type === 'success' ? ' toast-success' : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
