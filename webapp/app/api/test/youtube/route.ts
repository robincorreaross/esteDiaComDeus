import { NextResponse } from 'next/server';
import { getYouTubeTranscript } from '@/lib/youtube-transcript';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const channelId = 'UCrWihNP4LHvHSU3UAy4cJaA';

    // 1. Obter último vídeo via RSS Feed (funciona de qualquer IP)
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

    // 2. Tentar extrair transcrição via Innertube (pode falhar em IPs de datacenter)
    let transcript = await getYouTubeTranscript(videoId);
    let transcriptSource = 'innertube';

    // 3. Fallback: buscar transcrição do Supabase (caso já tenha sido processada pelo bot local)
    if (!transcript || transcript.length < 100) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      try {
        const logRes = await fetch(
          `${supabaseUrl}/rest/v1/execution_logs?video_url=eq.${encodeURIComponent(videoUrl)}&select=summary_preview&order=created_at.desc&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        const logs = await logRes.json();
        if (logs?.[0]?.summary_preview) {
          transcriptSource = 'supabase_cache';
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      title,
      videoUrl,
      videoId,
      transcriptLength: transcript ? transcript.length : 0,
      transcriptSource,
      transcript: transcript || null,
      note: (!transcript || transcript.length < 100)
        ? 'A transcrição pode não estar disponível quando acessada de servidores em nuvem (Cloudflare). O bot local (Python) extrai com sucesso via youtube-transcript-api.'
        : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
