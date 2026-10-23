(() => {
  'use strict';
  const TOKEN_KEY = 'romana_tok';
  const $ = (id) => document.getElementById(id);
  let subjects = [];
  let activeId = null;
  let afterAuth = null;
  let linkEdit = null;
  function token() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  function setToken(t) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
  }
  function isAdmin() { return !!token(); }
  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    const res = await fetch(path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { setToken(null); syncAdminUi(); }
    return { ok: res.ok, status: res.status, data };
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function syncAdminUi() {
    const btn = $('adminBtn');
    btn.setAttribute('aria-pressed', isAdmin() ? 'true' : 'false');
  }
  function render() {
    const nav = $('subjectsNav');
    nav.innerHTML = '';
    if (!subjects.length) {
      nav.innerHTML = '<p class="empty" style="padding:12px 0;font-size:14px">Nimic încă</p>';
    } else {
      subjects.forEach((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-item' + (s.id === activeId ? ' active' : '');
        const label = document.createElement('span');
        label.innerHTML = escapeHtml(s.name) + ' <span class="count">' + s.links.length + '</span>';
        btn.appendChild(label);
        if (isAdmin()) {
          const x = document.createElement('button');
          x.type = 'button';
          x.className = 'x';
          x.title = 'Șterge';
          x.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
          x.addEventListener('click', (e) => {
            e.stopPropagation();
            requireAdmin(async () => {
              if (!confirm('Ștergi „' + s.name + '”?')) return;
              await api('/api/subjects/' + s.id, { method: 'DELETE' });
              subjects = subjects.filter((x) => x.id !== s.id);
              if (activeId === s.id) activeId = subjects[0] ? subjects[0].id : null;
              render();
            });
          });
          btn.appendChild(x);
        }
        btn.addEventListener('click', () => { activeId = s.id; render(); });
        nav.appendChild(btn);
      });
    }
    const active = subjects.find((s) => s.id === activeId);
    $('addLinkBtn').disabled = !active;
    $('subjectTitle').textContent = active ? active.name : '—';
    const list = $('linksList');
    const empty = $('emptyState');
    list.innerHTML = '';
    if (!active) {
      empty.classList.remove('hidden');
      empty.textContent = subjects.length ? 'Alege o materie' : 'Adaugă o materie';
      return;
    }
    if (!active.links.length) {
      empty.classList.remove('hidden');
      empty.textContent = 'Niciun link';
      return;
    }
    empty.classList.add('hidden');
    active.links.forEach((link) => {
      const row = document.createElement('div');
      row.className = 'link-row';
      const a = document.createElement('a');
      a.className = 'main';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = '<strong>' + escapeHtml(link.name) + '</strong><span>' + escapeHtml(link.url) + '</span>';
      const ops = document.createElement('div');
      ops.className = 'ops';
      if (isAdmin()) {
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.title = 'Editează';
        edit.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        edit.addEventListener('click', () => requireAdmin(() => openLinkModal(active.id, link)));
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'danger';
        del.title = 'Șterge';
        del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
        del.addEventListener('click', () => {
          requireAdmin(async () => {
            if (!confirm('Ștergi „' + link.name + '”?')) return;
            await api('/api/subjects/' + active.id + '/links/' + link.id, { method: 'DELETE' });
            active.links = active.links.filter((l) => l.id !== link.id);
            render();
          });
        });
        ops.appendChild(edit);
        ops.appendChild(del);
      }
      const go = document.createElement('a');
      go.className = 'go';
      go.href = link.url;
      go.target = '_blank';
      go.rel = 'noopener noreferrer';
      go.setAttribute('aria-label', 'Deschide');
      go.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
      row.appendChild(a);
      row.appendChild(ops);
      row.appendChild(go);
      list.appendChild(row);
    });
    syncAdminUi();
  }
  function requireAdmin(fn) {
    if (isAdmin()) { fn(); return; }
    afterAuth = fn;
    openPw();
  }
  const pwModal = $('pwModal');
  const pwInput = $('pwInput');
  const pwFeedback = $('pwFeedback');
  function openPw() {
    pwFeedback.textContent = '';
    pwInput.value = '';
    pwModal.classList.remove('hidden');
    setTimeout(() => pwInput.focus(), 40);
  }
  function closePw() {
    pwModal.classList.add('hidden');
    afterAuth = null;
  }
  $('pwCancel').addEventListener('click', closePw);
  $('pwSubmit').addEventListener('click', submitPw);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitPw(); });
  async function submitPw() {
    const password = pwInput.value;
    if (!password) { pwInput.focus(); return; }
    $('pwSubmit').disabled = true;
    const { ok, data } = await api('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    $('pwSubmit').disabled = false;
    if (ok && data.token) {
      setToken(data.token);
      pwModal.classList.add('hidden');
      const fn = afterAuth;
      afterAuth = null;
      render();
      if (fn) fn();
    } else {
      pwFeedback.textContent = 'Parolă greșită';
      pwInput.select();
    }
  }
  $('adminBtn').addEventListener('click', () => {
    if (isAdmin()) { setToken(null); render(); }
    else requireAdmin(() => render());
  });
  const subjectModal = $('subjectModal');
  const subjectName = $('subjectName');
  function openSubject() {
    subjectName.value = '';
    subjectModal.classList.remove('hidden');
    setTimeout(() => subjectName.focus(), 40);
  }
  function closeSubject() { subjectModal.classList.add('hidden'); }
  $('addSubjectBtn').addEventListener('click', () => requireAdmin(openSubject));
  $('subjectCancel').addEventListener('click', closeSubject);
  $('subjectSave').addEventListener('click', async () => {
    const name = subjectName.value.trim();
    if (!name) return subjectName.focus();
    const { ok, data } = await api('/api/subjects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (ok) {
      subjects.push(data);
      activeId = data.id;
      closeSubject();
      render();
    }
  });
  subjectName.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('subjectSave').click(); });
  const linkModal = $('linkModal');
  const linkName = $('linkName');
  const linkUrl = $('linkUrl');
  function openLinkModal(subjectId, existing) {
    linkEdit = { subjectId, linkId: existing ? existing.id : null };
    linkName.value = existing ? existing.name : '';
    linkUrl.value = existing ? existing.url : '';
    $('linkModalTitle').textContent = existing ? 'Editează' : 'Link';
    linkModal.classList.remove('hidden');
    setTimeout(() => linkName.focus(), 40);
  }
  function closeLink() {
    linkModal.classList.add('hidden');
    linkEdit = null;
  }
  $('addLinkBtn').addEventListener('click', () => {
    if (!activeId) return;
    requireAdmin(() => openLinkModal(activeId, null));
  });
  $('linkCancel').addEventListener('click', closeLink);
  $('linkSave').addEventListener('click', async () => {
    if (!linkEdit) return;
    const name = linkName.value.trim();
    const url = linkUrl.value.trim();
    if (!name || !url) return (name ? linkUrl : linkName).focus();
    if (linkEdit.linkId) {
      const { ok, data } = await api('/api/subjects/' + linkEdit.subjectId + '/links/' + linkEdit.linkId, {
        method: 'PUT',
        body: JSON.stringify({ name, url }),
      });
      if (ok) {
        const sub = subjects.find((s) => s.id === linkEdit.subjectId);
        const L = sub && sub.links.find((l) => l.id === linkEdit.linkId);
        if (L) { L.name = data.name; L.url = data.url; }
        closeLink();
        render();
      }
    } else {
      const { ok, data } = await api('/api/subjects/' + linkEdit.subjectId + '/links', {
        method: 'POST',
        body: JSON.stringify({ name, url }),
      });
      if (ok) {
        const sub = subjects.find((s) => s.id === linkEdit.subjectId);
        if (sub) sub.links.push(data);
        closeLink();
        render();
      }
    }
  });
  linkUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('linkSave').click(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!pwModal.classList.contains('hidden')) closePw();
    if (!subjectModal.classList.contains('hidden')) closeSubject();
    if (!linkModal.classList.contains('hidden')) closeLink();
  });
  async function boot() {
    const { ok, data } = await api('/api/data');
    if (ok && Array.isArray(data.subjects)) {
      subjects = data.subjects;
      activeId = subjects[0] ? subjects[0].id : null;
    }
    render();
  }
  boot();
})();
