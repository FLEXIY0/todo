// ── State ────────────────────────────────────────────────────
const state = {
  theme: 'classic',
  categories: [
    { id: 'c1', name: 'Personal Tasks', tasks: [
      { id: 't1', text: 'Buy groceries for the week', done: false },
      { id: 't2', text: 'Call the dentist and schedule an appointment', done: false },
    ]},
    { id: 'c2', name: 'Work', tasks: [
      { id: 't3', text: 'Finish the project report for the client', done: true },
      { id: 't4', text: 'Review pull requests before standup', done: false },
      { id: 't5', text: 'Update documentation on the internal wiki', done: false },
    ]},
    { id: 'c3', name: 'Ideas', tasks: [
      { id: 't6', text: 'Build a habit tracker app', done: false },
    ]},
  ]
};

const strikeAnimSet = new Set();
let pressTimer = null;

// ── Render ───────────────────────────────────────────────────
function render() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  state.categories.forEach(cat => {
    const catEl  = document.createElement('div');
    catEl.className = 'category';

    const doneN  = cat.tasks.filter(t => t.done).length;
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span class="category-name">${esc(cat.name)}</span><span class="category-count">${doneN}/${cat.tasks.length}</span>`;
    setupLongPress(header, () => openCategorySheet(cat.id));
    catEl.appendChild(header);

    const tasksEl = document.createElement('div');
    tasksEl.className = 'tasks';
    cat.tasks.forEach(task => {
      const el = document.createElement('div');
      el.className = `task-item${task.done ? ' done' : ''}${strikeAnimSet.has(task.id) ? ' strike-anim' : ''}`;
      el.innerHTML = `<div class="task-bullet"></div><div class="task-text">${esc(task.text)}</div>`;
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
  const move   = (e) => { const p = e.touches ? e.touches[0] : e; if (Math.abs(p.clientX-sx) > 9 || Math.abs(p.clientY-sy) > 9) cancel(); };
  el.addEventListener('touchstart',  start,  { passive: true });
  el.addEventListener('touchend',    cancel);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('touchmove',   move,   { passive: true });
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     cancel);
  el.addEventListener('mouseleave',  cancel);
}

// ── Actions ──────────────────────────────────────────────────
function toggleTask(catId, taskId) {
  const task = state.categories.find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.done = !task.done;
  if (task.done) { strikeAnimSet.add(taskId); setTimeout(() => strikeAnimSet.delete(taskId), 520); }
  else strikeAnimSet.delete(taskId);
  render();
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
    { icon: '←', label: 'Cancel', action: () => {} },
  ]), 300);
}

document.getElementById('addCategoryBtn').addEventListener('click', () => {
  openDialog('New category', '', val => {
    state.categories.push({ id: 'c' + Date.now(), name: val, tasks: [] }); render();
  }, false);
});

// ── Helpers + Init ───────────────────────────────────────────
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
render();
