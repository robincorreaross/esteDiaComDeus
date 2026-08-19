import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const handle = 'EsteDiacomDeus';

    // 1. Get channelId from YouTube page
    const pageRes = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      return NextResponse.json({ success: false, error: 'Não foi possível extrair o channelId' }, { status: 500 });
    }

    // 2. Get latest video from RSS
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feedRes = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)', Accept: 'application/xml, text/xml, */*' },
    });
    const feedXml = await feedRes.text();

    // Simple XML parsing for RSS (edge-compatible, no heavy libs)
    const videoIdMatch = feedXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = feedXml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);

    if (!videoIdMatch) {
      return NextResponse.json({ success: false, error: 'Nenhum vídeo encontrado no RSS' }, { status: 500 });
    }

    const videoId = videoIdMatch[1];
    const title = titleMatch ? titleMatch[1] : 'Sem título';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 3. Try to get transcript info (note: full transcript extraction requires Python/Node runtime)
    // In edge mode, we report the video found but transcript needs server-side extraction
    let transcriptLength = 0;
    let transcript = '';

    // Try fetching transcript via YouTube's timedtext endpoint (basic attempt)
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      });
      const watchHtml = await watchRes.text();
      
      // Extract caption track URL from video page
      const captionMatch = watchHtml.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/);
      if (captionMatch) {
        const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');
        const captionRes = await fetch(captionUrl);
        const captionXml = await captionRes.text();
        
        // Extract text from caption XML
        const textSegments = captionXml.match(/<text[^>]*>([^<]*)<\/text>/g);
        if (textSegments) {
          transcript = textSegments
            .map(seg => {
              const textMatch = seg.match(/>([^<]*)</);
              return textMatch ? textMatch[1] : '';
            })
            .join(' ')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          transcriptLength = transcript.length;
        }
      }
    } catch {
      // Transcript extraction failed, continue without it
    }

    return NextResponse.json({
      success: true,
      title,
      videoUrl,
      videoId,
      transcriptLength,
      transcript: transcript || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
