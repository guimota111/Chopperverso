// ── ChopperVerso · Feedbacks (mural compartilhado, tipo grupo de zap) ──────────
// Todos os usuários veem a mesma conversa. Passa pelas Cloud Functions
// getFeedback/postFeedback (Admin SDK) em vez de acesso direto do cliente ao
// Firestore, então não depende de nenhuma regra de segurança nova.
// Depende de: auth (firebase-config.js), _currentUid (data.js), toast/formatDate helpers (app.js).

const FEEDBACK_BASE = 'https://us-central1-chopperverso.cloudfunctions.net';
const FEEDBACK_POLL_MS = 4000;

let _feedbackPoll   = null;
let _feedbackLastId = null;

function _fbEscapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function _feedbackAuthHeaders() {
  const idToken = await auth.currentUser.getIdToken();
  return { Authorization: 'Bearer ' + idToken };
}

function _fbBubbleHtml(msg) {
  const isMine = msg.uid === _currentUid;
  const time   = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  return `
    <div class="fb-row${isMine ? ' fb-mine' : ''}">
      <div class="fb-bubble">
        ${isMine ? '' : `<div class="fb-name">${_fbEscapeHtml(msg.nome || 'Anônimo')}</div>`}
        <div class="fb-text">${_fbEscapeHtml(msg.texto || '')}</div>
        <div class="fb-time">${time}</div>
      </div>
    </div>`;
}

async function _renderFeedback() {
  const list = document.getElementById('feedback-list');
  if (!list) return;

  let mensagens;
  try {
    const headers = await _feedbackAuthHeaders();
    const resp    = await fetch(`${FEEDBACK_BASE}/getFeedback`, { headers });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    mensagens = (await resp.json()).mensagens || [];
  } catch (e) {
    console.error('[feedback] erro ao carregar:', e);
    return;
  }

  if (mensagens.length === 0) {
    if (_feedbackLastId !== null) list.innerHTML = '<div class="fb-empty">Ninguém falou nada ainda. Seja o primeiro!</div>';
    _feedbackLastId = null;
    return;
  }

  const lastId = mensagens[mensagens.length - 1].id;
  if (lastId === _feedbackLastId) return; // nada novo — não reflui o scroll à toa

  const wasNearBottom = (list.scrollTop + list.clientHeight) >= (list.scrollHeight - 40);
  _feedbackLastId = lastId;
  list.innerHTML = mensagens.map(_fbBubbleHtml).join('');
  if (wasNearBottom || list.dataset.everRendered !== '1') list.scrollTop = list.scrollHeight;
  list.dataset.everRendered = '1';
}

function _startFeedbackPolling() {
  _stopFeedbackPolling();
  document.getElementById('feedback-list').dataset.everRendered = '0';
  _feedbackLastId = null;
  _renderFeedback();
  _feedbackPoll = setInterval(_renderFeedback, FEEDBACK_POLL_MS);
}

function _stopFeedbackPolling() {
  if (_feedbackPoll) { clearInterval(_feedbackPoll); _feedbackPoll = null; }
}

async function _sendFeedback() {
  const input = document.getElementById('feedback-input');
  const btn   = document.getElementById('feedback-send');
  const texto = input.value.trim();
  if (!texto) return;

  btn.disabled = true;
  try {
    const headers = await _feedbackAuthHeaders();
    const resp = await fetch(`${FEEDBACK_BASE}/postFeedback`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    input.value = '';
    _feedbackLastId = null; // força re-render mesmo se o polling ainda não rodou de novo
    await _renderFeedback();
  } catch (e) {
    console.error('[feedback] erro ao enviar:', e);
    toast('Não consegui enviar sua mensagem.', true);
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

document.getElementById('feedback-send').addEventListener('click', _sendFeedback);
document.getElementById('feedback-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); _sendFeedback(); }
});
