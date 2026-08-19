/**
 * Extrai a transcrição completa de um vídeo do YouTube em JavaScript puro.
 * Compatível com Edge Runtime (Cloudflare Pages), Node.js e Serverless.
 *
 * Estratégias implementadas:
 *  1) Innertube Player API com cliente ANDROID (URLs sem &exp=xpe)
 *  2) ytInitialPlayerResponse do HTML da página (fallback)
 *  3) Remoção de &exp=xpe de URLs de legendas (evita PoToken)
 */
export async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  // Tentar estratégia 1: Innertube ANDROID
  let transcript = await tryInnertubeAndroid(videoId);
  if (transcript && transcript.length > 50) return transcript;

  // Tentar estratégia 2: ytInitialPlayerResponse do HTML
  transcript = await tryHtmlPlayerResponse(videoId);
  if (transcript && transcript.length > 50) return transcript;

  return null;
}

/**
 * Estratégia 1: Innertube Player API com cliente ANDROID
 * Retorna URLs de legenda SEM o parâmetro &exp=xpe (evita PoToken)
 */
async function tryInnertubeAndroid(videoId: string): Promise<string | null> {
  try {
    // Buscar HTML para extrair INNERTUBE_API_KEY
    const htmlRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await htmlRes.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
    if (!apiKeyMatch) return null;

    const apiKey = apiKeyMatch[1];
    const playerRes = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'pt', gl: 'BR' } },
        videoId,
      }),
    });

    const data: any = await playerRes.json();
    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) return null;

    const ptTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('pt')) || captionTracks[0];
    return await fetchAndParseCaption(ptTrack.baseUrl);
  } catch {
    return null;
  }
}

/**
 * Estratégia 2: Extrair ytInitialPlayerResponse do HTML da página
 */
async function tryHtmlPlayerResponse(videoId: string): Promise<string | null> {
  try {
    const htmlRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await htmlRes.text();

    // Extrair ytInitialPlayerResponse
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});\s*<\/script/);
    if (!match) return null;

    const playerResponse = JSON.parse(match[1]);
    const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) return null;

    const ptTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('pt')) || captionTracks[0];
    return await fetchAndParseCaption(ptTrack.baseUrl);
  } catch {
    return null;
  }
}

/**
 * Busca e parseia o XML de legendas de uma URL.
 * Remove &exp=xpe (exige PoToken) e tenta múltiplos formatos.
 */
async function fetchAndParseCaption(rawUrl: string): Promise<string | null> {
  // Remover &exp=xpe que requer PoToken (proof-of-origin)
  let url = rawUrl.replace(/&exp=xpe/g, '');

  // Tentar com diferentes formatos: srv3 (padrão), srv1, sem formato
  const formats = ['', '&fmt=srv1', '&fmt=srv3'];
  for (const fmt of formats) {
    try {
      const finalUrl = url.includes('&fmt=') ? url : url + fmt;
      const res = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
        },
      });
      const xml = await res.text();
      if (!xml || xml.length < 10) continue;

      const transcript = parseXmlCaption(xml);
      if (transcript && transcript.length > 50) return transcript;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Parseia XML de legendas em múltiplos formatos (srv3, srv1, timedtext)
 */
function parseXmlCaption(xml: string): string | null {
  // srv3: <p> tags com <s> subtags
  const pMatches = xml.match(/<p[^>]*>[\s\S]*?<\/p>/g);
  // srv1/default: <text> tags
  const textMatches = xml.match(/<text[^>]*>[\s\S]*?<\/text>/g);

  const elements = (pMatches && pMatches.length > 0) ? pMatches : (textMatches || []);

  if (elements.length === 0) {
    // Último recurso: limpar todas as tags XML
    const clean = xml
      .replace(/<\?[^>]+\?>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return decodeEntities(clean) || null;
  }

  const transcript = elements
    .map((m: string) => decodeEntities(m.replace(/<[^>]+>/g, '').replace(/\n/g, ' ')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return transcript.length > 0 ? transcript : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}
