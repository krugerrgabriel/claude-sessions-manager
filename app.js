(() => {
  'use strict';
  const API = 'api';

  // ----- i18n (files in ./i18n/) -----
  const I18N_BASE = 'i18n';
  // Filled at boot from i18n/index.json
  let I18N_AVAILABLE = [];    // [{code, name, short, flag}]
  let I18N_DEFAULT = 'pt-br';
  const I18N_CACHE = {};      // { code: { key: value } }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
    return res.json();
  }

  async function loadLangIndex() {
    const idx = await fetchJson(`${I18N_BASE}/index.json`);
    I18N_AVAILABLE = Array.isArray(idx.languages) ? idx.languages : [];
    I18N_DEFAULT = idx.default && I18N_AVAILABLE.some(l => l.code === idx.default)
      ? idx.default
      : (I18N_AVAILABLE[0]?.code || 'pt-br');
  }

  async function loadLang(code) {
    if (I18N_CACHE[code]) return I18N_CACHE[code];
    const dict = await fetchJson(`${I18N_BASE}/${code}.json`);
    I18N_CACHE[code] = dict;
    return dict;
  }

  function supportedLang(code) {
    return I18N_AVAILABLE.some(l => l.code === code);
  }

  function detectLang() {
    try {
      const saved = localStorage.getItem('cs:lang');
      if (saved && supportedLang(saved)) return saved;
    } catch (_) {}
    const nav = (navigator.language || '').toLowerCase();
    // Try exact match first (e.g., "pt-br"), then language prefix (e.g., "pt")
    const exact = I18N_AVAILABLE.find(l => l.code.toLowerCase() === nav);
    if (exact) return exact.code;
    const prefix = nav.split('-')[0];
    const prefixed = I18N_AVAILABLE.find(l => l.code.toLowerCase().startsWith(prefix));
    if (prefixed) return prefixed.code;
    return I18N_DEFAULT;
  }

  function t(key, vars) {
    const dict = I18N_CACHE[state?.lang] || I18N_CACHE[I18N_DEFAULT] || {};
    let s = dict[key];
    if (s === undefined) s = (I18N_CACHE[I18N_DEFAULT] || {})[key];
    if (s === undefined) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : ''));
    return s;
  }

  const state = {
    sessions: [],
    filter: 'all',       // all | favorites | trash
    project: null,       // cwd of active project, null = all
    query: '',
    sort: localStorage.getItem('cs:sort') || 'recent',
    lang: null,          // resolved after loading i18n/index.json
    editing: null,
    collapsed: new Set(loadCollapsed()),
  };

  // ----- DOM helpers -----
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function loadCollapsed() {
    try { return JSON.parse(localStorage.getItem('cs:collapsed') || '[]'); } catch (_) { return []; }
  }
  function saveCollapsed() {
    try { localStorage.setItem('cs:collapsed', JSON.stringify([...state.collapsed])); } catch (_) {}
  }

  // ----- Formatting -----
  function prettyDate(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return t('date.now');
    if (diff < 3600) return `${Math.round(diff / 60)} ${t('date.min')}`;
    if (diff < 86400) return `${Math.round(diff / 3600)} ${t('date.h')}`;
    if (diff < 86400 * 7) return `${Math.round(diff / 86400)} ${t('date.d')}`;
    return d.toLocaleDateString(t('locale'), { day: '2-digit', month: 'short' });
  }

  function fullDate(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleString(t('locale'));
  }

  function prettySize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    const mb = bytes / 1024 / 1024;
    return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
  }

  function prettyTokens(t) {
    if (!t && t !== 0) return '';
    if (t < 1000) return `${t}`;
    if (t < 1000 * 1000) return `${(t / 1000).toFixed(t < 10000 ? 1 : 0)}k`;
    return `${(t / 1000 / 1000).toFixed(2)}M`;
  }

  function tokenClass(t) {
    // Visual hint for how "full" the context is. Claude's window = 200k (or 1M for 1m-context).
    if (!t) return '';
    if (t >= 800000) return 'tok-hot';
    if (t >= 180000) return 'tok-warm';
    return '';
  }

  function prettyCwd(cwd, folder) {
    const raw = cwd || (folder || '').replace(/^-/, '/').replace(/-/g, '/');
    return raw.replace(/^\/home\/[^/]+/, '~');
  }

  function projectKey(s) { return s.cwd || s.project_folder || t('unknown.project'); }

  function projectShortName(cwd) {
    if (!cwd) return t('unknown.project');
    const parts = cwd.split('/').filter(Boolean);
    return parts[parts.length - 1] || cwd;
  }

  function truncate(s, n) {
    s = (s || '').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  // ----- API -----
  async function fetchSessions() {
    const res = await fetch(`${API}/sessions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.sessions || [];
  }

  async function patchSession(id, patch) {
    const res = await fetch(`${API}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function deleteSession(id) {
    const res = await fetch(`${API}/sessions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch (_) {}
      throw new Error(msg);
    }
    return res.json();
  }

  // ----- Toast -----
  function toast(msg, type = '', opts = {}) {
    const el = $('#toast');
    const iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'copy';
    el.innerHTML = `${icon(iconName)}<span class="msg">${msg}</span>`;
    el.className = `toast show ${type}`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast hidden'; }, opts.duration || 2400);
  }

  // ----- Confirm dialog (replaces window.confirm) -----
  function confirmDialog({ title, message, confirmLabel = 'Confirmar', variant = 'default' }) {
    return new Promise(resolve => {
      const modal = $('#confirm-modal');
      const okBtn = $('#confirm-ok');
      const iconEl = $('#confirm-icon');
      $('#confirm-title').textContent = title;
      $('#confirm-message').textContent = message;
      okBtn.textContent = confirmLabel;
      okBtn.className = 'btn ' + (variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary');
      iconEl.className = 'confirm-icon ' + variant;

      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      setTimeout(() => okBtn.focus(), 20);

      const cleanup = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        okBtn.removeEventListener('click', onConfirm);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey, true);
      };
      const onConfirm = () => { cleanup(); resolve(true); };
      const onBackdrop = (e) => {
        if (e.target.closest('[data-confirm-cancel]')) { cleanup(); resolve(false); }
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); cleanup(); resolve(false); }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cleanup(); resolve(true); }
      };
      okBtn.addEventListener('click', onConfirm);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey, true);
    });
  }

  // ----- Tooltip (delegated, singleton bubble) -----
  const tooltip = (() => {
    const el = $('#tooltip');
    let showTimer = null;
    let current = null;

    function position(target) {
      const r = target.getBoundingClientRect();
      // Tentative top-center position below the element
      el.style.visibility = 'hidden';
      el.style.left = '0px';
      el.style.top = '0px';
      el.classList.add('show');
      const tr = el.getBoundingClientRect();
      let top = r.bottom + 8;
      let left = r.left + (r.width - tr.width) / 2;
      // Clamp to viewport
      const margin = 6;
      if (left < margin) left = margin;
      if (left + tr.width > window.innerWidth - margin) left = window.innerWidth - tr.width - margin;
      // Flip above if it overflows below
      let flipped = false;
      if (top + tr.height > window.innerHeight - margin) {
        top = r.top - tr.height - 8;
        flipped = true;
      }
      el.classList.toggle('flip', flipped);
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.visibility = '';
    }

    function show(target) {
      const text = target.getAttribute('data-tooltip');
      if (!text) return;
      el.textContent = text;
      current = target;
      position(target);
    }

    function hide() {
      clearTimeout(showTimer);
      showTimer = null;
      current = null;
      el.classList.remove('show');
    }

    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-tooltip]');
      if (!t || t === current) return;
      clearTimeout(showTimer);
      // Short delay to avoid flicker when sweeping the cursor
      showTimer = setTimeout(() => show(t), 280);
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest('[data-tooltip]');
      if (!t) return;
      // Only hide if the pointer actually left the tooltip target
      if (e.relatedTarget && t.contains(e.relatedTarget)) return;
      hide();
    });
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('focusout', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);

    return { hide };
  })();

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  // ----- Filtering -----
  function matchesQuery(s, q) {
    if (!q) return true;
    const hay = [s.name, s.description, s.first_message, s.cwd, s.git_branch, s.project_folder, s.id]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  function baseVisible(s) {
    if (state.filter === 'favorites') return s.favorite && !s.deleted;
    if (state.filter === 'trash') return s.deleted;
    return !s.deleted;
  }

  function visibleSessions() {
    const q = state.query.trim().toLowerCase();
    const filtered = state.sessions.filter(s => {
      if (!baseVisible(s)) return false;
      if (state.project && projectKey(s) !== state.project) return false;
      return matchesQuery(s, q);
    });
    return applySort(filtered);
  }

  function applySort(list) {
    const arr = [...list];
    const byNum = (pick) => (a, b) => (pick(b) || 0) - (pick(a) || 0);
    const byNumAsc = (pick) => (a, b) => (pick(a) || 0) - (pick(b) || 0);
    switch (state.sort) {
      case 'oldest':        arr.sort((a, b) => a.mtime - b.mtime); break;
      case 'tokens-desc':   arr.sort(byNum(s => s.context_tokens)); break;
      case 'tokens-asc':    arr.sort(byNumAsc(s => s.context_tokens || Infinity)); break;
      case 'size-desc':     arr.sort(byNum(s => s.size)); break;
      case 'name': {
        const label = s => (s.name || s.first_message || s.id).toLowerCase();
        arr.sort((a, b) => label(a).localeCompare(label(b), t('locale')));
        break;
      }
      case 'recent':
      default:              arr.sort((a, b) => b.mtime - a.mtime);
    }
    return arr;
  }

  function countByFilter(filter) {
    return state.sessions.filter(s => {
      if (filter === 'favorites') return s.favorite && !s.deleted;
      if (filter === 'trash') return s.deleted;
      return !s.deleted;
    }).length;
  }

  function projectsGrouped() {
    const m = new Map();
    for (const s of state.sessions) {
      if (!baseVisible(s)) continue;
      const key = projectKey(s);
      if (!m.has(key)) m.set(key, { key, cwd: s.cwd, folder: s.project_folder, count: 0, lastMtime: 0 });
      const g = m.get(key);
      g.count += 1;
      if (s.mtime > g.lastMtime) g.lastMtime = s.mtime;
    }
    return [...m.values()].sort((a, b) => b.lastMtime - a.lastMtime);
  }

  // ----- Render: sidebar -----
  function renderSidebar() {
    // counts
    $('[data-count="all"]').textContent = countByFilter('all');
    $('[data-count="favorites"]').textContent = countByFilter('favorites');
    $('[data-count="trash"]').textContent = countByFilter('trash');

    // active filter
    $$('.nav-item[data-filter]').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === state.filter && !state.project);
    });

    // project list (context-aware to current filter)
    const projects = projectsGrouped();
    const list = $('#project-list');
    if (projects.length === 0) {
      list.innerHTML = `<div class="hint" style="padding:6px 10px">${escapeHtml(t('nav.empty'))}</div>`;
      return;
    }
    list.innerHTML = projects.map(p => {
      const active = state.project === p.key;
      const short = projectShortName(p.cwd) || p.folder;
      return `
        <button class="nav-item ${active ? 'active' : ''}" data-project="${escapeHtml(p.key)}" type="button" data-tooltip="${escapeHtml(p.cwd || p.folder)}">
          ${icon('folder')}
          <span>${escapeHtml(short)}</span>
          <span class="nav-count">${p.count}</span>
        </button>
      `;
    }).join('');
  }

  // ----- Render: main -----
  function renderCrumbs(listLen) {
    const viewLabel = state.filter === 'favorites' ? t('crumbs.view.favorites') :
                      state.filter === 'trash' ? t('crumbs.view.trash') : t('crumbs.view.all');
    $('#crumb-view').textContent = viewLabel;
    const scope = state.project ? projectShortName(state.project) : t('crumbs.scope.all');
    $('#crumb-scope').textContent = scope;
    const total = state.sessions.length;
    const word = total === 1 ? t('crumbs.count.singular') : t('crumbs.count.plural');
    const of = t('crumbs.count.of');
    const filterPart = state.query ? ` · ${t('crumbs.count.filter')} "${state.query}"` : '';
    $('#result-count').textContent = `${listLen} ${of} ${total} ${word}${filterPart}`;
  }

  function renderEmpty() {
    const map = {
      search: { icon: 'search', h: t('empty.search.title'), p: t('empty.search.msg') },
      favorites: { icon: 'star', h: t('empty.favorites.title'), p: t('empty.favorites.msg') },
      trash: { icon: 'trash', h: t('empty.trash.title'), p: t('empty.trash.msg') },
      none: { icon: 'inbox', h: t('empty.none.title'), p: t('empty.none.msg') },
    };
    const state_ = state.query ? 'search' : state.filter === 'favorites' ? 'favorites' : state.filter === 'trash' ? 'trash' : 'none';
    const d = map[state_];
    return `
      <div class="empty">
        <div class="illus">${icon(d.icon)}</div>
        <h3>${escapeHtml(d.h)}</h3>
        <p>${escapeHtml(d.p)}</p>
      </div>
    `;
  }

  function renderCard(s) {
    const displayName = s.name || '';
    const preview = s.first_message || '';
    const classes = ['card'];
    if (s.favorite) classes.push('favorite');
    if (s.deleted) classes.push('deleted');

    const titleHtml = displayName
      ? `<div class="card-title">${escapeHtml(displayName)}</div>`
      : `<div class="card-title unnamed">${escapeHtml(truncate(preview, 140) || t('card.untitled'))}</div>`;

    const descHtml = s.description
      ? `<div class="card-desc">${escapeHtml(s.description)}</div>`
      : (displayName && preview
        ? `<div class="card-desc preview">${escapeHtml(truncate(preview, 180))}</div>`
        : '');

    const meta = [];
    if (s.git_branch) meta.push(`<span class="meta-pill branch" data-tooltip="${escapeHtml(t('card.tooltip.branch'))}">${icon('branch')}${escapeHtml(truncate(s.git_branch, 28))}</span>`);
    if (s.context_tokens) meta.push(`<span class="meta-pill tokens ${tokenClass(s.context_tokens)}" data-tooltip="${escapeHtml(t('card.tooltip.tokens', { n: s.context_tokens.toLocaleString(t('locale')) }))}">${icon('database')}${prettyTokens(s.context_tokens)}</span>`);
    if (s.size) meta.push(`<span class="meta-pill" data-tooltip="${escapeHtml(t('card.tooltip.size'))}">${icon('file')}${prettySize(s.size)}</span>`);
    meta.push(`<span class="meta-pill" data-tooltip="${escapeHtml(fullDate(s.mtime))}">${icon('clock')}${prettyDate(s.mtime)}</span>`);

    const favLabel = s.favorite ? t('card.action.unfavorite') : t('card.action.favorite');
    const actions = s.deleted
      ? `
        <button class="card-action success" data-action="restore" data-tooltip="${escapeHtml(t('card.action.restore'))}" aria-label="${escapeHtml(t('card.action.restore'))}">${icon('rotate')}</button>
        <button class="card-action danger" data-action="purge" data-tooltip="${escapeHtml(t('card.action.purge'))}" aria-label="${escapeHtml(t('card.action.purge'))}">${icon('x')}</button>
      `
      : `
        <button class="card-action primary" data-action="copy" data-tooltip="${escapeHtml(t('card.action.copy', { id: s.id }))}">${icon('copy')}${escapeHtml(t('card.action.copyLabel'))}</button>
        <button class="card-action fav ${s.favorite ? 'on' : ''}" data-action="favorite" data-tooltip="${escapeHtml(favLabel)}" aria-label="${escapeHtml(favLabel)}">${icon(s.favorite ? 'star-filled' : 'star')}</button>
        <button class="card-action" data-action="edit" data-tooltip="${escapeHtml(t('card.action.edit'))}" aria-label="${escapeHtml(t('card.action.editAria'))}">${icon('edit')}</button>
        <button class="card-action danger" data-action="delete" data-tooltip="${escapeHtml(t('card.action.delete'))}" aria-label="${escapeHtml(t('card.action.delete'))}">${icon('trash')}</button>
      `;

    return `
      <article class="${classes.join(' ')}" data-id="${s.id}" tabindex="0" role="button" aria-label="${escapeHtml(displayName || truncate(preview, 60) || s.id)}">
        <span class="card-id">${s.id.slice(0, 8)}</span>
        <div class="card-head">${titleHtml}</div>
        ${descHtml}
        <div class="card-meta">${meta.join('')}</div>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }

  function renderContent() {
    const list = visibleSessions();
    renderCrumbs(list.length);
    const container = $('#content');

    if (list.length === 0) {
      container.innerHTML = renderEmpty();
      return;
    }

    // Group by project (unless a specific project is selected)
    const groupByProject = !state.project;
    if (!groupByProject) {
      container.innerHTML = `
        <section class="project-group">
          <div class="grid">${list.map(renderCard).join('')}</div>
        </section>
      `;
      return;
    }

    const groups = new Map();
    for (const s of list) {
      const key = projectKey(s);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }

    const html = [...groups.entries()].map(([key, items]) => {
      const cwd = items[0].cwd;
      const folder = items[0].project_folder;
      const short = projectShortName(cwd) || folder;
      const rest = prettyCwd(cwd, folder).replace(new RegExp(`/${short}$`), '');
      const collapsed = state.collapsed.has(key);
      return `
        <section class="project-group ${collapsed ? 'collapsed' : ''}" data-group="${escapeHtml(key)}">
          <div class="project-header" data-toggle-group>
            <svg class="icon chev" aria-hidden="true"><use href="#i-chevron-down"></use></svg>
            <svg class="icon folder-ic" aria-hidden="true"><use href="#i-folder"></use></svg>
            <span class="project-path"><span class="path-dim">${escapeHtml(rest)}/</span>${escapeHtml(short)}</span>
            <span class="pill">${items.length}</span>
          </div>
          <div class="grid">${items.map(renderCard).join('')}</div>
        </section>
      `;
    }).join('');
    container.innerHTML = html;
  }

  function render() { renderSidebar(); renderContent(); }

  // ----- Actions -----
  async function handleAction(action, s, cardEl) {
    if (action === 'copy') {
      const cmd = `claude --resume ${s.id}`;
      const ok = await copyToClipboard(cmd);
      if (ok) {
        toast(t('toast.copied', { cmd: escapeHtml(cmd) }), 'success');
        if (cardEl) {
          cardEl.classList.add('copied');
          setTimeout(() => cardEl.classList.remove('copied'), 1200);
        }
      } else {
        toast(t('toast.copyFailed'), 'error');
      }
      return;
    }
    if (action === 'favorite') {
      const next = !s.favorite;
      await patchSession(s.id, { favorite: next });
      s.favorite = next;
      render();
      return;
    }
    if (action === 'edit') { openEditor(s); return; }
    if (action === 'delete') {
      const ok = await confirmDialog({
        title: t('confirm.delete.title'),
        message: t('confirm.delete.msg'),
        confirmLabel: t('confirm.delete.btn'),
        variant: 'warning',
      });
      if (!ok) return;
      await patchSession(s.id, { deleted: true });
      s.deleted = true;
      render();
      toast(t('toast.trashed'), 'success');
      return;
    }
    if (action === 'restore') {
      await patchSession(s.id, { deleted: false });
      s.deleted = false;
      render();
      toast(t('toast.restored'), 'success');
      return;
    }
    if (action === 'purge') {
      const ok = await confirmDialog({
        title: t('confirm.purge.title'),
        message: t('confirm.purge.msg', { short: s.id.slice(0, 8) }),
        confirmLabel: t('confirm.purge.btn'),
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await deleteSession(s.id);
        state.sessions = state.sessions.filter(x => x.id !== s.id);
        render();
        toast(t('toast.purged'), 'success');
      } catch (e) {
        toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
      }
      return;
    }
  }

  // ----- Editor modal -----
  function openEditor(s) {
    state.editing = s.id;
    $('#edit-name').value = s.name || '';
    $('#edit-desc').value = s.description || '';
    $('#edit-id').textContent = s.id;
    $('#edit-cwd').textContent = prettyCwd(s.cwd, s.project_folder);
    $('#modal').classList.remove('hidden');
    $('#modal').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#edit-name').focus(), 10);
  }
  function closeEditor() {
    state.editing = null;
    $('#modal').classList.add('hidden');
    $('#modal').setAttribute('aria-hidden', 'true');
  }
  async function saveEditor() {
    const id = state.editing;
    if (!id) return;
    const name = $('#edit-name').value.trim();
    const description = $('#edit-desc').value.trim();
    try {
      await patchSession(id, { name, description });
      const s = state.sessions.find(x => x.id === id);
      if (s) { s.name = name; s.description = description; }
      closeEditor();
      render();
      toast(t('toast.saved'), 'success');
    } catch (e) {
      toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
    }
  }

  // ----- Loading -----
  async function load() {
    try {
      state.sessions = await fetchSessions();
      render();
    } catch (e) {
      $('#content').innerHTML = `
        <div class="empty">
          <div class="illus">${icon('alert')}</div>
          <h3>${escapeHtml(t('error.load.title'))}</h3>
          <p>${t('error.load.msg', { err: escapeHtml(e.message) })}</p>
        </div>
      `;
    }
  }

  // ----- Events -----
  // Click routing
  document.addEventListener('click', async (ev) => {
    // Close modal
    if (ev.target.closest('[data-close]')) { closeEditor(); return; }

    // Sidebar: filter
    const filterBtn = ev.target.closest('.nav-item[data-filter]');
    if (filterBtn) {
      state.filter = filterBtn.dataset.filter;
      state.project = null;
      document.body.classList.remove('sidebar-open');
      render();
      return;
    }

    // Sidebar: project
    const projectBtn = ev.target.closest('.nav-item[data-project]');
    if (projectBtn) {
      const key = projectBtn.dataset.project;
      state.project = state.project === key ? null : key;
      document.body.classList.remove('sidebar-open');
      render();
      return;
    }

    // Collapse project group
    const toggleGroup = ev.target.closest('[data-toggle-group]');
    if (toggleGroup) {
      const group = toggleGroup.closest('.project-group');
      const key = group?.dataset.group;
      if (key) {
        if (state.collapsed.has(key)) state.collapsed.delete(key);
        else state.collapsed.add(key);
        group.classList.toggle('collapsed');
        saveCollapsed();
      }
      return;
    }

    // Mobile menu
    if (ev.target.closest('#toggle-sidebar')) {
      document.body.classList.toggle('sidebar-open');
      return;
    }

    // Card
    const card = ev.target.closest('.card');
    if (!card) return;
    const sid = card.dataset.id;
    const s = state.sessions.find(x => x.id === sid);
    if (!s) return;
    const actionBtn = ev.target.closest('[data-action]');
    const action = actionBtn ? actionBtn.dataset.action : 'copy';
    if (actionBtn) ev.stopPropagation();
    try {
      await handleAction(action, s, card);
    } catch (e) {
      toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
    }
  });

  // Keyboard on card = Enter/Space to copy
  document.addEventListener('keydown', async (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      $('#search').focus();
      return;
    }
    if (e.key === 'Escape') {
      if (!$('#modal').classList.contains('hidden')) { closeEditor(); return; }
      if ($('#search') === document.activeElement) { $('#search').value = ''; state.query = ''; render(); $('#search').blur(); return; }
      if (document.body.classList.contains('sidebar-open')) { document.body.classList.remove('sidebar-open'); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('card')) {
      e.preventDefault();
      const sid = document.activeElement.dataset.id;
      const s = state.sessions.find(x => x.id === sid);
      if (s) handleAction('copy', s, document.activeElement);
    }
    if (!$('#modal').classList.contains('hidden') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      saveEditor();
    }
  });

  $('#search').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderContent();
  });

  $('#refresh').addEventListener('click', async () => {
    const btn = $('#refresh');
    if (btn.classList.contains('spinning')) return;
    btn.classList.add('spinning');
    const start = Date.now();
    try {
      await load();
    } finally {
      // Ensure at least one full spin for visible feedback
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 650 - elapsed);
      setTimeout(() => btn.classList.remove('spinning'), wait);
    }
  });

  $('#sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    try { localStorage.setItem('cs:sort', state.sort); } catch (_) {}
    renderContent();
  });

  // Restore saved sort into the select on load
  const sortSel = $('#sort-select');
  if (sortSel) sortSel.value = state.sort;

  $('#edit-save').addEventListener('click', saveEditor);

  // ----- i18n application -----
  function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    root.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
      el.setAttribute('data-tooltip', t(el.dataset.i18nTooltip));
    });
  }

  async function setLang(lang) {
    if (!supportedLang(lang) || lang === state.lang) return;
    try { await loadLang(lang); } catch (e) { console.error(e); return; }
    state.lang = lang;
    try { localStorage.setItem('cs:lang', lang); } catch (_) {}
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    applyI18n();
    syncLangButtons();
    render();
    document.dispatchEvent(new CustomEvent('cs:lang-changed', { detail: { lang } }));
  }

  function renderLangSwitch() {
    const host = $('.lang-switch');
    if (!host) return;
    host.setAttribute('aria-label', t('lang.label'));
    const options = I18N_AVAILABLE.map(l => {
      const flag = l.flag ? `${l.flag} ` : '';
      const label = `${flag}${l.name}`;
      return `<option value="${escapeHtml(l.code)}">${escapeHtml(label)}</option>`;
    }).join('');
    host.innerHTML = `
      <select class="lang-select" id="lang-select" aria-label="${escapeHtml(t('lang.label'))}">
        ${options}
      </select>
      <svg class="icon lang-chev" aria-hidden="true"><use href="#i-chevron-down"></use></svg>
    `;
    const sel = $('#lang-select', host);
    sel.addEventListener('change', (e) => setLang(e.target.value));
  }

  function syncLangButtons() {
    const sel = $('#lang-select');
    if (sel && sel.value !== state.lang) sel.value = state.lang;
  }

  // Expose for external callers
  window.CSI18N = {
    t, setLang, applyI18n,
    getLang: () => state.lang,
    getAvailable: () => [...I18N_AVAILABLE],
  };

  // ----- Boot -----
  async function boot() {
    try {
      await loadLangIndex();
    } catch (e) {
      console.error('i18n index failed to load', e);
      I18N_AVAILABLE = [{ code: 'pt-br', name: 'Português', short: 'PT', flag: '🇧🇷' }];
      I18N_DEFAULT = 'pt-br';
    }
    state.lang = detectLang();
    try {
      await loadLang(state.lang);
    } catch (e) {
      console.error(`i18n dict for ${state.lang} failed, falling back to ${I18N_DEFAULT}`, e);
      if (state.lang !== I18N_DEFAULT) {
        state.lang = I18N_DEFAULT;
        try { await loadLang(I18N_DEFAULT); } catch (_) {}
      }
    }
    document.documentElement.setAttribute('lang', state.lang);
    document.documentElement.setAttribute('data-lang', state.lang);
    renderLangSwitch();
    applyI18n();
    syncLangButtons();
    load();
  }

  boot();
})();
