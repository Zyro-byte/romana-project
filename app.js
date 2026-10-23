(() => {
  'use strict';

  const STORAGE_KEY = 'romana_projects_v1';
  const ADMIN_PASS = '20205';
  const SESSION_KEY = 'romana_admin_ok';

  /** @typedef {{ id: string, name: string, links: { id: string, name: string, url: string }[] }} Subject */

  /** @returns {{ subjects: Subject[], activeId: string | null }} */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { subjects: [], activeId: null };
      const data = JSON.parse(raw);
      if (!Array.isArray(data.subjects)) return { subjects: [], activeId: null };
      return {
        subjects: data.subjects,
        activeId: data.activeId || (data.subjects[0] && data.subjects[0].id) || null,
      };
    } catch {
      return { subjects: [], activeId: null };
    }
  }

  /** @param {{ subjects: Subject[], activeId: string | null }} state */
  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function isAdmin() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  function setAdmin(ok) {
    try {
      if (ok) sessionStorage.setItem(SESSION_KEY, '1');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  let state = load();
  /** @type {null | (() => void)} */
  let pendingAction = null;

  const $ = (id) => document.getElementById(id);

  const subjectsNav = $('subjectsNav');
  const linksList = $('linksList');
  const emptyState = $('emptyState');
  const subjectTitle = $('subjectTitle');
  const subjectKicker = $('subjectKicker');
  const addLinkBtn = $('addLinkBtn');
  const addSubjectBtn = $('addSubjectBtn');
  const adminBtn = $('adminBtn');

  function render() {
    const subjects = state.subjects;
    subjectsNav.innerHTML = '';

    if (!subjects.length) {
      subjectsNav.innerHTML = '<p style="color:var(--dim);font-size:14px;padding:8px 0">Nicio materie încă.</p>';
    } else {
      subjects.forEach((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'staff-link' + (s.id === state.activeId ? ' active' : '');
        btn.dataset.id = s.id;
        btn.innerHTML = `<span>${escapeHtml(s.name)} <span class="link-count">${s.links.length}</span></span>`;
        if (isAdmin()) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'del-btn';
          del.textContent = 'Șterge';
          del.addEventListener('click', (e) => {
            e.stopPropagation();
            requireAdmin(() => {
              if (!confirm(`Ștergi materia „${s.name}”?`)) return;
              state.subjects = state.subjects.filter((x) => x.id !== s.id);
              if (state.activeId === s.id) state.activeId = state.subjects[0]?.id || null;
              save(state);
              render();
            });
          });
          btn.appendChild(del);
        }
        btn.addEventListener('click', () => {
          state.activeId = s.id;
          save(state);
          render();
        });
        subjectsNav.appendChild(btn);
      });
    }

    const active = subjects.find((s) => s.id === state.activeId);
    addLinkBtn.disabled = !active;

    if (!active) {
      subjectKicker.textContent = 'Selectează o materie';
      subjectTitle.textContent = 'Linkuri';
      linksList.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = subjects.length
        ? 'Alege o materie din stânga.'
        : 'Alege o materie din stânga sau adaugă una nouă.';
      return;
    }

    emptyState.classList.add('hidden');
    subjectKicker.textContent = 'Materie';
    subjectTitle.textContent = active.name;
    linksList.innerHTML = '';

    if (!active.links.length) {
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = 'Niciun link. Apasă „+ Link” pentru a adăuga.';
      return;
    }

    active.links.forEach((link) => {
      const row = document.createElement('div');
      row.className = 'link-item';
      const meta = document.createElement('a');
      meta.href = link.url;
      meta.target = '_blank';
      meta.rel = 'noopener noreferrer';
      meta.className = 'link-meta';
      meta.style.flex = '1';
      meta.style.minWidth = '0';
      meta.style.textDecoration = 'none';
      meta.style.color = 'inherit';
      meta.innerHTML = `<strong>${escapeHtml(link.name)}</strong><span>${escapeHtml(link.url)}</span>`;

      const actions = document.createElement('div');
      actions.className = 'link-actions';

      if (isAdmin()) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.title = 'Editează';
        editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        editBtn.addEventListener('click', () => {
          requireAdmin(() => openLinkModal(active.id, link));
        });
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'del';
        delBtn.title = 'Șterge';
        delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
        delBtn.addEventListener('click', () => {
          requireAdmin(() => {
            if (!confirm(`Ștergi „${link.name}”?`)) return;
            active.links = active.links.filter((l) => l.id !== link.id);
            save(state);
            render();
          });
        });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
      }

      const arrow = document.createElement('a');
      arrow.href = link.url;
      arrow.target = '_blank';
      arrow.rel = 'noopener noreferrer';
      arrow.className = 'arrow';
      arrow.setAttribute('aria-label', 'Deschide');
      arrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h13.6"/><path d="m13.6 7.2 4.8 4.8-4.8 4.8"/></svg>';

      row.appendChild(meta);
      row.appendChild(actions);
      row.appendChild(arrow);
      linksList.appendChild(row);
    });

    adminBtn.textContent = isAdmin() ? 'Admin ✓' : 'Admin';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function requireAdmin(fn) {
    if (isAdmin()) {
      fn();
      return;
    }
    pendingAction = fn;
    openPwModal();
  }

  /* Password modal */
  const pwModal = $('pwModal');
  const pwInput = $('pwInput');
  const pwFeedback = $('pwFeedback');

  function openPwModal() {
    pwFeedback.className = 'feedback-message';
    pwFeedback.textContent = '';
    pwInput.value = '';
    pwModal.classList.remove('hidden');
    setTimeout(() => pwInput.focus(), 50);
  }

  function closePwModal() {
    pwModal.classList.add('hidden');
    pendingAction = null;
  }

  $('pwCancel').addEventListener('click', closePwModal);
  $('pwSubmit').addEventListener('click', submitPw);
  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitPw();
  });

  function submitPw() {
    if (pwInput.value === ADMIN_PASS) {
      setAdmin(true);
      pwModal.classList.add('hidden');
      const fn = pendingAction;
      pendingAction = null;
      render();
      if (fn) fn();
    } else {
      pwFeedback.className = 'feedback-message error';
      pwFeedback.textContent = 'Parolă greșită.';
      pwInput.select();
    }
  }

  adminBtn.addEventListener('click', () => {
    if (isAdmin()) {
      setAdmin(false);
      render();
    } else {
      requireAdmin(() => render());
    }
  });

  /* Subject modal */
  const subjectModal = $('subjectModal');
  const subjectName = $('subjectName');

  function openSubjectModal() {
    subjectName.value = '';
    subjectModal.classList.remove('hidden');
    setTimeout(() => subjectName.focus(), 50);
  }

  function closeSubjectModal() {
    subjectModal.classList.add('hidden');
  }

  addSubjectBtn.addEventListener('click', () => {
    requireAdmin(openSubjectModal);
  });

  $('subjectCancel').addEventListener('click', closeSubjectModal);
  $('subjectSave').addEventListener('click', () => {
    const name = subjectName.value.trim();
    if (!name) {
      subjectName.focus();
      return;
    }
    const sub = { id: uid(), name, links: [] };
    state.subjects.push(sub);
    state.activeId = sub.id;
    save(state);
    closeSubjectModal();
    render();
  });
  subjectName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('subjectSave').click();
  });

  /* Link modal */
  const linkModal = $('linkModal');
  const linkName = $('linkName');
  const linkUrl = $('linkUrl');
  /** @type {{ subjectId: string, linkId: string | null } | null} */
  let linkEdit = null;

  function openLinkModal(subjectId, existing) {
    linkEdit = { subjectId, linkId: existing ? existing.id : null };
    linkName.value = existing ? existing.name : '';
    linkUrl.value = existing ? existing.url : '';
    $('linkModalTitle').textContent = existing ? 'Editează link' : 'Link nou';
    linkModal.classList.remove('hidden');
    setTimeout(() => linkName.focus(), 50);
  }

  function closeLinkModal() {
    linkModal.classList.add('hidden');
    linkEdit = null;
  }

  addLinkBtn.addEventListener('click', () => {
    if (!state.activeId) return;
    requireAdmin(() => openLinkModal(state.activeId, null));
  });

  $('linkCancel').addEventListener('click', closeLinkModal);
  $('linkSave').addEventListener('click', () => {
    if (!linkEdit) return;
    const name = linkName.value.trim();
    let url = linkUrl.value.trim();
    if (!name || !url) {
      (name ? linkUrl : linkName).focus();
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const sub = state.subjects.find((s) => s.id === linkEdit.subjectId);
    if (!sub) return;
    if (linkEdit.linkId) {
      const L = sub.links.find((l) => l.id === linkEdit.linkId);
      if (L) {
        L.name = name;
        L.url = url;
      }
    } else {
      sub.links.push({ id: uid(), name, url });
    }
    save(state);
    closeLinkModal();
    render();
  });
  linkUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('linkSave').click();
  });

  /* Escape closes modals */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!pwModal.classList.contains('hidden')) closePwModal();
    if (!subjectModal.classList.contains('hidden')) closeSubjectModal();
    if (!linkModal.classList.contains('hidden')) closeLinkModal();
  });

  /* Seed example if empty */
  if (!state.subjects.length) {
    state.subjects = [
      {
        id: uid(),
        name: 'Literatură',
        links: [
          {
            id: uid(),
            name: 'Copac Octombrie',
            url: 'https://www.figma.com/deck/CGIl0nptsWe1tYKgLKDl1F',
          },
        ],
      },
    ];
    state.activeId = state.subjects[0].id;
    save(state);
  }

  render();
})();
