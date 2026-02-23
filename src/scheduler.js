require('dotenv').config();
const cron = require('node-cron');
const logger = require('./logger');
const { fetchLatestVideoData } = require('./youtube');
const { generateSummary } = require('./summarizer');
const { sendWhatsAppMessage, checkInstanceStatus } = require('./whatsapp');

/**
 * Funcao principal que executa o fluxo completo:
 * 1. Busca o video mais recente do YouTube
 * 2. Gera o resumo com o Gemini
 * 3. Envia via WhatsApp
 */
async function runDailyAutomation() {
  const startTime = new Date();
  logger.info('='.repeat(60));
  logger.info('  INICIANDO AUTOMACAO - Este Dia Com Deus');
  logger.info(`  Hora: ${startTime.toLocaleString('pt-BR')}`);
  logger.info('='.repeat(60));

  try {
    // ETAPA 1: Verificar conexao WhatsApp
    logger.info('[1/4] Verificando conexao do WhatsApp...');
    const isConnected = await checkInstanceStatus();
    if (!isConnected) {
      throw new Error(
        'WhatsApp nao esta conectado! Conecte o numero na Evolution API antes de continuar.'
      );
    }
    logger.info('[1/4] WhatsApp conectado!');

    // ETAPA 2: Buscar video mais recente do YouTube
    logger.info('[2/4] Buscando video mais recente do canal...');
    const videoData = await fetchLatestVideoData();
    logger.info(`[2/4] Video: "${videoData.title}"`);

    // ETAPA 3: Gerar resumo com IA
    logger.info('[3/4] Gerando resumo com Google Gemini...');
    const message = await generateSummary(videoData);
    logger.info('[3/4] Resumo gerado com sucesso!');

    // ETAPA 4: Enviar mensagem no WhatsApp
    logger.info('[4/4] Enviando mensagem no WhatsApp...');
    await sendWhatsAppMessage(message);
    logger.info('[4/4] Mensagem enviada com sucesso!');

    const elapsed = ((Date.now() - startTime.getTime()) / 1000).toFixed(1);
    logger.info('='.repeat(60));
    logger.info(`  AUTOMACAO CONCLUIDA com sucesso em ${elapsed}s`);
    logger.info('='.repeat(60));

    return { success: true, title: videoData.title };

  } catch (err) {
    logger.error('='.repeat(60));
    logger.error('  FALHA NA AUTOMACAO');
    logger.error(`  Erro: ${err.message}`);
    logger.error('='.repeat(60));
    logger.error(err);

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
  logger.info('Interpretacao: todo dia as 06:00 horario de Brasilia');

  if (!cron.validate(schedule)) {
    throw new Error(`Expressao cron invalida: "${schedule}"`);
  }

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info('Cron job disparado!');
      await runDailyAutomation();
    },
    {
      timezone: timezone,
    }
  );

  logger.info('Agendador iniciado. Aguardando horario configurado...');
  logger.info('Para executar agora sem esperar, use: npm run now');

  return task;
}

module.exports = { runDailyAutomation, startScheduler };
