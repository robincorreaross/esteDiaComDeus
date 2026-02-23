require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { YoutubeTranscript } = require('youtube-transcript');
const logger = require('./logger');

/**
 * Obtém o channelId do canal a partir do handle.
 * Faz scraping da página do canal (sem precisar de API key).
 * O channelId fica na meta tag canonical da página do canal.
 */
async function getChannelId(handle) {
  logger.info(`Buscando channelId via pagina do canal: @${handle}`);

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

  // O channelId aparece em vários lugares no HTML. Tentamos extrair do canonical ou do externalId.
  const patterns = [
    /"externalId":"(UC[a-zA-Z0-9_-]{22})"/,       // JSON embedded
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/,
    /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
    /channel\/(UC[a-zA-Z0-9_-]{22})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const channelId = match[1];
      logger.info(`ChannelId encontrado: ${channelId}`);
      return channelId;
    }
  }

  throw new Error(
    `Nao foi possivel extrair o channelId para o handle @${handle}. ` +
    'Tente definir YOUTUBE_CHANNEL_ID diretamente no .env'
  );
}

/**
 * Busca o video mais recente do canal via RSS feed público do YouTube.
 * O RSS feed NÃO exige API key e não tem limite de cota.
 */
async function getLatestVideoFromRSS(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  logger.info(`Buscando RSS feed: ${feedUrl}`);

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
    throw new Error('Nenhum video encontrado no RSS feed do canal.');
  }

  // Pega o primeiro entry (mais recente)
  const latest = Array.isArray(entries) ? entries[0] : entries;

  const videoId = latest['yt:videoId'];
  const title = latest.title;
  const publishedAt = latest.published;
  const description = latest?.['media:group']?.['media:description'] || '';
  const thumbnail =
    latest?.['media:group']?.['media:thumbnail']?.['@_url'] || '';
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.info(`Video encontrado: "${title}" (${videoId})`);
  logger.info(`Publicado em: ${new Date(publishedAt).toLocaleString('pt-BR')}`);

  return { videoId, title, publishedAt, description, thumbnail, videoUrl };
}

/**
 * Extrai a transcricao do video (legenda/subtitulo).
 * Tenta portugues primeiro, depois qualquer idioma. Fallback para null.
 */
async function getTranscript(videoId) {
  logger.info(`Extraindo transcricao do video: ${videoId}`);

  try {
    let transcriptItems;
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'pt' });
      logger.info('Transcricao em portugues encontrada.');
    } catch {
      logger.warn('Transcricao em pt nao encontrada. Tentando outros idiomas...');
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      logger.info('Transcricao encontrada em outro idioma.');
    }

    const fullText = transcriptItems
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    logger.info(`Transcricao extraida: ${fullText.length} caracteres`);

    // Transcricao vazia = trata como indisponivel
    if (fullText.length === 0) {
      logger.warn('Transcricao veio vazia. Usando descricao como fallback.');
      return null;
    }

    return fullText;

  } catch (err) {
    logger.warn(`Transcricao nao disponivel: ${err.message}`);
    logger.info('Usando descricao do video como conteudo para o resumo.');
    return null;
  }
}

/**
 * Funcao principal: retorna todos os dados do ultimo video do canal.
 * Nao precisa de YouTube API key - usa RSS feed publico.
 */
async function fetchLatestVideoData() {
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE || 'EsteDiacomDeus';

  // Permite definir o channelId diretamente no .env para evitar o scraping
  let channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) {
    channelId = await getChannelId(handle);
    logger.info(`Dica: adicione YOUTUBE_CHANNEL_ID=${channelId} no .env para nao precisar buscar toda vez.`);
  } else {
    logger.info(`Usando channelId do .env: ${channelId}`);
  }

  const videoData = await getLatestVideoFromRSS(channelId);
  const transcript = await getTranscript(videoData.videoId);

  return {
    ...videoData,
    transcript,
  };
}

module.exports = { fetchLatestVideoData };

// Permite execucao direta para teste: node src/youtube.js
if (require.main === module) {
  fetchLatestVideoData()
    .then((data) => {
      logger.info('=== DADOS DO VIDEO ===');
      logger.info(`Titulo: ${data.title}`);
      logger.info(`URL: ${data.videoUrl}`);
      logger.info(`Descricao: ${data.description.substring(0, 200)}...`);
      logger.info(`Transcricao disponivel: ${data.transcript ? 'Sim' : 'Nao (usa descricao)'}`);
      if (data.transcript) {
        logger.info(`Primeiros 500 chars: ${data.transcript.substring(0, 500)}...`);
      }
    })
    .catch((err) => logger.error('Erro ao buscar video:', err));
}
