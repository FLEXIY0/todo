// ── Persistence ──────────────────────────────────────────────
const STORAGE_KEY = 'todo_state';

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    theme: state.theme,
    categories: state.categories,
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    if (saved.categories) state.categories = saved.categories;
    if (saved.theme) {
      state.theme = saved.theme;
      document.body.className = 'theme-' + saved.theme;
      THEME_IDS.forEach(n => document.getElementById('ti-' + n).classList.toggle('active', n === saved.theme));
    }
  } catch (e) { }
}

// ── State ────────────────────────────────────────────────────
const state = {
  theme: 'classic',
  categories: [
    {
      id: 'c1', name: 'Personal Tasks', tasks: [
        { id: 't1', text: 'Buy groceries for the week', done: false },
        { id: 't2', text: 'Call the dentist and schedule an appointment', done: false },
      ]
    },
    {
      id: 'c2', name: 'Work', tasks: [
        { id: 't3', text: 'Finish the project report for the client', done: true },
        { id: 't4', text: 'Review pull requests before standup', done: false },
        { id: 't5', text: 'Update documentation on the internal wiki', done: false },
      ]
    },
    {
      id: 'c3', name: 'Ideas', tasks: [
        { id: 't6', text: 'Build a habit tracker app', done: false },
      ]
    },
  ]
};


const strikeForwardSet = new Set();
const strikeReverseSet = new Set();
const animTimers = {};
let pressTimer = null;
let subtaskView = null; // { catId, taskId } while inside a task's subtasks
let changelogView = false; // true while the "What's new" screen is open

// ── Render ───────────────────────────────────────────────────
function render() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  if (changelogView) {
    renderChangelog(container);
    return;
  }

  if (subtaskView) {
    renderSubtasks(container);
    saveState();
    return;
  }

  state.categories.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'category';
    catEl.dataset.catId = cat.id;

    const doneN = cat.tasks.filter(t => t.done).length;
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span class="cat-line"></span><span class="category-name">${esc(cat.name)}</span><span class="cat-line-mid"></span><span class="category-count">${doneN}/${cat.tasks.length}</span><span class="cat-line"></span>`;
    setupCategoryReorder(header, catEl, cat.id);
    catEl.appendChild(header);

    const tasksEl = document.createElement('div');
    tasksEl.className = 'tasks';
    cat.tasks.forEach(task => {
      const el = document.createElement('div');
      const isFwd = strikeForwardSet.has(task.id);
      const isRev = strikeReverseSet.has(task.id);

      let cls = 'task-item';
      if (task.done || isRev) cls += ' done';
      if (isFwd) cls += ' strike-fwd';
      if (isRev) cls += ' strike-rev';

      el.className = cls;
      el.dataset.id = task.id;
      const subs = task.subtasks || [];
      const bars = subs.length
        ? `<div class="sub-bars">${subs.map(s => `<span class="sub-bar${s.done ? ' done' : ''}"></span>`).join('')}</div>`
        : '';
      el.innerHTML = `<div class="task-bullet"></div><div class="task-text"><span class="strike-wrap">${esc(task.text)}</span>${bars}</div>`;
      // A task with subtasks opens its nested list; completion is automatic.
      el.addEventListener('click', () => subs.length ? openSubtasks(cat.id, task.id) : toggleTask(cat.id, task.id));
      setupLongPress(el, () => openTaskSheet(cat.id, task.id));
      tasksEl.appendChild(el);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'add-task-btn';
    addBtn.innerHTML = `<div class="add-task-icon">+</div><span>Add task</span>`;
    addBtn.addEventListener('click', () => promptAddTask(cat.id));
    tasksEl.appendChild(addBtn);

    catEl.appendChild(tasksEl);
    container.appendChild(catEl);
  });
  saveState();
}

// Nested screen: one task's subtasks, framed like a category
function renderSubtasks(container) {
  const cat = state.categories.find(c => c.id === subtaskView.catId);
  const task = cat?.tasks.find(t => t.id === subtaskView.taskId);
  if (!task) { subtaskView = null; render(); return; }
  const subs = task.subtasks = task.subtasks || [];

  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">←</span><span>${esc(cat.name)}</span>`;
  back.addEventListener('click', closeSubtasks);
  container.appendChild(back);

  const catEl = document.createElement('div');
  catEl.className = 'category subtask-view';
  catEl.dataset.catId = cat.id;

  const doneN = subs.filter(s => s.done).length;
  const name = task.text.length > 28 ? task.text.slice(0, 28) + '…' : task.text;
  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `<span class="cat-line"></span><span class="category-name">${esc(name)}</span><span class="cat-line-mid"></span><span class="category-count">${doneN}/${subs.length}</span><span class="cat-line"></span>`;
  catEl.appendChild(header);

  const tasksEl = document.createElement('div');
  tasksEl.className = 'tasks';
  subs.forEach(sub => {
    const el = document.createElement('div');
    const isFwd = strikeForwardSet.has(sub.id);
    const isRev = strikeReverseSet.has(sub.id);

    let cls = 'task-item';
    if (sub.done || isRev) cls += ' done';
    if (isFwd) cls += ' strike-fwd';
    if (isRev) cls += ' strike-rev';

    el.className = cls;
    el.dataset.id = sub.id;
    el.innerHTML = `<div class="task-bullet"></div><div class="task-text"><span class="strike-wrap">${esc(sub.text)}</span></div>`;
    el.addEventListener('click', () => toggleSubtask(cat.id, task.id, sub.id));
    setupLongPress(el, () => openSubtaskSheet(cat.id, task.id, sub.id));
    tasksEl.appendChild(el);
  });

  const addBtn = document.createElement('div');
  addBtn.className = 'add-task-btn';
  addBtn.innerHTML = `<div class="add-task-icon">+</div><span>Add subtask</span>`;
  addBtn.addEventListener('click', () => promptAddSubtask(cat.id, task.id));
  tasksEl.appendChild(addBtn);

  catEl.appendChild(tasksEl);
  container.appendChild(catEl);
}

// ── Changelog ────────────────────────────────────────────────
// Hand-curated, GitHub-diff style. '+' added, '-' removed, '~' changed.
const CHANGELOG = [
  {
    version: 'v1.1', date: 'June 2026', changes: [
      { t: '+', text: 'Subtasks: nest steps inside any task, one level deep' },
      { t: '+', text: 'Progress stripes under a task — one per subtask' },
      { t: '+', text: 'Tap a task with subtasks to open its nested screen' },
      { t: '+', text: '"Subtasks" item in the task long-press menu' },
      { t: '+', text: 'Anthropic theme — light ivory with terracotta accents' },
      { t: '+', text: 'Pixel-art leaf icon, generated entirely from code' },
      { t: '+', text: 'Hold a category title and drag to reorder categories' },
      { t: '+', text: '"What\'s new" and "About" screens in the drawer' },
      { t: '+', text: 'Signed APK builds on GitHub Actions, releases by tag' },
      { t: '~', text: 'A task with subtasks completes itself when all of them are done' },
      { t: '~', text: 'App version now follows the release tag automatically' },
      { t: '-', text: 'Manual "Mark complete" for tasks that have subtasks' },
    ],
  },
  {
    version: 'v1.0', date: '2026', changes: [
      { t: '+', text: 'Categories with editable names and done counters' },
      { t: '+', text: 'Animated strikethrough that can reverse mid-flight' },
      { t: '+', text: 'Classic (amber) and OLED (pure black) themes' },
      { t: '+', text: 'Long-press menus for tasks, categories and empty space' },
      { t: '+', text: 'Swipe-right drawer, editable app title' },
      { t: '+', text: 'State persists in localStorage' },
    ],
  },
];

function openChangelog() { closeDrawer(); changelogView = true; subtaskView = null; render(); }
function closeChangelog() { changelogView = false; render(); }

function renderChangelog(container) {
  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">←</span><span>What's new</span>`;
  back.addEventListener('click', closeChangelog);
  container.appendChild(back);

  CHANGELOG.forEach(rel => {
    const relEl = document.createElement('div');
    relEl.className = 'category cl-release';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span class="cat-line"></span><span class="category-name">${esc(rel.version)}</span><span class="cat-line-mid"></span><span class="category-count">${esc(rel.date)}</span><span class="cat-line"></span>`;
    relEl.appendChild(header);

    const list = document.createElement('div');
    list.className = 'cl-lines';
    rel.changes.forEach(ch => {
      const cls = ch.t === '+' ? 'add' : ch.t === '-' ? 'del' : 'mod';
      const line = document.createElement('div');
      line.className = 'cl-line ' + cls;
      line.innerHTML = `<span class="cl-sign">${ch.t}</span><span class="cl-text">${esc(ch.text)}</span>`;
      list.appendChild(line);
    });
    relEl.appendChild(list);
    container.appendChild(relEl);
  });
}

// ── Category reorder (hold & drag) ───────────────────────────
// Long-press lifts the category; dragging moves it, neighbours slide out
// of the way; releasing without moving opens the category sheet instead.
const CAT_GAP = 18; // matches .categories flex gap in CSS

function setupCategoryReorder(header, catEl, catId) {
  const start = (e) => {
    const p = e.touches ? e.touches[0] : e;
    beginCategoryDrag(catEl, catId, p.clientX, p.clientY);
  };
  header.addEventListener('touchstart', start, { passive: true });
  header.addEventListener('mousedown', start);
}

function beginCategoryDrag(catEl, catId, sx, sy) {
  let lifted = false, moved = false;
  let els = [], mids = [], i0 = 0, target = 0, slot = 0;

  const timer = setTimeout(() => {
    lifted = true;
    navigator.vibrate && navigator.vibrate(30);
    els = [...document.querySelectorAll('#categoriesContainer > .category')];
    i0 = target = els.indexOf(catEl);
    mids = els.map(el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; });
    slot = catEl.offsetHeight + CAT_GAP;
    catEl.classList.add('drag-lift');
    els.forEach(el => { if (el !== catEl) el.classList.add('drag-shift'); });
  }, 480);

  const move = (e) => {
    const p = e.touches ? e.touches[0] : e;
    if (!lifted) {
      // movement before the long-press fires = scroll intent, abort
      if (Math.abs(p.clientX - sx) > 9 || Math.abs(p.clientY - sy) > 9) end(true);
      return;
    }
    if (e.cancelable) e.preventDefault(); // keep the page from scrolling
    const dy = p.clientY - sy;
    if (Math.abs(dy) > 6) moved = true;
    catEl.style.transform = `translateY(${dy}px)`;

    const center = mids[i0] + dy;
    target = i0;
    els.forEach((el, j) => {
      if (j === i0) return;
      if (j < i0 && center < mids[j]) {
        el.style.transform = `translateY(${slot}px)`;
        target = Math.min(target, j);
      } else if (j > i0 && center > mids[j]) {
        el.style.transform = `translateY(${-slot}px)`;
        target = Math.max(target, j);
      } else {
        el.style.transform = '';
      }
    });
  };

  const end = (cancelled) => {
    clearTimeout(timer);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('touchcancel', onCancel);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', onEnd);
    if (!lifted) return; // released before long-press fired — nothing to do

    if (moved && !cancelled && target !== i0) {
      const [cat] = state.categories.splice(i0, 1);
      state.categories.splice(target, 0, cat);
    }
    render(); // clears lift/shift classes and inline transforms
    if (!moved && cancelled !== true) openCategorySheet(catId);
  };
  const onEnd = () => end(false);
  const onCancel = () => end(true);

  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', onEnd);
  document.addEventListener('touchcancel', onCancel);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', onEnd);
}

// ── Long Press ───────────────────────────────────────────────
function setupLongPress(el, cb) {
  let sx = 0, sy = 0;
  const start = (e) => {
    const p = e.touches ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY;
    el.classList.add('pressing');
    pressTimer = setTimeout(() => { el.classList.remove('pressing'); navigator.vibrate && navigator.vibrate(30); cb(); }, 480);
  };
  const cancel = () => { clearTimeout(pressTimer); el.classList.remove('pressing'); };
  const move = (e) => { const p = e.touches ? e.touches[0] : e; if (Math.abs(p.clientX - sx) > 9 || Math.abs(p.clientY - sy) > 9) cancel(); };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('touchmove', move, { passive: true });
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
}

// ── Actions ──────────────────────────────────────────────────
// Shared toggle + strike animation for tasks and subtasks
function applyToggle(item, itemId, updateCount) {
  // Отменяем предыдущий таймер для этой задачи
  if (animTimers[itemId]) {
    clearTimeout(animTimers[itemId]);
    delete animTimers[itemId];
  }
  strikeForwardSet.delete(itemId);
  strikeReverseSet.delete(itemId);

  const el = document.querySelector(`.task-item[data-id="${itemId}"]`);

  if (item.done) {
    item.done = false;
    strikeReverseSet.add(itemId);
    if (el) {
      el.classList.remove('strike-fwd');
      void el.offsetWidth;
      el.classList.add('strike-rev');
    }
  } else {
    item.done = true;
    strikeForwardSet.add(itemId);
    if (el) {
      el.classList.remove('strike-rev');
      el.classList.add('done');
      void el.offsetWidth;
      el.classList.add('strike-fwd');
    }
  }
  saveState();
  updateCount();

  animTimers[itemId] = setTimeout(() => {
    delete animTimers[itemId];
    strikeForwardSet.delete(itemId);
    strikeReverseSet.delete(itemId);
    const el2 = document.querySelector(`.task-item[data-id="${itemId}"]`);
    if (el2) {
      el2.classList.remove('strike-fwd', 'strike-rev');
      if (!item.done) el2.classList.remove('done');
    }
    updateCount();
  }, 2100);
}

function toggleTask(catId, taskId) {
  const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.subtasks && task.subtasks.length) { openSubtasks(catId, taskId); return; }
  applyToggle(task, taskId, () => updateCategoryCount(catId));
}

function toggleSubtask(catId, taskId, subId) {
  const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  const sub = task?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  applyToggle(sub, subId, updateSubtaskCount);
  syncParentDone(task);
  saveState();
}

// ── Subtasks ─────────────────────────────────────────────────
function openSubtasks(catId, taskId) { subtaskView = { catId, taskId }; render(); }
function closeSubtasks() { subtaskView = null; render(); }

// A task with subtasks is done exactly when all of them are done
function syncParentDone(task) {
  if (task.subtasks && task.subtasks.length) task.done = task.subtasks.every(s => s.done);
}

function updateSubtaskCount() {
  if (!subtaskView) return;
  const task = state.categories.find(c => c.id === subtaskView.catId)?.tasks.find(t => t.id === subtaskView.taskId);
  const countEl = document.querySelector('.category.subtask-view .category-count');
  if (task && countEl) countEl.textContent = `${task.subtasks.filter(s => s.done).length}/${task.subtasks.length}`;
}

function promptAddSubtask(catId, taskId) {
  openDialog('New subtask', '', val => {
    const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.subtasks = task.subtasks || [];
    task.subtasks.push({ id: 's' + Date.now(), text: val, done: false });
    syncParentDone(task);
    render();
  }, true);
}

function promptEditSubtask(catId, taskId, subId) {
  const sub = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId)?.subtasks?.find(s => s.id === subId);
  if (sub) openDialog('Edit subtask', sub.text, val => { sub.text = val; render(); }, true);
}

function deleteSubtask(catId, taskId, subId) {
  const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  task.subtasks = task.subtasks.filter(s => s.id !== subId);
  syncParentDone(task);
  render();
}

function clearCompletedTasks(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  const doneTasks = cat.tasks.filter(t => t.done);
  if (!doneTasks.length) return;

  const STAGGER = 75;   // мс между задачами
  const ANIM_DUR = 2000; // мс — длина одной анимации (совпадает с CSS)

  doneTasks.forEach((task, i) => {
    // Отменяем активные таймеры анимации зачёркивания
    if (animTimers[task.id]) {
      clearTimeout(animTimers[task.id]);
      delete animTimers[task.id];
    }
    const el = document.querySelector(`.task-item[data-id="${task.id}"]`);
    if (!el) return;
    el.style.animationDelay = `${i * STAGGER}ms`;
    el.classList.add('slide-out');
  });

  const totalTime = (doneTasks.length - 1) * STAGGER + ANIM_DUR;
  setTimeout(() => {
    cat.tasks = cat.tasks.filter(t => !t.done);
    render();
  }, totalTime);
}

function clearAllCompleted() {
  const allDone = [];
  state.categories.forEach(cat => {
    cat.tasks.filter(t => t.done).forEach(task => allDone.push({ cat, task }));
  });
  if (!allDone.length) return;

  const STAGGER = 75;
  const ANIM_DUR = 2000;

  allDone.forEach(({ task }, i) => {
    if (animTimers[task.id]) {
      clearTimeout(animTimers[task.id]);
      delete animTimers[task.id];
    }
    const el = document.querySelector(`.task-item[data-id="${task.id}"]`);
    if (!el) return;
    el.style.animationDelay = `${i * STAGGER}ms`;
    el.classList.add('slide-out');
  });

  const totalTime = (allDone.length - 1) * STAGGER + ANIM_DUR;
  setTimeout(() => {
    state.categories.forEach(cat => { cat.tasks = cat.tasks.filter(t => !t.done); });
    render();
  }, totalTime);
}

function updateCategoryCount(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  const doneN = cat.tasks.filter(t => t.done).length;
  const catEl = document.querySelector(`.category[data-cat-id="${catId}"]`);
  if (catEl) {
    const countEl = catEl.querySelector('.category-count');
    if (countEl) countEl.textContent = `${doneN}/${cat.tasks.length}`;
  }
}
function promptRenameCategory(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (cat) openDialog('Rename category', cat.name, val => { cat.name = val; render(); }, false);
}
function deleteCategory(catId) {
  state.categories = state.categories.filter(c => c.id !== catId); render();
}
function promptEditTask(catId, taskId) {
  const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (task) openDialog('Edit task', task.text, val => { task.text = val; render(); }, true);
}
function deleteTask(catId, taskId) {
  const cat = state.categories.find(c => c.id === catId);
  if (cat) { cat.tasks = cat.tasks.filter(t => t.id !== taskId); render(); }
}
function promptAddTask(catId) {
  openDialog('New task', '', val => {
    const cat = state.categories.find(c => c.id === catId);
    if (cat) { cat.tasks.push({ id: 't' + Date.now(), text: val, done: false }); render(); }
  }, true);
}
function confirmClearAll() {
  closeDrawer();
  setTimeout(() => openSheet('Clear everything?', [
    { icon: '✕', label: 'Yes, delete all', danger: true, action: () => { state.categories = []; render(); } },
    { icon: '←', label: 'Cancel', action: () => { } },
  ]), 300);
}

// ── Helpers + Init ───────────────────────────────────────────
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
loadState();
render();
