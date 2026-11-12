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

  // How the resume command is handed over. 'ask' pops the chooser every time.
  const COPY_MODES = ['terminal', 'inline', 'ask'];
  function loadCopyMode() {
    try {
      const v = localStorage.getItem('cs:copyMode');
      if (COPY_MODES.includes(v)) return v;
    } catch (_) {}
    return 'terminal';
  }

  const state = {
    sessions: [],
    filter: 'all',       // all | favorites | trash
    project: null,       // cwd of active project, null = all
    query: '',
    sort: localStorage.getItem('cs:sort') || 'recent',
    copyMode: loadCopyMode(),   // terminal | inline | ask
    lang: null,          // resolved after loading i18n/index.json
    editing: null,
    moving: null,        // { ids: [...], target: cwd-string|null }
    collapsed: new Set(loadCollapsed()),
    selected: new Set(), // session IDs in bulk selection
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
  // Warn once per page load, not on every refresh/move.
  let metaErrorReported = false;

  async function fetchSessions() {
    const res = await fetch(`${API}/sessions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Sessions still list when metadata.json can't be read, but the missing
    // names would otherwise look like the user never wrote any. Say it out loud.
    if (data.meta_error && !metaErrorReported) {
      metaErrorReported = true;
      toast(t('toast.error', { msg: escapeHtml(data.meta_error) }), 'error', { duration: 8000 });
    }
    if (data.auto_trashed > 0) {
      const n = data.auto_trashed;
      toast(t(n === 1 ? 'toast.autoTrashed.one' : 'toast.autoTrashed.many', { n }), '', { duration: 6000, icon: 'trash' });
    }
    return data.sessions || [];
  }

  async function patchSession(id, patch) {
    const res = await fetch(`${API}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch (_) {}
      throw new Error(msg);
    }
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

  async function fetchSettings() {
    const res = await fetch(`${API}/settings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function saveSettings(patch) {
    const res = await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch (_) {}
      throw new Error(msg);
    }
    return res.json();
  }

  async function moveSession(id, targetCwd) {
    const res = await fetch(`${API}/sessions/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_cwd: targetCwd }),
    });
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
    const iconName = opts.icon || (type === 'success' ? 'check' : type === 'error' ? 'alert' : 'copy');
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

  // ----- Dropdown: progressive enhancement over a native <select> -----
  // The <select> stays in the DOM as the source of truth, so applyI18n keeps
  // translating its <option>s and existing 'change' listeners keep firing:
  // choosing an item just writes select.value and dispatches 'change'.
  const ddInstances = [];
  const ddOpen = new Set();
  let ddSeq = 0;

  function enhanceSelect(select, { icon: leadIcon, align = 'left', hints = {} } = {}) {
    if (!select || select.dataset.ddEnhanced) return null;
    select.dataset.ddEnhanced = '1';
    select.classList.add('dd-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    const panelId = `dd-panel-${++ddSeq}`;
    const dd = document.createElement('div');
    dd.className = 'dd';
    dd.dataset.open = 'false';
    dd.innerHTML = `
      <!-- role=button, not combobox: focus moves into the listbox on open, and
           the combobox pattern expects focus to stay put with
           aria-activedescendant. Matching the role to the actual interaction
           is what screen readers announce correctly. -->
      <button class="dd-trigger" type="button" aria-haspopup="listbox"
              aria-expanded="false" aria-controls="${panelId}">
        ${leadIcon ? `<svg class="icon dd-lead" aria-hidden="true"><use href="#i-${leadIcon}"></use></svg>` : ''}
        <span class="dd-value"></span>
        <svg class="icon dd-chev" aria-hidden="true"><use href="#i-chevron-down"></use></svg>
      </button>
      <div class="dd-panel" id="${panelId}" role="listbox" hidden></div>
    `;
    select.parentNode.insertBefore(dd, select.nextSibling);
    const trigger = $('.dd-trigger', dd);
    const panel = $('.dd-panel', dd);

    function sync() {
      const current = select.selectedOptions[0];
      // The visible label sits in a grid cell shared with one hidden ghost per
      // option, so the cell is always as wide as the longest one and the
      // trigger stops resizing every time the selection changes. Measuring in
      // JS would race the async webfont; CSS re-fits itself when it lands.
      $('.dd-value', dd).innerHTML = `
        <span class="dd-value-text">${escapeHtml(current ? current.textContent : '')}</span>
        ${[...select.options].map(o =>
          `<span class="dd-value-ghost" aria-hidden="true">${escapeHtml(o.textContent)}</span>`).join('')}
      `;
      trigger.setAttribute('aria-label', select.getAttribute('aria-label') || '');
      panel.innerHTML = [...select.options].map(o => `
        <button class="dd-option" type="button" role="option" tabindex="-1"
                data-value="${escapeHtml(o.value)}" aria-selected="${o.value === select.value}">
          <svg class="icon dd-check" aria-hidden="true"><use href="#i-check"></use></svg>
          <span class="dd-option-label">${escapeHtml(o.textContent)}</span>
          ${hints[o.value] ? `<code class="dd-option-hint">${escapeHtml(hints[o.value])}</code>` : ''}
        </button>
      `).join('');
    }

    function place() {
      const r = trigger.getBoundingClientRect();
      panel.hidden = false;
      panel.style.minWidth = `${r.width}px`;
      const m = 8;
      // clientWidth/clientHeight, not innerWidth/innerHeight: a fixed element
      // is anchored to the viewport *inside* the scrollbar, while innerWidth
      // counts the scrollbar, and the difference shifts the panel by its width.
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      // Cap the width here rather than in CSS: a `100vw` cap would include the
      // scrollbar gutter that clientWidth excludes, and the two disagreeing is
      // what lets the panel spill past the edge on a very narrow window.
      // Must precede the measurement below, or w/h describe the uncapped box.
      panel.style.maxWidth = `${Math.min(340, vw - m * 2)}px`;
      // offsetWidth/offsetHeight rather than getBoundingClientRect: the panel
      // plays a scale-in animation, and the rect reports the mid-animation
      // size, and positioning off that leaves the panel a few px adrift once it
      // settles.
      const w = panel.offsetWidth, h = panel.offsetHeight;
      if (align === 'right') {
        // Anchor by the right edge, so the panel's width never enters the
        // maths and it cannot drift past the edge of the screen.
        panel.style.left = 'auto';
        panel.style.right = `${Math.max(m, vw - r.right)}px`;
      } else {
        panel.style.right = 'auto';
        panel.style.left = `${Math.max(m, Math.min(r.left, vw - w - m))}px`;
      }
      // Flip above when there is no room below. This is what lets the
      // language picker at the bottom of the sidebar open upwards.
      let top = r.bottom + 6;
      if (top + h > vh - m) top = r.top - h - 6;
      panel.style.top = `${Math.max(m, top)}px`;
    }

    function open() {
      if (dd.dataset.open === 'true') return;
      sync();
      place();
      dd.dataset.open = 'true';
      trigger.setAttribute('aria-expanded', 'true');
      ddOpen.add(api);
      // preventScroll: the panel is position:fixed, so scrolling it into view
      // is pointless, and the scroll it fires is exactly what dismisses the
      // panel below.
      ($('.dd-option[aria-selected="true"]', panel) || panel.firstElementChild)
        ?.focus({ preventScroll: true });
      // Scrolling dismisses the panel. Arming a frame late is load-bearing:
      // anything the act of opening emits (the focus above, the browser
      // restoring scroll position right after load) would otherwise close the
      // panel the instant it appeared. Listeners live only while it is open.
      requestAnimationFrame(() => {
        if (dd.dataset.open !== 'true') return;
        window.addEventListener('scroll', onDismiss, true);
        window.addEventListener('resize', onDismiss);
      });
    }

    function onDismiss() { close(false); }

    function close(refocus) {
      if (dd.dataset.open !== 'true') return;
      dd.dataset.open = 'false';
      trigger.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      ddOpen.delete(api);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
      if (refocus) trigger.focus({ preventScroll: true });
    }

    function choose(value) {
      if (value == null) return;
      if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
      close(true);
    }

    function move(where) {
      const items = $$('.dd-option', panel);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      const next = where === 'home' ? 0
        : where === 'end' ? items.length - 1
        : i < 0 ? 0
        : (i + (where === 'next' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }

    trigger.addEventListener('click', () => (dd.dataset.open === 'true' ? close(true) : open()));
    trigger.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
    });
    panel.addEventListener('click', (e) => {
      const opt = e.target.closest('.dd-option');
      if (opt) choose(opt.dataset.value);
    });
    panel.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); move('next'); break;
        case 'ArrowUp':   e.preventDefault(); move('prev'); break;
        case 'Home':      e.preventDefault(); move('home'); break;
        case 'End':       e.preventDefault(); move('end');  break;
        case 'Enter':
        case ' ':         e.preventDefault(); choose(document.activeElement?.dataset?.value); break;
        // stopPropagation so Esc doesn't also run the global chain (clear
        // selection, close a modal) while a dropdown is what's open.
        case 'Escape':    e.stopPropagation(); close(true); break;
        case 'Tab':       close(false); break;
      }
    });

    const api = { sync, close, el: dd, trigger };
    ddInstances.push(api);
    sync();
    return api;
  }

  function syncDropdowns() { ddInstances.forEach(d => d.sync()); }

  // Click-outside is safe as a permanent listener: at mousedown time on the
  // trigger the panel is still shut, so it can't fight the opening click.
  document.addEventListener('mousedown', (e) => {
    [...ddOpen].forEach(d => { if (!d.el.contains(e.target)) d.close(false); });
  }, true);
  document.addEventListener('cs:lang-changed', syncDropdowns);

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

  // ----- Resume command -----
  // 'terminal' → pasted into a shell with Claude Code closed: starts a new
  //              session on this conversation.
  // 'inline'   → pasted into an already-open Claude Code: switches the running
  //              session over to this conversation.
  function resumeCommand(id, mode) {
    return mode === 'inline' ? `/resume ${id}` : `claude --resume ${id}`;
  }

  async function doCopy(s, mode, cardEl) {
    const cmd = resumeCommand(s.id, mode);
    const ok = await copyToClipboard(cmd);
    if (!ok) { toast(t('toast.copyFailed'), 'error'); return; }
    toast(t('toast.copied', { cmd: escapeHtml(cmd) }), 'success');
    if (cardEl) {
      cardEl.classList.add('copied');
      setTimeout(() => cardEl.classList.remove('copied'), 1200);
    }
  }

  // Resolves to 'terminal' | 'inline', or null when the user backs out.
  function askCopyMode(s) {
    return new Promise(resolve => {
      const modal = $('#copy-modal');
      // Show the real command for THIS session, not a placeholder.
      $$('[data-cmd]', modal).forEach(el => {
        el.textContent = resumeCommand(s.id, el.dataset.cmd);
      });
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      const first = $('.copy-option', modal);
      setTimeout(() => first && first.focus(), 20);

      const cleanup = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        modal.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey, true);
      };
      const onClick = (e) => {
        const opt = e.target.closest('.copy-option');
        if (opt) { cleanup(); resolve(opt.dataset.mode); return; }
        if (e.target.closest('[data-copy-close]')) { cleanup(); resolve(null); }
      };
      // Capture + stopPropagation so the global Esc chain doesn't also fire.
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); cleanup(); resolve(null); }
      };
      modal.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey, true);
    });
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

    if (state.selected.has(s.id)) classes.push('selected');

    const selectBtn = `<button class="card-select" data-action="select" type="button" aria-pressed="${state.selected.has(s.id)}" aria-label="${escapeHtml(t('card.action.select'))}" data-tooltip="${escapeHtml(t('card.action.select'))}">${icon('check')}</button>`;

    // Full title for the hover tooltip. It reveals the complete name when the
    // visible title is clamped to 2 lines (or the preview is truncated).
    const fullTitle = displayName || truncate(preview, 300) || t('card.untitled');
    const titleHtml = displayName
      ? `<div class="card-title" data-tooltip="${escapeHtml(fullTitle)}">${escapeHtml(displayName)}</div>`
      : `<div class="card-title unnamed" data-tooltip="${escapeHtml(fullTitle)}">${escapeHtml(truncate(preview, 140) || t('card.untitled'))}</div>`;

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
    const copyTip = state.copyMode === 'ask'
      ? t('card.action.copyAsk')
      : t('card.action.copy', { cmd: resumeCommand(s.id, state.copyMode) });
    const actions = s.deleted
      ? `
        <button class="card-action success" data-action="restore" data-tooltip="${escapeHtml(t('card.action.restore'))}" aria-label="${escapeHtml(t('card.action.restore'))}">${icon('rotate')}</button>
        <button class="card-action danger" data-action="purge" data-tooltip="${escapeHtml(t('card.action.purge'))}" aria-label="${escapeHtml(t('card.action.purge'))}">${icon('x')}</button>
      `
      : `
        <button class="card-action primary" data-action="copy" data-tooltip="${escapeHtml(copyTip)}">${icon('copy')}${escapeHtml(t('card.action.copyLabel'))}</button>
        <button class="card-action fav ${s.favorite ? 'on' : ''}" data-action="favorite" data-tooltip="${escapeHtml(favLabel)}" aria-label="${escapeHtml(favLabel)}">${icon(s.favorite ? 'star-filled' : 'star')}</button>
        <button class="card-action" data-action="edit" data-tooltip="${escapeHtml(t('card.action.edit'))}" aria-label="${escapeHtml(t('card.action.editAria'))}">${icon('edit')}</button>
        <button class="card-action" data-action="move" data-tooltip="${escapeHtml(t('card.action.move'))}" aria-label="${escapeHtml(t('card.action.move'))}">${icon('move')}</button>
        <button class="card-action danger" data-action="delete" data-tooltip="${escapeHtml(t('card.action.delete'))}" aria-label="${escapeHtml(t('card.action.delete'))}">${icon('trash')}</button>
      `;

    return `
      <article class="${classes.join(' ')}" data-id="${s.id}" tabindex="0" role="button" aria-label="${escapeHtml(displayName || truncate(preview, 60) || s.id)}">
        ${selectBtn}
        <div class="card-head">${titleHtml}</div>
        ${descHtml}
        <span class="card-id" data-tooltip="${escapeHtml(s.id)}">${escapeHtml(s.id)}</span>
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
      // Strip the trailing "/<short>" by length, not by RegExp: a folder named
      // "c++" or "a(b" would blow up new RegExp() and take the whole render
      // down with it.
      const full = prettyCwd(cwd, folder);
      const suffix = `/${short}`;
      const rest = full.endsWith(suffix) ? full.slice(0, -suffix.length) : full;
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

  function render() { pruneSelection(); renderSidebar(); renderContent(); renderBulkBar(); renderEmptyTrashBtn(); }

  // Drop selected IDs that no longer exist or are not visible under current filter
  function pruneSelection() {
    if (!state.selected.size) return;
    const visibleIds = new Set(state.sessions.filter(baseVisible).map(s => s.id));
    for (const id of [...state.selected]) {
      if (!visibleIds.has(id)) state.selected.delete(id);
    }
  }

  function selectionItems() {
    return [...state.selected]
      .map(id => state.sessions.find(s => s.id === id))
      .filter(Boolean);
  }

  function clearSelection() {
    if (!state.selected.size) return;
    state.selected.clear();
    render();
  }

  function toggleSelect(id) {
    if (state.selected.has(id)) state.selected.delete(id);
    else state.selected.add(id);
    render();
  }

  function renderBulkBar() {
    const n = state.selected.size;
    document.body.classList.toggle('has-selection', n > 0);
    if (!n) return;
    const items = selectionItems();
    $('#bulk-n').textContent = String(n);
    $('#bulk-noun').textContent = n === 1 ? t('bulk.count.singular') : t('bulk.count.plural');
    const inTrash = state.filter === 'trash';
    $('#bulk-fav').hidden = inTrash;
    $('#bulk-move').hidden = inTrash;
    $('#bulk-trash').hidden = inTrash;
    $('#bulk-restore').hidden = !inTrash;
    $('#bulk-purge').hidden = !inTrash;
    if (!inTrash) {
      const allFav = items.length > 0 && items.every(s => s.favorite);
      $('#bulk-fav-label').textContent = allFav ? t('bulk.unfavorite') : t('bulk.favorite');
    }
  }

  // ----- Bulk actions -----
  async function bulkFavorite() {
    const items = selectionItems();
    if (!items.length) return;
    const allFav = items.every(s => s.favorite);
    const next = !allFav;
    try {
      await Promise.all(items.map(s => patchSession(s.id, { favorite: next })));
      items.forEach(s => { s.favorite = next; });
      render();
      toast(t(next ? 'toast.bulk.favorited' : 'toast.bulk.unfavorited', { n: items.length }), 'success');
    } catch (e) {
      toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
    }
  }

  async function bulkTrash() {
    const items = selectionItems();
    if (!items.length) return;
    const ok = await confirmDialog({
      title: t('confirm.bulkTrash.title', { n: items.length }),
      message: t('confirm.bulkTrash.msg'),
      confirmLabel: t('confirm.bulkTrash.btn'),
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await Promise.all(items.map(s => patchSession(s.id, { deleted: true })));
      items.forEach(s => { s.deleted = true; });
      state.selected.clear();
      render();
      toast(t('toast.bulk.trashed', { n: items.length }), 'success');
    } catch (e) {
      toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
    }
  }

  async function bulkRestore() {
    const items = selectionItems();
    if (!items.length) return;
    try {
      await Promise.all(items.map(s => patchSession(s.id, { deleted: false })));
      items.forEach(s => { s.deleted = false; });
      state.selected.clear();
      render();
      toast(t('toast.bulk.restored', { n: items.length }), 'success');
    } catch (e) {
      toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
    }
  }

  async function bulkPurge() {
    await purgeSessions(selectionItems());
  }

  // Empties the trash as currently scoped: with no project or search filter
  // that is the whole trash, otherwise only what the user is looking at.
  async function emptyTrash() {
    if (state.filter !== 'trash') return;
    await purgeSessions(visibleSessions());
  }

  function renderEmptyTrashBtn() {
    const btn = $('#empty-trash');
    btn.hidden = state.filter !== 'trash' || visibleSessions().length === 0;
  }

  async function purgeSessions(items) {
    if (!items.length) return;
    const ok = await confirmDialog({
      title: t('confirm.bulkPurge.title', { n: items.length }),
      message: t('confirm.bulkPurge.msg'),
      confirmLabel: t('confirm.bulkPurge.btn'),
      variant: 'danger',
    });
    if (!ok) return;
    const results = await Promise.allSettled(items.map(s => deleteSession(s.id)));
    const okIds = new Set();
    results.forEach((r, i) => { if (r.status === 'fulfilled') okIds.add(items[i].id); });
    state.sessions = state.sessions.filter(s => !okIds.has(s.id));
    state.selected.clear();
    render();
    const failed = results.length - okIds.size;
    if (failed) toast(t('toast.bulk.purgedPartial', { ok: okIds.size, fail: failed }), 'error');
    else toast(t('toast.bulk.purged', { n: okIds.size }), 'success');
  }

  function bulkMove() {
    const ids = [...state.selected];
    if (!ids.length) return;
    openMoveModal(ids);
  }

  // ----- Move modal -----
  function moveCandidates() {
    if (!state.moving) return [];
    const items = state.moving.ids
      .map(id => state.sessions.find(s => s.id === id))
      .filter(Boolean);
    const sourceCwds = new Set(items.map(s => s.cwd).filter(Boolean));
    // Only exclude when all sources share one project. For mixed selections we
    // still let the user consolidate into one of the source projects.
    const exclude = sourceCwds.size === 1 ? sourceCwds : new Set();
    const m = new Map();
    for (const s of state.sessions) {
      if (s.deleted) continue;
      const cwd = s.cwd;
      if (!cwd || exclude.has(cwd)) continue;
      if (!m.has(cwd)) m.set(cwd, { cwd, count: 0 });
      m.get(cwd).count += 1;
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }

  function openMoveModal(ids) {
    if (!ids || !ids.length) return;
    state.moving = { ids: [...ids], target: null };
    const items = ids.map(id => state.sessions.find(s => s.id === id)).filter(Boolean);
    const sourceCwds = [...new Set(items.map(s => s.cwd).filter(Boolean))];
    $('#move-title').textContent = ids.length === 1
      ? t('move.title')
      : t('move.titleBulk', { n: ids.length });
    if (sourceCwds.length === 1) {
      $('#move-intro').innerHTML = t('move.intro.from', { from: `<code>${escapeHtml(prettyCwd(sourceCwds[0]))}</code>` });
    } else {
      $('#move-intro').textContent = t('move.intro.mixed');
    }
    $('#move-search').value = '';
    $('#move-confirm').disabled = true;
    renderMoveList();
    $('#move-modal').classList.remove('hidden');
    $('#move-modal').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#move-search').focus(), 30);
  }

  function renderMoveList(query = '') {
    const q = query.trim().toLowerCase();
    const all = moveCandidates();
    const list = q
      ? all.filter(p => (p.cwd + ' ' + (projectShortName(p.cwd) || '')).toLowerCase().includes(q))
      : all;
    const host = $('#move-list');
    if (!list.length) {
      host.innerHTML = `<div class="move-empty">${escapeHtml(t('move.empty'))}</div>`;
      return;
    }
    host.innerHTML = list.map(p => {
      const sel = state.moving && state.moving.target === p.cwd ? 'selected' : '';
      return `
        <button class="move-item ${sel}" type="button" role="option" data-cwd="${escapeHtml(p.cwd)}" aria-selected="${!!sel}">
          ${icon('folder')}
          <span class="name">${escapeHtml(projectShortName(p.cwd))}</span>
          <span class="path">${escapeHtml(prettyCwd(p.cwd))}</span>
          <span class="count">${p.count}</span>
        </button>
      `;
    }).join('');
  }

  function closeMoveModal() {
    state.moving = null;
    $('#move-modal').classList.add('hidden');
    $('#move-modal').setAttribute('aria-hidden', 'true');
  }

  async function confirmMove() {
    const m = state.moving;
    if (!m || !m.target || !m.ids.length) return;
    const target = m.target;
    const ids = [...m.ids];
    closeMoveModal();
    const results = await Promise.allSettled(ids.map(id => moveSession(id, target)));
    const okIds = new Set();
    results.forEach((r, i) => { if (r.status === 'fulfilled') okIds.add(ids[i]); });
    state.selected.clear();
    try { state.sessions = await fetchSessions(); } catch (_) {}
    render();
    const failed = results.length - okIds.size;
    if (failed && !okIds.size) {
      const firstErr = results.find(r => r.status === 'rejected');
      toast(t('toast.error', { msg: escapeHtml(firstErr?.reason?.message || 'move failed') }), 'error');
    } else if (failed) {
      toast(t('toast.bulk.movedPartial', { ok: okIds.size, fail: failed }), 'error');
    } else if (okIds.size > 1) {
      toast(t('toast.bulk.moved', { n: okIds.size }), 'success');
    } else {
      toast(t('toast.moved'), 'success');
    }
  }

  // ----- Actions -----
  async function handleAction(action, s, cardEl) {
    if (action === 'select') {
      toggleSelect(s.id);
      return;
    }
    if (action === 'move') {
      openMoveModal([s.id]);
      return;
    }
    if (action === 'copy') {
      const mode = state.copyMode === 'ask' ? await askCopyMode(s) : state.copyMode;
      if (!mode) return;   // chooser dismissed, copy nothing
      await doCopy(s, mode, cardEl);
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

  // ----- Settings modal -----
  // Mirrors the backend rule in apply_auto_trash, for the live preview only.
  function autoTrashCandidates(days) {
    if (!days) return 0;
    const cutoff = Date.now() / 1000 - days * 86400;
    return state.sessions.filter(s =>
      !s.deleted && !s.favorite && (s.inactive_since || s.mtime) < cutoff
    ).length;
  }

  function renderAutoTrashPreview() {
    const days = Number($('#auto-trash-days').value) || 0;
    const el = $('#auto-trash-preview');
    if (!days) { el.hidden = true; return; }
    const n = autoTrashCandidates(days);
    el.hidden = false;
    el.classList.toggle('has-hits', n > 0);
    el.textContent = n === 0 ? t('settings.autoTrash.previewNone')
      : t(n === 1 ? 'settings.autoTrash.previewOne' : 'settings.autoTrash.previewMany', { n });
  }

  async function openSettings() {
    let current;
    try { current = await fetchSettings(); }
    catch (e) { toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error'); return; }
    const sel = $('#auto-trash-days');
    const days = String(current.auto_trash_days || 0);
    // A value set by hand in settings.json may not be one of the presets.
    if (![...sel.options].some(o => o.value === days)) {
      const opt = document.createElement('option');
      opt.value = days;
      opt.textContent = t('settings.autoTrash.custom', { n: days });
      sel.appendChild(opt);
    }
    sel.value = days;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    renderAutoTrashPreview();
    $('#settings-modal').classList.remove('hidden');
    $('#settings-modal').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#settings-modal .dd-trigger, #auto-trash-days')?.focus(), 30);
  }

  function closeSettings() {
    $('#settings-modal').classList.add('hidden');
    $('#settings-modal').setAttribute('aria-hidden', 'true');
  }

  async function submitSettings() {
    const days = Number($('#auto-trash-days').value) || 0;
    const btn = $('#settings-save');
    btn.disabled = true;
    try {
      await saveSettings({ auto_trash_days: days });
      closeSettings();
      toast(days ? t('toast.settings.savedOn', { n: days }) : t('toast.settings.savedOff'), 'success');
      // Apply the new rule right away instead of on the next refresh.
      state.sessions = await fetchSessions();
      render();
    } catch (e) {
      toast(t('toast.error', { msg: escapeHtml(e.message) }), 'error');
    } finally {
      btn.disabled = false;
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

    // Close move modal
    if (ev.target.closest('[data-move-close]')) { closeMoveModal(); return; }

    // Close settings modal
    if (ev.target.closest('[data-settings-close]')) { closeSettings(); return; }

    // Move list item selection
    const moveItem = ev.target.closest('.move-item');
    if (moveItem && state.moving) {
      state.moving.target = moveItem.dataset.cwd;
      $$('.move-item', $('#move-list')).forEach(el => {
        el.classList.toggle('selected', el === moveItem);
        el.setAttribute('aria-selected', el === moveItem ? 'true' : 'false');
      });
      $('#move-confirm').disabled = false;
      return;
    }

    // Sidebar: filter
    const filterBtn = ev.target.closest('.nav-item[data-filter]');
    if (filterBtn) {
      state.filter = filterBtn.dataset.filter;
      state.project = null;
      state.selected.clear();
      document.body.classList.remove('sidebar-open');
      render();
      return;
    }

    // Sidebar: project
    const projectBtn = ev.target.closest('.nav-item[data-project]');
    if (projectBtn) {
      const key = projectBtn.dataset.project;
      state.project = state.project === key ? null : key;
      state.selected.clear();
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
    if (actionBtn) ev.stopPropagation();
    // In selection mode, clicking the card body (not an action button) toggles selection
    let action;
    if (actionBtn) {
      action = actionBtn.dataset.action;
    } else if (state.selected.size > 0) {
      action = 'select';
    } else {
      action = 'copy';
    }
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
      if (!$('#move-modal').classList.contains('hidden')) { closeMoveModal(); return; }
      if (!$('#settings-modal').classList.contains('hidden')) { closeSettings(); return; }
      if (!$('#modal').classList.contains('hidden')) { closeEditor(); return; }
      if (state.selected.size > 0) { clearSelection(); return; }
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

  // Copy-format selector (header)
  const copyModeSel = $('#copy-mode');
  if (copyModeSel) {
    copyModeSel.value = state.copyMode;
    copyModeSel.addEventListener('change', (e) => {
      state.copyMode = COPY_MODES.includes(e.target.value) ? e.target.value : 'terminal';
      try { localStorage.setItem('cs:copyMode', state.copyMode); } catch (_) {}
      renderContent();   // the copy button's tooltip spells out the mode
    });
  }

  $('#edit-save').addEventListener('click', saveEditor);

  // Bulk bar
  $('#bulk-fav').addEventListener('click', bulkFavorite);
  $('#bulk-move').addEventListener('click', bulkMove);
  $('#bulk-trash').addEventListener('click', bulkTrash);
  $('#bulk-restore').addEventListener('click', bulkRestore);
  $('#bulk-purge').addEventListener('click', bulkPurge);
  $('#empty-trash').addEventListener('click', emptyTrash);
  $('#settings-btn').addEventListener('click', openSettings);
  $('#settings-save').addEventListener('click', submitSettings);
  $('#auto-trash-days').addEventListener('change', renderAutoTrashPreview);
  $('#bulk-clear').addEventListener('click', clearSelection);

  // Move modal
  $('#move-confirm').addEventListener('click', confirmMove);
  $('#move-search').addEventListener('input', (e) => renderMoveList(e.target.value));

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
    host.innerHTML = `<select id="lang-select" aria-label="${escapeHtml(t('lang.label'))}">${options}</select>`;
    const sel = $('#lang-select', host);
    sel.value = state.lang;
    sel.addEventListener('change', (e) => setLang(e.target.value));
    enhanceSelect(sel);
  }

  function setupDropdowns() {
    enhanceSelect($('#copy-mode'), {
      icon: 'copy',
      align: 'right',   // it sits at the far edge of the header
      hints: { terminal: 'claude --resume', inline: '/resume' },
    });
    enhanceSelect($('#sort-select'), { icon: 'sort' });
    enhanceSelect($('#auto-trash-days'), { icon: 'clock', align: 'right' });
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

  // ----- Update checker -----
  const GITHUB_REPO = 'krugerrgabriel/claude-sessions-manager';
  const UPDATE_CMD = 'cd claude-sessions-manager && git pull && sudo ./install.sh';
  const UPDATE_CACHE_KEY = 'cs:updateCheck';
  const UPDATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

  async function fetchLocalVersion() {
    try {
      const res = await fetch('VERSION', { cache: 'no-store' });
      if (!res.ok) return null;
      return (await res.text()).trim().replace(/^v/i, '');
    } catch (_) { return null; }
  }

  async function fetchLatestRelease() {
    try {
      const cached = JSON.parse(localStorage.getItem(UPDATE_CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < UPDATE_CACHE_TTL_MS) return cached.tag;
    } catch (_) {}
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!res.ok) return null;
      const json = await res.json();
      const tag = String(json.tag_name || '').trim().replace(/^v/i, '');
      if (!tag) return null;
      try { localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify({ ts: Date.now(), tag })); } catch (_) {}
      return tag;
    } catch (_) { return null; }
  }

  function semverGt(a, b) {
    const pa = a.split('.').map(n => parseInt(n, 10) || 0);
    const pb = b.split('.').map(n => parseInt(n, 10) || 0);
    const max = Math.max(pa.length, pb.length);
    for (let i = 0; i < max; i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }

  async function checkForUpdates() {
    const btn = $('#update-btn');
    if (!btn) return;
    const badge = $('.update-badge', btn);
    btn.setAttribute('data-tooltip', t('update.checking'));
    const [local, latest] = await Promise.all([fetchLocalVersion(), fetchLatestRelease()]);
    btn.dataset.local = local || '';
    btn.dataset.latest = latest || '';
    if (!local || !latest) {
      btn.dataset.state = 'error';
      btn.setAttribute('data-tooltip', t('update.error'));
      return;
    }
    if (semverGt(latest, local)) {
      btn.dataset.state = 'outdated';
      btn.classList.add('outdated');
      badge.classList.remove('hidden');
      btn.setAttribute('data-tooltip', t('update.available', { local, latest }));
    } else {
      btn.dataset.state = 'upToDate';
      btn.classList.remove('outdated');
      badge.classList.add('hidden');
      btn.setAttribute('data-tooltip', t('update.upToDate', { local }));
    }
  }

  // Opens when the update cannot be finished from here. `body` swaps the
  // explanation between "this release needs the installer" and an outright
  // failure; `detail` carries raw git/OS output, untranslated because it is
  // diagnostic.
  function openManualModal({ command, detail, body }) {
    const modal = $('#manual-modal');
    $('#manual-command').textContent = command || UPDATE_CMD;
    $('#manual-body').textContent = body || t('update.manual.body');
    const wrap = $('#manual-detail-wrap');
    wrap.hidden = !detail;
    wrap.open = false;
    $('#manual-detail').textContent = detail || '';

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#manual-copy').focus(), 20);

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey, true);
    };
    const onClick = async (e) => {
      if (e.target.closest('#manual-copy')) {
        const cmd = $('#manual-command').textContent;
        const ok = await copyToClipboard(cmd);
        toast(ok ? t('toast.copied', { cmd: escapeHtml(cmd) }) : t('toast.copyFailed'),
              ok ? 'success' : 'error');
        return;
      }
      if (e.target.closest('[data-manual-close]')) cleanup();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cleanup(); } };
    modal.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey, true);
  }

  async function runSelfUpdate(btn) {
    btn.classList.add('spinning');
    btn.setAttribute('data-tooltip', t('update.applying'));
    tooltip.hide();
    let data = null;
    try {
      const res = await fetch(`${API}/update`, {
        method: 'POST',
        // Custom header: it cannot be sent cross-origin without a CORS
        // preflight the server never answers, so no other site can fire this.
        headers: { 'X-CS-Update': '1' },
      });
      data = await res.json();
    } catch (e) {
      data = { ok: false, reason: 'network', detail: e.message };
    } finally {
      btn.classList.remove('spinning');
    }

    if (data && data.ok) {
      toast(t('update.done', { v: escapeHtml(data.version || '') }), 'success', { duration: 3000 });
      // The new files are already in place; the reload is what picks them up.
      setTimeout(() => location.reload(), 1200);
      return;
    }
    openManualModal({
      command: data && data.command,
      detail: data && data.detail,
      body: data && data.reason === 'installer' ? null : t('update.manual.bodyFailed'),
    });
  }

  function wireUpdateButton() {
    const btn = $('#update-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('spinning')) return;
      const state = btn.dataset.state;
      const local = btn.dataset.local || '?';
      if (state === 'outdated') {
        await runSelfUpdate(btn);
      } else if (state === 'upToDate') {
        toast(t('update.upToDate', { local }), 'success');
      } else {
        toast(t('update.error'), 'error');
      }
    });
  }

  // ----- What's New -----
  const WHATSNEW_SEEN = 'cs:whatsNewSeen';        // version whose notes were opened
  const WHATSNEW_GREETED = 'cs:whatsNewGreeted';  // version that already got the loud state

  // Minimal markdown, covering the subset GitHub release notes actually use.
  // Every fragment is escaped BEFORE any tag is introduced, so nothing in the
  // notes can inject markup, and links are restricted to http(s).
  function renderMarkdown(md) {
    const inline = (s) => escapeHtml(s)
      .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`);

    const out = [];
    let para = [], list = null, code = null;
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
    const flushList = () => {
      if (list) { out.push(`<ul>${list.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`); list = null; }
    };

    for (const raw of String(md || '').replace(/\r\n/g, '\n').split('\n')) {
      if (code !== null) {
        if (/^\s*```/.test(raw)) { out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = null; }
        else code.push(raw);
        continue;
      }
      if (/^\s*```/.test(raw)) { flushPara(); flushList(); code = []; continue; }
      const h = raw.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara(); flushList();
        const lvl = Math.min(Math.max(h[1].length, 2), 4);
        out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
        continue;
      }
      if (/^\s*(---+|\*\*\*+)\s*$/.test(raw)) { flushPara(); flushList(); out.push('<hr>'); continue; }
      const li = raw.match(/^\s*[-*]\s+(.*)$/);
      if (li) { flushPara(); (list = list || []).push(li[1]); continue; }
      if (!raw.trim()) { flushPara(); flushList(); continue; }
      // An indented line under a bullet continues that bullet.
      if (list) { list[list.length - 1] += ' ' + raw.trim(); continue; }
      para.push(raw.trim());
    }
    if (code !== null) out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
    flushPara(); flushList();
    return out.join('');
  }

  // Notes ship with the app, one file per language, so they arrive in the
  // language the user picked and work with no network at all. The GitHub
  // release body is the last resort, for a version whose notes were never
  // shipped alongside it.
  async function fetchReleaseNotes(version, lang) {
    const releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${version}`;
    for (const code of [lang, 'en']) {
      if (!code) continue;
      try {
        const res = await fetch(`notes/${encodeURIComponent(version)}/${encodeURIComponent(code)}.md`);
        if (!res.ok) continue;
        const body = await res.text();
        if (body.trim()) return { version, lang: code, body, url: releaseUrl };
      } catch (_) { /* fall through to the next source */ }
    }
    // Tag naming is not consistent across this repo's history (1.3.1, v1.4.0),
    // so try both spellings before giving up.
    for (const tag of [`v${version}`, version]) {
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`);
        if (!res.ok) continue;
        const j = await res.json();
        return { version, lang: 'en', body: j.body || '', url: j.html_url || releaseUrl };
      } catch (_) { /* try the next spelling */ }
    }
    return null;
  }

  // quiet  = already read
  // loud   = first page load on a freshly installed version
  // subtle = unread, but the loud greeting already happened on an earlier load
  function whatsNewState(version) {
    if (!version) return 'quiet';
    try {
      if (localStorage.getItem(WHATSNEW_SEEN) === version) return 'quiet';
      if (localStorage.getItem(WHATSNEW_GREETED) !== version) {
        // Claim the greeting now, so the next refresh already finds it claimed.
        localStorage.setItem(WHATSNEW_GREETED, version);
        return 'loud';
      }
      return 'subtle';
    } catch (_) { return 'quiet'; }
  }

  async function openWhatsNew(version) {
    const modal = $('#whatsnew-modal');
    const body = $('#whatsnew-body');
    const link = $('#whatsnew-link');
    $('#whatsnew-title').textContent = t('whatsNew.title', { v: version || '' });
    body.innerHTML = `<p class="whatsnew-state">${escapeHtml(t('whatsNew.loading'))}</p>`;
    link.href = `https://github.com/${GITHUB_REPO}/releases`;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Opening counts as reading: the marker never comes back for this version.
    try { localStorage.setItem(WHATSNEW_SEEN, version || ''); } catch (_) {}
    const btn = $('#whats-new-btn');
    if (btn) btn.dataset.state = 'quiet';

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey, true);
    };
    const onClick = (e) => { if (e.target.closest('[data-whatsnew-close]')) cleanup(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cleanup(); } };
    modal.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey, true);

    const data = await fetchReleaseNotes(version, state.lang);
    if (modal.classList.contains('hidden')) return;   // closed while loading
    body.innerHTML = data && data.body
      ? renderMarkdown(data.body)
      : `<p class="whatsnew-state">${escapeHtml(t('whatsNew.error'))}</p>`;
    if (data && data.url) link.href = data.url;
    body.scrollTop = 0;
    // Deliberately not focused: it is reachable with Tab for keyboard
    // scrolling, but focusing it on open paints a ring around the whole
    // article, which reads as an error state.
  }

  async function setupWhatsNew() {
    const btn = $('#whats-new-btn');
    if (!btn) return;
    const version = await fetchLocalVersion();
    btn.dataset.state = whatsNewState(version);
    btn.addEventListener('click', () => openWhatsNew(version));
  }

  // ----- First-run coach mark -----
  // Points at the copy-format picker once, the first time this build is
  // opened, and never again. The key is new, so existing users get it too.
  const COACH_KEY = 'cs:copyHintSeen';

  function coachSeen() {
    try { return localStorage.getItem(COACH_KEY) === '1'; } catch (_) { return true; }
  }

  function dismissCoach() {
    const el = $('#coach');
    if (!el || el.classList.contains('hidden')) return;
    el.classList.add('hidden');
    $('.dd', $('.copy-wrap'))?.classList.remove('coach-target');
    try { localStorage.setItem(COACH_KEY, '1'); } catch (_) {}
    document.removeEventListener('keydown', onCoachKey, true);
    document.removeEventListener('mousedown', onCoachOutside, true);
  }

  const onCoachKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); dismissCoach(); } };
  const onCoachOutside = (e) => {
    if (!$('#coach').contains(e.target)) dismissCoach();
  };

  function showCoach() {
    const el = $('#coach');
    const target = $('.dd', $('.copy-wrap'));
    if (!el || !target) return;

    target.classList.add('coach-target');
    el.classList.remove('hidden');

    // Same clamp-to-viewport technique as the tooltip singleton.
    const r = target.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const m = 10;
    const vw = document.documentElement.clientWidth;   // excludes the scrollbar
    let left = r.left + (r.width - box.width) / 2;
    left = Math.max(m, Math.min(left, vw - box.width - m));
    const top = r.bottom + 12;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    // Keep the arrow under the control even after the box got clamped.
    const arrowX = Math.max(12, Math.min(r.left + r.width / 2 - left - 6, box.width - 24));
    $('.coach-arrow', el).style.left = `${arrowX}px`;

    $('#coach-ok').addEventListener('click', dismissCoach, { once: true });
    document.addEventListener('keydown', onCoachKey, true);
    document.addEventListener('mousedown', onCoachOutside, true);
    // Touching the picker itself counts as "got it".
    $('#copy-mode')?.addEventListener('change', dismissCoach, { once: true });
  }

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
    applyI18n();          // must run before the dropdowns read their labels
    setupDropdowns();
    syncLangButtons();
    wireUpdateButton();
    setupWhatsNew();
    load();
    checkForUpdates();
    // After layout settles, so the balloon anchors to the final header position.
    if (!coachSeen()) setTimeout(showCoach, 500);
  }

  boot();
})();
