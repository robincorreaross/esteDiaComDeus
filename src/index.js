require('dotenv').config();
const logger = require('./logger');
const { runDailyAutomation, startScheduler } = require('./scheduler');

const args = process.argv.slice(2);
const runNow = args.includes('--run-now');

async function main() {
  logger.info('Este Dia Com Deus - Bot WhatsApp Iniciado');
  logger.info(`Versao Node.js: ${process.version}`);

  const requiredEnvs = [
    'OPENAI_API_KEY',
    'EVOLUTION_API_URL',
    'EVOLUTION_API_KEY',
    'EVOLUTION_INSTANCE',
  ];

  const missing = requiredEnvs.filter((key) => !process.env[key]);
  if (!process.env.WHATSAPP_TARGETS && !process.env.WHATSAPP_GROUP_ID && !process.env.SUPABASE_URL) {
    missing.push('WHATSAPP_TARGETS or SUPABASE_URL');
  }

  if (missing.length > 0) {
    logger.error(`Variaveis de ambiente obrigatorias nao configuradas: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (runNow) {
    logger.info('Modo: execucao imediata (--run-now)');
    const result = await runDailyAutomation('manual');
    await new Promise((resolve) => setTimeout(resolve, 500));
    process.exit(result.success ? 0 : 1);
  } else {
    logger.info('Modo: agendador continuo (npm start)');
    startScheduler();

    process.on('SIGINT', () => {
      logger.info('Encerrando o bot... (SIGINT recebido)');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Encerrando o bot... (SIGTERM recebido)');
      process.exit(0);
    });
  }
}

main().catch((err) => {
  logger.error('Erro fatal na inicializacao:', err);
  process.exit(1);
});
