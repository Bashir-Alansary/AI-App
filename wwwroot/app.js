const API_URL = 'http://localhost:5233/api/AiChat';

let sessions = [], activeId = null, isLoading = false;

const emptyEl = document.getElementById('emptyState');
const listEl = document.getElementById('messagesList');
const inputEl = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const historyEl = document.getElementById('historyList');
const charCount = document.getElementById('charCount');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

// Nav tabs
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

// Sidebar toggle
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

loadFromStorage();
renderHistory();
showSession(activeId);

// ── Events ──────────────────────────────────────────────────────────────────
newChatBtn.addEventListener('click', () => { const s = createSession(); switchSession(s.id); });
sendBtn.addEventListener('click', sendMessage);

inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) sendMessage(); }
});

inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
    const len = inputEl.value.length;
    sendBtn.disabled = len === 0 || isLoading;
    charCount.textContent = len > 0 ? len + ' chars' : '';
});

document.querySelectorAll('.chip').forEach(c =>
    c.addEventListener('click', () => { inputEl.value = c.dataset.prompt; inputEl.dispatchEvent(new Event('input')); sendMessage(); })
);

// ── Sessions ──────────────────────────────────────────────────────────────────
function createSession() {
    const s = { id: Date.now().toString(), title: 'New chat', messages: [] };
    sessions.unshift(s); activeId = s.id; saveToStorage(); return s;
}
function getActive() { return sessions.find(s => s.id === activeId); }
function switchSession(id) { activeId = id; saveToStorage(); renderHistory(); showSession(id); }

function showSession(id) {
    listEl.innerHTML = '';
    const s = sessions.find(s => s.id === id);
    if (!s || s.messages.length === 0) {
        emptyEl.classList.remove('hidden'); listEl.classList.add('hidden');
    } else {
        emptyEl.classList.add('hidden'); listEl.classList.remove('hidden');
        s.messages.forEach(m => appendBubble(m.role, m.content));
        scrollBottom();
    }
}

function renderHistory() {
    historyEl.innerHTML = '';
    sessions.forEach(s => {
        const el = document.createElement('div');
        el.className = 'history-item' + (s.id === activeId ? ' active' : '');
        el.textContent = s.title; el.title = s.title;
        el.addEventListener('click', () => switchSession(s.id));
        historyEl.appendChild(el);
    });
}

// ── Send ──────────────────────────────────────────────────────────────────────
async function sendMessage() {
    const prompt = inputEl.value.trim();
    if (!prompt || isLoading) return;
    if (!activeId || !getActive()) createSession();

    emptyEl.classList.add('hidden'); listEl.classList.remove('hidden');

    const session = getActive();
    if (session.messages.length === 0) session.title = prompt.length > 38 ? prompt.slice(0, 38) + '…' : prompt;
    session.messages.push({ role: 'user', content: prompt });
    saveToStorage(); renderHistory();

    appendBubble('user', prompt);
    inputEl.value = ''; inputEl.style.height = 'auto';
    sendBtn.disabled = true; charCount.textContent = '';
    isLoading = true;

    const typingRow = appendTyping(); scrollBottom();

    try {
        const fd = new FormData(); fd.append('Prompt', prompt);
        const res = await fetch(API_URL, { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
        const raw = await res.text();
        const text = extractText(raw);
        typingRow.remove();
        appendBubble('ai', text);
        session.messages.push({ role: 'ai', content: text });
        saveToStorage();
    } catch (err) {
        typingRow.remove();
        appendBubble('ai', '⚠ ' + err.message, true);
    } finally {
        isLoading = false; sendBtn.disabled = inputEl.value.trim() === ''; scrollBottom();
    }
}

function extractText(raw) {
    try {
        const j = JSON.parse(raw);
        if (j.output) {
            const parts = [];
            for (const b of j.output) if (b.content) for (const c of b.content) if (c.text) parts.push(c.text);
            if (parts.length) return parts.join('\n\n');
        }
        if (j.choices?.[0]?.message?.content) return j.choices[0].message.content;
        if (j.text) return j.text;
        return raw;
    } catch { return raw; }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
function appendBubble(role, text, isError = false) {
    const row = document.createElement('div');
    row.className = 'msg-row ' + role;
    const av = document.createElement('div');
    av.className = 'avatar ' + role;
    av.textContent = role === 'user' ? 'U' : 'AI';
    const bub = document.createElement('div');
    bub.className = 'bubble ' + role + (isError ? ' error' : '');
    bub.textContent = text;
    row.appendChild(av); row.appendChild(bub);
    listEl.appendChild(row); return row;
}

function appendTyping() {
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    const av = document.createElement('div');
    av.className = 'avatar ai'; av.textContent = 'AI';
    const bub = document.createElement('div');
    bub.className = 'bubble ai';
    bub.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    row.appendChild(av); row.appendChild(bub); listEl.appendChild(row); return row;
}

function scrollBottom() { listEl.scrollTop = listEl.scrollHeight; }

// ── Storage ───────────────────────────────────────────────────────────────────
function saveToStorage() {
    try { localStorage.setItem('aiapp_s', JSON.stringify(sessions)); localStorage.setItem('aiapp_a', activeId); } catch { }
}
function loadFromStorage() {
    try {
        const s = localStorage.getItem('aiapp_s'); const a = localStorage.getItem('aiapp_a');
        if (s) sessions = JSON.parse(s); if (a) activeId = a;
    } catch { sessions = []; activeId = null; }
}