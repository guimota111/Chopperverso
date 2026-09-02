// ── ChopperVerso · Gerador do script Tampermonkey (Motion To Chopperverso) ─────
// Monta o "loader" pessoal (endpoint + senha + tipos) pronto pra instalar no
// Tampermonkey. A lógica genérica (motor) continua sendo buscada ao vivo do
// GitHub pelo próprio script — aqui só embutimos a config deste usuário.
// Depende de: TIPOS/tipoToId/getDisplayName/getWebhookToken/generateWebhookToken
// (data.js), WEBHOOK_BASE/toast (app.js).

const MOTION_SCRIPT_LINES = [
  "// ==UserScript==",
  "// @name         Motion To Chopperverso — __NOME__",
  "// @namespace    https://motionap.dasa.com.br/",
  "// @version      1.0",
  "// @description  Coleta FAP, Lâminas, Pontos e Tipo(s) e envia ao Chopperverso. Gerado automaticamente pelo ChopperVerso — a lógica fica num motor genérico buscado ao vivo do GitHub.",
  "// @author       __NOME__",
  "// @match        https://motionap.dasa.com.br/*",
  "// @grant        GM_addStyle",
  "// @grant        GM_xmlhttpRequest",
  "// @grant        GM_setValue",
  "// @grant        GM_getValue",
  "// @connect      raw.githubusercontent.com",
  "// ==/UserScript==",
  "//",
  "// Gerado automaticamente pelo ChopperVerso em __DATA__.",
  "// Este arquivo é pessoal (leva o endpoint, a senha e os tipos deste usuário).",
  "// Não tem @updateURL/@downloadURL de propósito — só o motor genérico é buscado",
  "// ao vivo do GitHub a cada execução; a config pessoal abaixo nunca é sobrescrita.",
  "",
  "(function() {",
  "    'use strict';",
  "",
  "    const CONFIG = {",
  "        ENDPOINT: '__ENDPOINT__',",
  "        ASSINATURA_VALOR: '__SENHA__',",
  "        TIPOS_DISPONIVEIS: [",
  "__TIPOS__",
  "        ]",
  "    };",
  "",
  "    const ENGINE_URL = 'https://raw.githubusercontent.com/guimota111/MotionTampermonkey/main/scripts/motion-chopperverso-engine.js';",
  "    const CACHE_KEY = 'motionChopperverso:engineCache:v1';",
  "",
  "    function executarMotor(codigoMotor) {",
  "        try {",
  "            const fabricar = new Function('CONFIG', 'GM_addStyle', 'GM_xmlhttpRequest',",
  "                codigoMotor + '\\n;iniciarMotorChopperverso(CONFIG, GM_addStyle, GM_xmlhttpRequest);');",
  "            fabricar(CONFIG, GM_addStyle, GM_xmlhttpRequest);",
  "        } catch (e) {",
  "            console.error('❌ Motion To Chopperverso: falha ao executar o motor buscado do GitHub', e);",
  "        }",
  "    }",
  "",
  "    function usarCache(motivo) {",
  "        const codigoCache = GM_getValue(CACHE_KEY, null);",
  "        if (codigoCache) {",
  "            console.warn('⚠️ Motion To Chopperverso: usando motor em cache (' + motivo + ')');",
  "            executarMotor(codigoCache);",
  "        } else {",
  "            console.error('❌ Motion To Chopperverso: motor indisponível — sem internet e sem cache local (' + motivo + ')');",
  "        }",
  "    }",
  "",
  "    GM_xmlhttpRequest({",
  "        method: 'GET',",
  "        url: ENGINE_URL,",
  "        onload: function(res) {",
  "            if (res.status >= 200 && res.status < 300 && res.responseText) {",
  "                GM_setValue(CACHE_KEY, res.responseText);",
  "                executarMotor(res.responseText);",
  "            } else {",
  "                usarCache('HTTP ' + res.status);",
  "            }",
  "        },",
  "        onerror: function() {",
  "            usarCache('erro de conexão');",
  "        }",
  "    });",
  "})();",
  "",
];

function _motionEscJs(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]+/g, ' ');
}

function buildMotionScript(senha) {
  const nomeComment = String(getDisplayName() || 'Usuário').replace(/[\r\n]+/g, ' ');
  const endpoint    = `${WEBHOOK_BASE}?token=${getWebhookToken()}`;
  const tiposLines  = TIPOS.map(t => `            { id: '${tipoToId(t)}', label: '${_motionEscJs(t)}' }`).join(',\n');
  const dataGeracao = new Date().toLocaleString('pt-BR');

  return MOTION_SCRIPT_LINES.join('\n')
    .replace(/__NOME__/g,     () => nomeComment)
    .replace(/__DATA__/g,     () => dataGeracao)
    .replace(/__ENDPOINT__/g, () => _motionEscJs(endpoint))
    .replace(/__SENHA__/g,    () => _motionEscJs(senha))
    .replace(/__TIPOS__/g,    () => tiposLines);
}

// ─ UI wiring ──────────────────────────────────────────────────────────────────
document.getElementById('btn-gen-motion-script').addEventListener('click', async () => {
  const btn     = document.getElementById('btn-gen-motion-script');
  const senhaEl = document.getElementById('motion-script-senha');
  const senha   = senhaEl.value.trim();

  if (!senha) { toast('Informe a senha de assinatura digital do Motion.', true); return; }

  btn.disabled    = true;
  btn.textContent = 'Gerando…';
  try {
    let token = getWebhookToken();
    if (!token) {
      token = await generateWebhookToken();
      _refreshWebhookUI();
    }

    const script   = buildMotionScript(senha);
    const nomeSlug = tipoToId(getDisplayName() || 'usuario') || 'usuario';
    const blob     = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url      = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href     = url;
    a.download = `motion-to-chopperverso-${nomeSlug}.user.js`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    senhaEl.value = '';
    toast('✅ Script gerado! Abra o arquivo baixado para instalar no Tampermonkey.');
  } catch (e) {
    console.error('[motion-script] erro ao gerar script:', e);
    toast('Erro: ' + (e.message || e.code || JSON.stringify(e)), true);
  } finally {
    btn.disabled    = false;
    btn.textContent = '📥 Gerar e baixar script';
  }
});
