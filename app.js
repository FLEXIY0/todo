// ── Persistence ──────────────────────────────────────────────
const STORAGE_KEY = 'todo_state';

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    v: 2,
    theme: state.theme,
    spaces: state.spaces,
    settings: state.settings,
    history: state.history,
    sync: state.sync,
    draft: state.draft,
  }));
  if (typeof maybeSync === 'function') maybeSync();
}

let firstRun = false;
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) { firstRun = true; return; }
    if (saved.spaces) {
      state.spaces = saved.spaces;
    } else if (saved.categories) {
      // v1 → v2 migration: the old flat board becomes the first space
      state.spaces[0].categories = saved.categories;
    }
    if (!state.spaces.some(s => s.shared)) {
      state.spaces.push({ id: 'sp_shared', name: 'Shared', shared: true, mode: 'todo', boards: { todo: [], wish: [] } });
    }
    // v2 → v3: the shared space now keeps two separate boards
    state.spaces.forEach(sp => {
      if (sp.shared && !sp.boards) {
        sp.boards = { todo: [], wish: [] };
        if (Array.isArray(sp.categories)) sp.boards[sp.mode === 'wish' ? 'wish' : 'todo'] = sp.categories;
        delete sp.categories;
      }
      if (!sp.shared && !Array.isArray(sp.categories)) sp.categories = [];
      if (sp.id === 'sp_wish' && sp.tree === undefined) sp.tree = true;
    });
    if (saved.settings) Object.assign(state.settings, saved.settings);
    if (Array.isArray(saved.history)) state.history = saved.history;
    if (saved.sync) Object.assign(state.sync, saved.sync);
    if (typeof saved.draft === 'string') state.draft = saved.draft;
    if (saved.theme) state.theme = saved.theme;
  } catch (e) { }
}

// ── State ────────────────────────────────────────────────────
const state = {
  theme: 'classic',
  spaces: [
    {
      id: 'sp_todo', name: 'To-Do', categories: [
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
    },
    { id: 'sp_wish', name: 'Wishlist', categories: [], tree: true },
    { id: 'sp_shared', name: 'Shared', shared: true, mode: 'todo', boards: { todo: [], wish: [] } },
  ],
  settings: { wishlistOn: true, sharedOn: true, historyLimit: 200, fontSize: 'm', fontFamily: 'system', currency: '₽' },
  history: [],
  sync: { room: null, tombs: {} },
  draft: '',
};

// Themes: id → drawer label/sub (the .theme-dot.<id> swatch lives in CSS)
const THEMES = [
  { id: 'classic', name: 'Classic', sub: 'Amber · Dark' },
  { id: 'oled', name: 'OLED', sub: 'Black · White' },
  { id: 'anthropic', name: 'Anthropic', sub: 'Ivory · Terracotta' },
  { id: 'anthropic-dark', name: 'Anthropic Dark', sub: 'Antique · Dark' },
];

let spaceIndex = 0;
let subtaskView = null;   // { catId, taskId } while inside a task's subtasks
let historyView = false;  // history journal screen
let settingsView = false; // settings screen
let themesView = false;   // themes picker screen
let connView = false;     // sync connection status screen
let reorderMode = false;  // category drag-to-reorder mode (toggled from the category menu)

const strikeForwardSet = new Set();
const strikeReverseSet = new Set();
const animTimers = {};
let pressTimer = null;

// ── Space helpers ────────────────────────────────────────────
function visSpaces() {
  return state.spaces.filter(s =>
    s.shared ? state.settings.sharedOn :
    s.id === 'sp_wish' ? state.settings.wishlistOn : true);
}
function curSpace() {
  const v = visSpaces();
  if (spaceIndex >= v.length) spaceIndex = Math.max(0, v.length - 1);
  return v[spaceIndex];
}
function cats() { return spCats(curSpace()); }
// a space's visible category list (the shared space has two boards)
function spCats(sp, board) {
  if (!sp.shared) return sp.categories;
  sp.boards = sp.boards || { todo: [], wish: [] };
  const b = board || sp.mode || 'todo';
  return sp.boards[b] = sp.boards[b] || [];
}
// subtask display style: stripes or tree
function treeOn(sp) { return sp.shared ? sp.mode === 'wish' : !!sp.tree; }
// any tree/nested-list board carries per-task prices (wishlist and any
// other space switched to "tree" subtasks) — and only those
function hasPrices(sp) { return treeOn(sp); }
const CUR_PRE = { '$': 1, '£': 1, '¥': 1 }; // symbols that sit before the number
function curSym() { return state.settings.currency || '₽'; }
function fmtPrice(n) {
  const s = curSym();
  const num = (Math.round(n * 100) / 100).toLocaleString('en-US').replace(/,/g, ' ');
  return CUR_PRE[s] ? s + num : num + ' ' + s;
}
// rolled-up price of a task: sum of its subtasks' prices, or its own leaf
// price when it has none. Prices live on the leaves (subtasks / leaf tasks).
function taskPrice(task) {
  if (task.subtasks && task.subtasks.length)
    return task.subtasks.reduce((a, s) => a + (Number(s.price) || 0), 0);
  return Number(task.price) || 0;
}

// Hybrid logical clock: monotonic timestamp that never goes backwards
// relative to anything we've seen from other devices. This keeps
// last-write-wins merges correct even when two phones' wall clocks
// disagree (the cause of "done shows for one device only").
function nextMt() {
  const t = Math.max(Date.now(), (state.sync.clock || 0) + 1);
  state.sync.clock = t;
  return t;
}
function stamp(o) { o.mt = nextMt(); }

// Globally-unique id: device tag + time + counter, so two phones adding
// at the same moment never collide (which caused phantom duplicates).
const DEVTAG = (() => {
  let d = localStorage.getItem('todo_devtag');
  if (!d) { d = Math.random().toString(36).slice(2, 6); localStorage.setItem('todo_devtag', d); }
  return d;
})();
let uidN = 0;
function uid(p) { return p + DEVTAG + Date.now().toString(36) + (uidN++).toString(36); }

function trunc(s, n = 30) { return s.length > n ? s.slice(0, n) + '…' : s; }
// history data context: which space/board an entry belongs to
function histCtx() {
  const sp = curSpace();
  return sp.shared ? { sp: sp.id, board: sp.mode } : { sp: sp.id };
}
// record a deletion tombstone so sync doesn't resurrect the item
function tombIfShared(space, id) {
  if (space.shared) state.sync.tombs[id] = nextMt();
}

// ── History journal ──────────────────────────────────────────
const HIST_LIMITS = [50, 200, 1000, 0]; // 0 = keep everything

function logH(sign, txt, data) {
  state.history.unshift({
    id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: Date.now(), s: sign, txt, d: data || null,
  });
  trimHistory();
}
function trimHistory() {
  const lim = state.settings.historyLimit;
  if (lim && state.history.length > lim) state.history.length = lim;
}
function cycleHistLimit() {
  const i = HIST_LIMITS.indexOf(state.settings.historyLimit);
  state.settings.historyLimit = HIST_LIMITS[(i + 1) % HIST_LIMITS.length];
  trimHistory();
  render();
}

function restoreH(entryId) {
  const e = state.history.find(h => h.id === entryId);
  if (!e || !e.d || e.used) return;
  const d = e.d;
  const sp = state.spaces.find(s => s.id === d.sp) || curSpace();
  const arr = spCats(sp, d.board);
  const findCat = (catId, catName) => {
    let c = arr.find(x => x.id === catId);
    if (!c) {
      c = { id: catId || uid('c'), name: catName || 'Restored', tasks: [], mt: nextMt() };
      arr.push(c);
    }
    return c;
  };
  const revive = (cat, task) => {
    if (cat.tasks.some(t => t.id === task.id)) return;
    task.mt = nextMt();
    delete state.sync.tombs[task.id];
    cat.tasks.push(task);
  };

  switch (d.k) {
    case 'task_del': revive(findCat(d.catId, d.catName), d.task); break;
    case 'tasks_clear': d.items.forEach(it => revive(findCat(it.catId, it.catName), it.task)); break;
    case 'subs_clear': {
      const t = arr.find(c => c.id === d.catId)?.tasks.find(t => t.id === d.taskId);
      if (t) {
        t.subtasks = t.subtasks || [];
        d.subs.forEach(s => { if (!t.subtasks.some(x => x.id === s.id)) t.subtasks.push(s); });
        syncParentDone(t); stamp(t);
      }
      break;
    }
    case 'cat_del':
      if (!arr.some(c => c.id === d.category.id)) {
        d.category.mt = nextMt();
        delete state.sync.tombs[d.category.id];
        arr.splice(Math.min(d.index, arr.length), 0, d.category);
      }
      break;
    case 'task_edit': {
      const t = arr.find(c => c.id === d.catId)?.tasks.find(t => t.id === d.taskId);
      if (t) { t.text = d.old; stamp(t); }
      else revive(findCat(d.catId, d.catName), { id: d.taskId, text: d.old, done: false });
      break;
    }
    case 'cat_rename': {
      const c = arr.find(c => c.id === d.catId);
      if (c) { c.name = d.old; stamp(c); }
      break;
    }
    case 'sub_edit': {
      const t = arr.find(c => c.id === d.catId)?.tasks.find(t => t.id === d.taskId);
      const s = t?.subtasks?.find(s => s.id === d.subId);
      if (s) { s.text = d.old; stamp(t); }
      break;
    }
    case 'sub_del': {
      const t = arr.find(c => c.id === d.catId)?.tasks.find(t => t.id === d.taskId);
      if (t) {
        t.subtasks = t.subtasks || [];
        if (!t.subtasks.some(s => s.id === d.sub.id)) t.subtasks.push(d.sub);
        syncParentDone(t);
        stamp(t);
      }
      break;
    }
    case 'space_wipe':
      d.categories.forEach(c => {
        if (!arr.some(x => x.id === c.id)) {
          c.mt = nextMt();
          delete state.sync.tombs[c.id];
          arr.push(c);
        }
      });
      break;
    case 'space_del':
      if (!state.spaces.some(s => s.id === d.space.id)) {
        state.spaces.splice(Math.max(0, state.spaces.length - 1), 0, d.space);
      }
      break;
  }
  e.used = true;
  logH('↩', 'Restored: ' + e.txt);
  navigator.vibrate && navigator.vibrate(20);
  render();
}

// ── Render ───────────────────────────────────────────────────
function render() {
  renderTabs();
  renderCurrentInto(document.getElementById('categoriesContainer'));
  saveState();
}

function renderCurrentInto(container) {
  container.innerHTML = '';
  if (themesView) return renderThemes(container);
  if (connView) return renderConn(container);
  if (historyView) return renderHistory(container);
  if (settingsView) return renderSettings(container);
  if (subtaskView) return renderSubtasks(container);
  renderSpace(container, curSpace());
}

function renderTabs() {
  const el = document.getElementById('spaceTabs');
  const vis = visSpaces();
  const cur = curSpace();
  const nested = subtaskView || historyView || settingsView || themesView || connView;
  if (nested || !cur) { el.style.display = 'none'; el.innerHTML = ''; return; }

  el.innerHTML = '';
  // if every space's label is enabled → show them all as tabs;
  // if at least one is hidden → show only the current page's label
  if (vis.length && vis.every(sp => !sp.tabDot)) {
    el.style.display = 'flex';
    vis.forEach((sp, i) => {
      const t = document.createElement('div');
      t.className = 'space-tab' + (i === spaceIndex ? ' active' : '');
      t.textContent = sp.name;
      t.addEventListener('click', () => flipToSpace(i));
      el.appendChild(t);
    });
    return;
  }
  if (cur.tabDot) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  const t = document.createElement('div');
  t.className = 'space-tab active';
  t.textContent = cur.name;
  el.appendChild(t);
}

function renderSpace(container, space) {
  if (space.shared) container.appendChild(buildSharedBar(space));
  const list = spCats(space);
  const tree = treeOn(space);

  if (reorderMode) {
    if (list.length < 2) { reorderMode = false; }
    else {
      const bar = document.createElement('div');
      bar.className = 'reorder-bar';
      bar.innerHTML = `<span class="sync-lbl">Drag ⠿ to reorder categories</span>`;
      const done = document.createElement('span');
      done.className = 'sync-btn';
      done.textContent = 'Done';
      done.addEventListener('click', () => { reorderMode = false; render(); });
      bar.appendChild(done);
      container.appendChild(bar);
    }
  }

  list.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'category';
    catEl.dataset.catId = cat.id;

    const doneN = cat.tasks.filter(t => t.done).length;
    const header = document.createElement('div');
    header.className = 'category-header';
    // tree mode: category shows the sum of its tasks' rolled-up prices
    let countTxt = `${doneN}/${cat.tasks.length}`;
    if (hasPrices(space)) {
      const sum = cat.tasks.reduce((a, t) => a + taskPrice(t), 0);
      if (sum > 0) countTxt += ` · ${fmtPrice(sum)}`;
    }
    header.innerHTML = `<span class="cat-line"></span><span class="category-name">${esc(cat.name)}</span><span class="cat-line-mid"></span><span class="category-count">${esc(countTxt)}</span><span class="cat-line"></span>`;
    if (reorderMode) {
      catEl.classList.add('reordering');
      const handle = document.createElement('span');
      handle.className = 'cat-handle';
      handle.innerHTML = iconSvg('drag');
      catEl.appendChild(handle);
      setupReorderDrag(handle, catEl, cat.id);
    } else {
      // long-press opens the category menu; triple tap clears completed
      setupLongPress(header, () => openCategorySheet(cat.id));
      setupTripleTap(header, () => {
        if (cat.tasks.some(t => t.done)) { navigator.vibrate && navigator.vibrate(20); clearCompletedTasks(cat.id); }
      });
    }
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
      let subsHtml = '';
      const priced = hasPrices(space);
      if (subs.length) {
        if (tree) {
          // tree: the actual subtask texts, with branch glyphs and (in a
          // priced space) each subtask's own price next to it
          subsHtml = `<div class="sub-tree">${subs.map((s, i) => {
            const sp = (priced && s.price != null && s.price !== '')
              ? `<span class="tw-price">${esc(fmtPrice(Number(s.price)))}</span>` : '';
            return `<div class="sub-twig${s.done ? ' done' : ''}"><span class="tw-br">${i === subs.length - 1 ? '└' : '├'}</span><span class="tw-txt">${esc(s.text)}</span>${sp}</div>`;
          }).join('')}</div>`;
        } else {
          // stripes: one bar per subtask, but never past the screen edge —
          // overflow collapses into a "+N" counter for the rest
          const STRIPE_W = 20; // 16px bar + 4px gap
          const fit = Math.max(4, Math.floor(((window.innerWidth || 380) - 80) / STRIPE_W));
          let shown = subs, more = 0;
          if (subs.length > fit) { shown = subs.slice(0, fit - 1); more = subs.length - shown.length; }
          const bars = shown.map(s => `<span class="sub-bar${s.done ? ' done' : ''}"></span>`).join('');
          subsHtml = `<div class="sub-bars">${bars}${more ? `<span class="sub-more">+${more}</span>` : ''}</div>`;
        }
      }
      // task pill = its leaf price, or (if it has subtasks) their sum
      const tp = priced ? taskPrice(task) : 0;
      const priceHtml = (priced && tp > 0)
        ? `<span class="task-price">${esc(fmtPrice(tp))}</span>` : '';
      el.innerHTML = `<div class="task-bullet"></div><div class="task-text"><span class="strike-wrap">${esc(task.text)}</span>${subsHtml}</div>${priceHtml}`;
      // Single tap toggles (or opens subtasks if it has them); double tap
      // always opens the nested subtask screen — see onTaskTap.
      el.addEventListener('click', () => onTaskTap(cat.id, task.id));
      // Hold & release ≤1s edits the text; hold past 1s opens the menu.
      setupHold(el, () => promptEditTask(cat.id, task.id), () => openTaskSheet(cat.id, task.id));
      tasksEl.appendChild(el);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'add-task-btn';
    addBtn.innerHTML = `<div class="add-task-icon">${iconSvg('add')}</div><span>Add task</span>`;
    addBtn.addEventListener('click', () => promptAddTask(cat.id));
    tasksEl.appendChild(addBtn);

    catEl.appendChild(tasksEl);
    container.appendChild(catEl);
  });

  if (!list.length) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = space.shared ? 'Shared board is empty' : 'Nothing here yet';
    container.appendChild(hint);
    const addBtn = document.createElement('div');
    addBtn.className = 'add-task-btn center';
    addBtn.innerHTML = `<div class="add-task-icon">${iconSvg('add')}</div><span>Add category</span>`;
    addBtn.addEventListener('click', () => openDialog('New category', '', val => addCategory(val), false));
    container.appendChild(addBtn);
  }
}

// Shared space header: board chips (two separate synced boards) + sync row
function buildSharedBar(space) {
  const bar = document.createElement('div');
  bar.className = 'shared-bar';

  const chips = document.createElement('div');
  chips.className = 'mode-chips';
  [['todo', 'To-Do'], ['wish', 'Wishlist']].forEach(([m, label]) => {
    const chip = document.createElement('div');
    chip.className = 'mode-chip' + (space.mode === m ? ' active' : '');
    chip.textContent = label;
    chip.addEventListener('click', () => setSharedBoard(m));
    chips.appendChild(chip);
  });
  bar.appendChild(chips);

  const row = document.createElement('div');
  row.className = 'sync-row tappable';
  const st = typeof syncState !== 'undefined' ? syncState : 'off';
  row.innerHTML = `<span class="sync-dot ${st}" id="syncDot"></span><span class="sync-lbl" id="syncLabel">…</span><span class="sync-more">⋯</span>`;
  row.addEventListener('click', () => openSyncSheet());
  bar.appendChild(row);
  setTimeout(() => { if (typeof setSyncUI === 'function') setSyncUI(); }, 0);
  return bar;
}

// switch which shared board is visible (each board has its own content)
function setSharedBoard(m) {
  const sp = state.spaces.find(s => s.shared);
  if (!sp || sp.mode === m) return;
  sp.mode = m;
  render();
}

// ── History screen ───────────────────────────────────────────
function renderHistory(container) {
  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">${iconSvg('back')}</span><span>History</span>`;
  back.addEventListener('click', closeHistory);
  container.appendChild(back);

  const bar = document.createElement('div');
  bar.className = 'hist-bar';
  const lim = state.settings.historyLimit;
  bar.innerHTML = `<span class="sync-lbl">Every change is recorded</span>`;
  const chip = document.createElement('span');
  chip.className = 'sync-btn';
  chip.textContent = 'Keep: ' + (lim === 0 ? 'all' : lim);
  chip.addEventListener('click', cycleHistLimit);
  bar.appendChild(chip);
  container.appendChild(bar);

  if (!state.history.length) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = 'No changes recorded yet';
    container.appendChild(hint);
    return;
  }

  const signCls = { '+': 'add', '-': 'del', '~': 'mod', '✓': 'done', '○': 'undone', '↩': 'res', '⇄': 'sync' };
  const list = document.createElement('div');
  list.className = 'category hist-list';
  state.history.slice(0, 400).forEach(h => {
    const line = document.createElement('div');
    line.className = 'cl-line ' + (signCls[h.s] || 'mod');
    line.innerHTML = `<span class="cl-sign">${h.s}</span><span class="cl-time">${fmtTs(h.ts)}</span><span class="cl-text">${esc(h.txt)}</span>`;
    if (h.d && !h.used) {
      const btn = document.createElement('span');
      btn.className = 'cl-restore';
      btn.textContent = '↩';
      btn.title = 'Restore';
      btn.addEventListener('click', ev => { ev.stopPropagation(); restoreH(h.id); });
      line.appendChild(btn);
    }
    list.appendChild(line);
  });
  container.appendChild(list);
}

function fmtTs(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString())
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function openHistory() {
  closeDrawer();
  armBack();
  setTimeout(() => flipTo(1, () => { historyView = true; settingsView = false; subtaskView = null; }), 260);
}
function closeHistory() { flipTo(-1, () => { historyView = false; }); }

// ── Settings screen ──────────────────────────────────────────
function renderSettings(container) {
  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">${iconSvg('back')}</span><span>Settings</span>`;
  back.addEventListener('click', closeSettings);
  container.appendChild(back);

  const frame = document.createElement('div');
  frame.className = 'category';
  frame.innerHTML = `<div class="category-header"><span class="cat-line"></span><span class="category-name">Spaces</span><span class="cat-line-mid"></span><span class="cat-line"></span></div>`;
  const list = document.createElement('div');
  list.className = 'tasks';

  state.spaces.forEach(sp => {
    const row = document.createElement('div');
    row.className = 'set-row';
    const hints = [];
    if (sp.shared) hints.push('shared');
    if (treeOn(sp) && !sp.shared) hints.push('tree');
    if (sp.tabDot) hints.push('no label');
    if ((sp.id === 'sp_wish' && !state.settings.wishlistOn) || (sp.shared && !state.settings.sharedOn)) hints.push('off');
    row.innerHTML = `<span class="set-name">${esc(sp.name)}${hints.length ? `<span class="set-hint"> · ${hints.join(' · ')}</span>` : ''}</span><span class="set-act">›</span>`;
    row.addEventListener('click', () => openSpaceSheet(sp.id));
    list.appendChild(row);
  });

  const addBtn = document.createElement('div');
  addBtn.className = 'add-task-btn';
  addBtn.innerHTML = `<div class="add-task-icon">${iconSvg('add')}</div><span>Add space</span>`;
  addBtn.addEventListener('click', () => openDialog('New space', '', val => {
    const sp = { id: uid('sp'), name: val, categories: [], mt: nextMt() };
    state.spaces.splice(Math.max(0, state.spaces.length - 1), 0, sp); // before shared
    logH('+', `Added space "${trunc(val)}"`);
    render();
  }, false));
  list.appendChild(addBtn);

  frame.appendChild(list);
  container.appendChild(frame);

  // ── Fonts ──
  const fonts = document.createElement('div');
  fonts.className = 'category';
  fonts.innerHTML = `<div class="category-header"><span class="cat-line"></span><span class="category-name">Fonts</span><span class="cat-line-mid"></span><span class="cat-line"></span></div>`;
  const fl = document.createElement('div');
  fl.className = 'tasks';
  fl.appendChild(chipRow('Text size', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']],
    state.settings.fontSize, v => {
      state.settings.fontSize = v;
      logH('~', `Text size → ${v.toUpperCase()}`);
      applyDisplay(); render();
    }));
  fl.appendChild(chipRow('Typeface', [['system', 'System'], ['mono', 'Mono'], ['serif', 'Serif']],
    state.settings.fontFamily, v => {
      state.settings.fontFamily = v;
      logH('~', `Typeface → ${v}`);
      applyDisplay(); render();
    }));
  fonts.appendChild(fl);
  container.appendChild(fonts);

  // ── Prices (any tree-mode space) ──
  const wish = document.createElement('div');
  wish.className = 'category';
  wish.innerHTML = `<div class="category-header"><span class="cat-line"></span><span class="category-name">Prices</span><span class="cat-line-mid"></span><span class="cat-line"></span></div>`;
  const wl = document.createElement('div');
  wl.className = 'tasks';
  wl.appendChild(chipRow('Currency', [['₽', '₽'], ['$', '$'], ['€', '€'], ['£', '£'], ['¥', '¥']],
    state.settings.currency, v => {
      state.settings.currency = v;
      logH('~', `Currency → ${v}`);
      render();
    }));
  wish.appendChild(wl);
  container.appendChild(wish);
}

// a labelled row of mutually-exclusive selectable chips
function chipRow(label, options, current, onPick) {
  const row = document.createElement('div');
  row.className = 'set-row chips';
  const name = document.createElement('span');
  name.className = 'set-name';
  name.textContent = label;
  row.appendChild(name);
  const group = document.createElement('div');
  group.className = 'chip-group';
  options.forEach(([val, lbl]) => {
    const chip = document.createElement('span');
    chip.className = 'mode-chip' + (val === current ? ' active' : '');
    chip.textContent = lbl;
    chip.addEventListener('click', () => { if (val !== current) onPick(val); });
    group.appendChild(chip);
  });
  row.appendChild(group);
  return row;
}

// ── Themes screen ────────────────────────────────────────────
function renderThemes(container) {
  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">${iconSvg('back')}</span><span>Themes</span>`;
  back.addEventListener('click', closeThemes);
  container.appendChild(back);

  const frame = document.createElement('div');
  frame.className = 'category';
  frame.innerHTML = `<div class="category-header"><span class="cat-line"></span><span class="category-name">Themes</span><span class="cat-line-mid"></span><span class="cat-line"></span></div>`;
  const list = document.createElement('div');
  list.className = 'tasks theme-list';
  THEMES.forEach(t => {
    const row = document.createElement('div');
    row.className = 'theme-item' + (state.theme === t.id ? ' active' : '');
    row.innerHTML = `<div class="theme-dot ${t.id}"></div><div class="theme-info"><div class="theme-name">${t.name}</div><div class="theme-sub">${t.sub}</div></div><div class="theme-check"></div>`;
    row.addEventListener('click', () => setTheme(t.id));
    list.appendChild(row);
  });
  frame.appendChild(list);
  container.appendChild(frame);
}

function openThemes() {
  closeDrawer();
  armBack();
  setTimeout(() => flipTo(1, () => { themesView = true; historyView = settingsView = false; subtaskView = null; }), 260);
}
function closeThemes() { flipTo(-1, () => { themesView = false; }); }

// ── Connection status screen ─────────────────────────────────
// Live list of sync endpoints with a green/amber/red dot each, so you
// can see which broker is carrying the sync (with or without a VPN).
function renderConn(container) {
  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">${iconSvg('back')}</span><span>Connection</span>`;
  back.addEventListener('click', closeConn);
  container.appendChild(back);

  const bar = document.createElement('div');
  bar.className = 'hist-bar';
  bar.innerHTML = `<span class="sync-lbl">${state.sync.room ? 'Room ' + esc(state.sync.room.id) : 'Not linked'}</span>`;
  const retest = document.createElement('span');
  retest.className = 'sync-btn';
  retest.textContent = 'Re-test';
  retest.addEventListener('click', () => { if (typeof startSync === 'function') { startSync(); toast('Re-testing…'); } });
  bar.appendChild(retest);
  container.appendChild(bar);

  const frame = document.createElement('div');
  frame.className = 'category';
  frame.innerHTML = `<div class="category-header"><span class="cat-line"></span><span class="category-name">Channels</span><span class="cat-line-mid"></span><span class="cat-line"></span></div>`;
  const list = document.createElement('div');
  list.className = 'tasks';

  // peer-to-peer row
  const p2pUp = typeof conn !== 'undefined' && conn && conn.open;
  list.appendChild(connRow(p2pUp ? 'up' : (state.sync.room ? 'wait' : 'down'),
    'Direct P2P', p2pUp ? 'connected' : 'standby', false));

  // one row per broker
  const stat = (typeof brokerStat !== 'undefined') ? brokerStat : {};
  (typeof brokerList === 'function' ? brokerList() : []).forEach(url => {
    const s = stat[url] || { state: state.sync.room ? 'wait' : 'down' };
    const sub = s.state === 'up' ? (s.active ? 'active' + (s.ms ? ' · ' + s.ms + 'ms' : '') : 'reachable' + (s.ms ? ' · ' + s.ms + 'ms' : ''))
      : s.state === 'wait' ? 'testing…' : 'unreachable';
    list.appendChild(connRow(s.state, brokerHostLabel(url), sub, s.active));
  });

  frame.appendChild(list);
  container.appendChild(frame);

  // ── Devices in the room ──
  if (state.sync.room) {
    const devs = (typeof onlineDevices === 'function') ? onlineDevices() : [];
    const dframe = document.createElement('div');
    dframe.className = 'category';
    dframe.innerHTML = `<div class="category-header"><span class="cat-line"></span><span class="category-name">Devices</span><span class="cat-line-mid"></span><span class="category-count">${devs.length + 1}</span><span class="cat-line"></span></div>`;
    const dlist = document.createElement('div');
    dlist.className = 'tasks';
    const me = (typeof DEV_ID !== 'undefined') ? DEV_ID : '';
    dlist.appendChild(connRow('up', 'This device', esc(me.slice(0, 6)) + ' · you', true));
    devs.sort((a, b) => b.ts - a.ts).forEach(d => {
      dlist.appendChild(connRow('up', d.id.slice(0, 6), fmtAgo(d.ts) + ' · ' + d.via, false));
    });
    if (!devs.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No other devices online';
      dlist.appendChild(hint);
    }
    dframe.appendChild(dlist);
    container.appendChild(dframe);
  }
}

function fmtAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return s + 's ago';
  return Math.round(s / 60) + 'm ago';
}

function brokerHostLabel(url) {
  const m = url.replace(/^wss?:\/\//, '');
  return m.length > 34 ? m.slice(0, 34) + '…' : m;
}

function connRow(stateName, name, sub, active) {
  const row = document.createElement('div');
  row.className = 'conn-row';
  const cls = stateName === 'up' ? 'on' : stateName === 'wait' ? 'wait' : 'err';
  row.innerHTML = `<span class="sync-dot ${cls}"></span>` +
    `<span class="conn-name">${esc(name)}${active ? ' <span class="conn-active">●</span>' : ''}</span>` +
    `<span class="conn-sub">${esc(sub)}</span>`;
  return row;
}

function openConn() {
  closeSheet();
  armBack();
  if (typeof startSync === 'function') startSync(); // kick a fresh probe
  setTimeout(() => flipTo(1, () => { connView = true; themesView = historyView = settingsView = false; subtaskView = null; }), 260);
}
function closeConn() { flipTo(-1, () => { connView = false; }); }

// Per-space options: rename, subtask style, tab label, enable, delete
function openSpaceSheet(spId) {
  const sp = state.spaces.find(s => s.id === spId);
  if (!sp) return;
  const items = [
    { icon: '✏️', label: 'Rename space', action: () => promptRenameSpace(spId) },
  ];
  if (!sp.shared) items.push({
    icon: '∴',
    label: `Subtasks: ${sp.tree ? 'tree' : 'stripes'} — tap to switch`,
    action: () => {
      sp.tree = !sp.tree;
      logH('~', `"${trunc(sp.name)}" subtasks → ${sp.tree ? 'tree' : 'stripes'}`);
      render();
    },
  });
  items.push({
    icon: '◦',
    label: `Tab label: ${sp.tabDot ? 'hidden' : 'shown'} — tap to switch`,
    action: () => {
      sp.tabDot = !sp.tabDot;
      logH('~', `"${trunc(sp.name)}" tab label ${sp.tabDot ? 'hidden' : 'shown'}`);
      render();
    },
  });
  if (sp.id === 'sp_wish' || sp.shared) {
    const key = sp.shared ? 'sharedOn' : 'wishlistOn';
    items.push({
      icon: '⏻',
      label: state.settings[key] ? 'Disable this space' : 'Enable this space',
      action: () => {
        state.settings[key] = !state.settings[key];
        logH('~', `${sp.name} space ${state.settings[key] ? 'enabled' : 'disabled'}`);
        spaceIndex = 0;
        render();
      },
    });
  }
  if (sp.id !== 'sp_todo' && sp.id !== 'sp_wish' && !sp.shared) {
    items.push({ icon: '🗑️', label: 'Delete space', danger: true, action: () => deleteSpace(spId) });
  }
  openSheet(sp.name, items);
}

function promptRenameSpace(spId) {
  const sp = state.spaces.find(s => s.id === spId);
  if (!sp) return;
  openDialog('Rename space', sp.name, val => {
    logH('~', `Renamed space "${trunc(sp.name)}" → "${trunc(val)}"`);
    sp.name = val;
    stamp(sp);
    render();
  }, false);
}

function deleteSpace(spId) {
  const sp = state.spaces.find(s => s.id === spId);
  if (!sp || sp.id === 'sp_todo' || sp.shared) return;
  openSheet(`Delete space "${trunc(sp.name, 24)}"?`, [
    { icon: '✕', label: 'Yes, delete', danger: true, action: () => {
        logH('-', `Deleted space "${trunc(sp.name)}"`, { k: 'space_del', space: sp });
        state.spaces = state.spaces.filter(s => s.id !== spId);
        spaceIndex = 0;
        render();
      } },
    { icon: '←', label: 'Cancel', action: () => { } },
  ]);
}

function openSettings() {
  closeDrawer();
  armBack();
  setTimeout(() => flipTo(1, () => { settingsView = true; historyView = false; subtaskView = null; }), 260);
}
function closeSettings() { flipTo(-1, () => { settingsView = false; }); }

// ── Page peel engine ─────────────────────────────────────────
// Full-screen page curl: a snapshot of the current screen lies on top of
// the (already rendered) target screen and peels away from the corner —
// clip-path reveals the page underneath while a rolled-paper strip
// (.flip-curl) follows the fold line. dir 1 peels toward the left
// (forward), dir -1 mirrors it (back). Finger-driven via p ∈ [0..1].
let flip = null;

function buildPeelLayer(dir) {
  const main = document.getElementById('main');
  const layer = document.createElement('div');
  layer.className = 'flip-page';
  const sy = window.scrollY;
  layer.style.top = sy + 'px';
  layer.style.height = window.innerHeight + 'px';

  const content = document.createElement('div');
  content.className = 'flip-content';
  const inner = document.createElement('div');
  inner.className = 'flip-inner';
  inner.style.transform = `translateY(${-sy}px)`;
  [...main.children].forEach(ch => {
    if (ch.id === 'drawerMask' || ch.classList.contains('flip-page')) return;
    inner.appendChild(ch.cloneNode(true));
  });
  content.appendChild(inner);

  const curl = document.createElement('div');
  curl.className = 'flip-curl';

  layer.appendChild(content);
  layer.appendChild(curl);
  main.appendChild(layer);
  flip = { layer, content, curl, dir, p: 0 };
  setPeel(0);
  return layer;
}

function setPeel(p) {
  if (!flip) return;
  p = Math.min(1, Math.max(0, p));
  flip.p = p;
  const W = window.innerWidth, H = window.innerHeight;
  const s = W * 0.38;       // fold slant: the bottom corner leads the turn
  const T = W + s;          // total sweep so the page clears the screen
  const xB = W - p * T;     // fold intersection with the bottom edge
  const xT = xB + s;        // …and with the top edge (may be off-screen)

  let poly;
  if (xT >= W) {
    // early phase: only the bottom corner is folded over
    const yR = H * (1 - (W - xB) / s);
    poly = [[0, 0], [W, 0], [W, yR], [xB, H], [0, H]];
  } else {
    poly = [[0, 0], [xT, 0], [xB, H], [0, H]];
  }
  const mx = x => flip.dir === 1 ? x : W - x;
  flip.content.style.clipPath =
    'polygon(' + poly.map(([x, y]) => `${mx(x).toFixed(1)}px ${y.toFixed(1)}px`).join(',') + ')';

  if (p < 0.004 || p > 0.996) { flip.curl.style.opacity = 0; return; }
  flip.curl.style.opacity = 1;
  const cw = 26 + 58 * Math.sin(Math.PI * Math.min(p * 1.25, 1)); // paper roll width
  const L = Math.hypot(s, H) + 90;
  const midX = mx((xB + xT) / 2), midY = H / 2;
  const ang = Math.atan2(s, H) * (flip.dir === 1 ? 1 : -1) * 180 / Math.PI;
  flip.curl.style.width = cw + 'px';
  flip.curl.style.height = L + 'px';
  flip.curl.style.transform =
    `translate(${(midX - cw / 2).toFixed(1)}px, ${(midY - L / 2).toFixed(1)}px) rotate(${ang.toFixed(2)}deg)`;
}

function tweenPeel(from, to, done) {
  const dur = 420, t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  flip.tweening = true;
  flip.done = done;
  (function step(now) {
    if (!flip) return;
    const k = Math.min(1, (now - t0) / dur);
    setPeel(from + (to - from) * ease(k));
    if (k < 1) flip.raf = requestAnimationFrame(step);
    else { flip.tweening = false; const d = flip.done; flip.done = null; d && d(); }
  })(t0);
}

// Instantly finish an in-progress peel tween so a fast follow-up swipe
// isn't dropped during the ~420ms animation (the "swipe sometimes stalls").
function settleFlip() {
  if (flip && flip.tweening) {
    if (flip.raf) cancelAnimationFrame(flip.raf);
    flip.tweening = false;
    const d = flip.done; flip.done = null;
    if (d) d();
  }
}

// Finger-driven peel between spaces
function flipDragStart(dir, tgtIdx) {
  settleFlip();
  if (flip) return false;
  const vis = visSpaces();
  const tgt = tgtIdx !== undefined ? tgtIdx : spaceIndex + dir;
  if (tgt < 0 || tgt >= vis.length || tgt === spaceIndex) return false;
  reorderMode = false; // leave reorder mode when changing spaces
  buildPeelLayer(dir);
  flip.prevIndex = spaceIndex;
  spaceIndex = tgt;
  render(); // target page is real and live underneath the peeling snapshot
  return true;
}
function flipDragMove(p) { if (flip) setPeel(p); }
function flipDragEnd(commit) {
  if (!flip) return;
  const f = flip;
  tweenPeel(f.p, commit ? 1 : 0, () => {
    if (!commit) { spaceIndex = f.prevIndex; render(); }
    else if (spaceIndex > 0) armBack(); // hardware back returns to the first space
    f.layer.remove();
    flip = null;
  });
}

function flipToSpace(i) {
  settleFlip();
  if (i === spaceIndex || flip) return;
  if (flipDragStart(i > spaceIndex ? 1 : -1, i)) flipDragEnd(true);
}

// Finger-driven "back" peel out of a nested screen (subtask/history/settings).
// A rightward swipe turns the nested page away like the space flip, landing
// back on the space it was opened from. Mirrors closeSubtasks/History/Settings.
function flipBackDragStart() {
  settleFlip();
  if (flip) return false;
  let restore;
  if (subtaskView) { const v = subtaskView; restore = () => { subtaskView = v; }; subtaskView = null; }
  else if (historyView) { restore = () => { historyView = true; }; historyView = false; }
  else if (settingsView) { restore = () => { settingsView = true; }; settingsView = false; }
  else if (themesView) { restore = () => { themesView = true; }; themesView = false; }
  else if (connView) { restore = () => { connView = true; }; connView = false; }
  else return false;
  buildPeelLayer(-1);
  flip.backRestore = restore;
  render(); // the space is now live underneath the peeling nested snapshot
  return true;
}
function flipBackDragEnd(commit) {
  if (!flip) return;
  const f = flip;
  tweenPeel(f.p, commit ? 1 : 0, () => {
    if (!commit && f.backRestore) { f.backRestore(); render(); }
    f.layer.remove();
    flip = null;
  });
}

// Programmatic peel for nested screens (subtasks, history, settings)
function flipTo(dir, mutate) {
  settleFlip();
  if (flip) { mutate(); render(); return; }
  buildPeelLayer(dir);
  mutate();
  render();
  const f = flip;
  tweenPeel(0, 1, () => { f.layer.remove(); flip = null; });
}

// ── Category reorder (dedicated mode, drag by the handle) ────
// Entered from the category menu ("Reorder categories"); a drag handle ⠿
// appears on each header. Pressing the handle starts the drag immediately
// (no long-press, no accidental lift) — neighbours slide out of the way.
const CAT_GAP = 18; // matches .categories flex gap in CSS

function setupReorderDrag(handle, catEl, catId) {
  const start = (e) => {
    if (e.cancelable) e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    beginHandleDrag(catEl, catId, p.clientY);
  };
  handle.addEventListener('touchstart', start, { passive: false });
  handle.addEventListener('mousedown', start);
}

function beginHandleDrag(catEl, catId, sy) {
  const els = [...document.querySelectorAll('#categoriesContainer > .category')];
  const i0 = els.indexOf(catEl);
  if (i0 < 0) return;
  let target = i0;
  const mids = els.map(el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; });
  const slot = catEl.offsetHeight + CAT_GAP;
  navigator.vibrate && navigator.vibrate(15);
  catEl.classList.add('drag-lift');
  els.forEach(el => { if (el !== catEl) el.classList.add('drag-shift'); });

  const move = (e) => {
    if (e.cancelable) e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    const dy = p.clientY - sy;
    catEl.style.transform = `translateY(${dy}px)`;
    const center = mids[i0] + dy;
    target = i0;
    els.forEach((el, j) => {
      if (j === i0) return;
      if (j < i0 && center < mids[j]) { el.style.transform = `translateY(${slot}px)`; target = Math.min(target, j); }
      else if (j > i0 && center > mids[j]) { el.style.transform = `translateY(${-slot}px)`; target = Math.max(target, j); }
      else el.style.transform = '';
    });
  };
  const end = () => {
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', end);
    document.removeEventListener('touchcancel', end);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', end);
    if (target !== i0) {
      const arr = cats();
      const [cat] = arr.splice(i0, 1);
      arr.splice(target, 0, cat);
      logH('~', `Moved category "${trunc(cat.name)}"`);
    }
    render(); // clears lift/shift classes and inline transforms, stays in reorder mode
  };
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end);
  document.addEventListener('touchcancel', end);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);
}

// ── Tap routing: single = toggle / open, double = open subtasks ──
// Single tap stays instant: a plain task toggles right away and its history
// entry is deferred past the double-tap window, so a quick second tap can
// cancel the toggle cleanly and open the subtask screen instead.
const DOUBLE_MS = 280;
let taskTap = { id: null, t: 0, logTimer: null, undo: null };

function onTaskTap(catId, taskId) {
  if (holdConsumed) { holdConsumed = false; return; } // a hold just fired
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  const hasSubs = task.subtasks && task.subtasks.length;
  const now = Date.now();

  if (taskTap.id === taskId && now - taskTap.t < DOUBLE_MS) {
    // double tap → open subtasks; undo the optimistic first-tap toggle
    clearTimeout(taskTap.logTimer);
    if (taskTap.undo) taskTap.undo();
    taskTap = { id: null, t: 0, logTimer: null, undo: null };
    openSubtasks(catId, taskId);
    return;
  }

  if (hasSubs) { // single tap on a task that has subtasks opens them
    taskTap = { id: taskId, t: now, logTimer: null, undo: null };
    openSubtasks(catId, taskId);
    return;
  }

  // plain task: toggle now, log after the double-tap window
  applyToggle(task, taskId, () => updateCategoryCount(catId));
  stamp(task);
  saveState();
  const wasDone = task.done, text = task.text;
  const undo = () => { applyToggle(task, taskId, () => updateCategoryCount(catId)); stamp(task); saveState(); };
  taskTap = {
    id: taskId, t: now, undo,
    logTimer: setTimeout(() => {
      logH(wasDone ? '✓' : '○', `${wasDone ? 'Completed' : 'Reopened'} "${trunc(text)}"`);
      if (historyView) render();
      taskTap.logTimer = null; taskTap.undo = null;
    }, DOUBLE_MS + 30),
  };
}

// ── Multi-tap helper ─────────────────────────────────────────
// Fires cb on the Nth quick tap (default 3). Uses `click`, which fires
// exactly once per tap on every device (touch and mouse) and never on a
// scroll/drag — unlike touchend+mouseup, which double-counted synthetic
// mouse events on real phones and made the count unreliable.
function setupTripleTap(el, cb, n = 3) {
  let count = 0, timer = null;
  el.addEventListener('click', () => {
    count++;
    clearTimeout(timer);
    if (count >= n) { count = 0; cb(); return; }
    timer = setTimeout(() => { count = 0; }, 600);
  });
}

// ── Subtask screen ───────────────────────────────────────────
// Nested screen: one task's subtasks, framed like a category
function renderSubtasks(container) {
  const cat = cats().find(c => c.id === subtaskView.catId);
  const task = cat?.tasks.find(t => t.id === subtaskView.taskId);
  if (!task) { subtaskView = null; renderSpace(container, curSpace()); renderTabs(); return; }
  const subs = task.subtasks = task.subtasks || [];

  const back = document.createElement('div');
  back.className = 'subtask-back';
  back.innerHTML = `<span class="sb-arrow">${iconSvg('back')}</span><span>${esc(cat.name)}</span>`;
  back.addEventListener('click', closeSubtasks);
  container.appendChild(back);

  const catEl = document.createElement('div');
  catEl.className = 'category subtask-view';
  catEl.dataset.catId = cat.id;

  const priced = hasPrices(curSpace());
  const doneN = subs.filter(s => s.done).length;
  const name = trunc(task.text, 28);
  let count = `${doneN}/${subs.length}`;
  if (priced) { const sum = taskPrice(task); if (sum > 0) count += ` · ${fmtPrice(sum)}`; }
  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `<span class="cat-line"></span><span class="category-name">${esc(name)}</span><span class="cat-line-mid"></span><span class="category-count">${esc(count)}</span><span class="cat-line"></span>`;
  // triple tap on the subtask header clears completed subtasks
  setupTripleTap(header, () => {
    if (subs.some(s => s.done)) { navigator.vibrate && navigator.vibrate(20); clearCompletedSubtasks(cat.id, task.id); }
  });
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
    const subPriceHtml = (priced && sub.price != null && sub.price !== '')
      ? `<span class="task-price">${esc(fmtPrice(Number(sub.price)))}</span>` : '';
    el.innerHTML = `<div class="task-bullet"></div><div class="task-text"><span class="strike-wrap">${esc(sub.text)}</span></div>${subPriceHtml}`;
    el.addEventListener('click', () => { if (holdConsumed) { holdConsumed = false; return; } toggleSubtask(cat.id, task.id, sub.id); });
    setupHold(el, () => promptEditSubtask(cat.id, task.id, sub.id), () => openSubtaskSheet(cat.id, task.id, sub.id));
    tasksEl.appendChild(el);
  });

  const addBtn = document.createElement('div');
  addBtn.className = 'add-task-btn';
  addBtn.innerHTML = `<div class="add-task-icon">${iconSvg('add')}</div><span>Add subtask</span>`;
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

// Two-stage hold: hold and release within the menu window → onEdit;
// keep holding past it → onMenu (with a vibration cue at the switch).
// `holdConsumed` suppresses the trailing click so it doesn't also toggle.
let holdConsumed = false;
const HOLD_EDIT = 350, HOLD_MENU = 1000;
function setupHold(el, onEdit, onMenu) {
  let sx = 0, sy = 0, phase = 0, menuT = null, editT = null;
  const consume = () => { holdConsumed = true; setTimeout(() => { holdConsumed = false; }, 500); };
  const start = (e) => {
    const p = e.touches ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY; phase = 0;
    el.classList.add('pressing');
    editT = setTimeout(() => { phase = 1; el.classList.add('hold-edit'); navigator.vibrate && navigator.vibrate(8); }, HOLD_EDIT);
    menuT = setTimeout(() => {
      phase = 2; el.classList.remove('pressing', 'hold-edit');
      navigator.vibrate && navigator.vibrate(28);
      consume(); onMenu();
    }, HOLD_MENU);
  };
  const clear = () => { clearTimeout(editT); clearTimeout(menuT); el.classList.remove('pressing', 'hold-edit'); };
  const end = () => {
    clearTimeout(editT); clearTimeout(menuT); el.classList.remove('pressing', 'hold-edit');
    if (phase === 1) { consume(); onEdit(); }  // released in the edit window
    phase = 0;
  };
  const move = (e) => { const p = e.touches ? e.touches[0] : e; if (Math.abs(p.clientX - sx) > 9 || Math.abs(p.clientY - sy) > 9) clear(); };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', clear);
  el.addEventListener('touchmove', move, { passive: true });
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', end);
  el.addEventListener('mouseleave', clear);
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
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.subtasks && task.subtasks.length) { openSubtasks(catId, taskId); return; }
  applyToggle(task, taskId, () => updateCategoryCount(catId));
  stamp(task);
  logH(task.done ? '✓' : '○', `${task.done ? 'Completed' : 'Reopened'} "${trunc(task.text)}"`);
  saveState();
}

function toggleSubtask(catId, taskId, subId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  const sub = task?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  applyToggle(sub, subId, updateSubtaskCount);
  syncParentDone(task);
  stamp(task);
  logH(sub.done ? '✓' : '○', `${sub.done ? 'Completed' : 'Reopened'} subtask "${trunc(sub.text)}"`);
  saveState();
}

// ── Subtasks ─────────────────────────────────────────────────
function openSubtasks(catId, taskId) { armBack(); flipTo(1, () => { subtaskView = { catId, taskId }; }); }
function closeSubtasks() { flipTo(-1, () => { subtaskView = null; }); }

// A task with subtasks is done exactly when all of them are done
function syncParentDone(task) {
  if (task.subtasks && task.subtasks.length) task.done = task.subtasks.every(s => s.done);
}

function updateSubtaskCount() {
  if (!subtaskView) return;
  const task = cats().find(c => c.id === subtaskView.catId)?.tasks.find(t => t.id === subtaskView.taskId);
  const countEl = document.querySelector('.category.subtask-view .category-count');
  if (task && countEl) countEl.textContent = `${task.subtasks.filter(s => s.done).length}/${task.subtasks.length}`;
}

function promptAddSubtask(catId, taskId) {
  openDialog('New subtask', state.draft || '', val => {
    const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.subtasks = task.subtasks || [];
    task.subtasks.push({ id: uid('s'), text: val, done: false });
    syncParentDone(task);
    stamp(task);
    state.draft = '';
    logH('+', `Added subtask "${trunc(val)}" to "${trunc(task.text, 20)}"`);
    render();
  }, true, true);
}

function promptEditSubtask(catId, taskId, subId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  const sub = task?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  openDialog('Edit subtask', sub.text, val => {
    logH('~', `Edited subtask "${trunc(sub.text, 20)}" → "${trunc(val, 20)}"`,
      Object.assign({ k: 'sub_edit', catId, taskId, subId, old: sub.text }, histCtx()));
    sub.text = val;
    stamp(task);
    render();
  }, true);
}

function deleteSubtask(catId, taskId, subId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  const sub = task.subtasks.find(s => s.id === subId);
  if (sub) logH('-', `Deleted subtask "${trunc(sub.text)}"`,
    Object.assign({ k: 'sub_del', catId, taskId, sub }, histCtx()));
  task.subtasks = task.subtasks.filter(s => s.id !== subId);
  syncParentDone(task);
  stamp(task);
  render();
}

// ── Task / category actions ──────────────────────────────────
function clearCompletedTasks(catId) {
  const cat = cats().find(c => c.id === catId);
  if (!cat) return;

  const doneTasks = cat.tasks.filter(t => t.done);
  if (!doneTasks.length) return;

  const space = curSpace();
  logH('-', `Cleared ${doneTasks.length} completed in "${trunc(cat.name)}"`, Object.assign({
    k: 'tasks_clear',
    items: doneTasks.map(t => ({ catId: cat.id, catName: cat.name, task: t })),
  }, histCtx()));
  doneTasks.forEach(t => tombIfShared(space, t.id));

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
    stamp(cat);
    render();
  }, totalTime);
}

// clear completed subtasks of a task (used by triple-tap on the subtask screen)
function clearCompletedSubtasks(catId, taskId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  const done = task.subtasks.filter(s => s.done);
  if (!done.length) return;

  logH('-', `Cleared ${done.length} completed subtasks in "${trunc(task.text)}"`,
    Object.assign({ k: 'subs_clear', catId, taskId, subs: done }, histCtx()));

  const STAGGER = 75, ANIM_DUR = 2000;
  done.forEach((sub, i) => {
    if (animTimers[sub.id]) { clearTimeout(animTimers[sub.id]); delete animTimers[sub.id]; }
    const el = document.querySelector(`.task-item[data-id="${sub.id}"]`);
    if (!el) return;
    el.style.animationDelay = `${i * STAGGER}ms`;
    el.classList.add('slide-out');
  });
  setTimeout(() => {
    task.subtasks = task.subtasks.filter(s => !s.done);
    syncParentDone(task);
    stamp(task);
    render();
  }, (done.length - 1) * STAGGER + ANIM_DUR);
}

function clearAllCompleted() {
  const space = curSpace();
  const allDone = [];
  cats().forEach(cat => {
    cat.tasks.filter(t => t.done).forEach(task => allDone.push({ cat, task }));
  });
  if (!allDone.length) return;

  logH('-', `Cleared ${allDone.length} completed in "${trunc(space.name)}"`, Object.assign({
    k: 'tasks_clear',
    items: allDone.map(({ cat, task }) => ({ catId: cat.id, catName: cat.name, task })),
  }, histCtx()));
  allDone.forEach(({ task }) => tombIfShared(space, task.id));

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
    spCats(space).forEach(cat => { cat.tasks = cat.tasks.filter(t => !t.done); stamp(cat); });
    render();
  }, totalTime);
}

function updateCategoryCount(catId) {
  const cat = cats().find(c => c.id === catId);
  if (!cat) return;
  const doneN = cat.tasks.filter(t => t.done).length;
  const catEl = document.querySelector(`.category[data-cat-id="${catId}"]`);
  if (catEl) {
    const countEl = catEl.querySelector('.category-count');
    if (countEl) countEl.textContent = `${doneN}/${cat.tasks.length}`;
  }
}

function addCategory(name) {
  cats().push({ id: uid('c'), name, tasks: [], mt: nextMt() });
  logH('+', `Added category "${trunc(name)}"`);
  render();
}

function promptRenameCategory(catId) {
  const cat = cats().find(c => c.id === catId);
  if (!cat) return;
  openDialog('Rename category', cat.name, val => {
    logH('~', `Renamed category "${trunc(cat.name, 20)}" → "${trunc(val, 20)}"`,
      Object.assign({ k: 'cat_rename', catId, old: cat.name }, histCtx()));
    cat.name = val;
    stamp(cat);
    render();
  }, false);
}

function deleteCategory(catId) {
  const space = curSpace();
  const list = spCats(space);
  const idx = list.findIndex(c => c.id === catId);
  if (idx === -1) return;
  const cat = list[idx];
  logH('-', `Deleted category "${trunc(cat.name)}" (${cat.tasks.length} tasks)`,
    Object.assign({ k: 'cat_del', index: idx, category: cat }, histCtx()));
  tombIfShared(space, catId);
  list.splice(idx, 1);
  render();
}

function promptEditTask(catId, taskId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  openDialog('Edit task', task.text, val => {
    logH('~', `Edited "${trunc(task.text, 20)}" → "${trunc(val, 20)}"`,
      Object.assign({ k: 'task_edit', catId, taskId, old: task.text }, histCtx()));
    task.text = val;
    stamp(task);
    render();
  }, true);
}

function parsePrice(val) {
  const n = parseFloat(String(val).replace(',', '.').replace(/[^\d.]/g, ''));
  return (!String(val).trim() || isNaN(n)) ? null : n;
}
// price on a leaf task (a task with no subtasks)
function promptSetPrice(catId, taskId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  openDialog(`Price in ${curSym()} — leave empty to clear`, task.price != null ? String(task.price) : '', val => {
    const n = parsePrice(val);
    if (n == null) { delete task.price; logH('~', `Cleared price for "${trunc(task.text)}"`); }
    else { task.price = n; logH('~', `Price ${fmtPrice(n)} for "${trunc(task.text)}"`); }
    stamp(task);
    render();
  }, false);
}
// price on a subtask (a leaf in the tree)
function promptSetSubPrice(catId, taskId, subId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  const sub = task?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  openDialog(`Price in ${curSym()} — leave empty to clear`, sub.price != null ? String(sub.price) : '', val => {
    const n = parsePrice(val);
    if (n == null) { delete sub.price; logH('~', `Cleared price for "${trunc(sub.text)}"`); }
    else { sub.price = n; logH('~', `Price ${fmtPrice(n)} for "${trunc(sub.text)}"`); }
    stamp(task);
    render();
  }, false);
}

function deleteTask(catId, taskId) {
  const space = curSpace();
  const cat = spCats(space).find(c => c.id === catId);
  const task = cat?.tasks.find(t => t.id === taskId);
  if (!cat || !task) return;
  logH('-', `Deleted "${trunc(task.text)}" from "${trunc(cat.name, 18)}"`,
    Object.assign({ k: 'task_del', catId, catName: cat.name, task }, histCtx()));
  tombIfShared(space, taskId);
  cat.tasks = cat.tasks.filter(t => t.id !== taskId);
  stamp(cat);
  render();
}

function promptAddTask(catId) {
  openDialog('New task', state.draft || '', val => {
    const cat = cats().find(c => c.id === catId);
    if (!cat) return;
    cat.tasks.push({ id: uid('t'), text: val, done: false, mt: nextMt() });
    stamp(cat);
    state.draft = '';
    logH('+', `Added "${trunc(val)}" to "${trunc(cat.name, 18)}"`);
    render();
  }, true, true);
}

function clearSpace() {
  const space = curSpace();
  const list = spCats(space);
  if (!list.length) return;
  logH('-', `Cleared the whole "${trunc(space.name)}"${space.shared ? ' · ' + space.mode + ' board' : ''}`,
    Object.assign({ k: 'space_wipe', categories: list }, histCtx()));
  list.forEach(c => tombIfShared(space, c.id));
  if (space.shared) space.boards[space.mode] = [];
  else space.categories = [];
  render();
}

function confirmClearAll() {
  closeDrawer();
  setTimeout(() => openSheet(`Clear "${trunc(curSpace().name, 20)}" space?`, [
    { icon: '✕', label: 'Yes, delete all', danger: true, action: clearSpace },
    { icon: '←', label: 'Cancel', action: () => { } },
  ]), 300);
}

// ── Export to clipboard (markdown checklist) ─────────────────
function mdTask(t) {
  let s = `- [${t.done ? 'x' : ' '}] ${t.text}`;
  (t.subtasks || []).forEach(st => { s += `\n  - [${st.done ? 'x' : ' '}] ${st.text}`; });
  return s;
}
function mdCategory(cat) {
  return `## ${cat.name}\n` + (cat.tasks.length ? cat.tasks.map(mdTask).join('\n') : '_empty_');
}
function exportTask(catId, taskId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  copyText(mdTask(task));
  toast('Task copied to clipboard');
  logH('~', `Exported task "${trunc(task.text)}"`);
}
function exportSubtask(catId, taskId, subId) {
  const sub = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId)?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  copyText(`- [${sub.done ? 'x' : ' '}] ${sub.text}`);
  toast('Subtask copied to clipboard');
  logH('~', `Exported subtask "${trunc(sub.text)}"`);
}
function exportCategory(catId) {
  const cat = cats().find(c => c.id === catId);
  if (!cat) return;
  copyText(mdCategory(cat));
  toast('Category copied to clipboard');
  logH('~', `Exported category "${trunc(cat.name)}"`);
}
function exportSpaceAll() {
  const sp = curSpace();
  const list = cats();
  copyText(`# ${sp.name}${sp.shared ? ' · ' + (sp.mode === 'wish' ? 'Wishlist' : 'To-Do') : ''}\n\n` +
    (list.length ? list.map(mdCategory).join('\n\n') : '_empty_'));
  toast('Space copied to clipboard');
  logH('~', `Exported space "${trunc(sp.name)}"`);
}

// ── Import from clipboard ────────────────────────────────────
// Lenient markdown-checklist parser: '## Name' starts a category;
// '- [x] text', '- text', '1) text', '2. text' or bare lines are tasks;
// indented ones are subtasks of the task above. '# Title' is skipped.
function parseChecklist(text) {
  const out = [];
  let cat = null, lastTask = null;
  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trimEnd();
    if (!line.trim()) return;
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.+)/))) {
      if (m[1].length === 1) return; // space title — ignore
      cat = { id: uid('c'), name: m[2].trim(), tasks: [], mt: nextMt() };
      out.push(cat);
      lastTask = null;
      return;
    }
    const isSub = /^(\s{2,}|\t)/.test(raw);
    // bullets (- * +), numbered (1. 1) 2)), lettered (a. a)) or a bare line
    const tm = line.trim().match(/^(?:[-*+]|\d{1,3}[.)]|[a-zA-Z][.)])\s*(?:\[([ xX])\])?\s*(.*)$/);
    const done = !!tm && (tm[1] || '').toLowerCase() === 'x';
    const txt = (tm ? tm[2] : line.trim()).trim();
    if (!txt) return;
    if (isSub && lastTask) {
      lastTask.subtasks = lastTask.subtasks || [];
      lastTask.subtasks.push({ id: uid('s'), text: txt, done });
      syncParentDone(lastTask);
    } else {
      if (!cat) {
        cat = { id: uid('c'), name: 'Imported', tasks: [], mt: nextMt() };
        out.push(cat);
      }
      lastTask = { id: uid('t'), text: txt, done, mt: nextMt() };
      cat.tasks.push(lastTask);
    }
  });
  return out.filter(c => c.tasks.length);
}

function pasteFromClipboard() {
  const openEditor = initial => openDialog('Paste & edit, then save', initial, val => {
    const imported = parseChecklist(val);
    if (!imported.length) { toast('Nothing recognizable to import'); return; }
    imported.forEach(c => cats().push(c));
    const n = imported.reduce((a, c) => a + c.tasks.length, 0);
    logH('+', `Imported ${imported.length} ${imported.length === 1 ? 'category' : 'categories'} (${n} tasks) from clipboard`);
    toast(`Imported ${n} task${n === 1 ? '' : 's'}`);
    render();
  }, true);
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(t => openEditor(t || '')).catch(() => openEditor(''));
  } else openEditor('');
}

// ── Hardware back (Capacitor) ────────────────────────────────
// The native back button/gesture closes layers like a cancel action;
// at the root it minimizes the app. Web fallback: history sentinel in ui.js.
if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) {
  Capacitor.Plugins.App.addListener('backButton', () => {
    if (closeTopLayer()) return;
    const App = Capacitor.Plugins.App;
    App.minimizeApp ? App.minimizeApp() : App.exitApp();
  });
}

// ── Helpers + Init ───────────────────────────────────────────
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
loadState();
if (firstRun) {
  // fresh install: start from an empty canvas and run the tour
  state.spaces.forEach(sp => { if (sp.categories) sp.categories = []; });
  state.settings.onboarded = false;
} else if (state.settings.onboarded === undefined) {
  state.settings.onboarded = true; // existing users skip the tour (replay from About)
}
applyTheme();
applyDisplay();
fillIcons();
render();
if (!state.settings.onboarded) {
  setTimeout(() => { if (typeof openTour === 'function') openTour(); }, 350);
}
