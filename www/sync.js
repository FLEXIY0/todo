// ── Sync for the shared space: two channels, one room ────────
// A "room" (invite code = roomId.key) links the devices.
//
// 1. Direct P2P (PeerJS/WebRTC): both devices derive their peer ids from
//    the room id ("st-<room>-a"/"-b"), so they always find each other
//    without storing fragile peer ids. Fast lane when both are online.
// 2. Public MQTT broker over WSS (minimal built-in client, QoS 0): the
//    encrypted snapshot is published as a *retained* message, so the
//    other phone picks it up whenever it comes online — no need to be
//    online at the same time. Failover across several free brokers.
//
// Everything is AES-GCM encrypted with the key from the invite code.
// Merge: union + last-write-wins by `mt`, tombstones stop resurrection.
// Every sync event is logged to the history journal (sign '⇄').

// Eclipse's broker is on wss/443, which blends with normal HTTPS and so
// passes most carrier/Wi-Fi firewalls (incl. RU mobile) — tried first.
// The rest are fallbacks on their own ports. All are public + anonymous;
// payloads are AES-GCM encrypted, and a retained snapshot + periodic
// resync keep things consistent even if a broker drops messages.
const DEFAULT_BROKERS = [
  'wss://mqtt.eclipseprojects.io:443/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081',
];

const DEV_ID = (() => {
  let d = localStorage.getItem('todo_dev');
  if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('todo_dev', d); }
  return d;
})();

let mqtt = null, mqttRetryT = null, mqttBackoff = 2, mqttWanted = false;
let activeBroker = null;      // url of the live broker
let brokerStat = {};          // url -> { state:'wait'|'up'|'down', active?, ms? }
let mqttProbes = [];          // in-flight probe clients
let peer = null, conn = null, peerRetryT = null, peerBackoff = 2, peerRole = null;
let sendTimer = null, applyingRemote = false, lastSent = '';
let syncState = 'off';

function sharedSp() { return state.spaces.find(s => s.shared); }
function syncEnabled() { return state.settings.sharedOn && !!state.sync.room; }
function roomTopic() { return 'simpletodo/r/' + state.sync.room.id; }

function logSync(msg) {
  logH('⇄', 'Sync: ' + msg);
  if (historyView) render();
}

function setSyncUI() {
  const p2p = conn && conn.open, brk = mqtt && mqtt.open;
  if (!syncEnabled()) syncState = 'off';
  else if (p2p || brk) syncState = 'on';
  else syncState = 'wait';
  const lbl = !syncEnabled() ? 'Not linked'
    : p2p && brk ? 'Connected · p2p + broker'
    : p2p ? 'Connected · p2p'
    : brk ? 'Connected · broker'
    : 'Connecting…';
  const dot = document.getElementById('syncDot');
  const el = document.getElementById('syncLabel');
  if (dot) dot.className = 'sync-dot ' + syncState;
  if (el) el.textContent = lbl;
}

// ── Crypto (AES-GCM, key from the invite code) ───────────────
function b64e(bytes) {
  let s = '';
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

let cKey = null, cKeyRoom = null;
async function roomKey() {
  const room = state.sync.room;
  if (!room || !crypto.subtle) return null;
  if (cKey && cKeyRoom === room.id) return cKey;
  cKey = await crypto.subtle.importKey('raw', b64d(room.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
  cKeyRoom = room.id;
  return cKey;
}
async function sealJson(obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const key = await roomKey();
  if (!key) return 'p.' + b64e(data); // no WebCrypto — plain (still obscured)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return b64e(iv) + '.' + b64e(ct);
}
async function openSealed(text) {
  try {
    const dot = text.indexOf('.');
    if (dot < 0) return null;
    const head = text.slice(0, dot), body = b64d(text.slice(dot + 1));
    let data;
    if (head === 'p') data = body;
    else {
      const key = await roomKey();
      if (!key) return null;
      data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(head) }, key, body));
    }
    return JSON.parse(new TextDecoder().decode(data));
  } catch (e) { return null; }
}

// ── Minimal MQTT 3.1.1 client over WebSocket (QoS 0) ─────────
function mqttOpen(url, opts) {
  let ws;
  try { ws = new WebSocket(url, 'mqtt'); } catch (e) { setTimeout(() => opts.onClose(), 0); return null; }
  ws.binaryType = 'arraybuffer';
  let buf = new Uint8Array(0), pingT = null, opened = false;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const concat = arrs => {
    const r = new Uint8Array(arrs.reduce((a, b) => a + b.length, 0));
    let o = 0; arrs.forEach(a => { r.set(a, o); o += a.length; });
    return r;
  };
  const str = s => { const b = enc.encode(s); return concat([Uint8Array.of(b.length >> 8, b.length & 255), b]); };
  const varlen = n => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; o.push(d); } while (n); return Uint8Array.from(o); };
  const send = (type, ...parts) => {
    const body = concat(parts);
    ws.send(concat([Uint8Array.of(type), varlen(body.length), body]));
  };

  ws.onopen = () => send(0x10, str('MQTT'), Uint8Array.of(4, 2, 0, 50), str(opts.clientId));
  ws.onmessage = e => {
    buf = concat([buf, new Uint8Array(e.data)]);
    for (;;) {
      if (buf.length < 2) return;
      let len = 0, mult = 1, i = 1;
      for (;;) {
        if (i >= buf.length) return;
        const d = buf[i++];
        len += (d & 127) * mult;
        if (!(d & 128)) break;
        mult *= 128;
        if (i > 5) { ws.close(); return; }
      }
      if (buf.length < i + len) return;
      const type = buf[0] >> 4, body = buf.subarray(i, i + len);
      buf = buf.slice(i + len);
      if (type === 2) {            // CONNACK
        if (body[1] === 0) {
          send(0x82, Uint8Array.of(0, 1), str(opts.topic), Uint8Array.of(0));
          pingT = setInterval(() => { if (ws.readyState === 1) ws.send(Uint8Array.of(0xC0, 0)); }, 25000);
          opened = true;
          opts.onOpen();
        } else ws.close();
      } else if (type === 3) {     // PUBLISH
        const tl = (body[0] << 8) | body[1];
        opts.onMessage(dec.decode(body.subarray(2, 2 + tl)), dec.decode(body.subarray(2 + tl)));
      }
    }
  };
  ws.onclose = () => { clearInterval(pingT); opts.onClose(); };
  ws.onerror = () => { };
  return {
    pub(topic, text, retain) {
      if (ws.readyState !== 1 || !opened) return false;
      send(0x30 | (retain ? 1 : 0), str(topic), enc.encode(text));
      return true;
    },
    close() { try { ws.onclose = () => clearInterval(pingT); ws.close(); } catch (e) { } },
    get open() { return ws.readyState === 1 && opened; },
  };
}

function brokerHost(url) { return url.replace(/^wss?:\/\//, '').split(/[:/]/)[0]; }
function brokerList() { return state.sync.brokers || DEFAULT_BROKERS; }
function refreshConn() { if (typeof connView !== 'undefined' && connView) render(); }

// Auto-select a working broker: probe every broker in parallel and keep
// the first that connects. This adapts on its own to the network — with
// a VPN some endpoints are reachable, without it others are, and whatever
// answers wins. Per-broker up/down is tracked for the Connection screen.
function startMqtt() {
  if (!syncEnabled()) return;
  mqttWanted = true;
  // drop stale probes, keep the live connection if it's still up
  mqttProbes.forEach(c => { if (c !== mqtt) { try { c.close(); } catch (e) { } } });
  mqttProbes = (mqtt && mqtt.open) ? [mqtt] : [];

  brokerList().forEach(url => {
    if (mqtt && mqtt.open && activeBroker === url) { brokerStat[url] = { state: 'up', active: true, ms: brokerStat[url] && brokerStat[url].ms }; return; }
    brokerStat[url] = { state: 'wait' };
    const t0 = (performance.now ? performance.now() : Date.now());
    let settled = false;
    const client = mqttOpen(url, {
      clientId: 'st_' + DEV_ID + Math.random().toString(36).slice(2, 6),
      topic: roomTopic(),
      onOpen() {
        settled = true;
        const ms = Math.round((performance.now ? performance.now() : Date.now()) - t0);
        if (!mqtt || !mqtt.open) {            // first reachable broker wins
          mqtt = client; activeBroker = url; mqttBackoff = 2;
          brokerStat[url] = { state: 'up', active: true, ms };
          logSync('broker connected: ' + brokerHost(url) + ' (' + ms + 'ms)');
          setSyncUI();
          sendSnap(true);
        } else {                               // already have a live one
          brokerStat[url] = { state: 'up', ms };
          if (client !== mqtt) { try { client.close(); } catch (e) { } }
        }
        refreshConn();
      },
      onMessage(t, payload) { handleIncoming(payload, 'broker'); },
      onClose() {
        mqttProbes = mqttProbes.filter(c => c !== client);
        if (mqtt === client) {                 // the live broker dropped
          mqtt = null; activeBroker = null;
          brokerStat[url] = { state: 'down' };
          setSyncUI();
          if (mqttWanted) { clearTimeout(mqttRetryT); mqttRetryT = setTimeout(startMqtt, mqttBackoff * 1000); mqttBackoff = Math.min(60, mqttBackoff * 2); }
        } else if (!settled) {
          brokerStat[url] = { state: 'down' };
        }
        refreshConn();
      },
    });
    if (!client) { brokerStat[url] = { state: 'down' }; return; }
    mqttProbes.push(client);
    // no CONNACK within 7s → mark unreachable and drop the probe
    setTimeout(() => {
      if (!settled && client !== mqtt) {
        if ((brokerStat[url] || {}).state !== 'up') brokerStat[url] = { state: 'down' };
        try { client.close(); } catch (e) { }
        refreshConn();
      }
    }, 7000);
  });
  setSyncUI();
  refreshConn();
}

// ── P2P lane (deterministic rendezvous from the room id) ─────
function startPeer() {
  if (!syncEnabled() || typeof Peer === 'undefined') return;
  if (peer && !peer.destroyed) return;
  tryPeerId('st-' + state.sync.room.id + '-a');
}

function tryPeerId(id) {
  peer = new Peer(id, Object.assign({ debug: 0 }, state.sync.server || {}));
  peer.on('open', () => {
    peerRole = id.slice(-1);
    logSync('p2p ready (role ' + peerRole + ')');
    if (peerRole === 'b') connectPeer();
  });
  peer.on('connection', c => { logSync('p2p incoming connection'); bindConn(c); });
  peer.on('disconnected', () => {
    logSync('p2p signaling lost, reconnecting');
    try { peer.reconnect(); } catch (e) { }
  });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      // partner already holds role "a" — take "b" and dial them
      logSync('p2p role a taken → becoming b');
      try { peer.destroy(); } catch (e) { }
      if (id.slice(-1) === 'a') tryPeerId('st-' + state.sync.room.id + '-b');
      else logSync('p2p both roles taken (third device?)');
    } else if (err.type === 'peer-unavailable') {
      logSync('p2p partner offline, retry in ' + peerBackoff + 's (broker mailbox still works)');
      schedulePeerRetry();
    } else {
      logSync('p2p error: ' + err.type);
      schedulePeerRetry();
    }
    setSyncUI();
  });
}

function connectPeer() {
  if (!syncEnabled() || !peer || peer.destroyed || (conn && conn.open)) return;
  bindConn(peer.connect('st-' + state.sync.room.id + '-a', { reliable: true }));
}

function schedulePeerRetry() {
  if (!syncEnabled()) return;
  clearTimeout(peerRetryT);
  peerRetryT = setTimeout(() => {
    if (peer && peer.destroyed) { peer = null; startPeer(); }
    else if (peerRole === 'b') connectPeer();
  }, peerBackoff * 1000);
  peerBackoff = Math.min(60, peerBackoff * 2);
}

function bindConn(c) {
  if (conn && conn.open && conn !== c) conn.close();
  conn = c;
  c.on('open', () => {
    peerBackoff = 2;
    logSync('p2p connected');
    setSyncUI();
    lastSent = '';
    sendSnap(true);
  });
  c.on('data', d => { if (d && d.t === 'snap' && d.j) handleIncoming(d.j, 'p2p'); });
  c.on('close', () => {
    if (conn === c) conn = null;
    logSync('p2p closed');
    setSyncUI();
    schedulePeerRetry();
  });
  c.on('error', () => setSyncUI());
}

// ── Snapshot send / receive / merge ──────────────────────────
function maybeSync() {
  if (applyingRemote || !syncEnabled()) return;
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => sendSnap(false), 350);
}

async function sendSnap(force) {
  if (!syncEnabled()) return;
  const sp = sharedSp();
  const plain = JSON.stringify({ boards: sp.boards, tombs: state.sync.tombs });
  if (!force && plain === lastSent) return;
  lastSent = plain;
  const sealed = await sealJson({ dev: DEV_ID, ts: Date.now(), boards: sp.boards, tombs: state.sync.tombs });
  const via = [];
  if (conn && conn.open) { try { conn.send({ t: 'snap', j: sealed }); via.push('p2p'); } catch (e) { } }
  if (mqtt && mqtt.open) { if (mqtt.pub(roomTopic(), sealed, true)) via.push('broker'); }
  if (via.length) logSync('snapshot sent (' + via.join('+') + ', ' + sealed.length + 'b)');
}

async function handleIncoming(text, via) {
  const o = await openSealed(text);
  if (!o) { logSync('undecryptable payload via ' + via + ' (wrong room key?)'); return; }
  if (o.dev === DEV_ID) return; // our own retained message echoed back
  if (o.dev) { presence[o.dev] = { ts: Date.now(), via, name: o.name || null }; refreshConn(); }
  applyingRemote = true;
  try { mergeBoards(o.boards || {}, o.tombs || {}); } finally { applyingRemote = false; }
  logSync('snapshot received (' + via + ')');
  render(); // saves; maybeSync sends our merged state back once if it differs
}

// roster of devices we've recently heard from in the room (dev id → last seen)
const presence = {};
function onlineDevices() {
  const now = Date.now();
  return Object.entries(presence)
    .filter(([, v]) => now - v.ts < 25000)
    .map(([id, v]) => ({ id, ts: v.ts, via: v.via }));
}

function mergeBoards(rBoards, rTombs) {
  const sp = sharedSp();
  if (!sp) return;
  const tombs = state.sync.tombs;
  let maxSeen = 0;
  Object.entries(rTombs).forEach(([k, v]) => {
    if (!tombs[k] || tombs[k] < v) tombs[k] = v;
    if (v > maxSeen) maxSeen = v;
  });
  const dead = o => (tombs[o.id] || 0) > (o.mt || 0);

  ['todo', 'wish'].forEach(b => {
    const local = sp.boards[b] = sp.boards[b] || [];
    (rBoards[b] || []).forEach(rc => {
      if ((rc.mt || 0) > maxSeen) maxSeen = rc.mt || 0;
      let lc = local.find(c => c.id === rc.id);
      if (!lc) { local.push(rc); return; }
      if ((rc.mt || 0) > (lc.mt || 0)) { lc.name = rc.name; lc.mt = rc.mt; }
      (rc.tasks || []).forEach(rt => {
        if ((rt.mt || 0) > maxSeen) maxSeen = rt.mt || 0;
        const lt = lc.tasks.find(t => t.id === rt.id);
        if (!lt) lc.tasks.push(rt);
        else if ((rt.mt || 0) > (lt.mt || 0)) {
          lt.text = rt.text; lt.done = rt.done; lt.subtasks = rt.subtasks; lt.mt = rt.mt;
        }
      });
    });
    sp.boards[b] = local.filter(c => !dead(c));
    sp.boards[b].forEach(c => { c.tasks = c.tasks.filter(t => !dead(t)); });
  });
  // advance our logical clock past everything we just saw, so the next
  // local edit on this device reliably wins the next merge
  if (maxSeen) state.sync.clock = Math.max(state.sync.clock || 0, maxSeen);
}

// ── Room management ──────────────────────────────────────────
function startSync() {
  if (!syncEnabled()) { setSyncUI(); return; }
  startMqtt();
  startPeer();
  setSyncUI();
}

function stopSync() {
  mqttWanted = false;
  clearTimeout(mqttRetryT);
  clearTimeout(peerRetryT);
  mqttProbes.forEach(c => { try { c.close(); } catch (e) { } });
  mqttProbes = [];
  if (mqtt) { try { mqtt.close(); } catch (e) { } mqtt = null; }
  activeBroker = null;
  brokerStat = {};
  if (conn) { try { conn.close(); } catch (e) { } conn = null; }
  if (peer) { try { peer.destroy(); } catch (e) { } peer = null; }
  peerRole = null;
  Object.keys(presence).forEach(k => delete presence[k]);
  setSyncUI();
}

function startInvite() {
  if (!state.sync.room) {
    state.sync.room = {
      id: b64e(crypto.getRandomValues(new Uint8Array(6))),
      key: b64e(crypto.getRandomValues(new Uint8Array(16))),
    };
    logSync('room created');
    saveState();
  }
  const code = state.sync.room.id + '.' + state.sync.room.key;
  copyText(code);
  startSync();
  openSheet('Invite to shared space', [
    { icon: '📋', label: 'Code copied: ' + code, action: () => { copyText(code); toast('Copied to clipboard'); } },
    { icon: '→', label: 'Send it to the other phone, tap Join there and paste it', action: () => { } },
  ]);
  toast('Invite code copied to clipboard');
}

function joinShared() {
  openDialog('Join — paste the invite code', '', code => {
    code = code.trim();
    const parts = code.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) { toast('That does not look like an invite code'); return; }
    stopSync();
    state.sync.room = { id: parts[0], key: parts[1] };
    state.sync.tombs = {};
    cKey = null; lastSent = '';
    logSync('joined room ' + parts[0]);
    saveState();
    startSync();
    render();
  }, true);
}

function leaveRoom() {
  logSync('left room ' + (state.sync.room ? state.sync.room.id : ''));
  stopSync();
  state.sync.room = null;
  cKey = null; lastSent = '';
  saveState();
  render();
}

function openSyncSheet() {
  const room = state.sync.room;
  const custom = state.sync.brokers && state.sync.brokers.length;
  const items = [
    { icon: '✉', label: room ? 'Show / copy invite code' : 'Create an invite', action: startInvite },
    { icon: '⇣', label: 'Join with a code', action: joinShared },
  ];
  items.push({ icon: '📶', label: 'Connection status', action: openConn });
  if (room) {
    items.push({ icon: '⟳', label: 'Sync now', action: () => { lastSent = ''; startSync(); sendSnap(true); toast('Syncing…'); } });
  }
  items.push({ icon: '🛰', label: custom ? 'Custom server (set) — change' : 'Use a custom server (if blocked)', action: setCustomServer });
  if (custom) items.push({ icon: '↺', label: 'Back to default servers', action: () => { state.sync.brokers = null; saveState(); stopSync(); startSync(); toast('Using default servers'); } });
  if (room) items.push({ icon: '✕', label: 'Leave shared sync', danger: true, action: leaveRoom });
  openSheet(room ? 'Sync · room ' + room.id : 'Sync · not linked', items);
}

// Escape hatch for networks that block the public brokers (e.g. some
// mobile carriers): paste your own MQTT-over-WebSocket broker URL.
// One per line; the client fails over between them. Best on port 443.
function setCustomServer() {
  const cur = (state.sync.brokers || []).join('\n');
  openDialog('Custom broker URL(s) — wss://host:port/mqtt, one per line', cur, val => {
    const urls = val.split(/\s+/).map(s => s.trim()).filter(s => /^wss?:\/\//.test(s));
    state.sync.brokers = urls.length ? urls : null;
    mqttIdx = 0;
    saveState();
    stopSync();
    startSync();
    toast(urls.length ? 'Custom server saved' : 'Using default servers');
  }, true);
}

function copyText(t) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).catch(fallback);
  } else fallback();
}

// ── Lifecycle: reconnect aggressively whenever we come back ──
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && syncEnabled()) {
    mqttBackoff = 2; peerBackoff = 2;
    startSync();
    sendSnap(true);
  }
});
window.addEventListener('online', () => { if (syncEnabled()) { mqttBackoff = 2; peerBackoff = 2; startSync(); } });

// Periodic full-state resync: QoS 0 publishes can be dropped on flaky
// mobile networks, so every few seconds each device rebroadcasts its full
// snapshot. Union + last-write-wins makes this self-healing and is what
// lets many devices in one room converge ("done shows for everyone").
setInterval(() => {
  if (syncEnabled() && ((mqtt && mqtt.open) || (conn && conn.open))) sendSnap(true);
}, 11000);

(function initSync() {
  const cutoff = Date.now() - 60 * 24 * 3600 * 1000;
  Object.keys(state.sync.tombs).forEach(k => { if (state.sync.tombs[k] < cutoff) delete state.sync.tombs[k]; });
  if (syncEnabled()) setTimeout(startSync, 800);
})();
