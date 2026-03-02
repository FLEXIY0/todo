// ── Theme ────────────────────────────────────────────────────
function setTheme(t) {
  state.theme = t;
  document.body.className = 'theme-' + t;
  document.getElementById('ti-classic').classList.toggle('active', t === 'classic');
  document.getElementById('ti-oled').classList.toggle('active', t === 'oled');
  closeDrawer();
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
function openDrawer(a)  { drawerOpen = true;  applyOffset(DRAWER_W, a !== false); maskEl.classList.add('active'); }
function closeDrawer(a) { drawerOpen = false; applyOffset(0, a !== false);        maskEl.classList.remove('active'); }
function overlayOpen()  {
  return document.getElementById('sheetOverlay').classList.contains('active') ||
         document.getElementById('dialogOverlay').classList.contains('active');
}

maskEl.addEventListener('click', () => closeDrawer());

document.addEventListener('touchstart', (e) => {
  if (overlayOpen()) return;
  swTouchX = e.touches[0].clientX; swTouchY = e.touches[0].clientY;
  swDir = null; swActive = false; swBase = drawerOpen ? DRAWER_W : 0;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (overlayOpen()) return;
  const dx = e.touches[0].clientX - swTouchX, dy = e.touches[0].clientY - swTouchY;
  if (!swDir) {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    swDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
  }
  if (swDir !== 'h') return;
  if (!drawerOpen && swTouchX > 44 && dx > 0) return;
  e.preventDefault(); swActive = true; applyOffset(swBase + dx, false);
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (!swActive) return; swActive = false;
  const dx = e.changedTouches[0].clientX - swTouchX;
  drawerOpen ? (dx < -44 ? closeDrawer() : openDrawer()) : (dx > 44 ? openDrawer() : closeDrawer());
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
}
function closeSheet() { document.getElementById('sheetOverlay').classList.remove('active'); }
document.getElementById('sheetOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('sheetOverlay')) closeSheet();
});

function openCategorySheet(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  openSheet(cat.name, [
    { icon: '✏️', label: 'Rename category', action: () => promptRenameCategory(catId) },
    { icon: '🗑️', label: 'Delete category', danger: true, action: () => deleteCategory(catId) },
  ]);
}
function openTaskSheet(catId, taskId) {
  const cat  = state.categories.find(c => c.id === catId);
  const task = cat?.tasks.find(t => t.id === taskId);
  if (!task) return;
  const lbl = task.text.length > 42 ? task.text.slice(0, 42) + '…' : task.text;
  openSheet(lbl, [
    { icon: task.done ? '○' : '✓', label: task.done ? 'Mark incomplete' : 'Mark complete', action: () => toggleTask(catId, taskId) },
    { icon: '✏️', label: 'Edit task',   action: () => promptEditTask(catId, taskId) },
    { icon: '🗑️', label: 'Delete task', danger: true, action: () => deleteTask(catId, taskId) },
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
