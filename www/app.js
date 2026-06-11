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

// ── Render ───────────────────────────────────────────────────
function render() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

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
    setupLongPress(header, () => openCategorySheet(cat.id));
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
