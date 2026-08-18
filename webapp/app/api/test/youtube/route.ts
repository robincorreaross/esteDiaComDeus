import { NextResponse } from 'next/server';
import { fetchLatestVideoData } from '@src/youtube';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchLatestVideoData();
    return NextResponse.json({
      success: true,
      title: data.title,
      videoUrl: data.videoUrl,
      videoId: data.videoId,
      transcriptLength: data.transcript ? data.transcript.length : 0,
      transcript: data.transcript,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
