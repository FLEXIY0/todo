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
      document.getElementById('ti-classic').classList.toggle('active', saved.theme === 'classic');
      document.getElementById('ti-oled').classList.toggle('active', saved.theme === 'oled');
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

// ── Render ───────────────────────────────────────────────────
function render() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

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
      el.innerHTML = `<div class="task-bullet"></div><div class="task-text"><span class="strike-wrap">${esc(task.text)}</span></div>`;
      el.addEventListener('click', () => toggleTask(cat.id, task.id));
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
function toggleTask(catId, taskId) {
  const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Отменяем предыдущий таймер для этой задачи
  if (animTimers[taskId]) {
    clearTimeout(animTimers[taskId]);
    delete animTimers[taskId];
  }
  strikeForwardSet.delete(taskId);
  strikeReverseSet.delete(taskId);

  const el = document.querySelector(`.task-item[data-id="${taskId}"]`);

  if (task.done) {
    task.done = false;
    strikeReverseSet.add(taskId);
    if (el) {
      el.classList.remove('strike-fwd');
      void el.offsetWidth;
      el.classList.add('strike-rev');
    }
  } else {
    task.done = true;
    strikeForwardSet.add(taskId);
    if (el) {
      el.classList.remove('strike-rev');
      el.classList.add('done');
      void el.offsetWidth;
      el.classList.add('strike-fwd');
    }
  }
  saveState();
  updateCategoryCount(catId);

  animTimers[taskId] = setTimeout(() => {
    delete animTimers[taskId];
    strikeForwardSet.delete(taskId);
    strikeReverseSet.delete(taskId);
    const el2 = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (el2) {
      el2.classList.remove('strike-fwd', 'strike-rev');
      if (!task.done) el2.classList.remove('done');
    }
    updateCategoryCount(catId);
  }, 2100);
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
