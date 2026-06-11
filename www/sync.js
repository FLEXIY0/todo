// ── P2P sync for the shared space ────────────────────────────
// PeerJS (vendored) over WebRTC: the free public PeerJS broker is used
// only to introduce the two phones; the data itself flows directly
// device-to-device, torrent-style. Both devices must be online at the
// same time. Merge strategy: union of items + last-write-wins by `mt`
// timestamps, with tombstones so deletions don't resurrect.

let peer = null, conn = null, sendTimer = null;
let applyingRemote = false;
let lastSent = '';
let syncState = 'off'; // off | wait | on | err

function sharedSp() { return state.spaces.find(s => s.shared); }

function setSyncUI(st, msg) {
  syncState = st;
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  if (dot) dot.className = 'sync-dot ' + st;
  if (lbl) lbl.textContent = msg ||
    ({ off: 'Not connected', wait: 'Connecting…', on: 'Connected', err: 'Connection error' })[st];
}

function ensurePeer(cb) {
  if (typeof Peer === 'undefined') { setSyncUI('err', 'Sync engine missing'); return; }
  if (peer && !peer.destroyed && peer.open) return cb();
  setSyncUI('wait');
  // Reuse our stored id so the other phone can reconnect to us later.
  // state.sync.server may override the default public PeerJS broker
  // with a self-hosted one ({ host, port, path }).
  peer = new Peer(state.sync.selfId || undefined, Object.assign({ debug: 0 }, state.sync.server || {}));
  peer.on('open', id => {
    state.sync.selfId = id;
    saveState();
    cb();
  });
  peer.on('connection', c => bindConn(c));
  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      // our old id is taken (stale session) — start fresh
      state.sync.selfId = null;
      peer = null;
      ensurePeer(cb);
      return;
    }
    setSyncUI('err', 'Error: ' + err.type);
  });
}

function bindConn(c) {
  if (conn && conn.open && conn !== c) conn.close();
  conn = c;
  c.on('open', () => {
    state.sync.remoteId = c.peer;
    saveState();
    setSyncUI('on');
    lastSent = '';
    sendSnap();
  });
  c.on('data', onSyncData);
  c.on('close', () => { if (conn === c) { conn = null; setSyncUI('off'); } });
  c.on('error', () => setSyncUI('err'));
}

// "Invite": copy our code to the clipboard and explain the next step
function startInvite() {
  ensurePeer(() => {
    const code = peer.id;
    copyText(code);
    setSyncUI('wait', 'Waiting for partner…');
    openSheet('Invite to shared space', [
      { icon: '📋', label: `Code copied: ${code}`, action: () => copyText(code) },
      { icon: '→', label: 'Send it to the other phone, then tap Join there and paste it', action: () => { } },
    ]);
  });
}

// "Join": paste the invite code into the familiar textarea dialog
function joinShared() {
  openDialog('Join shared space — paste the invite code', '', code => {
    code = code.trim();
    if (!code) return;
    ensurePeer(() => bindConn(peer.connect(code, { reliable: true })));
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

// Called from saveState() after every persisted change (debounced).
function maybeSync() {
  if (applyingRemote || !conn || !conn.open) return;
  clearTimeout(sendTimer);
  sendTimer = setTimeout(sendSnap, 350);
}

function sendSnap() {
  if (!conn || !conn.open) return;
  const payload = JSON.stringify({ space: sharedSp(), tombs: state.sync.tombs });
  if (payload === lastSent) return; // nothing changed → no echo ping-pong
  lastSent = payload;
  conn.send({ t: 'snap', j: payload });
}

function onSyncData(d) {
  if (!d || d.t !== 'snap' || !d.j) return;
  let o;
  try { o = JSON.parse(d.j); } catch (e) { return; }
  applyingRemote = true;
  try { mergeShared(o.space, o.tombs || {}); } finally { applyingRemote = false; }
  render(); // render() saves → maybeSync sends our merged state back once
}

// Union + last-write-wins by `mt`; tombstones win over older items.
function mergeShared(remote, rTombs) {
  const sp = sharedSp();
  if (!sp || !remote) return;
  const tombs = state.sync.tombs;
  Object.entries(rTombs).forEach(([k, v]) => {
    if (!tombs[k] || tombs[k] < v) tombs[k] = v;
  });
  if ((remote.modeMt || 0) > (sp.modeMt || 0)) { sp.mode = remote.mode; sp.modeMt = remote.modeMt; }

  (remote.categories || []).forEach(rc => {
    let lc = sp.categories.find(c => c.id === rc.id);
    if (!lc) { sp.categories.push(rc); return; }
    if ((rc.mt || 0) > (lc.mt || 0)) { lc.name = rc.name; lc.mt = rc.mt; }
    (rc.tasks || []).forEach(rt => {
      const lt = lc.tasks.find(t => t.id === rt.id);
      if (!lt) lc.tasks.push(rt);
      else if ((rt.mt || 0) > (lt.mt || 0)) {
        lt.text = rt.text; lt.done = rt.done; lt.subtasks = rt.subtasks; lt.mt = rt.mt;
      }
    });
  });

  const dead = o => (tombs[o.id] || 0) > (o.mt || 0);
  sp.categories = sp.categories.filter(c => !dead(c));
  sp.categories.forEach(c => { c.tasks = c.tasks.filter(t => !dead(t)); });
}

// Prune ancient tombstones (60 days) and try to reconnect on launch
(function initSync() {
  const cutoff = Date.now() - 60 * 24 * 3600 * 1000;
  Object.keys(state.sync.tombs).forEach(k => {
    if (state.sync.tombs[k] < cutoff) delete state.sync.tombs[k];
  });
  if (state.settings.sharedOn && state.sync.remoteId) {
    setTimeout(() => {
      ensurePeer(() => bindConn(peer.connect(state.sync.remoteId, { reliable: true })));
    }, 1200);
  }
})();
