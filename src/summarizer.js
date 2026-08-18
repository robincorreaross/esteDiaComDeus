require('dotenv').config();
const OpenAI = require('openai');
const axios = require('axios');
const logger = require('./logger');

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-build-key',
  });
}

/**
 * Busca a configuracao de prompt do Supabase
 */
async function getPromptTemplateFromDB() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGtqeXR5bmlvaHRxZ2JhYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODgwODMsImV4cCI6MjA5NTY2NDA4M30.r_DY6pwgsacCu46mm0UVCsmAoLanYYwra4XfgWzh7nU';

  try {
    const response = await axios.get(`${supabaseUrl}/rest/v1/settings?id=eq.default&select=prompt_template,transcript_strict_mode`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      timeout: 5000,
    });
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
  } catch (err) {
    logger.warn(`Nao foi possivel buscar prompt do Supabase. Usando fallback. (${err.message})`);
  }

  return null;
}

const DEFAULT_PROMPT_TEMPLATE = `Voce e um assistente especializado em conteudo cristao evangelico.
Analise o seguinte video devocional e gere uma mensagem baseado no devocional do vídeo, formatada para envio no WhatsApp.

TITULO DO VIDEO: {title}
LINK DO VIDEO: {videoUrl}

TRANSCRICAO DO VIDEO:
{transcript}

Crie uma mensagem com a seguinte estrutura exata (use formatacao WhatsApp com * para negrito):

1. Um "Bom dia" caloroso com uma saudacao acolhedora e espiritualmente encorajadora.
2. Sempre o titulo do episodio em destaque.
3. Cite exatamente a passagem bíblica chave completa mencionada no video.
4. Um resumo do ensinamento (4 a 6 paragrafos claros, relevantes e inspiradores).
5. Uma reflexao/aplicacao pratica para o dia.
6. O link do video completo.
7. Uma despedida com benção.

REGRAS IMPORTANTES:
- Use linguagem acolhedora, carinhosa e espiritualmente edificante
- Use emojis relevantes para tornar a mensagem mais expressiva (ex: biblia, oracao, coracao)
- Use *negrito* para destacar pontos importantes (formato WhatsApp)
- Mantenha o tom do Pr. Gilson Brito: ensinamento pratico e relevante para a vida crista
- A mensagem deve ter entre 300 e 500 palavras
- Escreva tudo em Portugues do Brasil
- NAO inclua markdown como ## ou ** - apenas * para negrito style WhatsApp

Gere apenas a mensagem, sem comentarios adicionais.`;

/**
 * Gera um resumo devocional formatado para WhatsApp usando GPT-4o mini
 */
async function generateSummary(videoData, overridePromptTemplate) {
  const { title, videoUrl, transcript } = videoData;

  // TRAVA ANTI-ALUCINACAO: Se nao houver transcricao valida (>100 chars), INTERROMPE!
  if (!transcript || transcript.trim().length < 100) {
    const errorMsg = 'TRANSCRIPT_UNAVAILABLE: Transcrição do vídeo indisponível ou insuficiente (<100 caracteres). Interrompido para evitar alucinação da IA.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('Buscando template de prompt...');
  let template = overridePromptTemplate;
  if (!template) {
    const dbSettings = await getPromptTemplateFromDB();
    template = dbSettings?.prompt_template || DEFAULT_PROMPT_TEMPLATE;
  }

  const prompt = template
    .replace(/{title}/g, title || '')
    .replace(/{videoUrl}/g, videoUrl || '')
    .replace(/{transcript}/g, transcript || '');

  logger.info(`Gerando resumo com GPT-4o mini (${transcript.length} chars de transcricao)...`);

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const openai = getOpenAIClient();
  let lastError;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
      });

      const text = completion.choices[0].message.content.trim();
      logger.info(`Resumo gerado com sucesso: ${text.length} caracteres`);
      return text;

    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('quota');

      if (isRateLimit && attempt < maxRetries) {
        const waitSecs = 20 * attempt;
        logger.warn(`OpenAI rate limit (tentativa ${attempt}/${maxRetries}). Aguardando ${waitSecs}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}

module.exports = { generateSummary, DEFAULT_PROMPT_TEMPLATE };
