import axios from "npm:axios";
import { XMLParser } from "npm:fast-xml-parser";
import { YoutubeTranscript } from "npm:youtube-transcript";

export interface VideoData {
  videoId: string;
  title: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  transcript: string | null;
}

/**
 * Obtém o channelId do canal a partir do handle.
 * Faz scraping da página do canal.
 */
async function getChannelId(handle: string): Promise<string> {
  console.log(`[YouTube] Buscando channelId via página do canal: @${handle}`);

  const url = `https://www.youtube.com/@${handle}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    timeout: 15000,
  });

  const html = response.data;

  const patterns = [
    /"externalId":"(UC[a-zA-Z0-9_-]{22})"/,
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/,
    /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
    /channel\/(UC[a-zA-Z0-9_-]{22})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const channelId = match[1];
      console.log(`[YouTube] ChannelId encontrado: ${channelId}`);
      return channelId;
    }
  }

  throw new Error(
    `Não foi possível extrair o channelId para o handle @${handle}.`
  );
}

/**
 * Busca o video mais recente do canal via RSS feed público do YouTube.
 */
async function getLatestVideoFromRSS(channelId: string) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  console.log(`[YouTube] Buscando RSS feed: ${feedUrl}`);

  const response = await axios.get(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
      'Accept': 'application/xml, text/xml, */*',
    },
    timeout: 15000,
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const feed = parser.parse(response.data);
  const entries = feed?.feed?.entry;

  if (!entries) {
    throw new Error('Nenhum vídeo encontrado no RSS feed do canal.');
  }

  const latest = Array.isArray(entries) ? entries[0] : entries;

  const videoId = latest['yt:videoId'];
  const title = latest.title;
  const publishedAt = latest.published;
  const description = latest?.['media:group']?.['media:description'] || '';
  const thumbnail =
    latest?.['media:group']?.['media:thumbnail']?.['@_url'] || '';
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[YouTube] Vídeo encontrado: "${title}" (${videoId})`);
  return { videoId, title, publishedAt, description, thumbnail, videoUrl };
}

/**
 * Extrai a transcrição do vídeo.
 */
async function getTranscript(videoId: string): Promise<string | null> {
  console.log(`[YouTube] Extraindo transcrição do vídeo: ${videoId}`);

  try {
    let transcriptItems;
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'pt' });
      console.log('[YouTube] Transcrição em português encontrada.');
    } catch {
      console.log('[YouTube] Transcrição em pt não encontrada. Tentando outros idiomas...');
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      console.log('[YouTube] Transcrição encontrada em outro idioma.');
    }

    const fullText = transcriptItems
      .map((item: { text: string }) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`[YouTube] Transcrição extraída: ${fullText.length} caracteres`);

    if (fullText.length === 0) {
      console.log('[YouTube] Transcrição vazia. Usando descrição como fallback.');
      return null;
    }

    return fullText;

  } catch (err: any) {
    console.log(`[YouTube] Transcrição não disponível: ${err.message}`);
    console.log('[YouTube] Usando descrição do vídeo como conteúdo para o resumo.');
    return null;
  }
}

/**
 * Função principal: retorna todos os dados do último vídeo do canal.
 */
export async function fetchLatestVideoData(): Promise<VideoData> {
  const handle = Deno.env.get('YOUTUBE_CHANNEL_HANDLE') || 'EsteDiacomDeus';
  let channelId = Deno.env.get('YOUTUBE_CHANNEL_ID');

  if (!channelId) {
    channelId = await getChannelId(handle);
    console.log(`[Dica] Configure YOUTUBE_CHANNEL_ID=${channelId} nas secrets para acelerar.`);
  } else {
    console.log(`[YouTube] Usando channelId das configurações: ${channelId}`);
  }

  const videoData = await getLatestVideoFromRSS(channelId);
  const transcript = await getTranscript(videoData.videoId);

  return {
    ...videoData,
    transcript,
  };
}
