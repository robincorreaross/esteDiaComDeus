require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const logger = require('./logger');
const { fetchLatestVideoData } = require('./youtube');
const { generateSummary } = require('./summarizer');
const { sendWhatsAppMessage, sendAdminErrorAlert, checkInstanceStatus } = require('./whatsapp');

/**
 * Salva log de execucao no Supabase
 */
async function saveExecutionLogToDB(logData) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGtqeXR5bmlvaHRxZ2JhYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODgwODMsImV4cCI6MjA5NTY2NDA4M30.r_DY6pwgsacCu46mm0UVCsmAoLanYYwra4XfgWzh7nU';

  try {
    await axios.post(`${supabaseUrl}/rest/v1/execution_logs`, logData, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      timeout: 5000,
    });
    logger.info('Log de execução registrado no Supabase com sucesso.');
  } catch (err) {
    logger.warn(`Não foi possível salvar log de execução no Supabase: ${err.message}`);
  }
}

/**
 * Executa a automacao completa
 * @param {string} [executionType='cron'] - 'cron' | 'manual' | 'test'
 */
async function runDailyAutomation(executionType = 'cron') {
  const startTime = new Date();
  logger.info('='.repeat(60));
  logger.info(`  INICIANDO AUTOMACAO (${executionType.toUpperCase()}) - Este Dia Com Deus`);
  logger.info(`  Hora: ${startTime.toLocaleString('pt-BR')}`);
  logger.info('='.repeat(60));

  let currentVideo = null;

  try {
    // 1. Verificar WhatsApp status
    logger.info('[1/4] Verificando conexao do WhatsApp...');
    const isConnected = await checkInstanceStatus();
    if (!isConnected) {
      throw new Error('WhatsApp nao esta conectado na Evolution API!');
    }

    // 2. Buscar video do YouTube
    logger.info('[2/4] Buscando video mais recente do canal...');
    currentVideo = await fetchLatestVideoData();
    logger.info(`[2/4] Video: "${currentVideo.title}"`);

    // 3. Gerar resumo com a IA (Trava ativa dentro de generateSummary)
    logger.info('[3/4] Gerando resumo com OpenAI GPT-4o mini...');
    const message = await generateSummary(currentVideo);

    // 4. Enviar para contatos ativos
    logger.info('[4/4] Enviando mensagem no WhatsApp...');
    const results = await sendWhatsAppMessage(message);

    const okCount = results ? results.filter(r => r.success).length : 0;
    const elapsed = ((Date.now() - startTime.getTime()) / 1000).toFixed(1);

    await saveExecutionLogToDB({
      video_id: currentVideo.videoId,
      video_title: currentVideo.title,
      video_url: currentVideo.videoUrl,
      transcript_length: currentVideo.transcript ? currentVideo.transcript.length : 0,
      transcript_text: currentVideo.transcript ? currentVideo.transcript.substring(0, 1000) : '',
      summary_text: message,
      status: 'SUCCESS',
      recipients_sent: okCount,
      execution_type: executionType,
    });

    logger.info('='.repeat(60));
    logger.info(`  AUTOMACAO CONCLUIDA COM SUCESSO (${elapsed}s)`);
    logger.info('='.repeat(60));

    return { success: true, title: currentVideo.title, summary: message };

  } catch (err) {
    logger.error('='.repeat(60));
    logger.error(`  FALHA NA AUTOMACAO: ${err.message}`);
    logger.error('='.repeat(60));

    // Envia alerta de erro no WhatsApp para o admin 5516991080895
    await sendAdminErrorAlert(err.message, currentVideo);

    // Registra falha no Supabase execution_logs
    await saveExecutionLogToDB({
      video_id: currentVideo?.videoId || null,
      video_title: currentVideo?.title || 'Desconhecido',
      video_url: currentVideo?.videoUrl || null,
      transcript_length: currentVideo?.transcript ? currentVideo.transcript.length : 0,
      status: err.message.includes('TRANSCRIPT') ? 'TRANSCRIPT_FAILED' : 'ERROR',
      error_message: err.message,
      recipients_sent: 0,
      execution_type: executionType,
    });

    return { success: false, error: err.message };
  }
}

/**
 * Inicia o agendador cron
 */
function startScheduler() {
  const schedule = process.env.CRON_SCHEDULE || '0 6 * * *';
  const timezone = process.env.TIMEZONE || 'America/Sao_Paulo';

  logger.info(`Agendador configurado: "${schedule}" (fuso: ${timezone})`);

  if (!cron.validate(schedule)) {
    throw new Error(`Expressao cron invalida: "${schedule}"`);
  }

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info('Cron job disparado!');
      await runDailyAutomation('cron');
    },
    { timezone }
  );

  return task;
}

module.exports = { runDailyAutomation, startScheduler };
