import { NextResponse } from 'next/server';
import { generateSummary } from '@src/summarizer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const summary = await generateSummary({
      title: body.title,
      videoUrl: body.videoUrl,
      transcript: body.transcript,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
