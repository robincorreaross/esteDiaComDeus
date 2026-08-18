import OpenAI from "npm:openai";
import { VideoData } from "./youtube.ts";

/**
 * Gera um resumo devocional formatado para WhatsApp usando GPT-4o mini ou outro modelo
 */
export async function generateSummary(videoData: VideoData): Promise<string> {
  const { title, videoUrl, transcript, description } = videoData;

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada nas variáveis de ambiente.');
  }

  const openai = new OpenAI({
    apiKey,
  });

  console.log('[Summarizer] Gerando resumo com o modelo GPT...');

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

  const content = transcript
    ? `TRANSCRICAO DO VIDEO:\n${transcript}`
    : `DESCRICAO DO VIDEO:\n${description}`;

  const prompt = `Voce e um assistente especializado em conteudo cristao evangelico.
Analise o seguinte video devocional e gere uma mensagem baseado no devocional do vídeo,formatada para envio no WhatsApp.

TITULO DO VIDEO: ${title}
LINK DO VIDEO: ${videoUrl}

${content}

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

      const text = completion.choices[0].message?.content?.trim();
      if (!text) {
        throw new Error('Retorno vazio da OpenAI API.');
      }
      console.log(`[Summarizer] Resumo gerado com sucesso: ${text.length} caracteres (modelo: ${model})`);
      return text;

    } catch (err: any) {
      lastError = err;
      const isRateLimit = err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('quota');

      if (isRateLimit && attempt < maxRetries) {
        const waitSecs = 30 * attempt;
        console.log(`[Summarizer] OpenAI rate limit (tentativa ${attempt}/${maxRetries}). Aguardando ${waitSecs}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}
