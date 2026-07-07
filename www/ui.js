// ── App meta ─────────────────────────────────────────────────
const APP_VERSION = '2.9';
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
  drag: 'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z',
  tag: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
  search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  alarm: 'M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  schedule: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  attach: 'M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z',
  image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  eyeoff: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  file: 'M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z',
};
// emoji currently passed around → Material icon name
const EMOJI_MI = {
  '✏️': 'edit', '🗑️': 'delete', '✓': 'check', '○': 'circle', '✕': 'close',
  '+': 'add', '←': 'back', '→': 'forward', '⧉': 'copy', '📋': 'copy', '⇪': 'paste',
  '≡': 'list', '∴': 'tree', '◦': 'label', '⏻': 'power', '⟳': 'sync', '🛰': 'dns',
  '📶': 'wifi', '⇣': 'download', '↺': 'restore', '✉': 'share', '↗': 'open',
  '🌿': 'eco', '◐': 'palette', '⚙': 'settings', '±': 'history', 'ⓘ': 'info',
  '⠿': 'drag', '🎓': 'school', '📶': 'wifi', '🏷': 'tag', '⏰': 'alarm',
  '📎': 'attach', '🖼': 'image', '📄': 'file', '👁': 'eye',
};
// ── i18n ─────────────────────────────────────────────────────
// Keys are the English strings; menus, dialogs, sheets and toasts are
// translated at the display layer (openSheet/openDialog/toast/chipRow),
// so most call sites stay plain English. Unknown keys pass through.
const I18N = {
  ru: {
    'Menu': 'Меню', 'Search': 'Поиск', 'Themes': 'Темы', 'Settings': 'Настройки', 'History': 'История', 'About': 'О приложении', 'Clear All': 'Очистить всё',
    'Cancel': 'Отмена', 'Save': 'Сохранить', 'Ctrl + Enter to save': 'Ctrl + Enter — сохранить', 'Describe your task…': 'Опиши задачу…', 'Category name…': 'Название категории…',
    'Options': 'Опции', 'Mark complete': 'Отметить выполненной', 'Mark incomplete': 'Снять отметку', 'Subtasks': 'Подзадачи', 'Edit task': 'Изменить задачу', 'Set price': 'Указать цену', 'Price': 'Цена',
    'Set reminder': 'Напоминание', 'Reminder': 'Напоминание', 'Attachments': 'Вложения', 'Send to space…': 'Отправить в пространство…', 'Copy as text': 'Скопировать текстом', 'Delete task': 'Удалить задачу',
    'Edit subtask': 'Изменить подзадачу', 'Delete subtask': 'Удалить подзадачу', 'Rename category': 'Переименовать категорию', 'Delete category': 'Удалить категорию', 'Clear completed': 'Убрать выполненные',
    'Rename space': 'Переименовать пространство', 'Delete space': 'Удалить пространство', 'New category': 'Новая категория', 'New task': 'Новая задача', 'New subtask': 'Новая подзадача', 'New space': 'Новое пространство',
    'Add space': 'Добавить пространство', 'Add category': 'Добавить категорию', 'Add task': 'Добавить', 'Add subtask': 'Добавить подзадачу', 'Add file…': 'Добавить файл…',
    'View photo': 'Открыть фото', 'Save / share': 'Сохранить / поделиться', 'Remove from task': 'Убрать из задачи', 'Copy here': 'Скопировать сюда', 'Move here': 'Перенести сюда',
    'Send task to…': 'Отправить задачу в…', 'Copy or move?': 'Скопировать или перенести?', 'into which category?': 'в какую категорию?',
    'Repeat every week': 'Повторять каждую неделю', 'Remove reminder': 'Убрать напоминание', 'Pick a time': 'Выбери время', 'Pick at least one day': 'Выбери хотя бы один день', 'Reminder set': 'Напоминание установлено',
    'daily': 'ежедневно', 'weekly': 'еженед.', 'once': 'один раз', 'Mo': 'Пн', 'Tu': 'Вт', 'We': 'Ср', 'Th': 'Чт', 'Fr': 'Пт', 'Sa': 'Сб', 'Su': 'Вс',
    'How to use — replay tour': 'Как пользоваться — показать тур', 'Source code on GitHub': 'Исходный код на GitHub',
    'Show / copy invite code': 'Показать / скопировать код', 'Create an invite': 'Создать приглашение', 'Join with a code': 'Войти по коду', 'Connection status': 'Статус соединения', 'Sync now': 'Синхронизировать',
    'Use a custom server (if blocked)': 'Свой сервер (если заблокировано)', 'Custom server (set) — change': 'Свой сервер (задан) — изменить', 'Back to default servers': 'Вернуть серверы по умолчанию', 'Leave shared sync': 'Выйти из общего списка',
    'Syncing…': 'Синхронизация…', 'Copied to clipboard': 'Скопировано', 'Invite code copied to clipboard': 'Код приглашения скопирован', 'Join — paste the invite code': 'Вход — вставь код приглашения',
    'That does not look like an invite code': 'Это не похоже на код приглашения', 'Using default servers': 'Серверы по умолчанию', 'Custom server saved': 'Свой сервер сохранён',
    'Send it to the other phone, tap Join there and paste it': 'Отправь код на другой телефон и вставь его там через «Войти по коду»',
    'Connection': 'Соединение', 'Re-test': 'Проверить', 'Re-testing…': 'Проверяю…', 'Channels': 'Каналы', 'Devices': 'Устройства', 'Direct P2P': 'Прямое P2P', 'connected': 'подключено', 'standby': 'ожидание',
    'testing…': 'проверка…', 'unreachable': 'недоступен', 'active': 'активен', 'reachable': 'доступен', 'This device': 'Это устройство', 'No other devices heard yet': 'Других устройств пока не слышно', 'Not linked': 'Не связано', 'Room': 'Комната',
    'Spaces': 'Пространства', 'Fonts': 'Шрифты', 'Prices': 'Цены', 'Language': 'Язык', 'Text size': 'Размер текста', 'Typeface': 'Гарнитура', 'Currency': 'Валюта',
    'Small': 'Мелкий', 'Medium': 'Средний', 'Large': 'Крупный', 'System': 'Системный', 'Mono': 'Моно', 'Serif': 'С засечками', 'Auto': 'Авто',
    'shared': 'общее', 'tree': 'дерево', 'hidden': 'скрыто', 'The last visible space stays': 'Последнее видимое пространство нельзя скрыть',
    'Search all spaces…': 'Поиск по всем пространствам…', 'Type to search tasks, subtasks and categories': 'Ищи задачи, подзадачи и категории', 'Nothing found': 'Ничего не найдено', 'Done': 'Готово',
    'Attached': 'Прикреплено', 'Removed': 'Убрано', 'Up to 20 MB per file': 'До 20 МБ на файл', 'File is not on this device': 'Файла нет на этом устройстве', 'Storage unavailable': 'Хранилище недоступно',
    'Task copied to clipboard': 'Задача скопирована', 'Category copied to clipboard': 'Категория скопирована', 'Space copied to clipboard': 'Пространство скопировано', 'Subtask copied to clipboard': 'Подзадача скопирована',
    'Nothing recognizable to import': 'Не удалось ничего распознать', 'No other space to send to': 'Некуда отправлять — нет других пространств', 'That category is gone': 'Этой категории уже нет',
    'Allow notifications in system settings': 'Разреши уведомления в настройках системы', 'Paste & edit, then save': 'Вставь и поправь, затем сохрани',
    'Export all to clipboard': 'Экспортировать всё', 'Paste from clipboard': 'Вставить из буфера', 'Clear all completed': 'Убрать все выполненные', 'Clear space': 'Очистить пространство',
    'Moved to': 'Перенесено в', 'Copied to': 'Скопировано в', 'Tap to complete': 'Тап — выполнить', 'Hold to edit': 'Удержание — изменить',
    'Tap a task to check it off. Tap again to bring it back.': 'Коснись задачи, чтобы вычеркнуть. Второй тап вернёт её.',
    'Hold a task and release to edit the text. Keep holding for the menu — subtasks, reminder, copy, delete.': 'Зажми задачу и отпусти — редактирование. Держи дольше — меню: подзадачи, напоминание, копия, удаление.',
    'Double-tap for subtasks': 'Дабл-тап — подзадачи', 'Double-tap a task to open its subtasks — a checklist inside a task.': 'Двойной тап раскрывает дерево подзадач прямо в списке. Одиночный — открывает их экран.',
    'Swipe between spaces': 'Свайп между пространствами', 'Swipe left or right to flip pages: To-Do, Wishlist and a Shared space you can sync with friends.': 'Свайпай влево-вправо: To-Do, Wishlist и Общее пространство для синка с друзьями.',
    'Swipe right for the menu': 'Свайп вправо — меню', 'On the first page, swipe right to open the menu — themes, settings, history and sync.': 'На первой странице свайп вправо открывает меню: темы, настройки, история, синк.',
    'Pull down to search': 'Потяни вниз — поиск', 'Pull the list down from the very top to search everything across all spaces at once.': 'Потяни список с самого верха — и ищи сразу по всем пространствам.',
    'Add & arrange': 'Добавляй и наводи порядок', 'Tap ADD for tasks. Long-press empty space to add a category, or triple-tap it to clear completed.': 'ADD — новая задача. Долгое нажатие на пустом месте — категория, тройной тап — убрать выполненные.',
    'Next': 'Дальше', 'Got it': 'Понятно', 'Skip': 'Пропустить',
    'Invite to shared space': 'Приглашение в общее пространство', 'Sync · not linked': 'Синк · не связано', 'Sync': 'Синк', 'no label': 'без метки',
    'offline · seen': 'офлайн · был', 'you': 'ты', 'now': 'сейчас', 's ago': 'с назад', 'm ago': 'м назад', 'h ago': 'ч назад', 'd ago': 'д назад',
    'or a specific date': 'или конкретная дата', 'here': 'здесь', 'No other category here': 'Здесь нет других категорий', 'That moment is already past': 'Этот момент уже прошёл', 'Could not share the file': 'Не удалось поделиться файлом',
  },
  zh: {
    'Menu': '菜单', 'Search': '搜索', 'Themes': '主题', 'Settings': '设置', 'History': '历史', 'About': '关于', 'Clear All': '全部清空',
    'Cancel': '取消', 'Save': '保存', 'Ctrl + Enter to save': 'Ctrl + Enter 保存', 'Describe your task…': '描述你的任务…', 'Category name…': '分类名称…',
    'Options': '选项', 'Mark complete': '标记完成', 'Mark incomplete': '取消完成', 'Subtasks': '子任务', 'Edit task': '编辑任务', 'Set price': '设置价格', 'Price': '价格',
    'Set reminder': '设置提醒', 'Reminder': '提醒', 'Attachments': '附件', 'Send to space…': '发送到空间…', 'Copy as text': '复制为文本', 'Delete task': '删除任务',
    'Edit subtask': '编辑子任务', 'Delete subtask': '删除子任务', 'Rename category': '重命名分类', 'Delete category': '删除分类', 'Clear completed': '清除已完成',
    'Rename space': '重命名空间', 'Delete space': '删除空间', 'New category': '新分类', 'New task': '新任务', 'New subtask': '新子任务', 'New space': '新空间',
    'Add space': '添加空间', 'Add category': '添加分类', 'Add task': '添加', 'Add subtask': '添加子任务', 'Add file…': '添加文件…',
    'View photo': '查看照片', 'Save / share': '保存 / 分享', 'Remove from task': '从任务移除', 'Copy here': '复制到这里', 'Move here': '移动到这里',
    'Send task to…': '发送任务到…', 'Copy or move?': '复制还是移动？', 'into which category?': '选择分类',
    'Repeat every week': '每周重复', 'Remove reminder': '移除提醒', 'Pick a time': '选择时间', 'Pick at least one day': '至少选择一天', 'Reminder set': '提醒已设置',
    'daily': '每天', 'weekly': '每周', 'once': '一次', 'Mo': '一', 'Tu': '二', 'We': '三', 'Th': '四', 'Fr': '五', 'Sa': '六', 'Su': '日',
    'How to use — replay tour': '使用说明 — 重看引导', 'Source code on GitHub': 'GitHub 源代码',
    'Show / copy invite code': '显示 / 复制邀请码', 'Create an invite': '创建邀请', 'Join with a code': '用邀请码加入', 'Connection status': '连接状态', 'Sync now': '立即同步',
    'Use a custom server (if blocked)': '自定义服务器（被墙时）', 'Custom server (set) — change': '自定义服务器（已设置）— 修改', 'Back to default servers': '恢复默认服务器', 'Leave shared sync': '退出共享同步',
    'Syncing…': '同步中…', 'Copied to clipboard': '已复制', 'Invite code copied to clipboard': '邀请码已复制', 'Join — paste the invite code': '加入 — 粘贴邀请码',
    'That does not look like an invite code': '这不像邀请码', 'Using default servers': '使用默认服务器', 'Custom server saved': '自定义服务器已保存',
    'Send it to the other phone, tap Join there and paste it': '把邀请码发到另一台手机，在那里点「用邀请码加入」并粘贴',
    'Connection': '连接', 'Re-test': '重新检测', 'Re-testing…': '检测中…', 'Channels': '通道', 'Devices': '设备', 'Direct P2P': '直连 P2P', 'connected': '已连接', 'standby': '待机',
    'testing…': '检测中…', 'unreachable': '不可达', 'active': '活跃', 'reachable': '可达', 'This device': '本机', 'No other devices heard yet': '还没有发现其他设备', 'Not linked': '未关联', 'Room': '房间',
    'Spaces': '空间', 'Fonts': '字体', 'Prices': '价格', 'Language': '语言', 'Text size': '字号', 'Typeface': '字体', 'Currency': '货币',
    'Small': '小', 'Medium': '中', 'Large': '大', 'System': '系统', 'Mono': '等宽', 'Serif': '衬线', 'Auto': '自动',
    'shared': '共享', 'tree': '树状', 'hidden': '已隐藏', 'The last visible space stays': '至少保留一个可见空间',
    'Search all spaces…': '搜索所有空间…', 'Type to search tasks, subtasks and categories': '输入以搜索任务、子任务和分类', 'Nothing found': '没有结果', 'Done': '完成',
    'Attached': '已附加', 'Removed': '已移除', 'Up to 20 MB per file': '单个文件最大 20 MB', 'File is not on this device': '文件不在本机', 'Storage unavailable': '存储不可用',
    'Task copied to clipboard': '任务已复制', 'Category copied to clipboard': '分类已复制', 'Space copied to clipboard': '空间已复制', 'Subtask copied to clipboard': '子任务已复制',
    'Nothing recognizable to import': '没有可识别的内容', 'No other space to send to': '没有其他空间可发送', 'That category is gone': '该分类已不存在',
    'Allow notifications in system settings': '请在系统设置中允许通知', 'Paste & edit, then save': '粘贴并编辑，然后保存',
    'Export all to clipboard': '全部导出到剪贴板', 'Paste from clipboard': '从剪贴板粘贴', 'Clear all completed': '清除所有已完成', 'Clear space': '清空空间',
    'Moved to': '已移动到', 'Copied to': '已复制到', 'Tap to complete': '点按完成',
    'Tap a task to check it off. Tap again to bring it back.': '点按任务划掉它，再点一下恢复。',
    'Hold to edit': '长按编辑', 'Hold a task and release to edit the text. Keep holding for the menu — subtasks, reminder, copy, delete.': '按住任务后松开即编辑文字；继续按住打开菜单：子任务、提醒、复制、删除。',
    'Double-tap for subtasks': '双击展开子任务', 'Double-tap a task to open its subtasks — a checklist inside a task.': '双击任务就地展开子任务树；单击打开子任务页面。',
    'Swipe between spaces': '滑动切换空间', 'Swipe left or right to flip pages: To-Do, Wishlist and a Shared space you can sync with friends.': '左右滑动翻页：待办、心愿单和可与朋友同步的共享空间。',
    'Swipe right for the menu': '右滑打开菜单', 'On the first page, swipe right to open the menu — themes, settings, history and sync.': '在第一页右滑打开菜单：主题、设置、历史和同步。',
    'Pull down to search': '下拉搜索', 'Pull the list down from the very top to search everything across all spaces at once.': '从列表顶部下拉，一次搜索所有空间。',
    'Add & arrange': '添加与整理', 'Tap ADD for tasks. Long-press empty space to add a category, or triple-tap it to clear completed.': '点 ADD 添加任务。长按空白处新建分类，三击清除已完成。',
    'Next': '下一步', 'Got it': '知道了', 'Skip': '跳过',
    'Invite to shared space': '邀请加入共享空间', 'Sync · not linked': '同步 · 未关联', 'Sync': '同步', 'no label': '无标签',
    'offline · seen': '离线 · 上次', 'you': '我', 'now': '刚刚', 's ago': '秒前', 'm ago': '分钟前', 'h ago': '小时前', 'd ago': '天前',
    'or a specific date': '或指定日期', 'here': '当前', 'No other category here': '这里没有其他分类', 'That moment is already past': '该时间已经过去', 'Could not share the file': '无法分享文件',
  },
};
let LANG = 'en';
function t(s) { const d = I18N[LANG]; return (d && d[s]) || s; }
function applyLang() {
  const pref = (state.settings && state.settings.lang) || 'system';
  const sys = (navigator.language || 'en').toLowerCase();
  LANG = pref !== 'system' ? pref : sys.startsWith('ru') ? 'ru' : sys.startsWith('zh') ? 'zh' : 'en';
  fillI18n();
}
// translate static HTML: drawer items, dialog buttons, tour buttons, hints
function fillI18n() {
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.getAttribute('data-t')); });
  const ta = document.getElementById('dialogTextarea');
  if (ta) ta.setAttribute('data-placeholder', t('Describe your task…'));
  const inp = document.getElementById('dialogInput');
  if (inp) inp.placeholder = t('Category name…');
}

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
    { icon: '🎓', label: 'How to use — replay tour', action: () => openTour() },
    { icon: '↗', label: 'Source code on GitHub', action: () => {
        const a = document.createElement('a');
        a.href = REPO_URL; a.target = '_blank'; a.rel = 'noopener';
        a.click();
      } },
  ]), 300);
}

// ── First-run tour ───────────────────────────────────────────
// Animated, gesture-by-gesture intro shown on a fresh install (empty
// board). Each step demonstrates one gesture with a moving "finger".
const TOUR = [
  { g: 'tap',    t: 'Tap to complete',        d: 'Tap a task to check it off. Tap again to bring it back.' },
  { g: 'hold',   t: 'Hold to edit',           d: 'Hold a task and release to edit the text. Keep holding for the menu — subtasks, reminder, copy, delete.' },
  { g: 'double', t: 'Double-tap for subtasks', d: 'Double-tap a task to open its subtasks — a checklist inside a task.' },
  { g: 'swipe',  t: 'Swipe between spaces',    d: 'Swipe left or right to flip pages: To-Do, Wishlist and a Shared space you can sync with friends.' },
  { g: 'right',  t: 'Swipe right for the menu', d: 'On the first page, swipe right to open the menu — themes, settings, history and sync.' },
  { g: 'pull',   t: 'Pull down to search',    d: 'Pull the list down from the very top to search everything across all spaces at once.' },
  { g: 'press',  t: 'Add & arrange',          d: 'Tap ADD for tasks. Long-press empty space to add a category, or triple-tap it to clear completed.' },
];
let tourStep = 0;

// mini building blocks for the animated demo scenes
function tgRow(w, target) {
  return `<div class="tg-row${target ? ' tgt' : ''}"><span class="tg-dot"></span><span class="tg-bar" style="width:${w}%"></span></div>`;
}
function tgScene(g) {
  switch (g) {
    case 'tap':
      return `<div class="tg-frame">${tgRow(72)}${tgRow(56, true)}${tgRow(64)}</div><div class="tg-finger"></div>`;
    case 'hold':
      return `<div class="tg-frame">${tgRow(64, true)}${tgRow(52)}</div>` +
        `<div class="tg-menu"><span class="tg-mi" style="width:72%"></span><span class="tg-mi" style="width:54%"></span><span class="tg-mi" style="width:63%"></span></div>` +
        `<div class="tg-finger"></div>`;
    case 'double':
      return `<div class="tg-frame">${tgRow(60, true)}` +
        `<div class="tg-subs"><div class="tg-sub"><span class="tg-br">├</span><span class="tg-bar" style="width:42%"></span></div>` +
        `<div class="tg-sub"><span class="tg-br">└</span><span class="tg-bar" style="width:35%"></span></div></div>` +
        `${tgRow(68)}</div><div class="tg-finger"></div>`;
    case 'swipe':
      return `<div class="tg-page b"><div class="tg-frame">${tgRow(48)}${tgRow(66)}</div></div>` +
        `<div class="tg-page a"><div class="tg-frame">${tgRow(72)}${tgRow(56)}${tgRow(64)}</div></div>` +
        `<div class="tg-finger"></div>`;
    case 'right':
      return `<div class="tg-page a"><div class="tg-frame">${tgRow(72)}${tgRow(56)}${tgRow(64)}</div></div>` +
        `<div class="tg-drawer"><span class="tg-mi" style="width:74%"></span><span class="tg-mi" style="width:58%"></span><span class="tg-mi" style="width:66%"></span><span class="tg-mi" style="width:50%"></span></div>` +
        `<div class="tg-finger"></div>`;
    case 'pull':
      return `<div class="tg-search">${iconSvg('search')}<span class="tg-bar" style="width:42%"></span></div>` +
        `<div class="tg-frame">${tgRow(72)}${tgRow(56)}${tgRow(64)}</div>` +
        `<div class="tg-finger"></div>`;
    case 'press':
      return `<div class="tg-frame empty"></div><div class="tg-chip">${iconSvg('add')} Category</div><div class="tg-finger"></div>`;
  }
  return '<div class="tg-finger"></div>';
}

function openTour() {
  closeSheet(); closeDrawer();
  tourStep = 0;
  document.getElementById('tour').classList.add('active');
  armBack();
  renderTourStep();
}
function closeTour(done) {
  document.getElementById('tour').classList.remove('active');
  if (done) { state.settings.onboarded = true; saveState(); }
}
function tourNext() {
  if (tourStep >= TOUR.length - 1) { closeTour(true); return; }
  tourStep++; renderTourStep();
}
function tourPrev() { if (tourStep > 0) { tourStep--; renderTourStep(); } }
function renderTourStep() {
  const s = TOUR[tourStep], last = tourStep === TOUR.length - 1;
  const demo = document.getElementById('tourDemo');
  const title = document.getElementById('tourTitle');
  const text = document.getElementById('tourText');
  demo.className = 'tour-demo tg-' + s.g;
  demo.innerHTML = tgScene(s.g);
  title.textContent = t(s.t);
  text.textContent = t(s.d);
  // restart the slide-in transition on every step change
  [demo, title, text].forEach(el => { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
  document.getElementById('tourDots').innerHTML = TOUR.map((_, i) =>
    `<span class="tour-dot${i === tourStep ? ' on' : ''}${i < tourStep ? ' past' : ''}"></span>`).join('');
  document.getElementById('tourNext').textContent = t(last ? 'Got it' : 'Next');
  document.getElementById('tourSkip').textContent = t('Skip');
  document.getElementById('tourSkip').style.visibility = last ? 'hidden' : 'visible';
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = t(msg);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1700);
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
  if (document.getElementById('tour').classList.contains('active')) {
    if (tourStep > 0) tourPrev(); else closeTour(false);
    return true;
  }
  if (document.getElementById('photoView').classList.contains('active')) { closePhoto(); return true; }
  if (document.getElementById('remOverlay').classList.contains('active')) { closeRem(); return true; }
  if (document.getElementById('dialogOverlay').classList.contains('active')) { closeDialog(); return true; }
  if (document.getElementById('sheetOverlay').classList.contains('active')) { closeSheet(); return true; }
  if (drawerOpen) { closeDrawer(); return true; }
  if (subtaskView) { closeSubtasks(); return true; }
  if (historyView) { closeHistory(); return true; }
  if (settingsView) { closeSettings(); return true; }
  if (themesView) { closeThemes(); return true; }
  if (connView) { closeConn(); return true; }
  if (searchView) { closeSearch(); return true; }
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
  // bundled woff2 — identical Latin + Cyrillic (system mono lacks Cyrillic)
  mono: "'JetBrains Mono', 'Courier New', Courier, monospace",
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
         document.getElementById('dialogOverlay').classList.contains('active') ||
         document.getElementById('remOverlay').classList.contains('active');
}

maskEl.addEventListener('click', () => closeDrawer());

let pageDrag = 0, pageDragP = 0; // active page-flip swipe between spaces
let backDrag = false;            // active "back" peel out of a nested screen
let pullActive = false, pullP = 0; // active pull-down-from-top → search

const PULL_MAX = 130;            // px of pull that maps to a full reveal
function setPull(p) {
  const el = document.getElementById('pullSearch');
  if (!el) return;
  // the drop stretches down from the top edge while the list follows
  el.style.setProperty('--p', p.toFixed(3));
  if (p >= 1 && !el.classList.contains('ready') && navigator.vibrate) navigator.vibrate(12);
  el.classList.toggle('ready', p >= 1);
  const list = document.getElementById('categoriesContainer');
  if (list) {
    list.style.transition = p ? 'none' : 'transform .28s cubic-bezier(.22,1,.36,1)';
    list.style.transform = p ? `translateY(${Math.round(p * 54)}px)` : '';
  }
}

function nestedView() { return subtaskView || historyView || settingsView || themesView || connView || searchView; }

document.addEventListener('touchstart', (e) => {
  if (overlayOpen()) return;
  swTouchX = e.touches[0].clientX; swTouchY = e.touches[0].clientY;
  swDir = null; swActive = false; swBase = drawerOpen ? DRAWER_W : 0;
}, { passive: true });

const clampP = v => Math.min(1, Math.max(0, v));

document.addEventListener('touchmove', (e) => {
  if (overlayOpen()) return;
  if (typeof catDragLive !== 'undefined' && catDragLive) return; // category drag owns the gesture
  const dx = e.touches[0].clientX - swTouchX, dy = e.touches[0].clientY - swTouchY;
  if (!swDir) {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    swDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
  }
  // vertical pull-down at the very top of the list → reveal search
  // (not while a category is lifted for drag-to-reorder)
  if (swDir === 'v') {
    if (typeof catDragLive !== 'undefined' && catDragLive) { pullActive = false; setPull(0); return; }
    if (!pullActive && dy > 0 && !drawerOpen && !nestedView() && window.scrollY <= 0) pullActive = true;
    if (pullActive) {
      if (dy <= 0) { pullActive = false; pullP = 0; setPull(0); return; }
      e.preventDefault();
      pullP = clampP(dy / PULL_MAX);
      setPull(pullP);
    }
    return;
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

document.addEventListener('touchcancel', () => {
  if (pullActive) { pullActive = false; pullP = 0; setPull(0); }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (pullActive) {
    pullActive = false;
    const open = pullP >= 1;
    pullP = 0; setPull(0);
    if (open) openSearch(true);
    return;
  }
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
  // allowed on a plain space, or inside the subtask screen (clears that
  // task's completed subtasks); blocked on the other nested screens
  const inSub = subtaskView && !historyView && !settingsView && !themesView && !connView;
  if (overlayOpen() || (nestedView() && !inSub) || !isEmptySpace(e.target)) { emptyTaps = 0; return; }
  emptyTaps++;
  clearTimeout(emptyTapTimer);
  if (emptyTaps >= 3) {
    emptyTaps = 0;
    if (inSub) {
      const t = cats().find(c => c.id === subtaskView.catId)?.tasks.find(t => t.id === subtaskView.taskId);
      if (t && t.subtasks && t.subtasks.some(s => s.done)) {
        navigator.vibrate && navigator.vibrate(20);
        clearCompletedSubtasks(subtaskView.catId, subtaskView.taskId);
      }
    } else if (cats().some(cat => cat.tasks.some(t => t.done))) {
      navigator.vibrate && navigator.vibrate(20);
      clearAllCompleted();
    }
    return;
  }
  emptyTapTimer = setTimeout(() => { emptyTaps = 0; }, 600);
});

// ── Bottom Sheet ─────────────────────────────────────────────
function openSheet(label, items) {
  document.getElementById('sheetLabel').textContent = t(label);
  const c = document.getElementById('sheetItems');
  c.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'sheet-item' + (item.danger ? ' danger' : '');
    el.innerHTML = `<span class="s-icon">${renderGlyph(item.icon)}</span>${esc(t(item.label))}`;
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
    { icon: '→', label: 'Send to space…', action: () => openSendCategorySheet(catId) },
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
  );
  // a task can have its own price only when it has no subtasks (a leaf);
  // tasks with subtasks roll up the subtasks' prices instead
  if (hasPrices(curSpace()) && !hasSubs) items.push(
    { icon: '🏷', label: (task.price != null && task.price !== '') ? `${t('Price')}: ${fmtPrice(Number(task.price))}` : 'Set price', action: () => promptSetPrice(catId, taskId) }
  );
  items.push(
    { icon: '⏰', label: task.rem ? `${t('Reminder')}: ${fmtRem(task.rem)}` : 'Set reminder', action: () => openReminderEditor(catId, taskId) },
    { icon: '📎', label: t('Attachments') + (task.att && task.att.length ? ` (${task.att.length})` : ''), action: () => openAttachments(catId, taskId) },
    { icon: '→', label: 'Send to space…', action: () => openSendTaskSheet(catId, taskId) },
    { icon: '⧉', label: 'Copy as text', action: () => exportTask(catId, taskId) },
    { icon: '🗑️', label: 'Delete task', danger: true, action: () => deleteTask(catId, taskId) },
  );
  openSheet(lbl, items);
}

// ── Reminder editor ──────────────────────────────────────────
let remCtx = null, remSelDays = new Set(), remRep = true, remDaysTouched = false;

// the day that "HH:MM" next lands on: today if still ahead, else tomorrow
function smartRemDay(time) {
  const t = (time || '').split(':').map(Number);
  const now = new Date();
  const ahead = t.length === 2 && (t[0] > now.getHours() || (t[0] === now.getHours() && t[1] > now.getMinutes()));
  const iso = ((now.getDay() + 6) % 7) + 1;
  return ahead ? iso : (iso % 7) + 1;
}

function openReminderEditor(catId, taskId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  if (!task) return;
  remCtx = { catId, taskId };
  const rem = task.rem || {};
  // default to the current time (rounded up to 5 min) — easier to reason from
  const now = new Date(Date.now() + 5 * 60000);
  const cur = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`;
  document.getElementById('remTime').value = rem.time || cur;
  document.getElementById('remDate').value = rem.date || '';
  remSelDays = new Set(rem.date ? [] : (rem.days || []));
  remRep = rem.rep !== false && !rem.date;
  remDaysTouched = !!(rem.days && rem.days.length) || !!rem.date;
  // picking a time pre-selects its day right away (until days are touched)
  if (!remSelDays.size && !rem.date) remSelDays = new Set([smartRemDay(rem.time || cur)]);
  renderRemDays();
  renderRemRep();
  document.getElementById('remRemove').style.display = task.rem ? '' : 'none';
  document.getElementById('remOverlay').classList.add('active');
  armBack();
}
function renderRemDays() {
  const el = document.getElementById('remDays');
  el.innerHTML = '';
  DAY_SHORT.forEach((lbl, i) => {
    const d = i + 1;
    const chip = document.createElement('span');
    chip.className = 'rem-day' + (remSelDays.has(d) ? ' on' : '');
    chip.textContent = lbl;
    chip.addEventListener('click', () => {
      remDaysTouched = true;
      document.getElementById('remDate').value = ''; // weekdays and a fixed date are exclusive
      remSelDays.has(d) ? remSelDays.delete(d) : remSelDays.add(d);
      chip.classList.toggle('on');
    });
    el.appendChild(chip);
  });
}
function renderRemRep() {
  document.getElementById('remRepBox').classList.toggle('on', remRep);
}
// keep the auto-picked day in sync with the chosen time until days are touched
document.getElementById('remTime').addEventListener('input', () => {
  if (remDaysTouched) return;
  remSelDays = new Set([smartRemDay(document.getElementById('remTime').value)]);
  renderRemDays();
});
// picking a calendar date clears the weekday chips (they're exclusive)
document.getElementById('remDate').addEventListener('input', () => {
  if (!document.getElementById('remDate').value) return;
  remDaysTouched = true;
  remSelDays.clear();
  remRep = false;
  renderRemDays();
  renderRemRep();
});
function toggleRemRep() { remRep = !remRep; renderRemRep(); }
function closeRem() { document.getElementById('remOverlay').classList.remove('active'); remCtx = null; }
function saveRem() {
  if (!remCtx) return;
  const task = cats().find(c => c.id === remCtx.catId)?.tasks.find(t => t.id === remCtx.taskId);
  if (!task) { closeRem(); return; }
  const time = document.getElementById('remTime').value;
  const date = document.getElementById('remDate').value;
  if (!time) { toast('Pick a time'); return; }
  if (!date && !remSelDays.size) { toast('Pick at least one day'); return; }
  if (date) {
    if (new Date(date + 'T' + time).getTime() <= Date.now()) { toast('That moment is already past'); return; }
    task.rem = { time, date };
  } else {
    task.rem = { time, days: [...remSelDays].sort((a, b) => a - b), rep: remRep };
  }
  delete task.rem.next;
  task.mt = nextMt();
  logH('~', `Set reminder ${fmtRem(task.rem)} for "${trunc(task.text)}"`);
  closeRem();
  saveState();
  render();
  toast(t('Reminder set') + ' · ' + fmtRem(task.rem));
}
function removeRem() {
  if (!remCtx) return;
  const task = cats().find(c => c.id === remCtx.catId)?.tasks.find(t => t.id === remCtx.taskId);
  if (task && task.rem) {
    logH('~', `Removed reminder from "${trunc(task.text)}"`);
    delete task.rem;
    task.mt = nextMt();
    saveState();
    render();
  }
  closeRem();
}

function openSubtaskSheet(catId, taskId, subId) {
  const task = cats().find(c => c.id === catId)?.tasks.find(t => t.id === taskId);
  const sub  = task?.subtasks?.find(s => s.id === subId);
  if (!sub) return;
  const lbl = sub.text.length > 42 ? sub.text.slice(0, 42) + '…' : sub.text;
  const items = [
    { icon: sub.done ? '○' : '✓', label: sub.done ? 'Mark incomplete' : 'Mark complete', action: () => toggleSubtask(catId, taskId, subId) },
    { icon: '✏️', label: 'Edit subtask',   action: () => promptEditSubtask(catId, taskId, subId) },
  ];
  if (hasPrices(curSpace())) items.push(
    { icon: '🏷', label: (sub.price != null && sub.price !== '') ? `${t('Price')}: ${fmtPrice(Number(sub.price))}` : 'Set price', action: () => promptSetSubPrice(catId, taskId, subId) }
  );
  items.push(
    { icon: '⧉', label: 'Copy as text',   action: () => exportSubtask(catId, taskId, subId) },
    { icon: '🗑️', label: 'Delete subtask', danger: true, action: () => deleteSubtask(catId, taskId, subId) },
  );
  openSheet(lbl, items);
}

// ── Dialog ───────────────────────────────────────────────────
// The task/subtask field is a contenteditable div (not a <textarea>) —
// Android WebViews tend to draw the red spellcheck underline on
// contenteditable more reliably than on form fields.
let dialogCb = null, dialogIsTask = false, dialogDraft = false;

function dialogEl(isTask) { return document.getElementById(isTask ? 'dialogTextarea' : 'dialogInput'); }
function getDialogValue(isTask) {
  const el = dialogEl(isTask);
  return isTask ? (el.innerText || '') : el.value;
}
function setDialogValue(isTask, val) {
  const el = dialogEl(isTask);
  if (isTask) { el.textContent = val || ''; el.classList.toggle('empty', !val); }
  else el.value = val || '';
}
function placeCaretEnd(el) {
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

function openDialog(title, value, cb, isTask, isDraft) {
  dialogIsTask = !!isTask; dialogCb = cb; dialogDraft = !!isDraft;
  document.getElementById('dialogTitle').textContent = t(title);
  const inp = document.getElementById('dialogInput');
  const ta  = document.getElementById('dialogTextarea');
  const ht  = document.getElementById('dialogHint');
  inp.style.display = isTask ? 'none'  : 'block';
  ta.style.display  = isTask ? 'block' : 'none';
  ht.style.display  = isTask ? 'block' : 'none';
  setDialogValue(isTask, value);
  document.getElementById('dialogOverlay').classList.add('active');
  armBack();
  setTimeout(() => { const f = isTask ? ta : inp; f.focus(); if (isTask) placeCaretEnd(ta); }, 130);
}
function closeDialog() {
  // dismissing a new-task/subtask dialog keeps the unfinished text as a draft
  if (dialogDraft) {
    const v = getDialogValue(true);
    state.draft = v.trim() ? v : '';
    dialogDraft = false;
    saveState();
  }
  document.getElementById('dialogOverlay').classList.remove('active'); dialogCb = null;
}
function confirmDialog() {
  const val = getDialogValue(dialogIsTask).trim();
  dialogDraft = false; // saved (or empty) — don't persist as a draft
  if (dialogCb && val) dialogCb(val);
  closeDialog();
}

document.getElementById('dialogInput').addEventListener('keydown', e => {
  if (e.key === 'Enter')  confirmDialog();
  if (e.key === 'Escape') closeDialog();
});
const dialogTa = document.getElementById('dialogTextarea');
dialogTa.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') confirmDialog();
  if (e.key === 'Escape') closeDialog();
});
dialogTa.addEventListener('input', () => dialogTa.classList.toggle('empty', !dialogTa.innerText.trim()));
// keep pasted text plain (contenteditable would otherwise paste rich HTML);
// execCommand can silently fail in some WebViews — fall back to Range API
dialogTa.addEventListener('paste', e => {
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  if (!t) return;
  let ok = false;
  try { ok = document.execCommand('insertText', false, t); } catch (err) { }
  if (!ok) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && dialogTa.contains(sel.anchorNode)) {
      const r = sel.getRangeAt(0);
      r.deleteContents();
      const node = document.createTextNode(t);
      r.insertNode(node);
      r.setStartAfter(node);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      dialogTa.appendChild(document.createTextNode(t));
    }
    dialogTa.classList.toggle('empty', !dialogTa.innerText.trim());
  }
});
document.getElementById('dialogOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('dialogOverlay')) closeDialog();
});
document.getElementById('remOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('remOverlay')) closeRem();
});
