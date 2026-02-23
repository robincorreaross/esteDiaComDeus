require('dotenv').config();
const OpenAI = require('openai');
const logger = require('./logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gera um resumo devocional formatado para WhatsApp usando GPT-4o mini
 * @param {object} videoData - { title, videoUrl, transcript, description }
 * @returns {string} - Mensagem formatada pronta para enviar no WhatsApp
 */
async function generateSummary(videoData) {
  const { title, videoUrl, transcript, description } = videoData;

  logger.info('Gerando resumo com GPT-4o mini...');

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Conteudo disponivel para o modelo
  const content = transcript
    ? `TRANSCRICAO DO VIDEO:\n${transcript}`
    : `DESCRICAO DO VIDEO:\n${description}`;

  const prompt = `Voce e um assistente criativo especializado em conteudo cristao evangelico.
Analise o seguinte video devocional e gere uma mensagem formatada para envio no WhatsApp.

TITULO DO VIDEO: ${title}
LINK DO VIDEO: ${videoUrl}

${content}

Crie uma mensagem com a seguinte estrutura exata (use formatacao WhatsApp com * para negrito):

1. Uma saudacao acolhedora e espiritualmente encorajadora
2. O titulo do episodio em destaque
3. Um resumo do ensinamento (4 a 6 paragrafos claros, relevantes e inspiradores)
4. Um versiculo biblico chave mencionado no video (ou relacionado ao tema)
5. Uma reflexao/aplicacao pratica para o dia
6. O link do video completo
7. Uma despedida com bencao

REGRAS IMPORTANTES:
- Use linguagem acolhedora, carinhosa e espiritualmente edificante
- Use emojis relevantes para tornar a mensagem mais expressiva (ex: biblia, oracao, coracao)
- Use *negrito* para destacar pontos importantes (formato WhatsApp)
- Mantenha o tom do Pr. Gilson Brito: ensinamento pratico e relevante para a vida crista
- A mensagem deve ter entre 300 e 500 palavras
- Escreva tudo em Portugues do Brasil
- NAO inclua markdown como ## ou ** - apenas * para negrito style WhatsApp

Gere apenas a mensagem, sem comentarios adicionais.`;

  let lastError;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      });

      const text = completion.choices[0].message.content.trim();
      logger.info(`Resumo gerado com sucesso: ${text.length} caracteres (modelo: ${model})`);
      return text;

    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('quota');

      if (isRateLimit && attempt < maxRetries) {
        const waitSecs = 30 * attempt;
        logger.warn(`OpenAI rate limit (tentativa ${attempt}/${maxRetries}). Aguardando ${waitSecs}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}

module.exports = { generateSummary };

// Permite execucao direta para teste: node src/summarizer.js
if (require.main === module) {
  const testData = {
    title: '#54 Simples Felicidade | Este Dia Com Deus - Pr. Gilson Brito',
    videoUrl: 'https://www.youtube.com/watch?v=DQb-oU-vAHY',
    transcript: null,
    description:
      'Este Dia Com Deus e uma serie de reflexoes espirituais diarias apresentadas pelo pastor Gilson Brito. Cada episodio oferece uma mensagem de fe, esperanca e amor para comecar o dia com Deus.',
  };

  generateSummary(testData)
    .then((summary) => {
      console.log('\n========== MENSAGEM GERADA ==========\n');
      console.log(summary);
      console.log('\n=====================================\n');
    })
    .catch((err) => logger.error('Erro ao gerar resumo:', err));
}
