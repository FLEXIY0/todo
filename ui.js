// ── App meta ─────────────────────────────────────────────────
const APP_VERSION = '1.8';
const REPO_URL = 'https://github.com/FLEXIY0/todo';

// ── Material icons (Google standard, inline SVG, themeable) ──
// Bundled as path data so the app stays offline and dependency-free.
const MI = {
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z',
  forward: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  paste: 'M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
  list: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
  tree: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z',
  label: 'M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12z',
  power: 'M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4z',
  dns: 'M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm13-9H4c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1zM7 5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  wifi: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  restore: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z',
  share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z',
  open: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z',
  eco: 'M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z',
  palette: 'M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.16-.64-1.59-.4-.43-.61-.97-.61-1.91 0-1.38 1.12-2.5 2.5-2.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  history: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
};
// emoji currently passed around → Material icon name
const EMOJI_MI = {
  '✏️': 'edit', '🗑️': 'delete', '✓': 'check', '○': 'circle', '✕': 'close',
  '+': 'add', '←': 'back', '→': 'forward', '⧉': 'copy', '📋': 'copy', '⇪': 'paste',
  '≡': 'list', '∴': 'tree', '◦': 'label', '⏻': 'power', '⟳': 'sync', '🛰': 'dns',
  '📶': 'wifi', '⇣': 'download', '↺': 'restore', '✉': 'share', '↗': 'open',
  '🌿': 'eco', '◐': 'palette', '⚙': 'settings', '±': 'history', 'ⓘ': 'info',
};
function iconSvg(name) {
  const d = MI[name];
  return d ? `<svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>` : '';
}
// renders a sheet/menu glyph: a known emoji → Material SVG, else the text
function renderGlyph(g) {
  return EMOJI_MI[g] ? iconSvg(EMOJI_MI[g]) : esc(g || '');
}
// fill any [data-icon] element (e.g. drawer items) with its Material SVG
function fillIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = iconSvg(el.getAttribute('data-icon')); });
}

function openAbout() {
  closeDrawer();
  setTimeout(() => openSheet('About', [
    { icon: '🌿', label: `Simple Todo v${APP_VERSION}`, action: () => { } },
    { icon: '↗', label: 'Source code on GitHub', action: () => {
        const a = document.createElement('a');
        a.href = REPO_URL; a.target = '_blank'; a.rel = 'noopener';
        a.click();
      } },
  ]), 300);
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1700);
}

// ── Hardware back gesture ────────────────────────────────────
// A sentinel history entry absorbs the system back gesture: while any
// layer is open, back closes it (like a cancel) instead of minimizing
// the app. At the root the sentinel is gone and back exits as usual.
let backArmed = false;
function armBack() {
  if (!backArmed) {
    try { history.pushState({ st: 1 }, ''); backArmed = true; } catch (e) { }
  }
}
window.addEventListener('popstate', () => {
  backArmed = false;
  if (closeTopLayer()) armBack(); // consumed — re-arm for the next back
});
function closeTopLayer() {
  if (document.getElementById('dialogOverlay').classList.contains('active')) { closeDialog(); return true; }
  if (document.getElementById('sheetOverlay').classList.contains('active')) { closeSheet(); return true; }
  if (drawerOpen) { closeDrawer(); return true; }
  if (subtaskView) { closeSubtasks(); return true; }
  if (historyView) { closeHistory(); return true; }
  if (settingsView) { closeSettings(); return true; }
  if (themesView) { closeThemes(); return true; }
  if (connView) { closeConn(); return true; }
  if (spaceIndex > 0) { flipToSpace(0); return true; }
  return false;
}

// ── Theme & display ──────────────────────────────────────────
function applyTheme() { document.body.className = 'theme-' + state.theme; }

function setTheme(t) {
  state.theme = t;
  applyTheme();
  saveState();
  if (themesView) render(); // refresh the active check, stay on the screen
}

const FONT_SCALES = { s: 0.9, m: 1, l: 1.16 };
const FONT_FAMS = {
  system: 'Arial, Helvetica, sans-serif',
  mono: "'Courier New', Courier, monospace",
  serif: "Georgia, 'Times New Roman', serif",
};
function applyDisplay() {
  const s = state.settings;
  document.body.style.setProperty('--font-scale', FONT_SCALES[s.fontSize] || 1);
  document.body.style.setProperty('--app-font', FONT_FAMS[s.fontFamily] || FONT_FAMS.system);
}

// ── Drawer ───────────────────────────────────────────────────
const mainEl   = document.getElementById('main');
const maskEl   = document.getElementById('drawerMask');
const DRAWER_W = 240;
let drawerOpen = false, swTouchX = 0, swTouchY = 0, swDir = null, swActive = false, swBase = 0;

function applyOffset(x, anim) {
  const c = Math.max(0, Math.min(DRAWER_W, x));
  mainEl.classList.toggle('snap', !!anim);
  mainEl.style.transform = `translateX(${c}px)`;
}
function openDrawer(a)  { drawerOpen = true;  applyOffset(DRAWER_W, a !== false); maskEl.classList.add('active'); armBack(); }
function closeDrawer(a) { drawerOpen = false; applyOffset(0, a !== false);        maskEl.classList.remove('active'); }
function overlayOpen()  {
  return document.getElementById('sheetOverlay').classList.contains('active') ||
         document.getElementById('dialogOverlay').classList.contains('active');
}

maskEl.addEventListener('click', () => closeDrawer());

let pageDrag = 0, pageDragP = 0; // active page-flip swipe between spaces
let backDrag = false;            // active "back" peel out of a nested screen

function nestedView() { return subtaskView || historyView || settingsView || themesView || connView; }

document.addEventListener('touchstart', (e) => {
  if (overlayOpen()) return;
  swTouchX = e.touches[0].clientX; swTouchY = e.touches[0].clientY;
  swDir = null; swActive = false; swBase = drawerOpen ? DRAWER_W : 0;
}, { passive: true });

const clampP = v => Math.min(1, Math.max(0, v));

document.addEventListener('touchmove', (e) => {
  if (overlayOpen()) return;
  const dx = e.touches[0].clientX - swTouchX, dy = e.touches[0].clientY - swTouchY;
  if (!swDir) {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    swDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
  }
  if (swDir !== 'h') return;
  const span = window.innerWidth * 0.7;

  // ── continue an in-progress finger drag (check before re-deciding) ──
  if (backDrag) {
    e.preventDefault();
    pageDragP = clampP(dx / span);
    flipDragMove(pageDragP);
    return;
  }
  if (pageDrag) {
    e.preventDefault();
    pageDragP = clampP((pageDrag === 1 ? -dx : dx) / span);
    flipDragMove(pageDragP);
    return;
  }
  if (drawerOpen || swActive) {
    e.preventDefault(); swActive = true; applyOffset(swBase + dx, false);
    return;
  }

  // ── start a new gesture ──
  // nested screen: a rightward swipe peels the page away (acts as Back)
  if (nestedView()) {
    if (dx > 0 && flipBackDragStart()) {
      backDrag = true;
      e.preventDefault();
      pageDragP = clampP(dx / span);
      flipDragMove(pageDragP);
    }
    return; // nested screens have no drawer / space flip
  }

  // main (first) space: a rightward swipe anywhere opens the drawer
  if (dx > 0 && spaceIndex === 0) {
    e.preventDefault(); swActive = true; applyOffset(swBase + dx, false);
    return;
  }

  // otherwise: finger-driven page flip between spaces
  const dir = dx < 0 ? 1 : -1;
  if (!flipDragStart(dir)) return;
  pageDrag = dir;
  e.preventDefault();
  pageDragP = clampP((pageDrag === 1 ? -dx : dx) / span);
  flipDragMove(pageDragP);
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (backDrag) {
    flipBackDragEnd(pageDragP > 0.22);
    backDrag = false; pageDragP = 0;
    return;
  }
  if (pageDrag) {
    flipDragEnd(pageDragP > 0.22);
    pageDrag = 0; pageDragP = 0;
    return;
  }
  if (!swActive) return; swActive = false;
  const dx = e.changedTouches[0].clientX - swTouchX;
  drawerOpen ? (dx < -44 ? closeDrawer() : openDrawer()) : (dx > 44 ? openDrawer() : closeDrawer());
});

// ── Long press on empty space ─────────────────────────────────
function isEmptySpace(el) {
  return !el.closest('.task-item, .category-header, .add-task-btn, .add-category-btn, .add-category-wrap, .app-header, .subtask-back, #drawer');
}

let emptyPressTimer = null;
let epStartX = 0, epStartY = 0;

function startEmptyPress(x, y) {
  epStartX = x; epStartY = y;
  emptyPressTimer = setTimeout(() => {
    if (historyView || settingsView) return;
    navigator.vibrate && navigator.vibrate(30);
    if (subtaskView) {
      openSheet('', [
        { icon: '+', label: 'Add subtask', action: () => promptAddSubtask(subtaskView.catId, subtaskView.taskId) },
      ]);
      return;
    }
    const hasDone = cats().some(cat => cat.tasks.some(t => t.done));
    const items = [
      { icon: '+', label: 'Add category', action: () => openDialog('New category', '', val => addCategory(val), false) },
      { icon: '⧉', label: 'Export all to clipboard', action: exportSpaceAll },
      { icon: '⇪', label: 'Paste from clipboard', action: pasteFromClipboard },
    ];
    if (hasDone) items.push({ icon: '✓', label: 'Clear all completed', action: clearAllCompleted });
    openSheet('', items);
  }, 480);
}
function cancelEmptyPress() { clearTimeout(emptyPressTimer); }

mainEl.addEventListener('touchstart', e => {
  if (overlayOpen() || !isEmptySpace(e.target)) return;
  startEmptyPress(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
mainEl.addEventListener('touchend',    cancelEmptyPress);
mainEl.addEventListener('touchcancel', cancelEmptyPress);
mainEl.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - epStartX;
  const dy = e.touches[0].clientY - epStartY;
  if (Math.abs(dx) > 9 || Math.abs(dy) > 9) cancelEmptyPress();
}, { passive: true });
mainEl.addEventListener('mousedown', e => {
  if (overlayOpen() || !isEmptySpace(e.target)) return;
  startEmptyPress(e.clientX, e.clientY);
});
mainEl.addEventListener('mouseup',    cancelEmptyPress);
mainEl.addEventListener('mouseleave', cancelEmptyPress);
mainEl.addEventListener('mousemove', e => {
  const dx = e.clientX - epStartX;
  const dy = e.clientY - epStartY;
  if (Math.abs(dx) > 9 || Math.abs(dy) > 9) cancelEmptyPress();
});

// triple tap on empty space clears all completed in the current space
let emptyTaps = 0, emptyTapTimer = null;
mainEl.addEventListener('click', e => {
  if (overlayOpen() || nestedView() || !isEmptySpace(e.target)) { emptyTaps = 0; return; }
  emptyTaps++;
  clearTimeout(emptyTapTimer);
  if (emptyTaps >= 3) {
    emptyTaps = 0;
    if (cats().some(cat => cat.tasks.some(t => t.done))) {
      navigator.vibrate && navigator.vibrate(20);
      clearAllCompleted();
    }
    return;
  }
  emptyTapTimer = setTimeout(() => { emptyTaps = 0; }, 460);
});

// ── Bottom Sheet ─────────────────────────────────────────────
function openSheet(label, items) {
  document.getElementById('sheetLabel').textContent = label;
  const c = document.getElementById('sheetItems');
  c.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'sheet-item' + (item.danger ? ' danger' : '');
    el.innerHTML = `<span class="s-icon">${renderGlyph(item.icon)}</span>${esc(item.label)}`;
    el.addEventListener('click', () => { closeSheet(); item.action(); });
    c.appendChild(el);
  });
  document.getElementById('sheetOverlay').classList.add('active');
  armBack();
}
function closeSheet() { document.getElementById('sheetOverlay').classList.remove('active'); }
document.getElementById('sheetOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('sheetOverlay')) closeSheet();
});

function openCategorySheet(catId) {
  const cat = cats().find(c => c.id === catId);
  if (!cat) return;
  const hasDone = cat.tasks.some(t => t.done);
  const items = [
    { icon: '✏️', label: 'Rename category', action: () => promptRenameCategory(catId) },
    { icon: '⧉', label: 'Copy as text', action: () => exportCategory(catId) },
  ];
  if (hasDone) items.push(
    { icon: '✓', label: 'Clear completed', action: () => clearCompletedTasks(catId) }
  );
  items.push(
    { icon: '🗑️', label: 'Delete category', danger: true, action: () => deleteCategory(catId) }
  );
  openSheet(cat.name, items);
}
function openTaskSheet(catId, taskId) {
  const cat  = cats().find(c => c.id === catId);
  const task = cat?.tasks.find(t => t.id === taskId);
  if (!task) return;
  const lbl = task.text.length > 42 ? task.text.slice(0, 42) + '…' : task.text;
  const hasSubs = task.subtasks && task.subtasks.length;
  const items = [];
  // A task with subtasks completes automatically — no manual toggle for it.
  if (!hasSubs) items.push(
    { icon: task.done ? '○' : '✓', label: task.done ? 'Mark incomplete' : 'Mark complete', action: () => toggleTask(catId, taskId) }
  );
  items.push(
    { icon: '≡', label: 'Subtasks', action: () => openSubtasks(catId, taskId) },
    { icon: '✏️', label: 'Edit task',   action: () => promptEditTask(catId, taskId) },
    { icon: '⧉', label: 'Copy as text', action: () => exportTask(catId, taskId) },
    { icon: '🗑️', label: 'Delete task', danger: true, action: () => deleteTask(catId, taskId) },
  );
  openSheet(lbl, items);
}

function openSubtaskSheet(catId, taskId, subId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  const sub  = task?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  const lbl = sub.text.length > 42 ? sub.text.slice(0, 42) + '…' : sub.text;
  openSheet(lbl, [
    { icon: sub.done ? '○' : '✓', label: sub.done ? 'Mark incomplete' : 'Mark complete', action: () => toggleSubtask(catId, taskId, subId) },
    { icon: '✏️', label: 'Edit subtask',   action: () => promptEditSubtask(catId, taskId, subId) },
    { icon: '🗑️', label: 'Delete subtask', danger: true, action: () => deleteSubtask(catId, taskId, subId) },
  ]);
}

// ── Dialog ───────────────────────────────────────────────────
let dialogCb = null, dialogIsTask = false;

function openDialog(title, value, cb, isTask) {
  dialogIsTask = !!isTask; dialogCb = cb;
  document.getElementById('dialogTitle').textContent = title;
  const inp = document.getElementById('dialogInput');
  const ta  = document.getElementById('dialogTextarea');
  const ht  = document.getElementById('dialogHint');
  inp.style.display = isTask ? 'none'  : 'block'; inp.value = isTask ? '' : value;
  ta.style.display  = isTask ? 'block' : 'none';  ta.value  = isTask ? value : '';
  ht.style.display  = isTask ? 'block' : 'none';
  document.getElementById('dialogOverlay').classList.add('active');
  armBack();
  setTimeout(() => (isTask ? ta : inp).focus(), 130);
}
function closeDialog() {
  document.getElementById('dialogOverlay').classList.remove('active'); dialogCb = null;
}
function confirmDialog() {
  const val = (dialogIsTask ? document.getElementById('dialogTextarea') : document.getElementById('dialogInput')).value.trim();
  if (dialogCb && val) dialogCb(val);
  closeDialog();
}

document.getElementById('dialogInput').addEventListener('keydown', e => {
  if (e.key === 'Enter')  confirmDialog();
  if (e.key === 'Escape') closeDialog();
});
document.getElementById('dialogTextarea').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') confirmDialog();
  if (e.key === 'Escape') closeDialog();
});
document.getElementById('dialogOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('dialogOverlay')) closeDialog();
});
