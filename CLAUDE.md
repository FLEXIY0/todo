# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Open `index.html` directly in a browser or serve with any static server:
```
npx serve .
```

## Architecture

Pure vanilla JS/CSS — no frameworks, no bundler, no dependencies.

**File roles:**
- `index.html` — markup only; no logic. Script order matters: `ui.js` loads before `app.js`
- `ui.js` — all UI chrome: drawer, bottom sheet, dialog, theme switching, swipe gestures, long-press on empty space
- `app.js` — state, render loop, task/category actions, animations
- `styles.css` — all styles including CSS keyframe animations

**State model:**
`state` in `app.js` holds `{ theme, categories[] }`. Each category has `{ id, name, tasks[] }`. Each task has `{ id, text, done }`. There is no persistence — state resets on page reload.

**Render pattern:**
`render()` fully rebuilds `#categoriesContainer` innerHTML on every call. It is intentionally NOT called during task toggle animations — instead `toggleTask()` and `clearCompletedTasks()` do direct DOM class manipulation on elements identified by `data-id` / `data-cat-id` attributes to avoid interrupting CSS animations.

**Animation state:**
- `strikeForwardSet` / `strikeReverseSet` — Sets of task IDs currently animating strikethrough
- `animTimers` — Map of taskId → setTimeout handle; used to cancel in-flight timers before re-toggling
- CSS animations (`strikeForward`, `strikeReverse`, `taskSlideOut`) are driven by adding/removing classes directly on DOM elements, not via re-render

**Long-press system:**
`setupLongPress(el, cb)` in `app.js` handles both touch and mouse with a 480ms timer and a 9px movement threshold. There is a separate inline long-press for empty space in `ui.js` using the same pattern.

**Theme:**
Two themes — `classic` (default amber/dark-brown) and `oled` (pure black/white). Switched by toggling `body.theme-*` class. The classic theme has a multi-layer radial gradient background on `#main`.

**Bottom sheet / dialog:**
`openSheet(label, items)` and `openDialog(title, value, cb, isTask)` in `ui.js` are the only two modal primitives. All menus and confirmations go through these.
