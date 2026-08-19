/**
 * Extrai a transcrição completa de um vídeo do YouTube em JavaScript puro
 * Compatível com Edge Runtime (Cloudflare Pages), Node.js e Serverless.
 */
export async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // 1. Obter HTML do vídeo
    const htmlRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await htmlRes.text();

    // 2. Extrair a chave de API do Innertube
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
    if (!apiKeyMatch) {
      console.warn('INNERTUBE_API_KEY não encontrada no HTML do YouTube.');
      return null;
    }
    const apiKey = apiKeyMatch[1];

    // 3. Chamar a API interna do Player Innertube (cliente ANDROID)
    const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    const playerRes = await fetch(playerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            hl: 'pt',
            gl: 'BR',
          },
        },
        videoId: videoId,
      }),
    });

    const data: any = await playerRes.json();
    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      console.warn('Nenhuma faixa de legenda encontrada para o vídeo:', videoId);
      return null;
    }

    // Preferir legenda em Português
    const ptTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('pt')) || captionTracks[0];
    const trackUrl = ptTrack.baseUrl;

    // 4. Baixar o XML da legenda
    const capRes = await fetch(trackUrl, {
      headers: {
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
      },
    });
    const capXml = await capRes.text();

    if (!capXml || capXml.length === 0) {
      return null;
    }

    // 5. Extrair texto de formatos XML (<p> em srv3 ou <text> em srv1)
    const pMatches = capXml.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
    const textMatches = capXml.match(/<text[^>]*>([\s\S]*?)<\/text>/g);
    const elements = (pMatches && pMatches.length > 0) ? pMatches : (textMatches || []);

    if (elements.length === 0) {
      // Fallback: remover todas as tags XML diretamente
      const clean = capXml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      return clean.length > 50 ? clean : null;
    }

    const transcript = elements
      .map((m: string) =>
        m
          .replace(/<[^>]+>/g, '')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n/g, ' ')
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return transcript.length > 50 ? transcript : null;
  } catch (err: any) {
    console.error('Erro na extração da transcrição do YouTube:', err);
    return null;
  }
}
