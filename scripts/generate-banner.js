// Generates the animated README banner (docs/banner.svg) from the same
// 16×16 pixel grid as the app icon. Pure Node, no dependencies.
//
//   node scripts/generate-banner.js

const fs = require('fs');
const path = require('path');
const { GRID, COLORS } = require('./generate-icon.js');

const W = 820, H = 220;
const CELL = 11;
const LEAF_X = 64, LEAF_Y = 24;

// Leaf pixels pop in one by one, then the whole leaf sways gently.
let rects = '';
let idx = 0;
for (let y = 0; y < GRID.length; y++) {
  for (let x = 0; x < GRID[y].length; x++) {
    const c = COLORS[GRID[y][x]];
    if (!c) continue;
    const fill = `rgb(${c[0]},${c[1]},${c[2]})`;
    // +0.6 overdraw hides antialiasing seams between cells while swaying
    rects += `<rect class="px" style="animation-delay:${(idx * 0.035).toFixed(3)}s" x="${LEAF_X + x * CELL}" y="${LEAF_Y + y * CELL}" width="${CELL + 0.6}" height="${CELL + 0.6}" fill="${fill}"/>\n      `;
    idx++;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="'Courier New',Courier,monospace">
  <style>
    .px { opacity: 0; animation: pop .3s ease-out forwards; }
    @keyframes pop { from { opacity: 0; } to { opacity: 1; } }
    .leaf { transform-origin: ${LEAF_X + 8 * CELL}px ${LEAF_Y + 16 * CELL}px; animation: sway 5s ease-in-out 2.5s infinite; }
    @keyframes sway { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-2.5deg); } 75% { transform: rotate(2.5deg); } }
    .title { fill: #e8943a; font-size: 42px; font-weight: bold; letter-spacing: 10px; }
    .sub { fill: rgba(240,230,211,.45); font-size: 15px; letter-spacing: 3px; }
    .task { fill: #f0e6d3; font-size: 17px; }
    .bullet { fill: #e8943a; }
    .strike { stroke: rgba(240,230,211,.55); stroke-width: 1.6; animation: strike 6s cubic-bezier(.19,1,.22,1) 3s infinite; }
    @keyframes strike { 0% { stroke-dashoffset: 196; } 25%,55% { stroke-dashoffset: 0; } 80%,100% { stroke-dashoffset: 196; } }
    .task-g { animation: dim 6s ease 3s infinite; }
    @keyframes dim { 0%,90% { opacity: 1; } 30%,55% { opacity: .45; } }
    .blink { animation: blink 1.2s steps(1) infinite; fill: #e8943a; }
    @keyframes blink { 50% { opacity: 0; } }
  </style>
  <rect width="${W}" height="${H}" rx="18" fill="#16100a"/>
  <rect width="${W}" height="${H}" rx="18" fill="none" stroke="rgba(232,148,58,.25)"/>
  <g class="leaf">
      ${rects.trim()}
  </g>
  <text class="title" x="285" y="92">SIMPLE TODO</text>
  <text class="sub" x="288" y="124">vanilla js · zero dependencies · pixel zen</text>
  <g class="task-g">
    <circle class="bullet" cx="295" cy="160" r="3.5"/>
    <text class="task" x="312" y="166">water the pixel leaf</text>
    <line class="strike" x1="310" y1="160" x2="506" y2="160" stroke-dasharray="196"/>
  </g>
  <text class="blink" x="520" y="166" font-size="17">▌</text>
</svg>
`;

const out = path.join(__dirname, '..', 'docs', 'banner.svg');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg);
console.log('wrote docs/banner.svg', `(${svg.length} bytes, ${idx} leaf pixels)`);
