// Variables used by Scriptable.
// icon-color: red; icon-glyph: stethoscope;

// ── ChopperVerso · Widget de hoje ───────────────────────────────────────────
// Mostra casos vistos, lâminas e pontos de hoje + um Chopper aleatório.
//
// CONFIGURAÇÃO (uma única vez):
//   1. Abra este script direto no app Scriptable (não como widget) e rode.
//   2. Informe seu e-mail e senha do ChopperVerso quando for pedido.
//   3. Depois disso é só adicionar o widget na tela de início e escolher
//      este script.
//
// A sessão é guardada no Keychain do iOS (não fica salva a senha, só um
// refresh token, renovado a cada execução).

const API_KEY    = "AIzaSyCCLsnpD_xtXN_Uh80pu6gOL1gPxwDHIJs";
const PROJECT_ID = "chopperverso";
const HOSTING    = "https://chopperverso.web.app";

const CHOPPER_IMAGES = [
  "Estatistico.png", "HP.png", "Jedi.png", "academia1.png", "algodao.png",
  "almpçp.png", "astronauta.png", "cafe.png", "estatisco2.png", "frio1.png",
  "mecanico.png", "novidades.png", "recebimento.png", "sono.png",
  "trabalhando1.png", "yoda.png",
];

const KC_REFRESH = "chopperverso_refreshToken";
const KC_UID     = "chopperverso_uid";

// Janela em que o widget tenta atualizar com frequência máxima. Fora dela
// (madrugada), ele nem pede refresh — evita gastar o orçamento diário do
// iOS com atualizações inúteis enquanto ninguém está lançando casos.
const ACTIVE_HOURS = { start: 8, end: 22 };
// Intervalo pedido dentro da janela ativa. O iOS não garante esse valor —
// é só o mínimo entre tentativas; o sistema decide quantas de fato acontecem
// dentro do orçamento dele. Pedir um valor baixo aqui só maximiza as chances
// de cada "vaga" de refresh liberada pelo iOS cair dentro da janela ativa.
const REFRESH_INTERVAL_MINUTES = 10;

const COLORS = {
  bg1:     new Color("#0e1121"),
  bg2:     new Color("#090b14"),
  card:    new Color("#181e30"),
  primary: new Color("#e53935"),
  blue:    new Color("#1e88e5"),
  accent:  new Color("#ffd54f"),
  text:    new Color("#e8eaf6"),
  text2:   new Color("#9fa8da"),
};

// ── Auth ─────────────────────────────────────────────────────────────────
async function signInWithPassword(email, password) {
  const req = new Request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`
  );
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({ email, password, returnSecureToken: true });
  const res = await req.loadJSON();
  if (res.error) throw new Error(res.error.message || "Falha no login");
  return { idToken: res.idToken, refreshToken: res.refreshToken, uid: res.localId };
}

async function refreshIdToken(refreshToken) {
  const req = new Request(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`);
  req.method = "POST";
  req.headers = { "Content-Type": "application/x-www-form-urlencoded" };
  req.body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
  const res = await req.loadJSON();
  if (res.error) throw new Error(res.error.message || "Falha ao renovar sessão");
  return { idToken: res.id_token, refreshToken: res.refresh_token, uid: res.user_id };
}

async function promptLogin() {
  const alert = new Alert();
  alert.title = "Login ChopperVerso";
  alert.message = "Informe seu e-mail e senha do ChopperVerso (mesmos do site).";
  alert.addTextField("E-mail", "");
  alert.addSecureTextField("Senha", "");
  alert.addAction("Entrar");
  alert.addCancelAction("Cancelar");

  try {
    await alert.present();
  } catch (e) {
    throw new Error("Login cancelado.");
  }

  const email = alert.textFieldValue(0);
  const pwd   = alert.textFieldValue(1);
  const { idToken, refreshToken, uid } = await signInWithPassword(email, pwd);
  Keychain.set(KC_REFRESH, refreshToken);
  Keychain.set(KC_UID, uid);
  return { idToken, uid };
}

async function getSession() {
  if (Keychain.contains(KC_REFRESH) && Keychain.contains(KC_UID)) {
    try {
      const refreshToken = Keychain.get(KC_REFRESH);
      const savedUid     = Keychain.get(KC_UID);
      const r = await refreshIdToken(refreshToken);
      Keychain.set(KC_REFRESH, r.refreshToken);
      return { idToken: r.idToken, uid: r.uid || savedUid };
    } catch (e) {
      // token de refresh inválido/expirado — cai para login interativo abaixo
    }
  }

  if (config.runsInWidget) {
    throw new Error(
      "Sem login salvo. Abra o Scriptable e rode este script uma vez para configurar."
    );
  }
  return await promptLogin();
}

// ── Firestore ────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function numFromValue(v) {
  if (!v) return 0;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  return 0;
}

async function fetchTodayStats(idToken, uid) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/users/${uid}:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: "entries" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "data" },
          op: "EQUAL",
          value: { stringValue: todayISO() },
        },
      },
    },
  };

  const req = new Request(url);
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
  req.body = JSON.stringify(body);
  const res = await req.loadJSON();
  if (!Array.isArray(res)) throw new Error("Resposta inesperada do Firestore.");

  let casos = 0, laminas = 0, pontos = 0;
  for (const row of res) {
    if (!row.document) continue;
    casos++;
    const fields = row.document.fields || {};
    laminas += numFromValue(fields.laminas);
    pontos  += numFromValue(fields.pontos);
  }
  return { casos, laminas, pontos };
}

// ── Chopper aleatório ────────────────────────────────────────────────────
async function loadRandomChopper() {
  const name = CHOPPER_IMAGES[Math.floor(Math.random() * CHOPPER_IMAGES.length)];
  const url = `${HOSTING}/Choppers/${encodeURIComponent(name)}`;
  try {
    return await new Request(url).loadImage();
  } catch (e) {
    return null;
  }
}

// ── Agendamento ──────────────────────────────────────────────────────────
// Decide quando pedir o próximo refresh: intervalo curto durante a janela
// ativa, ou pular direto pro início da próxima janela se já for madrugada.
function nextRefreshDate(intervalMinutes = REFRESH_INTERVAL_MINUTES) {
  const now = new Date();
  const hour = now.getHours();
  const { start, end } = ACTIVE_HOURS;

  if (hour >= start && hour < end) {
    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }

  const next = new Date(now);
  next.setHours(start, 0, 0, 0);
  if (hour >= end) next.setDate(next.getDate() + 1);
  return next;
}

// ── Widget ───────────────────────────────────────────────────────────────
function addStatRow(container, label, value, color) {
  const row = container.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const valText = row.addText(String(value));
  valText.font = Font.boldSystemFont(20);
  valText.textColor = color;
  valText.minimumScaleFactor = 0.6;

  row.addSpacer(6);

  const labelText = row.addText(label);
  labelText.font = Font.systemFont(12);
  labelText.textColor = COLORS.text2;
}

function addChopperImage(container, image, size) {
  const imgStack = container.addStack();
  imgStack.size = new Size(size, size);
  imgStack.cornerRadius = size * 0.14;
  imgStack.backgroundColor = COLORS.card;
  imgStack.centerAlignContent();
  const iw = imgStack.addImage(image);
  iw.imageSize = new Size(size - 8, size - 8);
  iw.cornerRadius = (size - 8) * 0.12;
  return imgStack;
}

async function buildWidget() {
  const family = config.widgetFamily || "medium";
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [COLORS.bg1, COLORS.bg2];
  w.backgroundGradient = gradient;
  w.setPadding(14, 14, 14, 14);

  let session, stats;
  try {
    session = await getSession();
    stats = await fetchTodayStats(session.idToken, session.uid);
  } catch (e) {
    const title = w.addText("ChopperVerso");
    title.font = Font.boldSystemFont(13);
    title.textColor = COLORS.primary;
    w.addSpacer(6);
    const errText = w.addText(`⚠️ ${e.message}`);
    errText.font = Font.systemFont(12);
    errText.textColor = COLORS.text;
    w.refreshAfterDate = nextRefreshDate(5);
    return w;
  }

  const chopperImg = await loadRandomChopper();

  if (family === "small") {
    const title = w.addText("ChopperVerso");
    title.font = Font.boldSystemFont(12);
    title.textColor = COLORS.primary;
    w.addSpacer(4);

    addStatRow(w, "casos", stats.casos, COLORS.blue);
    addStatRow(w, "lâminas", stats.laminas, COLORS.accent);
    addStatRow(w, "pontos", stats.pontos, COLORS.primary);

    w.addSpacer();
    if (chopperImg) {
      const bottom = w.addStack();
      bottom.layoutHorizontally();
      bottom.addSpacer();
      addChopperImage(bottom, chopperImg, 46);
    }
  } else {
    const main = w.addStack();
    main.layoutHorizontally();
    main.centerAlignContent();

    const left = main.addStack();
    left.layoutVertically();
    left.spacing = 5;

    const title = left.addText("ChopperVerso");
    title.font = Font.boldSystemFont(14);
    title.textColor = COLORS.primary;

    const dateText = left.addText(new Date().toLocaleDateString("pt-BR"));
    dateText.font = Font.systemFont(11);
    dateText.textColor = COLORS.text2;

    left.addSpacer(8);
    addStatRow(left, "casos vistos hoje", stats.casos, COLORS.blue);
    addStatRow(left, "lâminas", stats.laminas, COLORS.accent);
    addStatRow(left, "pontos", stats.pontos, COLORS.primary);

    main.addSpacer();

    if (chopperImg) {
      addChopperImage(main, chopperImg, 84);
    }
  }

  w.refreshAfterDate = nextRefreshDate();
  return w;
}

const widget = await buildWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
