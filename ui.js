// ── App meta ─────────────────────────────────────────────────
const APP_VERSION = '1.6';
const REPO_URL = 'https://github.com/FLEXIY0/todo';

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

function nestedView() { return subtaskView || historyView || settingsView || themesView; }

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
    el.innerHTML = `<span class="s-icon">${item.icon}</span>${item.label}`;
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
