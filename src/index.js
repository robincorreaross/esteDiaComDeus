require('dotenv').config();
const logger = require('./logger');
const { runDailyAutomation, startScheduler } = require('./scheduler');

const args = process.argv.slice(2);
const runNow = args.includes('--run-now');

async function main() {
  logger.info('Este Dia Com Deus - Bot WhatsApp Iniciado');
  logger.info(`Versao Node.js: ${process.version}`);

  // Validacoes criticas de configuracao
  const requiredEnvs = [
    'OPENAI_API_KEY',
    'EVOLUTION_API_URL',
    'EVOLUTION_API_KEY',
    'EVOLUTION_INSTANCE',
  ];

  // Aceita WHATSAPP_TARGETS (novo) ou WHATSAPP_GROUP_ID (legado)
  const missing = requiredEnvs.filter((key) => !process.env[key]);
  if (!process.env.WHATSAPP_TARGETS && !process.env.WHATSAPP_GROUP_ID) {
    missing.push('WHATSAPP_TARGETS');
  }

  if (missing.length > 0) {
    logger.error(`Variaveis de ambiente obrigatorias nao configuradas: ${missing.join(', ')}`);
    logger.error('Copie o arquivo .env.example para .env e preencha todos os valores.');
    process.exit(1);
  }

  if (runNow) {
    // Execucao imediata (modo de teste: npm run now)
    logger.info('Modo: execucao imediata (--run-now)');
    const result = await runDailyAutomation();
    // Aguarda o flush do winston antes de encerrar
    await new Promise((resolve) => setTimeout(resolve, 500));
    process.exit(result.success ? 0 : 1);
  } else {
    // Modo normal: inicia o agendador
    logger.info('Modo: agendador continuo (npm start)');
    startScheduler();

    // Mantém o processo ativo
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
