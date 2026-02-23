require('dotenv').config();
const axios = require('axios');
const logger = require('./logger');

/**
 * Envia mensagem de texto para um destino via Evolution API.
 * Compativel com v1 e v2.
 */
async function sendToTarget(message, targetId, baseUrl, apiKey, instance) {
  const url = `${baseUrl}/message/sendText/${instance}`;

  // Tenta formato v2 primeiro, fallback para v1
  const payloads = [
    { number: targetId, text: message },
    { number: targetId, options: { delay: 1200, presence: 'composing' }, textMessage: { text: message } },
  ];

  let lastError;

  for (let i = 0; i < payloads.length; i++) {
    const version = i === 0 ? 'v2' : 'v1';
    try {
      const response = await axios.post(url, payloads[i], {
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        timeout: 30000,
      });
      logger.info(`  [OK] ${targetId} — formato ${version}, status ${response.status}`);
      return { target: targetId, success: true };
    } catch (err) {
      const status = err.response?.status;
      const body = JSON.stringify(err.response?.data || {});
      logger.warn(`  [FALHA] ${targetId} — formato ${version}, status ${status}: ${body}`);
      lastError = err;
      if (status !== 400 && status !== 422 && status !== 404) throw err;
    }
  }

  return { target: targetId, success: false, error: lastError?.message };
}

/**
 * Envia a mensagem para TODOS os destinos configurados em WHATSAPP_TARGETS.
 * Suporta numeros individuais e grupos separados por virgula.
 *
 * Exemplo no .env:
 *   WHATSAPP_TARGETS=5511999998888,120363123456789@g.us,5516991080895
 */
async function sendWhatsAppMessage(message) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  // Suporte a WHATSAPP_TARGETS (novo) e WHATSAPP_GROUP_ID (legado)
  const targetsRaw = process.env.WHATSAPP_TARGETS || process.env.WHATSAPP_GROUP_ID;

  if (!baseUrl || !apiKey || !instance || !targetsRaw) {
    throw new Error(
      'Configuracoes da Evolution API incompletas. Verifique: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_TARGETS'
    );
  }

  // Parseia a lista de destinos (aceita virgula ou ponto-e-virgula como separador)
  const targets = targetsRaw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  logger.info(`Enviando para ${targets.length} destino(s): ${targets.join(', ')}`);

  const results = [];
  for (const target of targets) {
    logger.info(`→ Enviando para: ${target}`);
    const result = await sendToTarget(message, target, baseUrl, apiKey, instance);
    results.push(result);

    // Pausa de 10s entre envios (quando ha mais de 1 destinatario)
    if (targets.length > 1 && targets.indexOf(target) < targets.length - 1) {
      logger.info('Aguardando 10s antes do proximo envio...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  const ok = results.filter((r) => r.success).length;
  const fail = results.filter((r) => !r.success).length;
  logger.info(`Resultado do envio: ${ok} sucesso(s), ${fail} falha(s)`);

  if (fail > 0) {
    const failed = results.filter((r) => !r.success).map((r) => r.target);
    logger.warn(`Destinos com falha: ${failed.join(', ')}`);
  }

  return results;
}

/**
 * Verifica se a instancia esta conectada
 */
async function checkInstanceStatus() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  const url = `${baseUrl}/instance/connectionState/${instance}`;
  const response = await axios.get(url, {
    headers: { apikey: apiKey },
    timeout: 10000,
  });

  const state = response.data?.instance?.state || response.data?.state;
  logger.info(`Status da instancia WhatsApp: ${state}`);
  return state === 'open';
}

module.exports = { sendWhatsAppMessage, checkInstanceStatus };

// Permite execucao direta para teste: node src/whatsapp.js
if (require.main === module) {
  const testMessage = '*Teste - Este Dia Com Deus Bot*\n\nSe voce recebeu esta mensagem, a integracao com a Evolution API esta funcionando! \u{1F64F}';

  checkInstanceStatus()
    .then((connected) => {
      if (!connected) {
        logger.warn('WhatsApp nao esta conectado!');
        return;
      }
      return sendWhatsAppMessage(testMessage);
    })
    .then((results) => {
      if (results) logger.info(`Teste concluido! ${results.filter(r=>r.success).length}/${results.length} enviados.`);
    })
    .catch((err) => logger.error('Erro no teste do WhatsApp:', err));
}
