// Generates the app icon (pixel-art leaf) and all Android launcher assets.
// Pure Node — minimal PNG encoder on top of zlib, no dependencies.
//
//   node scripts/generate-icon.js
//
// Outputs:
//   icon.png, assets/icon.png, assets/icon-only.png   (1024px previews/sources)
//   android/.../mipmap-*/ic_launcher.png              (legacy rounded tile)
//   android/.../mipmap-*/ic_launcher_round.png        (legacy circle)
//   android/.../mipmap-*/ic_launcher_foreground.png   (adaptive foreground)

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── Palette (Anthropic-ish: terracotta on ivory) ─────────────
const COLORS = {
  '.': null,                  // transparent / background
  'L': [0xD9, 0x77, 0x57],    // leaf body — terracotta
  'D': [0xA8, 0x4E, 0x2F],    // midrib + stem — darker terracotta
  'H': [0xE8, 0x9B, 0x7E],    // highlight pixels
};
const BG = [0xF0, 0xEE, 0xE6]; // ivory tile background

// ── Pixel grid: upright leaf — teardrop blade, midrib, stem ──
const GRID = [
  '................',
  '.......L........',
  '......LLL.......',
  '.....LLDLL......',
  '....LHLDLLL.....',
  '...LHLLDLLLL....',
  '...LHLLDLLLL....',
  '..LLLLLDLLLLL...',
  '..LLLLLDLLLLL...',
  '..LLLLLDLLLLL...',
  '...LLLLDLLLL....',
  '...LLLLDLLLL....',
  '....LLLDLLL.....',
  '.....LLDLL......',
  '.......D........',
  '......DD........',
];
const GW = GRID[0].length, GH = GRID.length;

// Bounding box of the drawn pixels — the artwork is centered by content,
// not by grid, so an asymmetric grid doesn't shift the leaf off-center.
const BB = (() => {
  let x0 = GW, y0 = GH, x1 = -1, y1 = -1;
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++)
      if (GRID[y][x] !== '.') {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
})();

// ── Minimal PNG encoder (RGBA, 8-bit) ────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
// pixels: Uint8Array of size w*h*4 (RGBA)
function encodePNG(pixels, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    pixels.copy ? pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
                : raw.set(pixels.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Renderer ─────────────────────────────────────────────────
// Draws the grid into a size×size canvas. `scale` = fraction of the canvas
// the grid occupies (centered, snapped to whole pixels for crisp squares).
// `bg` = tile color or null for transparent. `mask`: 'rect' | 'round' | 'circle'.
function render(size, { scale = 1, bg = null, mask = 'rect' } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const cell = Math.max(1, Math.floor((size * scale) / Math.max(BB.w, BB.h)));
  const offX = Math.floor((size - cell * BB.w) / 2) - BB.x0 * cell;
  const offY = Math.floor((size - cell * BB.h) / 2) - BB.y0 * cell;
  const r = size * 0.18;           // corner radius for 'round' mask
  const cx = size / 2 - 0.5, half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = bg;
      const gx = Math.floor((x - offX) / cell), gy = Math.floor((y - offY) / cell);
      if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) {
        const c = COLORS[GRID[gy][gx]];
        if (c) color = c;
      }
      if (color && mask !== 'rect') {
        const dx = x - cx, dy = y - cx;
        if (mask === 'circle') {
          if (dx * dx + dy * dy > half * half) color = null;
        } else { // rounded rect
          const ax = Math.abs(dx) - (half - r), ay = Math.abs(dy) - (half - r);
          if (ax > 0 && ay > 0 && ax * ax + ay * ay > r * r) color = null;
        }
      }
      const i = (y * size + x) * 4;
      if (color) {
        px[i] = color[0]; px[i + 1] = color[1]; px[i + 2] = color[2]; px[i + 3] = 255;
      }
    }
  }
  return encodePNG(px, size, size);
}

function write(rel, buf) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, buf);
  console.log('wrote', rel, `(${buf.length} bytes)`);
}

// ── Outputs ──────────────────────────────────────────────────
if (require.main === module) {
  // Source / store icon: ivory rounded tile, leaf at ~72%
  write('icon.png', render(1024, { scale: 0.72, bg: BG, mask: 'round' }));
  write('assets/icon.png', render(1024, { scale: 0.72, bg: BG, mask: 'rect' }));
  write('assets/icon-only.png', render(1024, { scale: 0.9 }));

  const RES = 'android/app/src/main/res';
  const DPI = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [dpi, k] of Object.entries(DPI)) {
    const launcher = Math.round(48 * k);   // legacy launcher icon
    const adaptive = Math.round(108 * k);  // adaptive foreground canvas
    // Adaptive: only ~66/108 of the canvas is safe; keep the leaf inside it.
    write(`${RES}/mipmap-${dpi}/ic_launcher_foreground.png`, render(adaptive, { scale: 0.5 }));
    write(`${RES}/mipmap-${dpi}/ic_launcher.png`, render(launcher, { scale: 0.72, bg: BG, mask: 'round' }));
    write(`${RES}/mipmap-${dpi}/ic_launcher_round.png`, render(launcher, { scale: 0.66, bg: BG, mask: 'circle' }));
  }
}

module.exports = { GRID, COLORS, BG };
