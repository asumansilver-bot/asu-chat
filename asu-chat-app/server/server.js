// ASU-CHAT server — zero dependencies (Node.js 18+).
// Accounts, 1:1 and group chats, photos, replies, read receipts, typing and
// online status. Live updates are pushed to apps with Server-Sent Events.
// Data is kept in DATA_DIR/db.json.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 1.5 * 1024 * 1024;       // 1.5 MB per request (photos are shrunk by the app)
const MAX_MSGS_PER_CHAT = 5000;

/* ---------- storage ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let D = { users: {}, usernames: {}, tokens: {}, chats: {}, messages: {} };
try { D = Object.assign(D, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); console.log('Loaded data from', DB_FILE); }
catch { console.log('Starting with an empty database at', DB_FILE); }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(D), err => { if (!err) fs.rename(tmp, DB_FILE, () => {}); else console.error('save failed', err); });
  }, 400);
}
const newId = (n = 12) => crypto.randomBytes(n).toString('base64url');

/* ---------- passwords ---------- */
function hashPw(pw) { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex'); }
function checkPw(pw, stored) {
  const [salt, h] = String(stored).split(':'); if (!salt || !h) return false;
  const a = crypto.scryptSync(pw, salt, 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- live connections ---------- */
const clients = new Map(); // userId -> Set<res>
const isOnline = uid => clients.has(uid);
function send(uid, event, data) {
  const set = clients.get(uid); if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}
function broadcast(event, data, except) { for (const uid of clients.keys()) if (uid !== except) send(uid, event, data); }

/* ---------- shapes sent to apps ---------- */
const pubUser = u => ({ id: u.id, username: u.username, name: u.name, about: u.about, seen: u.seen, online: isOnline(u.id) });
function pubChat(c, forUid) {
  const msgs = D.messages[c.id] || [];
  const readAt = (c.readBy || {})[forUid] || 0;
  let unread = 0;
  for (let i = msgs.length - 1; i >= 0 && msgs[i].at > readAt; i--) if (msgs[i].from !== forUid && msgs[i].from !== 'system' && !msgs[i].deleted) unread++;
  return { id: c.id, type: c.type, name: c.name, members: c.members, createdBy: c.createdBy, createdAt: c.createdAt, last: c.last || null, readBy: c.readBy || {}, unread };
}
function pushChat(c, extraUids = []) { for (const m of new Set([...c.members, ...extraUids])) send(m, 'chat', pubChat(c, m)); }

/* ---------- helpers ---------- */
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cors });
  res.end(JSON.stringify(obj));
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(Object.assign(new Error('Bad JSON'), { status: 400 })); } });
    req.on('error', reject);
  });
}
function auth(req, url) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('token');
  const uid = token && D.tokens[token];
  return uid && D.users[uid] ? D.users[uid] : null;
}
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
function systemMessage(chat, text) {
  const msg = { id: newId(), from: 'system', text, at: Date.now() };
  (D.messages[chat.id] = D.messages[chat.id] || []).push(msg);
  chat.last = { text, from: 'system', at: msg.at };
  for (const m of chat.members) send(m, 'message', { chat: chat.id, msg });
}
function addMessage(chat, msg) {
  const list = (D.messages[chat.id] = D.messages[chat.id] || []);
  list.push(msg);
  if (list.length > MAX_MSGS_PER_CHAT) list.splice(0, list.length - MAX_MSGS_PER_CHAT);
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/health') return json(res, 200, { ok: true, app: 'ASU-CHAT' });

  if (p === '/api/register' && m === 'POST') {
    const b = await readBody(req);
    const username = str(b.username, 30).toLowerCase(), name = str(b.name, 40), password = typeof b.password === 'string' ? b.password : '';
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) return json(res, 400, { error: 'Username must be 3–30 letters, numbers, _ or .' });
    if (!name) return json(res, 400, { error: 'Please enter your name' });
    if (password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters' });
    if (D.usernames[username]) return json(res, 409, { error: 'That username is taken' });
    const u = { id: newId(9), username, name, about: 'Hey there! I am using ASU-CHAT.', pw: hashPw(password), joinedAt: Date.now(), seen: Date.now() };
    D.users[u.id] = u; D.usernames[username] = u.id;
    const token = newId(24); D.tokens[token] = u.id; save();
    broadcast('user', pubUser(u));
    return json(res, 200, { token, user: pubUser(u) });
  }
  if (p === '/api/login' && m === 'POST') {
    const b = await readBody(req);
    const uid = D.usernames[str(b.username, 30).toLowerCase()];
    const u = uid && D.users[uid];
    if (!u || !checkPw(String(b.password || ''), u.pw)) return json(res, 401, { error: 'Wrong username or password' });
    const token = newId(24); D.tokens[token] = u.id; save();
    return json(res, 200, { token, user: pubUser(u) });
  }

  const me = auth(req, url);
  if (!me) return json(res, 401, { error: 'Please sign in again' });

  if (p === '/api/logout' && m === 'POST') {
    const h = req.headers.authorization || ''; delete D.tokens[h.slice(7)]; save(); return json(res, 200, { ok: true });
  }
  if (p === '/api/events' && m === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', ...cors });
    res.write('retry: 3000\n\n');
    const first = !clients.has(me.id);
    if (first) clients.set(me.id, new Set());
    clients.get(me.id).add(res);
    if (first) broadcast('presence', { id: me.id, online: true, seen: me.seen }, me.id);
    res.write(`event: ready\ndata: {}\n\n`);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      const set = clients.get(me.id); if (!set) return;
      set.delete(res);
      if (!set.size) { clients.delete(me.id); me.seen = Date.now(); save(); broadcast('presence', { id: me.id, online: false, seen: me.seen }); }
    });
    return;
  }
  if (p === '/api/me' && m === 'GET') return json(res, 200, { user: pubUser(me) });
  if (p === '/api/me' && m === 'PATCH') {
    const b = await readBody(req);
    if (typeof b.name === 'string' && str(b.name, 40)) me.name = str(b.name, 40);
    if (typeof b.about === 'string') me.about = str(b.about, 140);
    save(); broadcast('user', pubUser(me));
    return json(res, 200, { user: pubUser(me) });
  }
  if (p === '/api/users' && m === 'GET') return json(res, 200, { users: Object.values(D.users).map(pubUser) });

  if (p === '/api/chats' && m === 'GET') {
    const chats = Object.values(D.chats).filter(c => c.members.includes(me.id)).map(c => pubChat(c, me.id));
    return json(res, 200, { chats });
  }
  if (p === '/api/chats' && m === 'POST') {
    const b = await readBody(req);
    if (b.type === 'dm') {
      const other = D.users[b.with]; if (!other || other.id === me.id) return json(res, 400, { error: 'Unknown person' });
      const id = 'dm_' + [me.id, other.id].sort().join('_');
      let c = D.chats[id];
      if (!c) { c = D.chats[id] = { id, type: 'dm', members: [me.id, other.id], createdBy: me.id, createdAt: Date.now(), readBy: {} }; save(); pushChat(c); }
      return json(res, 200, { chat: pubChat(c, me.id) });
    }
    if (b.type === 'group') {
      const name = str(b.name, 60); if (!name) return json(res, 400, { error: 'Give the group a name' });
      const members = [...new Set([me.id, ...(Array.isArray(b.members) ? b.members : [])])].filter(id => D.users[id]);
      if (members.length < 2) return json(res, 400, { error: 'Pick at least one member' });
      const id = 'g_' + newId(9);
      const c = D.chats[id] = { id, type: 'group', name, members, createdBy: me.id, createdAt: Date.now(), readBy: { [me.id]: Date.now() } };
      systemMessage(c, `${me.name} created the group “${name}”`); save(); pushChat(c);
      return json(res, 200, { chat: pubChat(c, me.id) });
    }
    return json(res, 400, { error: 'Unknown chat type' });
  }

  let mm = p.match(/^\/api\/chats\/([\w-]+)(\/[a-z]+)?$/);
  if (mm) {
    const chat = D.chats[mm[1]];
    if (!chat || !chat.members.includes(me.id)) return json(res, 404, { error: 'Chat not found' });
    const sub = mm[2] || '';
    if (sub === '/messages' && m === 'GET') {
      const list = D.messages[chat.id] || [];
      const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);
      return json(res, 200, { messages: list.slice(-limit) });
    }
    if (sub === '/messages' && m === 'POST') {
      const b = await readBody(req);
      const text = str(b.text, 4000);
      const img = typeof b.img === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(b.img) && b.img.length < 1_000_000 ? b.img : null;
      if (!text && !img) return json(res, 400, { error: 'Empty message' });
      const msg = { id: newId(), from: me.id, text, at: Date.now() };
      if (img) msg.img = img;
      if (typeof b.cid === 'string') msg.cid = b.cid.slice(0, 40);
      if (b.reply && typeof b.reply === 'object') msg.reply = { from: str(b.reply.from, 40), text: str(b.reply.text, 140) };
      addMessage(chat, msg);
      chat.last = { text: (img ? '📷 ' + (text || 'Photo') : text).slice(0, 120), from: me.id, at: msg.at };
      chat.readBy = chat.readBy || {}; chat.readBy[me.id] = msg.at;
      save();
      for (const u of chat.members) send(u, 'message', { chat: chat.id, msg });
      pushChat(chat);
      return json(res, 200, { msg });
    }
    if (sub === '/read' && m === 'POST') {
      chat.readBy = chat.readBy || {}; chat.readBy[me.id] = Date.now(); save(); pushChat(chat);
      return json(res, 200, { ok: true });
    }
    if (sub === '/typing' && m === 'POST') {
      const b = await readBody(req);
      for (const u of chat.members) if (u !== me.id) send(u, 'typing', { chat: chat.id, id: me.id, typing: !!b.typing });
      return json(res, 200, { ok: true });
    }
    if (sub === '' && m === 'PATCH' && chat.type === 'group') {
      const b = await readBody(req);
      const before = [...chat.members];
      if (typeof b.name === 'string' && str(b.name, 60) && str(b.name, 60) !== chat.name) { chat.name = str(b.name, 60); systemMessage(chat, `${me.name} renamed the group to “${chat.name}”`); }
      if (Array.isArray(b.add)) {
        const add = b.add.filter(id => D.users[id] && !chat.members.includes(id));
        if (add.length) { chat.members.push(...add); systemMessage(chat, `${me.name} added ${add.map(id => D.users[id].name).join(', ')}`); }
      }
      if (b.leave) {
        chat.members = chat.members.filter(id => id !== me.id);
        systemMessage(chat, `${me.name} left`);
        send(me.id, 'chat_removed', { id: chat.id });
      }
      if (!chat.members.length) { delete D.chats[chat.id]; delete D.messages[chat.id]; }
      save(); if (D.chats[chat.id]) pushChat(chat, before.filter(id => id !== me.id && !chat.members.includes(id)));
      return json(res, 200, { ok: true });
    }
  }
  mm = p.match(/^\/api\/chats\/([\w-]+)\/messages\/([\w-]+)$/);
  if (mm && m === 'DELETE') {
    const chat = D.chats[mm[1]];
    if (!chat || !chat.members.includes(me.id)) return json(res, 404, { error: 'Chat not found' });
    const msg = (D.messages[chat.id] || []).find(x => x.id === mm[2]);
    if (!msg || msg.from !== me.id) return json(res, 403, { error: 'You can only delete your own messages' });
    msg.deleted = true; msg.text = ''; delete msg.img; delete msg.reply; save();
    for (const u of chat.members) send(u, 'message', { chat: chat.id, msg });
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'Not found' });
}

/* ---------- static files (the web version of the app) ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.apk': 'application/vnd.android.package-archive' };
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (url.pathname.startsWith('/api/')) {
    try { await api(req, res, url); }
    catch (e) { if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Server error' }); if (!e.status) console.error(e); }
    return;
  }
  serveStatic(req, res, url);
}).listen(PORT, () => console.log(`ASU-CHAT server running on http://localhost:${PORT}`));
