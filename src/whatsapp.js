require('dotenv').config();
const axios = require('axios');
const logger = require('./logger');

/**
 * Envia mensagem de texto para um destino via Evolution API.
 */
async function sendToTarget(message, targetId, baseUrl, apiKey, instance) {
  const url = `${baseUrl}/message/sendText/${instance}`;

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
 * Busca contatos ativos no Supabase DB
 */
async function getActiveContactsFromDB() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGtqeXR5bmlvaHRxZ2JhYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODgwODMsImV4cCI6MjA5NTY2NDA4M30.r_DY6pwgsacCu46mm0UVCsmAoLanYYwra4XfgWzh7nU';

  try {
    const response = await axios.get(`${supabaseUrl}/rest/v1/contacts?is_active=eq.true&select=target_id,name`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      timeout: 5000,
    });
    if (response.data && response.data.length > 0) {
      return response.data.map(c => c.target_id);
    }
  } catch (err) {
    logger.warn(`Nao foi possivel buscar contatos do Supabase: ${err.message}. Usando .env.`);
  }

  const targetsRaw = process.env.WHATSAPP_TARGETS || process.env.WHATSAPP_GROUP_ID || '5516991080895';
  return targetsRaw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Envia a mensagem para os destinos ativos
 */
async function sendWhatsAppMessage(message, targetsOverride) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) {
    throw new Error(
      'Configuracoes da Evolution API incompletas (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE)'
    );
  }

  let targets = targetsOverride;
  if (!targets || targets.length === 0) {
    targets = await getActiveContactsFromDB();
  }

  logger.info(`Enviando para ${targets.length} destino(s): ${targets.join(', ')}`);

  const results = [];
  for (const target of targets) {
    logger.info(`→ Enviando para: ${target}`);
    const result = await sendToTarget(message, target, baseUrl, apiKey, instance);
    results.push(result);

    if (targets.length > 1 && targets.indexOf(target) < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  const ok = results.filter((r) => r.success).length;
  const fail = results.filter((r) => !r.success).length;
  logger.info(`Resultado do envio: ${ok} sucesso(s), ${fail} falha(s)`);

  return results;
}

/**
 * Envia um alerta urgente no WhatsApp do Administrador (5516991080895)
 */
async function sendAdminErrorAlert(errorMessage, videoData) {
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || '5516991080895';
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) {
    logger.error('Nao foi possivel enviar alerta de erro no WhatsApp: Evolution API nao configurada.');
    return;
  }

  const title = videoData?.title || 'Vídeo Desconhecido';
  const url = videoData?.videoUrl || '';
  const timestamp = new Date().toLocaleString('pt-BR');

  const alertMessage = `⚠️ *ALERTA DE ERRO - ESTE DIA COM DEUS* ⚠️\n\n` +
    `Ocorreu um erro no processo de automação diária:\n` +
    `📌 *Erro:* ${errorMessage}\n` +
    `🎬 *Vídeo:* ${title}\n` +
    `🔗 *Link:* ${url}\n` +
    `⏰ *Data/Hora:* ${timestamp}\n\n` +
    `🛑 *Ação Tomada:* O envio da mensagem foi bloqueado para evitar alucinações de conteúdo pela IA.`;

  logger.info(`🚨 Enviando alerta de erro no WhatsApp para o admin (${adminPhone})...`);
  try {
    await sendToTarget(alertMessage, adminPhone, baseUrl, apiKey, instance);
    logger.info('🚨 Alerta de erro enviado com sucesso ao admin!');
  } catch (err) {
    logger.error(`Falha ao enviar alerta de erro no WhatsApp: ${err.message}`);
  }
}

/**
 * Verifica se a instancia esta conectada
 */
async function checkInstanceStatus() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) return false;

  try {
    const url = `${baseUrl}/instance/connectionState/${instance}`;
    const response = await axios.get(url, {
      headers: { apikey: apiKey },
      timeout: 10000,
    });

    const state = response.data?.instance?.state || response.data?.state;
    logger.info(`Status da instancia WhatsApp: ${state}`);
    return state === 'open';
  } catch (err) {
    logger.warn(`Erro ao checar status da instancia: ${err.message}`);
    return false;
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendAdminErrorAlert,
  checkInstanceStatus,
  getActiveContactsFromDB,
};
