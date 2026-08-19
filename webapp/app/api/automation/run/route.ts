import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Step 1: Fetch latest video (reuse youtube logic via internal edge-compatible code)
    const handle = 'EsteDiacomDeus';
    const pageRes = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    });
    const html = await pageRes.text();

    const channelPatterns = [
      /"externalId":"(UC[a-zA-Z0-9_-]{22})"/,
      /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
    ];
    let channelId = '';
    for (const p of channelPatterns) {
      const m = html.match(p);
      if (m) { channelId = m[1]; break; }
    }
    if (!channelId) {
      return NextResponse.json({ success: false, error: 'channelId não encontrado' }, { status: 500 });
    }

    const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const feedXml = await feedRes.text();
    const videoIdMatch = feedXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = feedXml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);
    if (!videoIdMatch) {
      return NextResponse.json({ success: false, error: 'Nenhum vídeo encontrado' }, { status: 500 });
    }
    const videoId = videoIdMatch[1];
    const title = titleMatch ? titleMatch[1] : '';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Step 2: Get transcript
    let transcript = '';
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      });
      const watchHtml = await watchRes.text();
      const captionMatch = watchHtml.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/);
      if (captionMatch) {
        const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');
        const captionRes = await fetch(captionUrl);
        const captionXml = await captionRes.text();
        const textSegments = captionXml.match(/<text[^>]*>([^<]*)<\/text>/g);
        if (textSegments) {
          transcript = textSegments
            .map(seg => { const m = seg.match(/>([^<]*)</); return m ? m[1] : ''; })
            .join(' ')
            .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')
            .trim();
        }
      }
    } catch { /* transcript not available */ }

    if (transcript.length < 100) {
      return NextResponse.json({
        success: false,
        step: 'transcript',
        error: 'Transcrição indisponível ou muito curta. Automação bloqueada para evitar alucinação.',
      }, { status: 400 });
    }

    // Step 3: Generate summary via OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY não configurada' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    let promptTemplate = '';
    try {
      const sRes = await fetch(`${supabaseUrl}/rest/v1/settings?id=eq.default&select=prompt_template`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      const sData = await sRes.json();
      promptTemplate = sData?.[0]?.prompt_template || '';
    } catch { /* use default */ }

    if (!promptTemplate) {
      promptTemplate = `Voce e um assistente especializado em conteudo cristao evangelico. Analise o seguinte video devocional e gere uma mensagem baseado no devocional do vídeo, formatada para envio no WhatsApp.\n\nTITULO DO VIDEO: {title}\nLINK DO VIDEO: {videoUrl}\n\nTRANSCRICAO DO VIDEO:\n{transcript}\n\nCrie uma mensagem com: 1) Bom dia caloroso; 2) Titulo do episodio; 3) Passagem bíblica chave; 4) Resumo (4-6 paragrafos); 5) Reflexao pratica; 6) Link do video; 7) Despedida com bencao.\n\nUse emojis, *negrito* WhatsApp, linguagem acolhedora, 300-500 palavras, Portugues do Brasil.`;
    }

    const prompt = promptTemplate
      .replace(/{title}/g, title)
      .replace(/{videoUrl}/g, videoUrl)
      .replace(/{transcript}/g, transcript);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1200, temperature: 0.7 }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return NextResponse.json({ success: false, step: 'summarizer', error: `OpenAI: ${errText}` }, { status: 500 });
    }

    const completion = await openaiRes.json();
    const summary = completion.choices?.[0]?.message?.content?.trim();

    // Step 4: Send via WhatsApp
    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKeyEvo = process.env.EVOLUTION_API_KEY;
    const instanceEvo = process.env.EVOLUTION_INSTANCE;
    if (!baseUrl || !apiKeyEvo || !instanceEvo) {
      return NextResponse.json({ success: false, step: 'whatsapp', error: 'Evolution API não configurada' }, { status: 500 });
    }

    // Get active contacts
    let targets: string[] = [];
    try {
      const cRes = await fetch(`${supabaseUrl}/rest/v1/contacts?is_active=eq.true&select=target_id`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      const contacts = await cRes.json();
      if (Array.isArray(contacts)) targets = contacts.map((c: any) => c.target_id);
    } catch { /* fallback */ }
    if (targets.length === 0) targets = ['5516991080895'];

    const results = [];
    for (const t of targets) {
      try {
        const res = await fetch(`${baseUrl}/message/sendText/${instanceEvo}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: apiKeyEvo },
          body: JSON.stringify({ number: t, text: summary }),
        });
        results.push({ target: t, success: res.ok });
      } catch (e: any) {
        results.push({ target: t, success: false, error: e.message });
      }
    }

    // Log execution
    try {
      await fetch(`${supabaseUrl}/rest/v1/execution_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          trigger: 'manual',
          status: 'success',
          video_title: title,
          video_url: videoUrl,
          summary_preview: summary?.substring(0, 200),
          targets_count: targets.length,
        }),
      });
    } catch { /* log failed silently */ }

    return NextResponse.json({ success: true, title, videoUrl, transcriptLength: transcript.length, summary, whatsappResults: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
