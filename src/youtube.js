require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * Encontra o caminho absoluto do script get_transcript.py
 * Funciona tanto no Node.js puro quanto bundlado no Next.js
 */
function getScriptPath() {
  const possiblePaths = [
    path.join(__dirname, 'get_transcript.py'),
    path.join(process.cwd(), 'src', 'get_transcript.py'),
    path.join(process.cwd(), '..', 'src', 'get_transcript.py'),
    path.resolve(process.cwd(), 'get_transcript.py'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      logger.info(`Script de transcrição Python encontrado em: ${p}`);
      return p;
    }
  }

  logger.warn(`Script get_transcript.py não encontrado nas rotas padrão. Usando fallback: ${possiblePaths[0]}`);
  return possiblePaths[0];
}

/**
 * Obtém o channelId do canal a partir do handle.
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
      logger.info(`ChannelId encontrado: ${channelId}`);
      return channelId;
    }
  }

  throw new Error(
    `Nao foi possivel extrair o channelId para o handle @${handle}.`
  );
}

/**
 * Busca o video mais recente do canal via RSS feed público do YouTube.
 */
async function getLatestVideoFromRSS(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  logger.info(`Buscando RSS feed: ${feedUrl}`);

  const response = await axios.get(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
      Accept: 'application/xml, text/xml, */*',
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
 * Extrai a transcricao do video via Python Helper (youtube-transcript-api).
 * Tenta 'python', 'py' ou 'python3'.
 */
function getTranscriptViaPython(videoId) {
  return new Promise((resolve) => {
    const scriptPath = getScriptPath();
    const commands = ['python', 'py', 'python3'];

    const tryCommand = (index) => {
      if (index >= commands.length) {
        logger.warn('Nenhum comando python funcionou.');
        return resolve(null);
      }

      const cmd = commands[index];
      execFile(cmd, [scriptPath, videoId], { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          logger.warn(`Tentativa com '${cmd}' falhou: ${error.message}`);
          return tryCommand(index + 1);
        }

        try {
          const res = JSON.parse(stdout.trim());
          if (res.success && res.transcript && res.transcript.length > 50) {
            return resolve(res.transcript);
          }
          logger.warn(`Transcricao via '${cmd}' retornou erro/vazia: ${res.error || 'sem texto'}`);
          return resolve(null);
        } catch (err) {
          logger.warn(`Erro ao interpretar JSON do script python: ${err.message}. Raw output: ${stdout}`);
          return tryCommand(index + 1);
        }
      });
    };

    tryCommand(0);
  });
}

/**
 * Extrai a transcricao do video.
 */
async function getTranscript(videoId) {
  logger.info(`Extraindo transcricao do video: ${videoId}`);
  const transcript = await getTranscriptViaPython(videoId);

  if (!transcript || transcript.length < 100) {
    logger.warn(`Transcricao nao disponivel ou muito curta (<100 caracteres).`);
    return null;
  }

  logger.info(`Transcricao extraida com sucesso: ${transcript.length} caracteres`);
  return transcript;
}

/**
 * Funcao principal: retorna todos os dados do ultimo video do canal.
 */
async function fetchLatestVideoData() {
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE || 'EsteDiacomDeus';

  let channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) {
    channelId = await getChannelId(handle);
  } else {
    logger.info(`Usando channelId: ${channelId}`);
  }

  const videoData = await getLatestVideoFromRSS(channelId);
  const transcript = await getTranscript(videoData.videoId);

  return {
    ...videoData,
    transcript,
  };
}

module.exports = { fetchLatestVideoData, getTranscript };

if (require.main === module) {
  fetchLatestVideoData()
    .then((data) => {
      logger.info('=== DADOS DO VIDEO ===');
      logger.info(`Titulo: ${data.title}`);
      logger.info(`URL: ${data.videoUrl}`);
      logger.info(`Transcricao disponivel: ${data.transcript ? 'SIM' : 'NAO'}`);
      if (data.transcript) {
        logger.info(`Primeiros 300 chars: ${data.transcript.substring(0, 300)}...`);
      }
    })
    .catch((err) => logger.error('Erro ao buscar video:', err));
}
