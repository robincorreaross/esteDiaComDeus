import { NextResponse } from 'next/server';
import { getYouTubeTranscript } from '@/lib/youtube-transcript';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const handle = 'EsteDiacomDeus';

    // 1. Obter channelId da página do canal
    const pageRes = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await pageRes.text();

    const patterns = [
      /"externalId":"(UC[a-zA-Z0-9_-]{22})"/,
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/,
      /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
    ];

    let channelId = '';
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        channelId = match[1];
        break;
      }
    }

    if (!channelId) {
      channelId = 'UCrWihNP4LHvHSU3UAy4cJaA'; // Fallback conhecido do canal
    }

    // 2. Obter último vídeo via RSS Feed
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feedRes = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)', Accept: 'application/xml, text/xml, */*' },
    });
    const feedXml = await feedRes.text();

    const videoIdMatch = feedXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = feedXml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);

    if (!videoIdMatch) {
      return NextResponse.json({ success: false, error: 'Nenhum vídeo encontrado no RSS' }, { status: 500 });
    }

    const videoId = videoIdMatch[1];
    const title = titleMatch ? titleMatch[1] : 'Sem título';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 3. Extrair transcrição completa usando algoritmo Innertube
    const transcript = await getYouTubeTranscript(videoId);

    return NextResponse.json({
      success: true,
      title,
      videoUrl,
      videoId,
      transcriptLength: transcript ? transcript.length : 0,
      transcript: transcript || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
