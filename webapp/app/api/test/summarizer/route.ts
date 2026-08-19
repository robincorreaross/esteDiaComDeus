import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, videoUrl, transcript } = body;

    // TRAVA ANTI-ALUCINACAO
    if (!transcript || transcript.trim().length < 100) {
      return NextResponse.json({
        success: false,
        error: 'TRANSCRIPT_UNAVAILABLE: Transcrição indisponível ou insuficiente (<100 caracteres). Bloqueado para evitar alucinação.',
      }, { status: 400 });
    }

    // Buscar prompt customizado do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    let template = DEFAULT_PROMPT_TEMPLATE;
    try {
      const settingsRes = await fetch(
        `${supabaseUrl}/rest/v1/settings?id=eq.default&select=prompt_template`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const settings = await settingsRes.json();
      if (settings?.[0]?.prompt_template) {
        template = settings[0].prompt_template;
      }
    } catch {
      // fallback to default
    }

    const prompt = template
      .replace(/{title}/g, title || '')
      .replace(/{videoUrl}/g, videoUrl || '')
      .replace(/{transcript}/g, transcript || '');

    // Chamar OpenAI via fetch (edge-compatible)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY não configurada' }, { status: 500 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      return NextResponse.json({ success: false, error: `OpenAI API error: ${openaiRes.status} - ${errBody}` }, { status: 500 });
    }

    const completion = await openaiRes.json();
    const summary = completion.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
