/* ASU-CHAT app */
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(str){ let h1=0xdeadbeef,h2=0x41c6ce57; for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);} h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909); return (h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0'); }
const hue = s => parseInt(hash(String(s)).slice(0,4),16) % 360;
const initials = n => (n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
const fmtTime = t => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
function fmtDay(t){ const d=new Date(t), n=new Date(); const y=new Date(); y.setDate(n.getDate()-1);
  if(d.toDateString()===n.toDateString()) return 'Today';
  if(d.toDateString()===y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {weekday:'long', day:'numeric', month:'short', year: d.getFullYear()===n.getFullYear()?undefined:'numeric'}); }
function fmtListTime(t){ if(!t) return ''; const d=new Date(t), n=new Date(); if(d.toDateString()===n.toDateString()) return fmtTime(t);
  const y=new Date(); y.setDate(n.getDate()-1); if(d.toDateString()===y.toDateString()) return 'Yesterday';
  if(n-d < 6*864e5) return d.toLocaleDateString([], {weekday:'short'}); return d.toLocaleDateString([], {day:'2-digit',month:'2-digit',year:'2-digit'}); }
function ago(t){ if(!t) return ''; const s=(Date.now()-t)/1000; if(s<90) return 'last seen just now'; if(s<3600) return `last seen ${Math.round(s/60)} min ago`;
  const d=new Date(t), n=new Date(); if(d.toDateString()===n.toDateString()) return 'last seen today at '+fmtTime(t); return 'last seen '+fmtDay(t).toLowerCase()+' at '+fmtTime(t); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),2600); }
const store = { get(k){ try{return localStorage.getItem(k);}catch{return null;} }, set(k,v){ try{ v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch{} } };
const Native = window.AsuNative || null; // provided by the Android app

const I = {
  back:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  info:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  smile:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>',
  clip:'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>',
  send:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>',
  copy:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  reply:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  logo:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="110" height="110"><path d="M28 14h42a18 18 0 0 1 18 18v20a18 18 0 0 1-18 18H45L17 88l5-19.5A18 18 0 0 1 10 52V32a18 18 0 0 1 18-18z" fill="#0E9F6E"/><path d="M36.5 60 49 27.5 61.5 60" fill="none" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="45" cy="52.5" r="2" fill="#FFFFFF"/><circle cx="49" cy="52.5" r="2" fill="#FFFFFF"/><circle cx="53" cy="52.5" r="2" fill="#FFFFFF"/><circle cx="85" cy="16" r="10.5" fill="var(--chatbg)"/><circle cx="85" cy="16" r="7" fill="#FF7A59"/></svg>',
};
const tick1='<svg class="tick" width="15" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6 5 9.5 11 2"/></svg>';
const tick2 = read => `<svg class="tick ${read?'read':''}" width="17" height="11" viewBox="0 0 18 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6 4.5 9.5 10.5 2"/><path d="M7.5 9.5 13.5 2"/></svg>`;
const EMOJI = '😀 😂 🥹 😊 😍 🥰 😘 😎 🤩 🥳 😇 🙃 😉 🤔 🤗 😴 😢 😭 😤 😡 🤯 😱 🙏 👍 👎 👏 🙌 💪 🤝 👋 ❤️ 💜 🧡 💯 🔥 ✨ 🎉 🎂 ☕ 🍕 ⚽ 🎵 📚 💼 ✅ ❌ 👀 🌍'.split(' ');

/* ================= connection ================= */
let SERVER = (store.get('asu_server') || window.ASU_DEFAULT_SERVER || (location.protocol.startsWith('http') ? location.origin : '')).replace(/\/+$/,'');
let TOKEN = store.get('asu_token');
let es = null;

async function api(method, p, body){
  let r;
  try{ r = await fetch(SERVER + p, { method, headers: { 'Content-Type':'application/json', ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch(e){ const err=new Error("Can't reach the ASU-CHAT server. Check your internet connection."); err.network=true; throw err; }
  let j={}; try{ j=await r.json(); }catch{}
  if(!r.ok){ const err=new Error(j.error || ('Server error ('+r.status+')')); err.status=r.status; if(r.status===401 && TOKEN && p!=='/api/login') signOut(true); throw err; }
  return j;
}

/* ================= state ================= */
const S = { me:null, chats:{}, msgs:{}, users:{}, current:null, typing:{}, filter:'', reply:null };
const nameOf = id => id===S.me ? 'You' : (S.users[id]?.name || 'Someone');
const isOnline = id => !!S.users[id]?.online;
const chatOther = c => (c.members||[]).find(m=>m!==S.me) || S.me;
const chatTitle = c => c.type==='group' ? (c.name||'Group') : nameOf(chatOther(c));
function avatarHtml(key, label, cls='', online=false){
  const h=hue(key); return `<div class="avatar ${cls}" style="background:linear-gradient(135deg,hsl(${h} 65% 52%),hsl(${(h+40)%360} 70% 45%))">${esc(initials(label))}${online?'<span class="dot"></span>':''}</div>`; }

/* ================= auth screen ================= */
let authTab='login';
function showAuth(){
  $('#app').style.display='none'; $('#auth').style.display='grid';
  $('#aServer').value=SERVER;
  if(!SERVER) $('#serverRow').style.display='';
  setTab(authTab);
}
function setTab(t){ authTab=t; document.querySelectorAll('.auth .tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  $('#nameRow').style.display = t==='register' ? '' : 'none'; $('#aGo').textContent = t==='register' ? 'Create account' : 'Sign in';
  $('#aPass').autocomplete = t==='register' ? 'new-password' : 'current-password'; $('#aErr').textContent=''; }
document.querySelectorAll('.auth .tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#aServerToggle').onclick=()=>{ const r=$('#serverRow'); r.style.display = r.style.display==='none' ? '' : 'none'; };
$('#authForm').onsubmit=async e=>{
  e.preventDefault();
  const srv=$('#aServer').value.trim().replace(/\/+$/,'');
  if(!srv){ $('#serverRow').style.display=''; $('#aErr').textContent='Enter your ASU-CHAT server address'; return; }
  SERVER = /^https?:\/\//.test(srv) ? srv : 'https://'+srv; store.set('asu_server',SERVER);
  const body={ username:$('#aUser').value.trim(), password:$('#aPass').value };
  if(authTab==='register') body.name=$('#aName').value.trim();
  $('#aGo').disabled=true; $('#aErr').textContent='';
  try{
    const r=await api('POST', authTab==='register'?'/api/register':'/api/login', body);
    TOKEN=r.token; store.set('asu_token',TOKEN); $('#aPass').value='';
    start();
  }catch(err){ $('#aErr').textContent=err.message; }
  finally{ $('#aGo').disabled=false; }
};
function signOut(expired){
  if(TOKEN && !expired) api('POST','/api/logout').catch(()=>{});
  TOKEN=null; store.set('asu_token',null); if(es){ es.close(); es=null; }
  Object.assign(S,{me:null,chats:{},msgs:{},users:{},current:null,typing:{}});
  closeModal(); showAuth(); if(expired) $('#aErr').textContent='Please sign in again.';
}

/* ================= start / live updates ================= */
async function start(){
  $('#auth').style.display='none'; $('#app').style.display='';
  try{ const r=await api('GET','/api/me'); S.me=r.user.id; S.users[r.user.id]=r.user; }
  catch(e){ if(!TOKEN) return; $('#list').innerHTML=`<div class="empty-list">${esc(e.message)}<div class="cta"><button class="btn" onclick="start()">Try again</button></div></div>`; return; }
  renderAll();
  connect();
}
async function refreshAll(){
  try{
    const [u,c]=await Promise.all([api('GET','/api/users'),api('GET','/api/chats')]);
    S.users={}; u.users.forEach(x=>S.users[x.id]=x);
    S.chats={}; c.chats.forEach(x=>S.chats[x.id]=x);
    if(S.current && !S.chats[S.current]) S.current=null;
    if(S.current) await loadMessages(S.current);
    renderAll();
  }catch(e){ if(e.network) setConn(false); }
}
function setConn(ok){ $('#conn').classList.toggle('show',!ok); }
let connTimer=null;
function connect(){
  if(es) es.close();
  es = new EventSource(SERVER + '/api/events?token=' + encodeURIComponent(TOKEN));
  clearTimeout(connTimer); connTimer=setTimeout(()=>setConn(false),6000);
  es.addEventListener('ready',()=>{ clearTimeout(connTimer); setConn(true); refreshAll(); });
  es.onerror=()=>{ clearTimeout(connTimer); connTimer=setTimeout(()=>setConn(false),2500);
    if(es.readyState===2){ setTimeout(()=>{ if(TOKEN) api('GET','/api/me').then(connect).catch(()=>setTimeout(()=>TOKEN&&connect(),5000)); },3000); } };
  es.addEventListener('chat', e=>{ const c=JSON.parse(e.data); S.chats[c.id]=c; renderList(); if(S.current===c.id) updateHeader(), renderMessages(); });
  es.addEventListener('chat_removed', e=>{ const {id}=JSON.parse(e.data); delete S.chats[id]; if(S.current===id) closeChat(); renderList(); });
  es.addEventListener('user', e=>{ const u=JSON.parse(e.data); S.users[u.id]={...(S.users[u.id]||{}),...u}; renderAll(); });
  es.addEventListener('presence', e=>{ const p=JSON.parse(e.data); if(S.users[p.id]){ S.users[p.id].online=p.online; S.users[p.id].seen=p.seen; } renderList(); if(S.current) updateHeader(); });
  es.addEventListener('typing', e=>{ const t=JSON.parse(e.data); setTypingFor(t.chat,t.id,t.typing); });
  es.addEventListener('message', e=>{ const {chat,msg}=JSON.parse(e.data); onMessage(chat,msg); });
}
const typingTimers={};
function setTypingFor(chat, uid, on){
  const list=new Set(S.typing[chat]||[]); on?list.add(uid):list.delete(uid); S.typing[chat]=[...list];
  clearTimeout(typingTimers[chat+uid]); if(on) typingTimers[chat+uid]=setTimeout(()=>setTypingFor(chat,uid,false),6000);
  renderList(); if(S.current===chat){ updateHeader(); renderMessages(); }
}
function onMessage(chatId, msg){
  setTypingFor(chatId, msg.from, false);
  const list=S.msgs[chatId];
  if(list){
    let i=list.findIndex(m=>m.id===msg.id || (msg.cid && m.cid===msg.cid));
    if(i>=0) list[i]=msg; else list.push(msg);
    if(S.current===chatId){ renderMessages(); scheduleRead(); }
  }
  const isNew = msg.from!==S.me && msg.from!=='system' && !msg.deleted && Date.now()-msg.at<60000;
  if(isNew && (S.current!==chatId || appHidden())) notify(chatId,msg);
}
let audioCtx=null;
const appHidden=()=>document.hidden || window.asuAppVisible===false;
window.asuOnResume=()=>{ scheduleRead(); if(TOKEN && es && es.readyState===2) connect(); };
function notify(chatId,msg){
  const c=S.chats[chatId]; const title = c ? (c.type==='group' ? `${nameOf(msg.from)} @ ${c.name}` : nameOf(msg.from)) : 'ASU-CHAT';
  const body = msg.img ? '📷 '+(msg.text||'Photo') : msg.text;
  if(appHidden() && Native && Native.notify){ try{ Native.notify(title, body); }catch{} return; }
  if(appHidden() && 'Notification' in window && Notification.permission==='granted'){ try{ new Notification(title,{body,icon:'icon-192.png'}); }catch{} return; }
  try{ audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.frequency.value=880; o.type='sine'; g.gain.setValueAtTime(0.0001,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.15,audioCtx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.25);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+0.3); }catch{}
}

/* ================= rendering ================= */
function renderAll(){ renderMe(); renderList(); renderChat(); }
function renderMe(){ const b=$('#meAvatar'); const n=S.users[S.me]?.name||'Me'; const h=hue(S.me||'me');
  b.style.background=`linear-gradient(135deg,hsl(${h} 65% 52%),hsl(${(h+40)%360} 70% 45%))`; b.textContent=initials(n); }

function renderList(){
  const el=$('#list'); const q=S.filter.toLowerCase();
  const chats=Object.values(S.chats).filter(c=>!q || chatTitle(c).toLowerCase().includes(q) || (c.last?.text||'').toLowerCase().includes(q))
    .sort((a,b)=>((b.last?.at)||b.createdAt||0)-((a.last?.at)||a.createdAt||0));
  if(!chats.length){
    el.innerHTML = q ? `<div class="empty-list">No chats match “${esc(S.filter)}”.</div>` :
      `<div class="empty-list"><b>No chats yet</b><br>Start a conversation with someone on ASU-CHAT.<div class="cta"><button class="btn" onclick="openNewChat()">Start a chat</button></div></div>`;
    return;
  }
  el.innerHTML = chats.map(c=>{
    const other=chatOther(c), title=chatTitle(c);
    const online = c.type!=='group' && isOnline(other);
    const typers=(S.typing[c.id]||[]);
    let prev;
    if(typers.length) prev=`<div class="prev typing">${c.type==='group'?esc(nameOf(typers[0]))+' is ':''}typing…</div>`;
    else if(c.last){ const who = c.last.from===S.me ? 'You: ' : (c.type==='group' && c.last.from!=='system' ? nameOf(c.last.from)+': ' : '');
      prev=`<div class="prev">${esc(who)}${esc(c.last.text)}</div>`; }
    else prev=`<div class="prev">Tap to start chatting</div>`;
    const unread = S.current===c.id ? 0 : (c.unread||0);
    return `<div class="item ${S.current===c.id?'active':''}" data-cid="${esc(c.id)}">
      ${avatarHtml(c.type==='group'?c.id:other, title, '', online)}
      <div class="mid"><div class="row"><div class="title">${esc(title)}</div><div class="time ${unread?'new':''}">${fmtListTime(c.last?.at||c.createdAt)}</div></div>
      <div class="row">${prev}${unread?`<div class="badge">${unread>99?'99+':unread}</div>`:''}</div></div></div>`;
  }).join('');
  const total=Object.values(S.chats).reduce((n,c)=>n+(S.current===c.id?0:(c.unread||0)),0);
  document.title = total ? `(${total}) ASU-CHAT` : 'ASU-CHAT';
}

function subtitle(c){
  const typers=(S.typing[c.id]||[]);
  if(typers.length) return {t: c.type==='group' ? `${nameOf(typers[0])} is typing…` : 'typing…', on:true};
  if(c.type==='group'){ const names=(c.members||[]).map(nameOf).sort((a,b)=>a==='You'?1:b==='You'?-1:0); return {t:names.join(', ')}; }
  const o=chatOther(c); if(isOnline(o)) return {t:'online', on:true};
  const u=S.users[o]; return {t: u?.seen ? ago(u.seen) : (u?.about||'')};
}
function updateHeader(){
  const c=S.chats[S.current]; if(!c || !$('#chName')) return;
  const other=chatOther(c), title=chatTitle(c);
  $('#chAv').innerHTML=avatarHtml(c.type==='group'?c.id:other, title, 'sm', c.type!=='group'&&isOnline(other));
  $('#chName').textContent=title;
  const sub=subtitle(c); const se=$('#chSub'); se.textContent=sub.t; se.classList.toggle('on',!!sub.on);
}
function renderChat(){
  const el=$('#chat');
  const c=S.current && S.chats[S.current];
  $('#app').classList.toggle('show-chat', !!c);
  if(!c){
    el.innerHTML=`<div class="welcome"><div><div class="big">${I.logo}</div><h1>ASU<span class="l">CHAT</span></h1><div class="tagline">Talk freely. Stay close.</div><p>Send messages, photos and emojis to friends and groups in real time. Pick a chat, or start a new one.</p>
      <div style="margin-top:20px;display:flex;gap:10px;justify-content:center"><button class="btn" onclick="openNewChat()">New chat</button><button class="btn ghost" onclick="openNewGroup()">New group</button></div></div></div>`;
    el._cid=null; return;
  }
  if(el._cid!==c.id){
    el._cid=c.id;
    el.innerHTML=`<div class="chat-head">
        <button class="icon-btn back" onclick="closeChat()">${I.back}</button>
        <div id="chAv"></div>
        <div class="who" onclick="openInfo()"><div class="name" id="chName"></div><div class="sub" id="chSub"></div></div>
        <button class="icon-btn" onclick="openInfo()" title="Info">${I.info}</button>
      </div>
      <div class="msgs" id="msgs"></div>
      <div id="replyBar"></div>
      <div class="composer">
        <div class="emoji-pop" id="emojiPop">${EMOJI.map(e=>`<button type="button">${e}</button>`).join('')}</div>
        <button class="icon-btn" id="emojiBtn" title="Emoji">${I.smile}</button>
        <button class="icon-btn" id="attachBtn" title="Send a photo">${I.clip}</button>
        <div class="box"><textarea id="input" rows="1" placeholder="Type a message"></textarea></div>
        <button class="send" id="sendBtn" title="Send">${I.send}</button>
      </div>`;
    wireComposer();
    el._lastCount=-1;
  }
  updateHeader(); renderMessages(); renderReplyBar();
}

function renderMessages(){
  const box=$('#msgs'); if(!box) return;
  const c=S.chats[S.current]; const list=S.msgs[S.current];
  if(!list){ box.innerHTML='<div class="loading"><div class="spin"></div>Loading messages…</div>'; return; }
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const others=(c.members||[]).filter(m=>m!==S.me);
  const readBy=c.readBy||{};
  let html='', lastDay='', lastFrom=null, lastAt=0;
  if(!list.length) html=`<div class="sys">Say hi to start the conversation 👋</div>`;
  for(const m of list){
    const day=new Date(m.at).toDateString();
    if(day!==lastDay){ html+=`<div class="day">${fmtDay(m.at)}</div>`; lastDay=day; lastFrom=null; }
    if(m.from==='system'){ html+=`<div class="sys">${esc(m.text)}</div>`; lastFrom=null; continue; }
    const mine=m.from===S.me; const gap = m.from!==lastFrom || m.at-lastAt>5*60e3;
    lastFrom=m.from; lastAt=m.at;
    let ticks='';
    if(mine && !m.deleted){
      if(m.pending) ticks=m.failed?'<span style="color:var(--danger)">!</span>':tick1;
      else { const read = others.length>0 && others.every(o=>(readBy[o]||0)>=m.at); ticks=tick2(read); }
    }
    const from = (!mine && c.type==='group' && gap) ? `<div class="from" style="color:hsl(${hue(m.from)} 75% 62%)">${esc(nameOf(m.from))}</div>` : '';
    let quote='';
    if(m.reply && !m.deleted) quote=`<div style="border-left:3px solid var(--accent2);background:rgba(127,127,160,.12);border-radius:8px;padding:5px 8px;margin:2px 0 5px;font-size:12.5px"><b style="color:var(--accent2)">${esc(nameOf(m.reply.from))}</b><div style="color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${esc(m.reply.text||'📷 Photo')}</div></div>`;
    const body = m.deleted ? `<div class="txt del">🚫 ${mine?'You deleted this message':'This message was deleted'}</div>`
      : `${quote}${m.img?`<img src="${esc(m.img)}" alt="photo" data-full="1">`:''}${m.text?`<span class="txt">${esc(m.text)}</span>`:''}`;
    const acts = (m.deleted||m.pending) ? '' : `<div class="acts"><button data-act="reply" title="Reply">${I.reply}</button>${m.text?`<button data-act="copy" title="Copy">${I.copy}</button>`:''}${mine?`<button data-act="del" title="Delete">${I.trash}</button>`:''}</div>`;
    html+=`<div class="m ${mine?'mine':''} ${gap?'gap':''}" data-mid="${esc(m.id)}"><div class="bubble">${from}${body}<span class="meta">${fmtTime(m.at)} ${ticks}</span></div>${acts}</div>`;
  }
  if((S.typing[S.current]||[]).length) html+=`<div class="typing-b"><i></i><i></i><i></i></div>`;
  box.innerHTML=html;
  const chat=$('#chat'); const grew=list.length!==chat._lastCount; const lastMine=list.length && list[list.length-1].from===S.me;
  if(nearBottom || chat._lastCount===-1 || (grew && lastMine)) box.scrollTop=box.scrollHeight;
  chat._lastCount=list.length;
}
function renderReplyBar(){
  const el=$('#replyBar'); if(!el) return;
  if(!S.reply){ el.innerHTML=''; return; }
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--panel2);border-top:1px solid var(--line);z-index:1;position:relative">
    <div style="flex:1;border-left:3px solid var(--accent2);padding-left:10px;min-width:0"><b style="color:var(--accent2);font-size:12.5px">Replying to ${esc(nameOf(S.reply.from))}</b>
    <div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(S.reply.text||'📷 Photo')}</div></div>
    <button class="icon-btn" onclick="S.reply=null;renderReplyBar()">${I.x}</button></div>`;
}

/* ================= composer ================= */
let typingTimer=null, typingOn=false, typingSentAt=0;
function setTyping(on){
  if(!S.current) return;
  if(on && typingOn && Date.now()-typingSentAt<3000) return;
  if(!on && !typingOn) return;
  typingOn=on; typingSentAt=Date.now();
  api('POST',`/api/chats/${S.current}/typing`,{typing:on}).catch(()=>{});
}
function wireComposer(){
  const ta=$('#input');
  ta.addEventListener('input',()=>{ ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,140)+'px';
    if(ta.value.trim()){ setTyping(true); clearTimeout(typingTimer); typingTimer=setTimeout(()=>setTyping(false),4000); } else setTyping(false); });
  ta.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey && !e.isComposing && window.innerWidth>760){ e.preventDefault(); doSend(); } });
  $('#sendBtn').onclick=doSend;
  $('#emojiBtn').onclick=e=>{ e.stopPropagation(); $('#emojiPop').classList.toggle('open'); };
  $('#emojiPop').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; e.stopPropagation(); const p=ta.selectionStart??ta.value.length;
    ta.value=ta.value.slice(0,p)+b.textContent+ta.value.slice(p); ta.selectionStart=ta.selectionEnd=p+b.textContent.length; ta.dispatchEvent(new Event('input')); };
  $('#attachBtn').onclick=()=>$('#fileIn').click();
  $('#msgs').addEventListener('click',onMsgClick);
  if(window.innerWidth>760) setTimeout(()=>ta.focus(),50);
}
document.addEventListener('click',e=>{ const p=$('#emojiPop'); if(p && !e.target.closest('#emojiPop')) p.classList.remove('open');
  if(!e.target.closest('.m')) document.querySelectorAll('.m.show-acts').forEach(x=>x.classList.remove('show-acts')); });
function onMsgClick(e){
  const img=e.target.closest('img[data-full]'); if(img){ $('#lbImg').src=img.src; $('#lightbox').classList.add('open'); return; }
  const mEl=e.target.closest('.m'); if(!mEl) return;
  const m=(S.msgs[S.current]||[]).find(x=>x.id===mEl.dataset.mid); if(!m) return;
  const act=e.target.closest('[data-act]')?.dataset.act;
  if(!act){ document.querySelectorAll('.m.show-acts').forEach(x=>x!==mEl&&x.classList.remove('show-acts')); mEl.classList.toggle('show-acts'); return; }
  mEl.classList.remove('show-acts');
  if(act==='copy') copyText(m.text);
  if(act==='reply'){ S.reply={from:m.from, text:(m.text||'').slice(0,140)}; renderReplyBar(); $('#input')?.focus(); }
  if(act==='del') confirmModal('Delete message?','This deletes the message for everyone in the chat.','Delete',()=>api('DELETE',`/api/chats/${S.current}/messages/${m.id}`).catch(e=>toast(e.message)));
}
function copyText(t){
  if(Native && Native.copy){ try{ Native.copy(t); toast('Copied'); return; }catch{} }
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast('Copied'),()=>toast("Couldn't copy"));
}
$('#lightbox').onclick=()=>$('#lightbox').classList.remove('open');

async function doSend(){
  const ta=$('#input'); const text=ta.value.trim(); if(!text) return;
  ta.value=''; ta.style.height='auto'; clearTimeout(typingTimer); setTyping(false);
  const reply=S.reply; S.reply=null; renderReplyBar();
  sendMessage(S.current,{text, reply});
  ta.focus();
}
$('#fileIn').onchange=async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  if(!f.type.startsWith('image/')) return toast('Please choose a photo');
  try{ const url=await shrinkImage(f); const cap=$('#input').value.trim(); $('#input').value='';
    const reply=S.reply; S.reply=null; renderReplyBar();
    sendMessage(S.current,{img:url, text:cap, reply}); }catch(err){ toast("Couldn't read that photo"); }
};
function shrinkImage(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onerror=rej; r.onload=()=>{ const im=new Image(); im.onerror=rej; im.onload=()=>{
  let max=1100, q=0.75, out='';
  for(let i=0;i<6;i++){ const s=Math.min(1,max/Math.max(im.width,im.height)); const cv=document.createElement('canvas'); cv.width=Math.round(im.width*s); cv.height=Math.round(im.height*s);
    cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height); out=cv.toDataURL('image/jpeg',q); if(out.length<700000) break; max*=0.75; q-=0.07; }
  res(out); }; im.src=r.result; }; r.readAsDataURL(file); }); }

async function sendMessage(cid,{text='',img=null,reply=null}){
  const tmp={ id:'tmp'+Date.now()+Math.random().toString(36).slice(2,6), cid:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8), from:S.me, text, img, reply, at:Date.now(), pending:true };
  (S.msgs[cid]=S.msgs[cid]||[]).push(tmp); renderMessages();
  try{
    const r=await api('POST',`/api/chats/${cid}/messages`,{text,img,reply,cid:tmp.cid});
    const list=S.msgs[cid]; const i=list.findIndex(m=>m.cid===tmp.cid || m.id===r.msg.id);
    if(i>=0) list[i]=r.msg; if(S.current===cid) renderMessages();
  }catch(e){ tmp.failed=true; renderMessages(); toast(e.message); }
}

/* ================= chats ================= */
async function loadMessages(cid){
  try{ const r=await api('GET',`/api/chats/${cid}/messages?limit=300`);
    const pend=(S.msgs[cid]||[]).filter(m=>m.pending && !r.messages.some(x=>x.cid===m.cid));
    S.msgs[cid]=[...r.messages,...pend]; }
  catch(e){ S.msgs[cid]=S.msgs[cid]||[]; toast(e.message); }
  if(S.current===cid){ renderMessages(); scheduleRead(); }
}
function openChat(cid){
  if(S.current===cid) return;
  setTyping(false);
  S.current=cid; S.reply=null;
  if(S.chats[cid]) S.chats[cid].unread=0;
  renderList(); renderChat();
  loadMessages(cid);
  try{ history.pushState({chat:cid},''); }catch{}
}
function closeChat(){ setTyping(false); S.current=null; renderList(); renderChat(); }
window.addEventListener('popstate',()=>{ if(S.current) closeChat(); });
window.asuBack = function(){ // called by the Android back button
  if($('#lightbox').classList.contains('open')){ $('#lightbox').classList.remove('open'); return true; }
  if($('#overlay').classList.contains('open')){ closeModal(); return true; }
  if(S.current){ closeChat(); return true; }
  return false;
};
let readTimer=null;
function scheduleRead(){
  clearTimeout(readTimer);
  readTimer=setTimeout(()=>{
    const c=S.chats[S.current]; if(!c || appHidden() || !c.last) return;
    if(c.last.from===S.me || c.last.at <= ((c.readBy||{})[S.me]||0)) return;
    c.readBy={...(c.readBy||{}),[S.me]:Date.now()};
    api('POST',`/api/chats/${c.id}/read`).catch(()=>{});
  },700);
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ scheduleRead(); if(TOKEN && es && es.readyState===2) connect(); } });

async function startDM(uid){
  closeModal();
  try{ const r=await api('POST','/api/chats',{type:'dm',with:uid}); S.chats[r.chat.id]=r.chat; openChat(r.chat.id); }catch(e){ toast(e.message); }
}
async function createGroup(name, ids){
  closeModal();
  try{ const r=await api('POST','/api/chats',{type:'group',name,members:ids}); S.chats[r.chat.id]=r.chat; openChat(r.chat.id); }catch(e){ toast(e.message); }
}

/* ================= modals ================= */
function openModal(html){ $('#modal').innerHTML=html; $('#overlay').classList.add('open'); }
function closeModal(){ $('#overlay').classList.remove('open'); }
$('#overlay').addEventListener('click',e=>{ if(e.target.id==='overlay') closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeModal(); $('#lightbox').classList.remove('open'); } });
const closeX=()=>`<button class="icon-btn" onclick="closeModal()">${I.x}</button>`;
function people(){ return Object.values(S.users).filter(u=>u.id!==S.me).sort((a,b)=>(b.online-a.online) || a.name.localeCompare(b.name)); }
function personRow(u, check=false){
  const st = u.online ? '<span style="color:var(--ok)">online</span>' : esc('@'+u.username+(u.about?' · '+u.about:''));
  return `<label class="pick" data-uid="${esc(u.id)}" data-q="${esc((u.name+' '+u.username).toLowerCase())}">${avatarHtml(u.id,u.name,'sm',u.online)}<div class="nm"><b>${esc(u.name)}</b><small>${st}</small></div>${check?`<input type="checkbox" value="${esc(u.id)}">`:''}</label>`; }
const noPeople = `<div class="muted" style="padding:10px 0 4px">No one else is on this ASU-CHAT server yet.<br><br>Send your friends the app and tell them to create an account using the same server address. They'll show up here.</div>`;
function wireSearch(inputSel, listSel){ $(inputSel)?.addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); document.querySelectorAll(listSel+' .pick').forEach(p=>p.style.display=p.dataset.q.includes(q)?'':'none'); }); }

function openNewChat(){
  const ps=people();
  openModal(`<h2>New chat ${closeX()}</h2><div class="body">
    ${ps.length?`<input class="field" id="cSearch" placeholder="Search name or username">`:''}
    <div class="lbl">People on ASU-CHAT</div><div id="cList">${ps.length?ps.map(u=>personRow(u)).join(''):noPeople}</div></div>`);
  $('#cList').onclick=e=>{ const p=e.target.closest('.pick'); if(p) startDM(p.dataset.uid); };
  wireSearch('#cSearch','#cList');
}
function openNewGroup(){
  const ps=people();
  openModal(`<h2>New group ${closeX()}</h2><div class="body">
    <input class="field" id="gName" maxlength="60" placeholder="Group name (e.g. ASU Study Squad)">
    ${ps.length>6?`<input class="field" id="gSearch" placeholder="Search people">`:''}
    <div class="lbl">Add members</div><div id="gList">${ps.length?ps.map(u=>personRow(u,true)).join(''):noPeople}</div></div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="gCreate">Create group</button></div>`);
  wireSearch('#gSearch','#gList');
  $('#gCreate').onclick=()=>{ const name=$('#gName').value.trim(); const ids=[...document.querySelectorAll('#gList input:checked')].map(i=>i.value);
    if(!name) return toast('Give the group a name'); if(!ids.length) return toast('Pick at least one member'); createGroup(name,ids); };
}
function openInfo(){
  const c=S.chats[S.current]; if(!c) return;
  if(c.type!=='group'){
    const o=chatOther(c), u=S.users[o]||{};
    openModal(`<h2>Contact info ${closeX()}</h2><div class="body" style="text-align:center">
      <div style="display:flex;justify-content:center;margin:6px 0 12px;transform:scale(1.6);height:70px;align-items:center">${avatarHtml(o,u.name,'',u.online)}</div>
      <div style="font-size:20px;font-weight:800">${esc(u.name||'Someone')}</div>
      <div class="muted">@${esc(u.username||'')}</div>
      <div class="muted" style="margin:4px 0 14px">${u.online?'<span style="color:var(--ok)">online</span>':esc(ago(u.seen))}</div>
      <div class="lbl" style="text-align:left">About</div><div style="text-align:left;background:var(--panel2);padding:12px;border-radius:12px">${esc(u.about||'')}</div></div>`);
    return;
  }
  const members=c.members||[]; const others=people().filter(u=>!members.includes(u.id));
  openModal(`<h2>Group info ${closeX()}</h2><div class="body">
    <div class="lbl">Group name</div><div style="display:flex;gap:8px"><input class="field" id="gRename" value="${esc(c.name)}" maxlength="60" style="margin:0"><button class="btn ghost" id="gRenameBtn">Save</button></div>
    <div class="lbl" style="margin-top:16px">${members.length} members</div>
    ${members.map(id=>{ const u=S.users[id]||{}; return `<div class="pick">${avatarHtml(id,nameOf(id),'sm',u.online)}<div class="nm"><b>${esc(nameOf(id))}</b><small>${id===c.createdBy?'Group creator':esc(u.username?'@'+u.username:'')}</small></div></div>`; }).join('')}
    ${others.length?`<div class="lbl" style="margin-top:14px">Add people</div><div id="addList">${others.map(u=>personRow(u,true)).join('')}</div>`:''}
  </div><div class="foot"><button class="btn danger" id="leaveBtn">Leave group</button>${others.length?`<button class="btn" id="addBtn">Add selected</button>`:''}</div>`);
  $('#gRenameBtn').onclick=()=>{ const n=$('#gRename').value.trim(); closeModal(); if(n && n!==c.name) api('PATCH',`/api/chats/${c.id}`,{name:n}).catch(e=>toast(e.message)); };
  $('#addBtn')?.addEventListener('click',()=>{ const ids=[...document.querySelectorAll('#addList input:checked')].map(i=>i.value); if(!ids.length) return toast('Pick someone to add');
    closeModal(); api('PATCH',`/api/chats/${c.id}`,{add:ids}).catch(e=>toast(e.message)); });
  $('#leaveBtn').onclick=()=>confirmModal('Leave group?',`You'll stop getting messages from “${c.name}”.`,'Leave',()=>{
    api('PATCH',`/api/chats/${c.id}`,{leave:true}).then(()=>{ delete S.chats[c.id]; closeChat(); }).catch(e=>toast(e.message)); });
}
function openProfile(){
  const me=S.users[S.me]||{};
  openModal(`<h2>My profile ${closeX()}</h2><div class="body">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">${avatarHtml(S.me,me.name)}<div><div style="font-weight:800;font-size:17px">${esc(me.name)}</div><div class="muted">@${esc(me.username)}</div></div></div>
    <div class="lbl">Name</div><input class="field" id="pName" maxlength="40" value="${esc(me.name)}">
    <div class="lbl">About</div><input class="field" id="pAbout" maxlength="140" value="${esc(me.about||'')}">
    <div class="muted" style="margin-top:4px">Server: ${esc(SERVER)}</div>
    ${'Notification' in window && !Native && Notification.permission==='default' ? `<button class="btn ghost" style="margin-top:12px;width:100%" id="pNotif">Turn on notifications</button>`:''}
  </div>
  <div class="foot"><button class="btn danger" id="pOut" style="margin-right:auto">Sign out</button><button class="btn" id="pSave">Save</button></div>`);
  $('#pSave').onclick=async()=>{ try{ const r=await api('PATCH','/api/me',{name:$('#pName').value.trim(),about:$('#pAbout').value.trim()}); S.users[S.me]=r.user; closeModal(); renderAll(); toast('Profile saved'); }catch(e){ toast(e.message); } };
  $('#pOut').onclick=()=>confirmModal('Sign out?','You can sign back in with your username and password.','Sign out',()=>signOut(false));
  $('#pNotif')?.addEventListener('click',()=>Notification.requestPermission().then(()=>closeModal()));
}
function confirmModal(title,text,okLabel,fn){
  openModal(`<h2>${esc(title)}</h2><div class="body"><p class="muted">${esc(text)}</p></div><div class="foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" id="okBtn">${esc(okLabel)}</button></div>`);
  $('#okBtn').onclick=()=>{ closeModal(); fn(); };
}

$('#newChatBtn').onclick=openNewChat; $('#newGroupBtn').onclick=openNewGroup; $('#meAvatar').onclick=openProfile;
$('#search').oninput=e=>{ S.filter=e.target.value; renderList(); };
$('#list').onclick=e=>{ const it=e.target.closest('.item'); if(it) openChat(it.dataset.cid); };
setInterval(()=>{ if(S.current) updateHeader(); },60000);

if(TOKEN && SERVER) start(); else showAuth();
